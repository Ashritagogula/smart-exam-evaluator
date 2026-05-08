import express from "express";
import mongoose from "mongoose";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import AnswerBooklet from "../models/AnswerBooklet.js";
import AIEvaluation from "../models/AIEvaluation.js";
import FacultyEvaluation from "../models/FacultyEvaluation.js";
import FreezeEvent from "../models/FreezeEvent.js";
import InternalExam from "../models/InternalExam.js";
import { sendStudentNotification } from "../services/notification.service.js";
import { updateCIEMarks } from "../services/marks.service.js";
import { BOOKLET_STATUS, REVIEW_WINDOW_HOURS } from "../config/constants.js";
import {
  convertPDFToImages, filterUsefulImages, evaluateWithGemini, cleanupFiles,
} from "../services/ocr.service.js";
import EvaluationSchema from "../models/EvaluationSchema.js";

const router = express.Router();
router.use(authenticate);

// Get AI evaluation for a booklet
router.get("/booklet/:bookletId/ai-eval", asyncHandler(async (req, res) => {
  const ai = await AIEvaluation.findOne({ booklet: req.params.bookletId });
  if (!ai) return res.status(404).json({ message: "AI evaluation not found" });
  res.json(ai);
}));

// Get faculty evaluation for a booklet
router.get("/booklet/:bookletId/faculty-eval", asyncHandler(async (req, res) => {
  const fe = await FacultyEvaluation.findOne({ booklet: req.params.bookletId })
    .populate("faculty", "name employeeId")
    .populate("aiEvaluation");
  res.json(fe);
}));

// Get all booklets assigned to a faculty with their eval status
router.get("/faculty/:facultyId/booklets", asyncHandler(async (req, res) => {
  const { status, subject } = req.query;
  const filter = { assignedFaculty: req.params.facultyId };
  if (status) filter.status = status;
  if (subject) filter.subject = subject;
  const booklets = await AnswerBooklet.find(filter)
    .populate("student", "rollNumber name")
    .populate("subject", "courseCode title")
    .populate("examEvent", "examType title");

  const result = await Promise.all(booklets.map(async (b) => {
    const ai = await AIEvaluation.findOne({ booklet: b._id }).lean();
    const fe = await FacultyEvaluation.findOne({ booklet: b._id }).lean();
    return { ...b.toObject(), aiEvaluation: ai, facultyEvaluation: fe };
  }));
  res.json(result);
}));

// Trigger AI evaluation for a booklet
router.post("/booklet/:bookletId/ai-evaluate", asyncHandler(async (req, res) => {
  const booklet = await AnswerBooklet.findById(req.params.bookletId)
    .populate("examEvent subject");
  if (!booklet) return res.status(404).json({ message: "Booklet not found" });

  // Get evaluation schema for answer key
  const schema = await EvaluationSchema.findOne({
    examEvent: booklet.examEvent._id,
    subject: booklet.subject._id,
  });

  const keyText = schema
    ? schema.questions.map(q => `${q.questionNumber}: ${q.description || ""} [${q.maxMarks} marks]`).join("\n")
    : req.body.answerKeyText || "";

  let studentImages = [];
  let allImages = [];
  try {
    const filePath = `.${booklet.fileUrl}`;
    const rawImages = await convertPDFToImages(filePath, booklet.fileName || "booklet.pdf");
    allImages = rawImages;
    studentImages = filterUsefulImages(rawImages);

    const aiResult = await evaluateWithGemini(studentImages, keyText);

    // Store AI evaluation
    const aiEval = await AIEvaluation.findOneAndUpdate(
      { booklet: booklet._id },
      {
        booklet: booklet._id,
        questionWiseMarks: (aiResult.questionWise || []).map(q => ({
          questionNumber: q.question || "",
          maxMarks: q.maxMarks || 0,
          marksAwarded: q.marksAwarded || 0,
          status: q.status || "not_attempted",
          feedback: q.feedback || "",
        })),
        totalMarks: aiResult.totalMarks || 0,
        maxMarks: aiResult.maxMarks || 0,
        strengths: aiResult.strengths || [],
        weaknesses: aiResult.weaknesses || [],
        improvements: aiResult.suggestions || [],
        mistakes: aiResult.mistakes || [],
        suggestions: aiResult.suggestions || [],
        processedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    await AnswerBooklet.findByIdAndUpdate(booklet._id, { status: BOOKLET_STATUS.AI_EVALUATED });
    res.json(aiEval);
  } finally {
    await cleanupFiles(allImages);
  }
}));

// Faculty modifies marks
router.put("/booklet/:bookletId/marks", authorize("faculty", "subject_coordinator", "hod"), asyncHandler(async (req, res) => {
  const { modifications, finalMarks } = req.body;
  const booklet = await AnswerBooklet.findById(req.params.bookletId);
  if (!booklet) return res.status(404).json({ message: "Booklet not found" });
  if (booklet.status === BOOKLET_STATUS.PERMANENTLY_FROZEN) {
    return res.status(403).json({ message: "Booklet is permanently frozen" });
  }

  const facultyId = req.user.roleRef || req.body.facultyId;
  const fe = await FacultyEvaluation.findOneAndUpdate(
    { booklet: req.params.bookletId },
    {
      $set: { finalMarks, faculty: facultyId },
      $push: {
        modifiedQuestions: {
          $each: modifications.map(m => ({ ...m, modifiedBy: facultyId, modifiedAt: new Date() }))
        }
      },
      $inc: { version: 1 },
    },
    { upsert: true, new: true }
  );
  await AnswerBooklet.findByIdAndUpdate(req.params.bookletId, { status: BOOKLET_STATUS.FACULTY_REVIEWED });
  res.json(fe);
}));

// Freeze booklet (starts 2-day review window) — ATOMIC transaction
router.post("/booklet/:bookletId/freeze", authorize("faculty", "subject_coordinator", "hod"), asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const booklet = await AnswerBooklet.findById(req.params.bookletId).populate("student subject").session(session);
    if (!booklet) throw new Error("Booklet not found");
    if (booklet.status === BOOKLET_STATUS.PERMANENTLY_FROZEN) throw new Error("Already permanently frozen");

    const facultyId = req.user.roleRef || req.body.facultyId;
    const now = new Date();
    const reviewExpiry = new Date(now.getTime() + REVIEW_WINDOW_HOURS * 60 * 60 * 1000);

    await FacultyEvaluation.findOneAndUpdate(
      { booklet: booklet._id },
      {
        $set: {
          isFrozen: true, frozenAt: now, frozenBy: facultyId,
          reviewWindowExpiresAt: reviewExpiry, faculty: facultyId,
        }
      },
      { upsert: true, session }
    );

    await AnswerBooklet.findByIdAndUpdate(booklet._id, { status: BOOKLET_STATUS.FROZEN }, { session });

    await FreezeEvent.create([{
      booklet: booklet._id, faculty: facultyId,
      type: "temporary", frozenAt: now, permanentFreezeScheduledAt: reviewExpiry,
    }], { session });

    // Save InternalExam record
    const fe = await FacultyEvaluation.findOne({ booklet: booklet._id }).session(session);
    if (fe?.finalMarks !== undefined) {
      await InternalExam.findOneAndUpdate(
        { student: booklet.student._id, subject: booklet.subject._id, examType: booklet.examType },
        { booklet: booklet._id, finalMarks: fe.finalMarks, examEvent: booklet.examEvent },
        { upsert: true, session }
      );
    }

    await session.commitTransaction();

    // Send student notification (outside transaction)
    if (booklet.student) {
      await sendStudentNotification({
        studentId: booklet.student._id,
        type: "freeze",
        subjectId: booklet.subject._id,
        bookletId: booklet._id,
        message: `Your ${booklet.examType} answer sheet for ${booklet.subject.title || booklet.subject.courseCode} has been evaluated. You have 48 hours to consult your faculty for any concerns.`,
        title: "Answer Sheet Evaluated - Review Window Open",
        reviewWindowExpiresAt: reviewExpiry,
      });
    }

    res.json({ message: "Booklet frozen. 48-hour review window started.", reviewWindowExpiresAt: reviewExpiry });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}));

// Unfreeze during review window (faculty adjusts marks)
router.post("/booklet/:bookletId/unfreeze", authorize("faculty", "subject_coordinator", "hod"), asyncHandler(async (req, res) => {
  const fe = await FacultyEvaluation.findOne({ booklet: req.params.bookletId });
  if (!fe) return res.status(404).json({ message: "No evaluation found" });
  if (fe.isPermanentlyFrozen) return res.status(403).json({ message: "Cannot unfreeze permanently frozen booklet" });
  if (new Date() > fe.reviewWindowExpiresAt) return res.status(403).json({ message: "Review window has expired" });

  await FacultyEvaluation.findByIdAndUpdate(fe._id, { isFrozen: false, frozenAt: null });
  await AnswerBooklet.findByIdAndUpdate(req.params.bookletId, { status: BOOKLET_STATUS.FACULTY_REVIEWED });
  res.json({ message: "Booklet unfrozen for modification" });
}));

export default router;
