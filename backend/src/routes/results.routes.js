import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import FinalResult from "../models/FinalResult.js";
import CIEMarks from "../models/CIEMarks.js";
import LabMarks from "../models/LabMarks.js";
import Student from "../models/Student.js";
import AcademicYear from "../models/AcademicYear.js";
import { getGrade, applyRelativeGrading } from "../services/marks.service.js";

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

// Compute and store final result for a student-subject
router.post("/compute", authorize("examcell", "admin", "ce"), asyncHandler(async (req, res) => {
  const { studentId, subjectId, academicYearId, semesterId, regulationId, seeTheoryMarks } = req.body;

  const cie = await CIEMarks.findOne({ student: studentId, subject: subjectId });
  const lab = await LabMarks.findOne({ student: studentId, subject: subjectId });

  const totalCIE = cie?.totalCIE || 0;
  const seeScaled = Math.round((seeTheoryMarks || 0) / 100 * 50 * 100) / 100;
  const labTotal = lab?.totalLabMarks || 0;
  const grandTotal = totalCIE + seeScaled + labTotal;

  const { grade, gradePoints } = getGrade(grandTotal, 100);

  const result = await FinalResult.findOneAndUpdate(
    { student: studentId, subject: subjectId },
    {
      student: studentId, subject: subjectId,
      academicYear: academicYearId, semester: semesterId, regulation: regulationId,
      cieMarks: cie?._id, labMarks: lab?._id,
      seeTheoryMarks: seeTheoryMarks || 0, seeScaledMarks: seeScaled,
      totalCIE, totalSEE: seeScaled, grandTotal, grade, gradePoints,
      isPassed: gradePoints > 0,
    },
    { upsert: true, new: true }
  );
  res.json(result);
}));

// Bulk compute results for a subject
router.post("/compute-bulk", authorize("examcell", "admin", "ce"), asyncHandler(async (req, res) => {
  const { subjectId, academicYearId, semesterId, regulationId, seeMarksMap } = req.body;
  // seeMarksMap: { [studentId]: marks }
  const students = await Student.find({ enrolledSubjects: subjectId });
  const results = [];
  for (const student of students) {
    const seeTheoryMarks = seeMarksMap?.[student._id.toString()] || 0;
    const cie = await CIEMarks.findOne({ student: student._id, subject: subjectId });
    const lab = await LabMarks.findOne({ student: student._id, subject: subjectId });
    const totalCIE = cie?.totalCIE || 0;
    const seeScaled = Math.round(seeTheoryMarks / 100 * 50 * 100) / 100;
    const grandTotal = totalCIE + seeScaled + (lab?.totalLabMarks || 0);
    const { grade, gradePoints } = getGrade(grandTotal, 100);
    const r = await FinalResult.findOneAndUpdate(
      { student: student._id, subject: subjectId },
      {
        student: student._id, subject: subjectId,
        academicYear: academicYearId, semester: semesterId, regulation: regulationId,
        cieMarks: cie?._id, labMarks: lab?._id,
        seeTheoryMarks, seeScaledMarks: seeScaled, totalCIE, totalSEE: seeScaled,
        grandTotal, grade, gradePoints, isPassed: gradePoints > 0,
      },
      { upsert: true, new: true }
    );
    results.push(r);
  }
  res.json({ message: `Computed ${results.length} results`, results });
}));

// Declare results for a subject
router.post("/declare", authorize("ce", "admin"), asyncHandler(async (req, res) => {
  const { subjectId, academicYearId } = req.body;
  if (req.college) {
    const ay = await AcademicYear.findById(academicYearId);
    if (!ay || ay.college.toString() !== req.college._id.toString())
      return res.status(403).json({ message: "Academic year does not belong to your college" });
  }
  await FinalResult.updateMany(
    { subject: subjectId, academicYear: academicYearId },
    { isDeclared: true, declaredAt: new Date() }
  );
  res.json({ message: "Results declared" });
}));

// Apply relative grading to all results for a subject
router.post("/apply-relative-grading", authorize("examcell", "admin", "ce"), asyncHandler(async (req, res) => {
  const { subjectId, academicYearId } = req.body;
  if (!subjectId || !academicYearId)
    return res.status(400).json({ message: "subjectId and academicYearId are required" });
  const outcome = await applyRelativeGrading(subjectId, academicYearId);
  res.json({ message: `Relative grading applied to ${outcome.updated} students`, ...outcome });
}));

// Analytics for a subject
router.get("/analytics/:subjectId", asyncHandler(async (req, res) => {
  const { academicYear } = req.query;
  const filter = { subject: req.params.subjectId, isDeclared: true };
  if (academicYear) filter.academicYear = academicYear;
  const results = await FinalResult.find(filter);
  const total = results.length;
  const pass = results.filter(r => r.isPassed).length;
  const marks = results.map(r => r.grandTotal);
  const avg = total > 0 ? marks.reduce((a, b) => a + b, 0) / total : 0;
  const gradeDistrib = results.reduce((acc, r) => {
    acc[r.grade] = (acc[r.grade] || 0) + 1;
    return acc;
  }, {});
  res.json({
    totalStudents: total, passCount: pass, failCount: total - pass,
    passPercentage: total > 0 ? Math.round(pass / total * 100) : 0,
    averageMarks: Math.round(avg * 100) / 100,
    highestMarks: Math.max(...marks, 0),
    lowestMarks: Math.min(...marks, 0),
    gradeDistribution: gradeDistrib,
  });
}));

export default router;
