import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import LabMarks from "../models/LabMarks.js";

const router = express.Router();
router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const { subject, faculty, academicYear } = req.query;
  const filter = {};
  if (subject) filter.subject = subject;
  if (faculty) filter.faculty = faculty;
  if (academicYear) filter.academicYear = academicYear;
  res.json(await LabMarks.find(filter)
    .populate("student", "rollNumber name")
    .populate("subject", "courseCode title")
    .sort("student"));
}));

router.get("/student/:studentId/subject/:subjectId", asyncHandler(async (req, res) => {
  const lm = await LabMarks.findOne({
    student: req.params.studentId,
    subject: req.params.subjectId,
  });
  if (!lm) return res.status(404).json({ message: "Lab marks not found" });
  res.json(lm);
}));

router.post("/", authorize("faculty", "subject_coordinator", "hod"), asyncHandler(async (req, res) => {
  const { studentId, subjectId, facultyId, academicYearId, semesterId, ...marks } = req.body;
  const total = (marks.internalLabMarks || 0) + (marks.internalVivaMarks || 0) +
    (marks.externalLabMarks || 0) + (marks.externalVivaMarks || 0);
  const lm = await LabMarks.findOneAndUpdate(
    { student: studentId, subject: subjectId },
    {
      student: studentId, subject: subjectId,
      faculty: facultyId || req.user.roleRef,
      academicYear: academicYearId, semester: semesterId,
      ...marks, totalLabMarks: total,
    },
    { upsert: true, new: true }
  );
  res.status(201).json(lm);
}));

// Bulk entry for a subject
router.post("/bulk", authorize("faculty", "subject_coordinator", "hod"), asyncHandler(async (req, res) => {
  const { entries } = req.body; // array of { studentId, subjectId, ...marks }
  const results = [];
  for (const entry of entries) {
    const total = (entry.internalLabMarks || 0) + (entry.internalVivaMarks || 0) +
      (entry.externalLabMarks || 0) + (entry.externalVivaMarks || 0);
    const lm = await LabMarks.findOneAndUpdate(
      { student: entry.studentId, subject: entry.subjectId },
      { ...entry, student: entry.studentId, subject: entry.subjectId, totalLabMarks: total },
      { upsert: true, new: true }
    );
    results.push(lm);
  }
  res.status(201).json({ message: `${results.length} lab marks saved`, results });
}));

// Submit/freeze lab marks
router.patch("/:id/submit", authorize("faculty", "subject_coordinator", "hod"), asyncHandler(async (req, res) => {
  const lm = await LabMarks.findByIdAndUpdate(req.params.id, {
    isSubmitted: true, submittedAt: new Date(),
  }, { new: true });
  res.json(lm);
}));

export default router;
