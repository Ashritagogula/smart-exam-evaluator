import express from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ExamEvent from "../models/ExamEvent.js";

const router = express.Router();
router.use(authenticate);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

const VALID_EXAM_TYPES = ["IE1", "IE2", "SEE", "Mid-1", "Mid-2", "End-Sem", "Supplementary", "Lab Exam"];
const VALID_STATUSES   = ["upcoming", "active", "completed", "cancelled"];

const createValidators = [
  body("type").isIn(["internal", "external"]).withMessage("type must be 'internal' or 'external'"),
  body("examType").isIn(VALID_EXAM_TYPES).withMessage(`examType must be one of: ${VALID_EXAM_TYPES.join(", ")}`),
  body("college").optional().isMongoId().withMessage("college must be a valid ID"),
  body("department").optional().isMongoId().withMessage("department must be a valid ID"),
  body("semester").optional().isMongoId().withMessage("semester must be a valid ID"),
  body("maxMarks").optional().isInt({ min: 1, max: 200 }).withMessage("maxMarks must be 1–200"),
  body("duration").optional().isInt({ min: 1, max: 480 }).withMessage("duration must be 1–480 minutes"),
];

const statusValidator = [
  body("status").isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(", ")}`),
];

router.get("/", asyncHandler(async (req, res) => {
  const { type, department, academicYear, semester, status, assignedTo } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (department) filter.department = department;
  if (academicYear) filter.academicYear = academicYear;
  if (semester) filter.semester = semester;
  if (status) filter.status = status;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (req.college) filter.college = req.college._id;
  res.json(await ExamEvent.find(filter)
    .populate("college", "name code")
    .populate("regulation", "code name")
    .populate("academicYear", "year")
    .populate("semester", "number name")
    .populate("department", "name code")
    .populate("subjects", "courseCode title")
    .populate("assignedTo", "name employeeId primaryRole")
    .sort("-createdAt"));
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const event = await ExamEvent.findById(req.params.id)
    .populate("college regulation academicYear semester department")
    .populate("subjects", "courseCode title type cieConfig seeConfig")
    .populate("assignedTo", "name employeeId primaryRole");
  if (!event) return res.status(404).json({ message: "Exam event not found" });
  res.json(event);
}));

router.post("/", authorize("admin", "examcell"), createValidators, validate, asyncHandler(async (req, res) => {
  const college = req.college?._id || req.body.college;
  const event = await ExamEvent.create({ ...req.body, college, createdBy: req.user._id });
  res.status(201).json(event);
}));

router.put("/:id", authorize("admin", "examcell"), createValidators, validate, asyncHandler(async (req, res) => {
  if (req.college) {
    const event = await ExamEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Exam event not found" });
    if (event.college.toString() !== req.college._id.toString())
      return res.status(403).json({ message: "Access denied to this exam event" });
  }
  res.json(await ExamEvent.findByIdAndUpdate(req.params.id, req.body, { new: true }));
}));

router.patch("/:id/status", authorize("admin", "examcell", "dce", "ce"), statusValidator, validate, asyncHandler(async (req, res) => {
  if (req.college) {
    const event = await ExamEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Exam event not found" });
    if (event.college.toString() !== req.college._id.toString())
      return res.status(403).json({ message: "Access denied to this exam event" });
  }
  const { status } = req.body;
  res.json(await ExamEvent.findByIdAndUpdate(req.params.id, { status }, { new: true }));
}));

export default router;
