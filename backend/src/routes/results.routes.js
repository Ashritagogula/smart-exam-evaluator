import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import FinalResult from "../models/FinalResult.js";
import {
  computeResult,
  computeBulkResults,
  declareResults,
  applyRelativeGradingHandler,
} from "../controllers/results.controller.js";

const router = express.Router();
router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const { student, subject, academicYear, semester, isDeclared } = req.query;
  const filter = {};
  if (student) filter.student = student;
  if (subject) filter.subject = subject;
  if (academicYear) filter.academicYear = academicYear;
  if (semester) filter.semester = semester;
  if (isDeclared !== undefined) filter.isDeclared = isDeclared === "true";
  res.json(await FinalResult.find(filter)
    .populate("student", "rollNumber name")
    .populate("subject", "courseCode title")
    .populate("academicYear", "year")
    .populate("semester", "number name")
    .sort("student"));
}));

router.get("/student/:studentId", asyncHandler(async (req, res) => {
  const results = await FinalResult.find({ student: req.params.studentId })
    .populate("subject", "courseCode title credits type")
    .populate("academicYear", "year")
    .populate("semester", "number name")
    .populate("regulation", "code")
    .sort("-createdAt");
  res.json(results);
}));

router.post("/compute",      authorize("examcell", "admin", "ce"), asyncHandler(computeResult));
router.post("/compute-bulk", authorize("examcell", "admin", "ce"), asyncHandler(computeBulkResults));
router.post("/declare",      authorize("ce", "admin"),             asyncHandler(declareResults));

router.post("/apply-relative-grading",
  authorize("examcell", "admin", "ce"),
  asyncHandler(applyRelativeGradingHandler)
);

router.get("/analytics/:subjectId", asyncHandler(async (req, res) => {
  const { academicYear } = req.query;
  const filter = { subject: req.params.subjectId, isDeclared: true };
  if (academicYear) filter.academicYear = academicYear;
  const results = await FinalResult.find(filter);
  const total = results.length;
  const pass  = results.filter(r => r.isPassed).length;
  const marks = results.map(r => r.grandTotal);
  const avg   = total > 0 ? marks.reduce((a, b) => a + b, 0) / total : 0;
  const gradeDistrib = results.reduce((acc, r) => {
    acc[r.grade] = (acc[r.grade] || 0) + 1;
    return acc;
  }, {});
  res.json({
    totalStudents: total, passCount: pass, failCount: total - pass,
    passPercentage: total > 0 ? Math.round(pass / total * 100) : 0,
    averageMarks: Math.round(avg * 100) / 100,
    highestMarks: Math.max(...marks, 0),
    lowestMarks:  Math.min(...marks, 0),
    gradeDistribution: gradeDistrib,
  });
}));

export default router;
