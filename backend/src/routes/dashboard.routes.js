import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ExamEvent from "../models/ExamEvent.js";
import AnswerBooklet from "../models/AnswerBooklet.js";
import ExternalBundle from "../models/ExternalBundle.js";
import FinalResult from "../models/FinalResult.js";
import Student from "../models/Student.js";
import Faculty from "../models/Faculty.js";
import Department from "../models/Department.js";
import CIEMarks from "../models/CIEMarks.js";
import FacultyEvaluation from "../models/FacultyEvaluation.js";
import CentralExaminerSubmission from "../models/CentralExaminerSubmission.js";
import LabMarks from "../models/LabMarks.js";

const router = express.Router();
router.use(authenticate);

// Admin/ExamCell overview dashboard stats
router.get("/overview", asyncHandler(async (req, res) => {
  const [
    totalStudents, totalFaculty, totalExamEvents,
    totalBooklets, pendingBooklets, frozenBooklets,
    totalResults, declaredResults,
  ] = await Promise.all([
    Student.countDocuments({ isActive: true }),
    Faculty.countDocuments({ isActive: true }),
    ExamEvent.countDocuments(),
    AnswerBooklet.countDocuments(),
    AnswerBooklet.countDocuments({ status: "pending" }),
    AnswerBooklet.countDocuments({ status: { $in: ["frozen", "permanently_frozen"] } }),
    FinalResult.countDocuments(),
    FinalResult.countDocuments({ isDeclared: true }),
  ]);
  res.json({
    totalStudents, totalFaculty, totalExamEvents,
    totalBooklets, pendingBooklets, frozenBooklets,
    totalResults, declaredResults,
  });
}));

// Faculty dashboard stats
router.get("/faculty/:facultyId", asyncHandler(async (req, res) => {
  const facultyId = req.params.facultyId;
  const [assigned, pending, evaluated, frozen] = await Promise.all([
    AnswerBooklet.countDocuments({ assignedFaculty: facultyId }),
    AnswerBooklet.countDocuments({ assignedFaculty: facultyId, status: "pending" }),
    AnswerBooklet.countDocuments({ assignedFaculty: facultyId, status: { $in: ["ai_evaluated", "faculty_reviewed"] } }),
    AnswerBooklet.countDocuments({ assignedFaculty: facultyId, status: { $in: ["frozen", "permanently_frozen"] } }),
  ]);
  res.json({ assigned, pending, evaluated, frozen });
}));

// External examiner stats
router.get("/examiner/:examinerId", asyncHandler(async (req, res) => {
  const bundles = await ExternalBundle.find({ examiner: req.params.examinerId });
  const totalBooklets = bundles.reduce((a, b) => a + b.totalBooklets, 0);
  const pending = bundles.filter(b => b.status === "pending").length;
  const evaluated = bundles.filter(b => ["evaluated", "frozen", "scrutinized", "dce_approved"].includes(b.status)).length;
  res.json({ totalBundles: bundles.length, totalBooklets, pendingBundles: pending, evaluatedBundles: evaluated });
}));

// DCE dashboard stats
router.get("/dce/:examEventId", asyncHandler(async (req, res) => {
  const booklets = await import("../models/ExternalExamBooklet.js").then(m => m.default);
  const total = await booklets.countDocuments({ examEvent: req.params.examEventId });
  const scrutinized = await booklets.countDocuments({ examEvent: req.params.examEventId, status: "scrutinized" });
  const dceApproved = await booklets.countDocuments({ examEvent: req.params.examEventId, status: "dce_approved" });
  res.json({ totalBooklets: total, scrutinized, dceApproved, pending: total - scrutinized });
}));

// Department analytics
router.get("/department/:deptId", asyncHandler(async (req, res) => {
  const subjects = req.query.subjects?.split(",") || [];
  const results = await FinalResult.find({
    ...(subjects.length ? { subject: { $in: subjects } } : {}),
    isDeclared: true,
  });
  const pass = results.filter(r => r.isPassed).length;
  const total = results.length;
  const avg = total > 0 ? results.reduce((a, r) => a + r.grandTotal, 0) / total : 0;
  res.json({
    totalResults: total, passCount: pass, failCount: total - pass,
    passPercentage: total > 0 ? Math.round(pass / total * 100) : 0,
    averageMarks: Math.round(avg * 100) / 100,
  });
}));

// Student dashboard
router.get("/student/:studentId", asyncHandler(async (req, res) => {
  const [results, labMarks, pendingNotifications] = await Promise.all([
    FinalResult.find({ student: req.params.studentId })
      .populate("subject", "courseCode title"),
    LabMarks.find({ student: req.params.studentId })
      .populate("subject", "courseCode title"),
    import("../models/StudentNotification.js").then(m =>
      m.default.countDocuments({ student: req.params.studentId, isRead: false })
    ),
  ]);
  const declared = results.filter(r => r.isDeclared);
  const sgpa = declared.length > 0
    ? declared.reduce((a, r) => a + r.gradePoints, 0) / declared.length
    : 0;
  res.json({
    totalSubjects: results.length, declaredResults: declared.length,
    sgpa: Math.round(sgpa * 100) / 100,
    pendingNotifications, results,
  });
}));

export default router;
