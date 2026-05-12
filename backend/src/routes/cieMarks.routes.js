import express from "express";
import { body, param, validationResult } from "express-validator";
import { authenticate } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import CIEMarks from "../models/CIEMarks.js";
import { computeCIETheory } from "../services/marks.service.js";

const router = express.Router();
router.use(authenticate);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
};

router.get("/", asyncHandler(async (req, res) => {
  const { student, subject, academicYear } = req.query;
  const filter = {};
  if (student) filter.student = student;
  if (subject) filter.subject = subject;
  if (academicYear) filter.academicYear = academicYear;
  res.json(await CIEMarks.find(filter)
    .populate("student", "rollNumber name")
    .populate("subject", "courseCode title"));
}));

router.get("/student/:studentId/subject/:subjectId", asyncHandler(async (req, res) => {
  const cie = await CIEMarks.findOne({
    student: req.params.studentId,
    subject: req.params.subjectId,
  }).populate("subject", "courseCode title cieConfig");
  if (!cie) return res.status(404).json({ message: "CIE marks not found" });
  res.json(cie);
}));

// Manual update of LA/DDA/LT marks
router.put(
  "/student/:studentId/subject/:subjectId",
  param("studentId").isMongoId().withMessage("Invalid studentId"),
  param("subjectId").isMongoId().withMessage("Invalid subjectId"),
  body("LA.marks").optional().isFloat({ min: 0 }).withMessage("LA.marks must be >= 0"),
  body("DDA.marks").optional().isFloat({ min: 0 }).withMessage("DDA.marks must be >= 0"),
  body("LT.marks").optional().isFloat({ min: 0 }).withMessage("LT.marks must be >= 0"),
  validate,
  asyncHandler(async (req, res) => {
    const { LA, DDA, LT } = req.body;
    const cie = await CIEMarks.findOneAndUpdate(
      { student: req.params.studentId, subject: req.params.subjectId },
      { $set: { LA, DDA, LT } },
      { upsert: true, new: true }
    );
    const cieTheory = computeCIETheory(cie.IE1.marks, cie.IE2.marks);
    const totalCIE = cieTheory + (LA?.marks || 0) + (DDA?.marks || 0) + (LT?.marks || 0);
    await CIEMarks.findByIdAndUpdate(cie._id, { cieTheory, totalCIE });
    res.json({ ...cie.toObject(), cieTheory, totalCIE });
  })
);

// Compute CIE for all students in an exam event's subject
router.post(
  "/compute",
  body("subjectId").isMongoId().withMessage("subjectId must be a valid Mongo ObjectId"),
  validate,
  asyncHandler(async (req, res) => {
    const { subjectId } = req.body;
    const all = await CIEMarks.find({ subject: subjectId });
    const updates = [];
    for (const cie of all) {
      const cieTheory = computeCIETheory(cie.IE1.marks, cie.IE2.marks);
      const totalCIE = cieTheory + (cie.LA?.marks || 0) + (cie.DDA?.marks || 0) + (cie.LT?.marks || 0);
      updates.push(CIEMarks.findByIdAndUpdate(cie._id, { cieTheory, totalCIE }));
    }
    await Promise.all(updates);
    res.json({ message: `Computed CIE for ${all.length} students` });
  })
);

export default router;
