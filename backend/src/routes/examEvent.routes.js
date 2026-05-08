import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ExamEvent from "../models/ExamEvent.js";

const router = express.Router();
router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const { type, department, academicYear, semester, status } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (department) filter.department = department;
  if (academicYear) filter.academicYear = academicYear;
  if (semester) filter.semester = semester;
  if (status) filter.status = status;
  if (req.college) filter.college = req.college._id;
  res.json(await ExamEvent.find(filter)
    .populate("college", "name code")
    .populate("regulation", "code name")
    .populate("academicYear", "year")
    .populate("semester", "number name")
    .populate("department", "name code")
    .populate("subjects", "courseCode title")
    .sort("-createdAt"));
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const event = await ExamEvent.findById(req.params.id)
    .populate("college regulation academicYear semester department")
    .populate("subjects", "courseCode title type cieConfig seeConfig");
  if (!event) return res.status(404).json({ message: "Exam event not found" });
  res.json(event);
}));

router.post("/", authorize("admin", "examcell"), asyncHandler(async (req, res) => {
  const college = req.college?._id || req.body.college;
  const event = await ExamEvent.create({ ...req.body, college, createdBy: req.user._id });
  res.status(201).json(event);
}));

router.put("/:id", authorize("admin", "examcell"), asyncHandler(async (req, res) => {
  if (req.college) {
    const event = await ExamEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Exam event not found" });
    if (event.college.toString() !== req.college._id.toString())
      return res.status(403).json({ message: "Access denied to this exam event" });
  }
  res.json(await ExamEvent.findByIdAndUpdate(req.params.id, req.body, { new: true }));
}));

router.patch("/:id/status", authorize("admin", "examcell", "dce", "ce"), asyncHandler(async (req, res) => {
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
