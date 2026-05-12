import express from "express";
import { body, param, validationResult } from "express-validator";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import LabMarks from "../models/LabMarks.js";

const router = express.Router();
router.use(authenticate);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
};

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

router.post(
  "/",
  authorize("faculty", "subject_coordinator", "hod"),
  body("studentId").isMongoId().withMessage("studentId must be a valid Mongo ObjectId"),
  body("subjectId").isMongoId().withMessage("subjectId must be a valid Mongo ObjectId"),
  body("internalLabMarks").optional().isFloat({ min: 0 }).withMessage("internalLabMarks must be >= 0"),
  body("internalVivaMarks").optional().isFloat({ min: 0 }).withMessage("internalVivaMarks must be >= 0"),
  body("externalLabMarks").optional().isFloat({ min: 0 }).withMessage("externalLabMarks must be >= 0"),
  body("externalVivaMarks").optional().isFloat({ min: 0 }).withMessage("externalVivaMarks must be >= 0"),
  validate,
  asyncHandler(async (req, res) => {
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
  })
);

router.post(
  "/bulk",
  authorize("faculty", "subject_coordinator", "hod"),
  body("entries").isArray({ min: 1 }).withMessage("entries must be a non-empty array"),
  body("entries.*.studentId").isMongoId().withMessage("Each entry.studentId must be a valid Mongo ObjectId"),
  body("entries.*.subjectId").isMongoId().withMessage("Each entry.subjectId must be a valid Mongo ObjectId"),
  validate,
  asyncHandler(async (req, res) => {
    const { entries } = req.body;
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
  })
);

router.patch(
  "/:id/submit",
  authorize("faculty", "subject_coordinator", "hod"),
  param("id").isMongoId().withMessage("Invalid lab marks id"),
  validate,
  asyncHandler(async (req, res) => {
    const lm = await LabMarks.findByIdAndUpdate(req.params.id, {
      isSubmitted: true, submittedAt: new Date(),
    }, { new: true });
    if (!lm) return res.status(404).json({ message: "Lab marks not found" });
    res.json(lm);
  })
);

export default router;
