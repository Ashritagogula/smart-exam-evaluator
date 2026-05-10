import express from "express";
import mongoose from "mongoose";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { uploadBooklets } from "../middleware/upload.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ExternalExamBooklet from "../models/ExternalExamBooklet.js";
import ExternalBundle from "../models/ExternalBundle.js";
import ExternalAIEvaluation from "../models/ExternalAIEvaluation.js";
import ExternalExaminerEvaluation from "../models/ExternalExaminerEvaluation.js";
import ScrutinizerReview from "../models/ScrutinizerReview.js";
import DCEReview from "../models/DCEReview.js";
import CentralExaminerSubmission from "../models/CentralExaminerSubmission.js";
import ExamEvent from "../models/ExamEvent.js";
import AuditLog from "../models/AuditLog.js";
import {
  convertPDFToImages, filterUsefulImages, evaluateWithGemini, cleanupFiles,
} from "../services/ocr.service.js";
import EvaluationSchema from "../models/EvaluationSchema.js";
import { EXTERNAL_BOOKLET_STATUS, BUNDLE_STATUS } from "../config/constants.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();
router.use(authenticate);

// ─── BOOKLETS ───────────────────────────────────────────────────────────────

router.get("/booklets", asyncHandler(async (req, res) => {
  const { examEvent, bundle, status, subject, examiner } = req.query;
  const filter = {};
  if (examEvent) filter.examEvent = examEvent;
  if (bundle) filter.bundle = bundle;
  if (status) filter.status = status;
  if (subject) filter.subject = subject;

  const booklets = await ExternalExamBooklet.find(filter)
    .populate("student", "rollNumber name")
    .populate("subject", "courseCode title")
    .populate("bundle");

  const ids = booklets.map(b => b._id);
  const [aiEvals, examinerEvals, scrutReviews] = await Promise.all([
    ExternalAIEvaluation.find({ booklet: { $in: ids } }).lean(),
    ExternalExaminerEvaluation.find({ booklet: { $in: ids } }).lean(),
    ScrutinizerReview.find({ booklet: { $in: ids } }).lean(),
  ]);
  const aiMap      = Object.fromEntries(aiEvals.map(a => [a.booklet.toString(), a]));
  const examMap    = Object.fromEntries(examinerEvals.map(e => [e.booklet.toString(), e]));
  const scrutMap   = Object.fromEntries(scrutReviews.map(s => [s.booklet.toString(), s]));

  res.json(booklets.map(b => ({
    ...b.toObject(),
    aiEvaluation:       aiMap[b._id.toString()]    || null,
    examinerEvaluation: examMap[b._id.toString()]   || null,
    returnedByScrutinizer: scrutMap[b._id.toString()]?.action === "return",
    returnMessage:      scrutMap[b._id.toString()]?.comments || "",
  })));
}));

router.post("/booklets/upload", authorize("clerk", "examcell", "admin"), (req, res, next) => {
  uploadBooklets(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, asyncHandler(async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ message: "No booklets uploaded" });
  const { examEventId, subjectId } = req.body;
  const created = [];
  for (const file of req.files) {
    const barcode = `EXT-${uuidv4().slice(0, 8).toUpperCase()}`;
    const b = await ExternalExamBooklet.create({
      barcode, subject: subjectId, examEvent: examEventId,
      fileUrl: `/uploads/booklets/${file.filename}`,
      fileName: file.originalname, uploadedBy: req.user._id,
    });
    created.push(b);
  }
  res.status(201).json({ message: `${created.length} external booklets uploaded`, booklets: created });
}));

// ─── BUNDLES ─────────────────────────────────────────────────────────────────

router.get("/bundles", asyncHandler(async (req, res) => {
  const { examEvent, examiner, status, subject } = req.query;
  const filter = {};
  if (examEvent) filter.examEvent = examEvent;
  if (examiner) filter.examiner = examiner;
  if (status) filter.status = status;
  if (subject) filter.subject = subject;
  res.json(await ExternalBundle.find(filter)
    .populate("examiner", "name employeeId")
    .populate("subject", "courseCode title")
    .populate("booklets"));
}));

// Create bundles (divide booklets among examiners)
router.post("/bundles/create", authorize("examcell", "admin", "dce"), asyncHandler(async (req, res) => {
  const { examEventId, subjectId, examinerIds } = req.body;
  const booklets = await ExternalExamBooklet.find({
    examEvent: examEventId, subject: subjectId, bundle: null,
  });
  if (!booklets.length) return res.status(400).json({ message: "No unbundled booklets found" });

  const chunks = chunkArray(booklets, Math.ceil(booklets.length / examinerIds.length));
  const bundles = [];
  for (let i = 0; i < examinerIds.length; i++) {
    if (!chunks[i]?.length) continue;
    const bundle = await ExternalBundle.create({
      examEvent: examEventId, subject: subjectId,
      examiner: examinerIds[i], bundleNumber: i + 1,
      booklets: chunks[i].map(b => b._id), totalBooklets: chunks[i].length,
    });
    await ExternalExamBooklet.updateMany(
      { _id: { $in: chunks[i].map(b => b._id) } },
      { bundle: bundle._id }
    );
    bundles.push(bundle);
  }
  res.status(201).json({ message: `${bundles.length} bundles created`, bundles });
}));

// Examiner triggers AI evaluation for their bundle
router.post("/bundles/:bundleId/ai-evaluate", authorize("external", "examcell"), asyncHandler(async (req, res) => {
  const bundle = await ExternalBundle.findById(req.params.bundleId)
    .populate("booklets").populate("examEvent").populate("subject");
  if (!bundle) return res.status(404).json({ message: "Bundle not found" });

  await ExternalBundle.findByIdAndUpdate(bundle._id, { status: BUNDLE_STATUS.EVALUATING });

  const schema = await EvaluationSchema.findOne({
    examEvent: bundle.examEvent._id, subject: bundle.subject._id,
  });
  const keyText = schema
    ? schema.questions.map(q => `${q.questionNumber}: ${q.description || ""} [${q.maxMarks} marks]`).join("\n")
    : "";

  const results = [];
  for (const booklet of bundle.booklets) {
    let allImages = [];
    try {
      const filePath = `.${booklet.fileUrl}`;
      const rawImages = await convertPDFToImages(filePath, booklet.fileName || "booklet.pdf");
      allImages = rawImages;
      const studentImages = filterUsefulImages(rawImages);
      const aiResult = await evaluateWithGemini(studentImages, keyText);

      const totalMarks = aiResult.totalMarks || 0;
      const scaledTotal = Math.round((totalMarks / (aiResult.maxMarks || 100)) * 50 * 100) / 100;

      const aiEval = await ExternalAIEvaluation.findOneAndUpdate(
        { booklet: booklet._id },
        {
          booklet: booklet._id,
          questionWiseMarks: (aiResult.questionWise || []).map(q => ({
            questionNumber: q.question || "",
            maxMarks: q.maxMarks || 0,
            marksAwarded: q.marksAwarded || 0,
            scaledMarks: Math.round(((q.marksAwarded || 0) / (q.maxMarks || 1)) * 50 * 100) / 100,
            status: q.status || "not_attempted",
            feedback: q.feedback || "",
          })),
          totalMarks, scaledTotal,
          maxMarks: aiResult.maxMarks || 100,
          strengths: aiResult.strengths || [],
          weaknesses: aiResult.weaknesses || [],
          mistakes: aiResult.mistakes || [],
          suggestions: aiResult.suggestions || [],
          processedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      await ExternalExamBooklet.findByIdAndUpdate(booklet._id, {
        status: EXTERNAL_BOOKLET_STATUS.AI_EVALUATED,
      });
      results.push({ bookletId: booklet._id, totalMarks, scaledTotal });
    } finally {
      await cleanupFiles(allImages);
    }
  }

  await ExternalBundle.findByIdAndUpdate(bundle._id, { status: BUNDLE_STATUS.EVALUATED });
  res.json({ message: `AI evaluated ${results.length} booklets`, results });
}));

// Examiner modifies marks
router.put("/booklets/:bookletId/marks", authorize("external", "examcell"), asyncHandler(async (req, res) => {
  const { modifications, finalMarks, examinerFacultyId } = req.body;
  const booklet = await ExternalExamBooklet.findById(req.params.bookletId);
  if (!booklet) return res.status(404).json({ message: "Booklet not found" });
  if (booklet.status === EXTERNAL_BOOKLET_STATUS.FROZEN) {
    return res.status(403).json({ message: "Booklet is frozen" });
  }

  const examiner = examinerFacultyId || req.user.roleRef;
  const scaledFinalMarks = Math.round((finalMarks / 100) * 50 * 100) / 100;

  const eval_ = await ExternalExaminerEvaluation.findOneAndUpdate(
    { booklet: req.params.bookletId },
    {
      $set: { finalMarks, scaledFinalMarks, examiner },
      $push: {
        modifiedQuestions: {
          $each: (modifications || []).map(m => ({ ...m, modifiedAt: new Date() }))
        }
      },
      $inc: { version: 1 },
    },
    { upsert: true, new: true }
  );
  await ExternalExamBooklet.findByIdAndUpdate(req.params.bookletId, {
    status: EXTERNAL_BOOKLET_STATUS.EXAMINER_REVIEWED,
  });
  res.json(eval_);
}));

// Examiner freezes a booklet
router.post("/booklets/:bookletId/freeze", authorize("external", "examcell"), asyncHandler(async (req, res) => {
  const examiner = req.user.roleRef || req.body.examinerFacultyId;
  await ExternalExaminerEvaluation.findOneAndUpdate(
    { booklet: req.params.bookletId },
    { $set: { isFrozen: true, frozenAt: new Date() } },
    { upsert: true }
  );
  await ExternalExamBooklet.findByIdAndUpdate(req.params.bookletId, {
    status: EXTERNAL_BOOKLET_STATUS.FROZEN,
  });
  await AuditLog.create({
    action: "freeze_booklet", entity: "ExternalExamBooklet",
    entityId: req.params.bookletId, performedBy: req.user._id,
    role: req.user.role, details: { examiner },
    ipAddress: req.ip,
  });
  res.json({ message: "Booklet frozen by examiner" });
}));

// ─── SCRUTINIZER ─────────────────────────────────────────────────────────────

router.get("/scrutinizer/pending", authorize("scrutinizer", "admin"), asyncHandler(async (req, res) => {
  const booklets = await ExternalExamBooklet.find({ status: EXTERNAL_BOOKLET_STATUS.FROZEN })
    .populate("student", "rollNumber name")
    .populate("subject", "courseCode title")
    .populate("bundle");
  const result = await Promise.all(booklets.map(async b => {
    const aiEval = await ExternalAIEvaluation.findOne({ booklet: b._id }).lean();
    const examEval = await ExternalExaminerEvaluation.findOne({ booklet: b._id }).lean();
    return { ...b.toObject(), aiEvaluation: aiEval, examinerEvaluation: examEval };
  }));
  res.json(result);
}));

router.post("/scrutinizer/review/:bookletId", authorize("scrutinizer", "admin"), asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { questionChecks, isApproved, issuesSummary, scrutinizerFacultyId } = req.body;
    const hasIssues = questionChecks?.some(q => q.hasIssue) || false;
    const scrutinizer = scrutinizerFacultyId || req.user.roleRef;

    const review = await ScrutinizerReview.create([{
      booklet: req.params.bookletId, scrutinizer,
      questionChecks: questionChecks || [], isApproved, hasIssues, issuesSummary,
      reviewedAt: new Date(),
      approvedAt: isApproved ? new Date() : undefined,
      unfreezeTriggered: hasIssues,
    }], { session });

    if (hasIssues) {
      // Unfreeze and notify examiner
      await ExternalExaminerEvaluation.findOneAndUpdate(
        { booklet: req.params.bookletId }, { $set: { isFrozen: false } }, { session }
      );
      await ExternalExamBooklet.findByIdAndUpdate(req.params.bookletId, {
        status: EXTERNAL_BOOKLET_STATUS.EXAMINER_REVIEWED,
      }, { session });
    } else {
      await ExternalExamBooklet.findByIdAndUpdate(req.params.bookletId, {
        status: EXTERNAL_BOOKLET_STATUS.SCRUTINIZED,
      }, { session });

      // Check if ALL booklets in bundle are scrutinized
      const booklet = await ExternalExamBooklet.findById(req.params.bookletId).session(session);
      if (booklet.bundle) {
        const bundle = await ExternalBundle.findById(booklet.bundle).session(session);
        const allBooklets = await ExternalExamBooklet.find({ bundle: booklet.bundle }).session(session);
        const allScrutinized = allBooklets.every(b => b.status === EXTERNAL_BOOKLET_STATUS.SCRUTINIZED || b._id.equals(req.params.bookletId));
        if (allScrutinized) {
          await ExternalBundle.findByIdAndUpdate(booklet.bundle, { status: BUNDLE_STATUS.SCRUTINIZED }, { session });
        }
      }
    }

    await AuditLog.create({
      action: isApproved ? "scrutinizer_approve" : "scrutinizer_flag_issue",
      entity: "ExternalExamBooklet", entityId: req.params.bookletId,
      performedBy: req.user._id, role: req.user.role,
      details: { isApproved, hasIssues, issuesSummary },
      ipAddress: req.ip,
    });
    await session.commitTransaction();
    res.json(review[0]);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}));

// ─── DCE ─────────────────────────────────────────────────────────────────────

// Random sample of booklets for DCE spot-check audit
router.get("/dce/random-sample", authorize("dce", "admin"), asyncHandler(async (req, res) => {
  const { subjectId, examEventId, count = 5 } = req.query;
  const filter = { status: EXTERNAL_BOOKLET_STATUS.DCE_APPROVED };
  if (subjectId)   filter.subject   = subjectId;
  if (examEventId) filter.examEvent = examEventId;

  const allBooklets = await ExternalExamBooklet.find(filter)
    .populate("student", "rollNumber name")
    .populate("subject", "courseCode title");

  const shuffled = [...allBooklets].sort(() => Math.random() - 0.5);
  const sample   = shuffled.slice(0, Math.min(Number(count), allBooklets.length));

  const result = await Promise.all(sample.map(async b => {
    const [aiEval, examEval] = await Promise.all([
      ExternalAIEvaluation.findOne({ booklet: b._id }).lean(),
      ExternalExaminerEvaluation.findOne({ booklet: b._id }).lean(),
    ]);
    return {
      ...b.toObject(),
      id:      b._id.toString(),
      roll:    b.student?.rollNumber || b.barcode,
      name:    b.student?.name || "Unknown",
      subject: b.subject?.title || b.subject?.courseCode || "Unknown",
      marks:   examEval?.scaledFinalMarks ?? aiEval?.scaledTotal ?? 0,
      max:     50,
      status:  "pending",
      aiEvaluation:      aiEval  || null,
      examinerEvaluation: examEval || null,
    };
  }));

  await AuditLog.create({
    action: "dce_random_sample", entity: "ExternalExamBooklet",
    performedBy: req.user._id, role: req.user.role,
    details: { subjectId, examEventId, count, sampledCount: result.length },
    ipAddress: req.ip,
  });
  res.json(result);
}));

router.get("/dce/pending", authorize("dce", "admin"), asyncHandler(async (req, res) => {
  const { examEvent, subject } = req.query;
  const filter = {};
  if (examEvent) filter.examEvent = examEvent;
  if (subject) filter.subject = subject;

  const bundles = await ExternalBundle.find({ ...filter, status: BUNDLE_STATUS.SCRUTINIZED })
    .populate("examiner", "name employeeId")
    .populate("subject", "courseCode title");

  // DCE is notified only when ALL bundles for a subject are scrutinized
  const subjectMap = {};
  for (const b of bundles) {
    const key = b.subject._id.toString();
    if (!subjectMap[key]) subjectMap[key] = { subject: b.subject, bundles: [], allReady: true };
    subjectMap[key].bundles.push(b);
  }

  // For each subject, check total bundles vs scrutinized
  const result = [];
  for (const key of Object.keys(subjectMap)) {
    const allBundles = await ExternalBundle.countDocuments({ examEvent: examEvent, subject: key });
    const scrutinized = subjectMap[key].bundles.length;
    if (allBundles === scrutinized) result.push(subjectMap[key]);
  }
  res.json(result);
}));

router.post("/dce/review", authorize("dce", "admin"), asyncHandler(async (req, res) => {
  const {
    examEventId, subjectId, sampleBookletIds, reviewNotes, hasCorrections, isApproved, dceFacultyId,
    bookletId, action, reason, yearId,
  } = req.body;
  const dce = dceFacultyId || req.user.roleRef;

  // ── Individual booklet action from DCE random audit UI ────────────────────
  if (bookletId && action) {
    if (action === "approve") {
      await ExternalExamBooklet.findByIdAndUpdate(bookletId, {
        status: EXTERNAL_BOOKLET_STATUS.DCE_APPROVED,
      });
      await AuditLog.create({
        action: "dce_approve_booklet", entity: "ExternalExamBooklet",
        entityId: bookletId, performedBy: req.user._id, role: req.user.role,
        details: { action }, ipAddress: req.ip,
      });
      return res.json({ message: "Booklet approved by DCE", bookletId, action });
    }
    if (action === "send_back") {
      await ExternalExamBooklet.findByIdAndUpdate(bookletId, {
        status: EXTERNAL_BOOKLET_STATUS.SCRUTINIZED,
      });
      await ExternalExaminerEvaluation.findOneAndUpdate(
        { booklet: bookletId }, { $set: { isFrozen: false } }
      );
      await AuditLog.create({
        action: "dce_send_back_booklet", entity: "ExternalExamBooklet",
        entityId: bookletId, performedBy: req.user._id, role: req.user.role,
        details: { action, reason }, ipAddress: req.ip,
      });
      return res.json({ message: "Booklet sent back to scrutinizer", bookletId, action, reason });
    }
    if (action === "approve_to_ce") {
      await AuditLog.create({
        action: "dce_approve_to_ce", entity: "AcademicYear",
        performedBy: req.user._id, role: req.user.role,
        details: { yearId }, ipAddress: req.ip,
      });
      return res.json({ message: "Year results approved for CE submission", yearId });
    }
    return res.status(400).json({ message: "Unknown action" });
  }

  // ── Batch subject review (original flow) ─────────────────────────────────
  const review = await DCEReview.findOneAndUpdate(
    { examEvent: examEventId, subject: subjectId },
    {
      examEvent: examEventId, subject: subjectId, dce,
      sampledBooklets: sampleBookletIds || [],
      reviewNotes, hasCorrections, isApproved,
      approvedAt: isApproved ? new Date() : undefined,
    },
    { upsert: true, new: true }
  );

  if (isApproved) {
    await ExternalBundle.updateMany(
      { examEvent: examEventId, subject: subjectId },
      { status: BUNDLE_STATUS.DCE_APPROVED, dceApprovedAt: new Date() }
    );
    await ExternalExamBooklet.updateMany(
      { examEvent: examEventId, subject: subjectId },
      { status: EXTERNAL_BOOKLET_STATUS.DCE_APPROVED }
    );
    await AuditLog.create({
      action: "dce_approve_subject", entity: "ExternalExamBooklet",
      performedBy: req.user._id, role: req.user.role,
      details: { examEventId, subjectId, isApproved }, ipAddress: req.ip,
    });
  }
  res.json(review);
}));

// ─── CENTRAL EXAMINER ────────────────────────────────────────────────────────

router.post("/central/submit", authorize("dce", "admin"), asyncHandler(async (req, res) => {
  const { examEventId, subjectId, dceFacultyId } = req.body;
  const booklets = await ExternalExamBooklet.find({
    examEvent: examEventId, subject: subjectId,
    status: EXTERNAL_BOOKLET_STATUS.DCE_APPROVED,
  });
  const evals = await ExternalExaminerEvaluation.find({
    booklet: { $in: booklets.map(b => b._id) },
  });

  const marks = evals.map(e => e.scaledFinalMarks || 0).filter(m => m > 0);
  const total = marks.length;
  const avg = total > 0 ? marks.reduce((a, b) => a + b, 0) / total : 0;
  const gradeDistrib = marks.reduce((acc, m) => {
    const pct = (m / 50) * 100;
    if (pct >= 90) acc.O++;
    else if (pct >= 80) acc.A++;
    else if (pct >= 70) acc.B++;
    else if (pct >= 60) acc.C++;
    else if (pct >= 50) acc.D++;
    else acc.F++;
    return acc;
  }, { O: 0, A: 0, B: 0, C: 0, D: 0, F: 0 });

  const submission = await CentralExaminerSubmission.findOneAndUpdate(
    { examEvent: examEventId, subject: subjectId },
    {
      examEvent: examEventId, subject: subjectId,
      submittedBy: dceFacultyId || req.user.roleRef,
      statistics: {
        totalStudents: total, passCount: marks.filter(m => (m/50)*100 >= 45).length,
        failCount: marks.filter(m => (m/50)*100 < 45).length,
        averageMarks: Math.round(avg * 100) / 100,
        highestMarks: Math.max(...marks, 0), lowestMarks: Math.min(...marks, 0),
        gradeDistribution: gradeDistrib,
      },
    },
    { upsert: true, new: true }
  );
  await DCEReview.findOneAndUpdate(
    { examEvent: examEventId, subject: subjectId },
    { statisticsSentToCE: true, statisticsSentAt: new Date() }
  );
  res.json(submission);
}));

router.post("/central/declare", authorize("ce", "admin"), asyncHandler(async (req, res) => {
  const { examEventId, subjectId, ceFacultyId } = req.body;
  if (req.college) {
    const event = await ExamEvent.findById(examEventId);
    if (!event || event.college.toString() !== req.college._id.toString())
      return res.status(403).json({ message: "Exam event does not belong to your college" });
  }
  const submission = await CentralExaminerSubmission.findOneAndUpdate(
    { examEvent: examEventId, subject: subjectId },
    {
      resultsDeclared: true, declaredAt: new Date(),
      declaredBy: ceFacultyId || req.user.roleRef,
    },
    { new: true }
  );
  await AuditLog.create({
    action: "ce_declare_results", entity: "CentralExaminerSubmission",
    entityId: submission?._id, performedBy: req.user._id, role: req.user.role,
    details: { examEventId, subjectId }, ipAddress: req.ip,
  });
  res.json(submission);
}));

router.get("/central/submissions", authorize("ce", "dce", "admin"), asyncHandler(async (req, res) => {
  const { examEvent } = req.query;
  const filter = {};
  if (examEvent) {
    filter.examEvent = examEvent;
  } else if (req.college && req.user.role === "ce") {
    const collegeEvents = await ExamEvent.find({ college: req.college._id }, "_id");
    filter.examEvent = { $in: collegeEvents.map(e => e._id) };
  }
  res.json(await CentralExaminerSubmission.find(filter)
    .populate("subject", "courseCode title")
    .populate("submittedBy", "name")
    .populate("declaredBy", "name")
    .sort("-createdAt"));
}));

// Helper
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export default router;
