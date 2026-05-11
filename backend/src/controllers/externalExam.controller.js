import mongoose from "mongoose";
import ExternalExamBooklet from "../models/ExternalExamBooklet.js";
import ExternalBundle from "../models/ExternalBundle.js";
import ExternalAIEvaluation from "../models/ExternalAIEvaluation.js";
import ExternalExaminerEvaluation from "../models/ExternalExaminerEvaluation.js";
import ScrutinizerReview from "../models/ScrutinizerReview.js";
import DCEReview from "../models/DCEReview.js";
import CentralExaminerSubmission from "../models/CentralExaminerSubmission.js";
import ExamEvent from "../models/ExamEvent.js";
import EvaluationSchema from "../models/EvaluationSchema.js";
import AuditLog from "../models/AuditLog.js";
import {
  convertPDFToImages, filterUsefulImages, evaluateWithGemini, cleanupFiles,
} from "../services/ocr.service.js";
import { EXTERNAL_BOOKLET_STATUS, BUNDLE_STATUS } from "../config/constants.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isQueueEnabled, enqueueBundleEvaluation } from "../services/queue.service.js";

export const aiEvaluateBundle = asyncHandler(async (req, res) => {
  const { bundleId } = req.params;

  if (isQueueEnabled) {
    const job = await enqueueBundleEvaluation(bundleId);
    return res.status(202).json({ queued: true, jobId: job.id, bundleId });
  }

  const bundle = await ExternalBundle.findById(bundleId)
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

      await ExternalAIEvaluation.findOneAndUpdate(
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
});

export const scrutinizerReview = asyncHandler(async (req, res) => {
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

      const booklet = await ExternalExamBooklet.findById(req.params.bookletId).session(session);
      if (booklet.bundle) {
        const allBooklets = await ExternalExamBooklet.find({ bundle: booklet.bundle }).session(session);
        const allScrutinized = allBooklets.every(
          b => b.status === EXTERNAL_BOOKLET_STATUS.SCRUTINIZED || b._id.equals(req.params.bookletId)
        );
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
});

export const dceReview = asyncHandler(async (req, res) => {
  const {
    examEventId, subjectId, sampleBookletIds, reviewNotes, hasCorrections, isApproved, dceFacultyId,
    bookletId, action, reason, yearId,
  } = req.body;
  const dce = dceFacultyId || req.user.roleRef;

  if (bookletId && action) {
    if (action === "approve") {
      await ExternalExamBooklet.findByIdAndUpdate(bookletId, { status: EXTERNAL_BOOKLET_STATUS.DCE_APPROVED });
      await AuditLog.create({
        action: "dce_approve_booklet", entity: "ExternalExamBooklet",
        entityId: bookletId, performedBy: req.user._id, role: req.user.role,
        details: { action }, ipAddress: req.ip,
      });
      return res.json({ message: "Booklet approved by DCE", bookletId, action });
    }
    if (action === "send_back") {
      await ExternalExamBooklet.findByIdAndUpdate(bookletId, { status: EXTERNAL_BOOKLET_STATUS.SCRUTINIZED });
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
});

export const submitToCE = asyncHandler(async (req, res) => {
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
        totalStudents: total, passCount: marks.filter(m => (m / 50) * 100 >= 45).length,
        failCount: marks.filter(m => (m / 50) * 100 < 45).length,
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
});

export const sendEvaluatorMessage = asyncHandler(async (req, res) => {
  const { examEventId, subjectId, message, sentToFacultyId } = req.body;
  if (!message) return res.status(400).json({ message: "Message content is required" });

  const review = await DCEReview.findOneAndUpdate(
    { examEvent: examEventId, subject: subjectId },
    {
      $push: {
        communicationLog: {
          message,
          sentTo: sentToFacultyId || null,
          sentAt: new Date(),
        }
      }
    },
    { new: true }
  ).populate("communicationLog.sentTo", "name employeeId");

  if (!review) return res.status(404).json({ message: "DCE review not found for this subject and exam event" });
  res.json({ message: "Message sent to evaluator", communicationLog: review.communicationLog });
});
