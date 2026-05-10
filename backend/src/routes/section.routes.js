import express from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Section from "../models/Section.js";

const router = express.Router();
router.use(authenticate);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

const sectionCreateValidators = [
  body("name").trim().notEmpty().withMessage("Section name is required"),
  body("department").isMongoId().withMessage("department must be a valid ID"),
  body("semester").optional().isMongoId().withMessage("semester must be a valid ID"),
  body("academicYear").optional().isMongoId().withMessage("academicYear must be a valid ID"),
];

const addStudentValidators = [
  body("studentId").isMongoId().withMessage("studentId must be a valid MongoDB ID"),
];

router.get("/", asyncHandler(async (req, res) => {
  const { department, semester, academicYear } = req.query;
  const filter = { isActive: true };
  if (department) filter.department = department;
  if (semester) filter.semester = semester;
  if (academicYear) filter.academicYear = academicYear;
  res.json(await Section.find(filter)
    .populate("department", "name code")
    .populate("semester", "number name")
    .sort("name"));
}));

router.get("/:id/students", asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id)
    .populate("students", "rollNumber name email currentSemester section")
    .populate("semester", "number name");
  if (!section) return res.status(404).json({ message: "Section not found" });
  res.json(section.students);
}));

router.post("/", sectionCreateValidators, validate, asyncHandler(async (req, res) => {
  res.status(201).json(await Section.create(req.body));
}));

router.put("/:id", asyncHandler(async (req, res) => {
  res.json(await Section.findByIdAndUpdate(req.params.id, req.body, { new: true }));
}));

router.post("/:id/add-student", addStudentValidators, validate, asyncHandler(async (req, res) => {
  const { studentId } = req.body;
  const section = await Section.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { students: studentId } },
    { new: true }
  );
  res.json(section);
}));

export default router;
