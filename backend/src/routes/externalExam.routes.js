import express from "express";
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
import { EXTERNAL_BOOKLET_STATUS, BUNDLE_STATUS } from "../config/constants.js";
import { v4 as uuidv4 } from "uuid";
import {
  aiEvaluateBundle,
  scrutinizerReview,
  dceReview,
  submitToCE,
  sendEvaluatorMessage,
} from "../controllers/externalExam.controller.js";

const router = express.Router();
router.use(authenticate);

// ─── BOOKLETS ───────────────────────────────────────────────────────────────

router.get("/booklets", asyncHandler(async (req, res) => {
  const { examEvent, bundle, status, subject } = req.query;
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
  const aiMap    = Object.fromEntries(aiEvals.map(a => [a.booklet.toString(), a]));
  const examMap  = Object.fromEntries(examinerEvals.map(e => [e.booklet.toString(), e]));
  const scrutMap = Object.fromEntries(scrutReviews.map(s => [s.booklet.toString(), s]));

  res.json(booklets.map(b => ({
    ...b.toObject(),
    aiEvaluation:          aiMap[b._id.toString()]    || null,
    examinerEvaluation:    examMap[b._id.toString()]   || null,
    returnedByScrutinizer: scrutMap[b._id.toString()]?.action === "return",
    returnMessage:         scrutMap[b._id.toString()]?.comments || "",
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

router.post("/bundles/:bundleId/ai-evaluate",
  authorize("external", "examcell"),
  asyncHandler(aiEvaluateBundle)
);

// ─── EXAMINER ─────────────────────────────────────────────────────────────────

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

router.post("/scrutinizer/review/:bookletId",
  authorize("scrutinizer", "admin"),
  asyncHandler(scrutinizerReview)
);

// ─── DCE ─────────────────────────────────────────────────────────────────────

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
      aiEvaluation:       aiEval  || null,
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

  const subjectMap = {};
  for (const b of bundles) {
    const key = b.subject._id.toString();
    if (!subjectMap[key]) subjectMap[key] = { subject: b.subject, bundles: [], allReady: true };
    subjectMap[key].bundles.push(b);
  }

  const result = [];
  for (const key of Object.keys(subjectMap)) {
    const allBundles = await ExternalBundle.countDocuments({ examEvent: examEvent, subject: key });
    const scrutinized = subjectMap[key].bundles.length;
    if (allBundles === scrutinized) result.push(subjectMap[key]);
  }
  res.json(result);
}));

router.post("/dce/review", authorize("dce", "admin"), asyncHandler(dceReview));

// DCE sends a message to an evaluator (recorded in communicationLog)
router.post("/dce/message", authorize("dce", "admin"), asyncHandler(sendEvaluatorMessage));

router.get("/dce/communication-log", authorize("dce", "admin", "examcell"), asyncHandler(async (req, res) => {
  const { examEventId, subjectId } = req.query;
  const review = await DCEReview.findOne({ examEvent: examEventId, subject: subjectId })
    .populate("communicationLog.sentTo", "name employeeId");
  if (!review) return res.status(404).json({ message: "DCE review not found" });
  res.json(review.communicationLog);
}));

// ─── CENTRAL EXAMINER ────────────────────────────────────────────────────────

router.post("/central/submit", authorize("dce", "admin"), asyncHandler(submitToCE));

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

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export default router;
