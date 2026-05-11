import express from "express";
import mongoose from "mongoose";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import RevaluationRequest from "../models/RevaluationRequest.js";
import ExternalExamBooklet from "../models/ExternalExamBooklet.js";
import AuditLog from "../models/AuditLog.js";
import FinalResult from "../models/FinalResult.js";
import { getGrade } from "../services/marks.service.js";

const router = express.Router();
router.use(authenticate);

// Student or exam cell submits a revaluation request
router.post("/request", authorize("student", "examcell", "admin"), asyncHandler(async (req, res) => {
  const { bookletId, studentId, subjectId, examEventId, academicYearId, reason } = req.body;

  const existing = await RevaluationRequest.findOne({
    booklet: bookletId, student: studentId, subject: subjectId, examEvent: examEventId,
  });
  if (existing) return res.status(409).json({ message: "Revaluation request already submitted" });

  const result = await FinalResult.findOne({ student: studentId, subject: subjectId });

  const request = await RevaluationRequest.create({
    booklet: bookletId,
    student: studentId,
    subject: subjectId,
    examEvent: examEventId,
    academicYear: academicYearId,
    reason,
    originalMarks: result?.grandTotal,
    originalGrade: result?.grade,
    status: "pending",
  });

  await AuditLog.create({
    action: "revaluation_requested",
    entity: "RevaluationRequest",
    entityId: request._id,
    performedBy: req.user._id,
    role: req.user.role,
    details: { bookletId, studentId, subjectId },
    ipAddress: req.ip,
  });

  res.status(201).json(request);
}));

// List revaluation requests (DCE/admin view)
router.get("/", authorize("dce", "examcell", "admin", "ce"), asyncHandler(async (req, res) => {
  const { status, examEvent, subject, student } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (examEvent) filter.examEvent = examEvent;
  if (subject) filter.subject = subject;
  if (student) filter.student = student;

  const requests = await RevaluationRequest.find(filter)
    .populate("student", "rollNumber name")
    .populate("subject", "courseCode title")
    .populate("examEvent", "title examType")
    .populate("secondEvaluator.evaluator", "name employeeId")
    .populate("thirdEvaluator.evaluator", "name employeeId")
    .sort("-createdAt");
  res.json(requests);
}));

// Get a student's own revaluation requests
router.get("/my", authorize("student"), asyncHandler(async (req, res) => {
  const studentId = req.user.roleRef;
  const requests = await RevaluationRequest.find({ student: studentId })
    .populate("subject", "courseCode title")
    .populate("examEvent", "title examType")
    .sort("-createdAt");
  res.json(requests);
}));

// DCE assigns a second evaluator to the request
router.post("/:requestId/assign-second", authorize("dce", "admin"), asyncHandler(async (req, res) => {
  const { evaluatorFacultyId } = req.body;
  const request = await RevaluationRequest.findById(req.params.requestId);
  if (!request) return res.status(404).json({ message: "Revaluation request not found" });
  if (request.status !== "pending") {
    return res.status(400).json({ message: "Request is not in pending state" });
  }

  request.secondEvaluator = { evaluator: evaluatorFacultyId, assignedAt: new Date() };
  request.status = "assigned";
  await request.save();

  await AuditLog.create({
    action: "revaluation_second_evaluator_assigned",
    entity: "RevaluationRequest", entityId: request._id,
    performedBy: req.user._id, role: req.user.role,
    details: { evaluatorFacultyId }, ipAddress: req.ip,
  });
  res.json(request);
}));

// Second evaluator submits marks
router.post("/:requestId/second-eval", authorize("faculty", "external", "examcell"), asyncHandler(async (req, res) => {
  const { marksAwarded, questionWiseMarks, remarks } = req.body;
  const request = await RevaluationRequest.findById(req.params.requestId);
  if (!request) return res.status(404).json({ message: "Revaluation request not found" });

  request.secondEvaluator.marksAwarded = marksAwarded;
  request.secondEvaluator.questionWiseMarks = questionWiseMarks || [];
  request.secondEvaluator.remarks = remarks;
  request.secondEvaluator.completedAt = new Date();
  request.status = "in_progress";

  // If variance from original > 10%, assign third evaluator
  const variance = Math.abs(marksAwarded - (request.originalMarks || 0));
  request.marksVariance = variance;

  await request.save();
  res.json({ request, requiresThirdEvaluator: variance > 10 });
}));

// DCE assigns third evaluator when marks differ significantly
router.post("/:requestId/assign-third", authorize("dce", "admin"), asyncHandler(async (req, res) => {
  const { evaluatorFacultyId } = req.body;
  const request = await RevaluationRequest.findById(req.params.requestId);
  if (!request) return res.status(404).json({ message: "Revaluation request not found" });
  if (!request.secondEvaluator?.completedAt) {
    return res.status(400).json({ message: "Second evaluator has not completed evaluation" });
  }

  request.thirdEvaluator = { evaluator: evaluatorFacultyId, assignedAt: new Date() };
  await request.save();

  await AuditLog.create({
    action: "revaluation_third_evaluator_assigned",
    entity: "RevaluationRequest", entityId: request._id,
    performedBy: req.user._id, role: req.user.role,
    details: { evaluatorFacultyId }, ipAddress: req.ip,
  });
  res.json(request);
}));

// Third evaluator submits marks
router.post("/:requestId/third-eval", authorize("faculty", "external", "examcell"), asyncHandler(async (req, res) => {
  const { marksAwarded, questionWiseMarks, remarks } = req.body;
  const request = await RevaluationRequest.findById(req.params.requestId);
  if (!request) return res.status(404).json({ message: "Revaluation request not found" });

  request.thirdEvaluator.marksAwarded = marksAwarded;
  request.thirdEvaluator.questionWiseMarks = questionWiseMarks || [];
  request.thirdEvaluator.remarks = remarks;
  request.thirdEvaluator.completedAt = new Date();
  await request.save();
  res.json(request);
}));

// DCE finalizes and declares revaluation result
router.post("/:requestId/declare", authorize("dce", "admin"), asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const request = await RevaluationRequest.findById(req.params.requestId).session(session);
    if (!request) throw new Error("Revaluation request not found");

    // Final marks: average of available evaluations
    const marks = [
      request.originalMarks,
      request.secondEvaluator?.marksAwarded,
      request.thirdEvaluator?.marksAwarded,
    ].filter(m => m !== undefined && m !== null);

    const finalMarks = Math.round(marks.reduce((a, b) => a + b, 0) / marks.length * 100) / 100;
    const { grade: finalGrade, gradePoints } = getGrade(finalMarks, 100);

    request.finalMarks = finalMarks;
    request.finalGrade = finalGrade;
    request.isUpgraded = finalMarks > (request.originalMarks || 0);
    request.approvedByDCE = true;
    request.approvedByDCEAt = new Date();
    request.dce = req.user.roleRef;
    request.status = "completed";
    request.declaredAt = new Date();
    await request.save({ session });

    // Update FinalResult if marks improved
    if (request.isUpgraded) {
      await FinalResult.findOneAndUpdate(
        { student: request.student, subject: request.subject },
        { grandTotal: finalMarks, grade: finalGrade, gradePoints, isPassed: gradePoints > 0 },
        { session }
      );
    }

    await AuditLog.create({
      action: "revaluation_declared",
      entity: "RevaluationRequest", entityId: request._id,
      performedBy: req.user._id, role: req.user.role,
      details: { finalMarks, finalGrade, isUpgraded: request.isUpgraded },
      ipAddress: req.ip,
    });

    await session.commitTransaction();
    res.json(request);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}));

// Reject a revaluation request
router.post("/:requestId/reject", authorize("dce", "admin"), asyncHandler(async (req, res) => {
  const { rejectionReason } = req.body;
  const request = await RevaluationRequest.findByIdAndUpdate(
    req.params.requestId,
    { status: "rejected", rejectionReason },
    { new: true }
  );
  if (!request) return res.status(404).json({ message: "Revaluation request not found" });
  await AuditLog.create({
    action: "revaluation_rejected",
    entity: "RevaluationRequest", entityId: request._id,
    performedBy: req.user._id, role: req.user.role,
    details: { rejectionReason }, ipAddress: req.ip,
  });
  res.json(request);
}));

export default router;
