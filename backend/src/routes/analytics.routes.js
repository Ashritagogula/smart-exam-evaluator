import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getSubjectAnalytics,
  getFacultyEvaluationStats,
  getStudentPerformanceTrend,
  identifyAtRiskStudents,
  generateInstitutionReport,
} from "../services/analytics.service.js";

const router = express.Router();
router.use(authenticate);

// Subject-level performance analytics
router.get("/subject/:subjectId", authorize("admin", "examcell", "hod", "principal", "vc", "ce", "dce"), asyncHandler(async (req, res) => {
  const { academicYear } = req.query;
  const stats = await getSubjectAnalytics(req.params.subjectId, academicYear);
  res.json(stats);
}));

// Faculty evaluation efficiency report
router.get("/faculty/:facultyId/efficiency", authorize("admin", "hod", "principal", "examcell"), asyncHandler(async (req, res) => {
  const { subject } = req.query;
  const stats = await getFacultyEvaluationStats(req.params.facultyId, subject);
  res.json(stats);
}));

// Student performance trend across semesters
router.get("/student/:studentId/trend", asyncHandler(async (req, res) => {
  const trend = await getStudentPerformanceTrend(req.params.studentId);
  res.json(trend);
}));

// At-risk student identification for a subject
router.get("/subject/:subjectId/at-risk", authorize("admin", "examcell", "hod", "principal", "faculty"), asyncHandler(async (req, res) => {
  const { academicYear } = req.query;
  const result = await identifyAtRiskStudents(req.params.subjectId, academicYear);
  res.json(result);
}));

// Institution-wide annual report with AI narrative
router.get("/institution/report", authorize("admin", "principal", "vc", "chairman"), asyncHandler(async (req, res) => {
  const { academicYear } = req.query;
  if (!academicYear) return res.status(400).json({ message: "academicYear query parameter is required" });
  const report = await generateInstitutionReport(academicYear);
  res.json(report);
}));

export default router;
