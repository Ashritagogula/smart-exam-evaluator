import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Student from "../models/Student.js";
import FinalResult from "../models/FinalResult.js";
import StudentNotification from "../models/StudentNotification.js";

const router = express.Router();
router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const { department, section, academicYear, search } = req.query;
  const filter = { isActive: true };
  if (department) filter.department = department;
  if (section) filter.section = section;
  if (academicYear) filter.academicYear = academicYear;
  if (search) filter.$or = [
    { rollNumber: { $regex: search, $options: "i" } },
    { name: { $regex: search, $options: "i" } },
    { email: { $regex: search, $options: "i" } },
  ];
  const students = await Student.find(filter)
    .populate("department", "name code")
    .populate("section", "name")
    .sort("rollNumber")
    .limit(100);
  res.json(students);
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate("department section academicYear regulation");
  if (!student) return res.status(404).json({ message: "Student not found" });
  res.json(student);
}));

router.get("/:id/results", asyncHandler(async (req, res) => {
  const results = await FinalResult.find({ student: req.params.id, isDeclared: true })
    .populate("subject", "courseCode title")
    .populate("academicYear", "year")
    .populate("semester", "number name")
    .sort("-createdAt");
  res.json(results);
}));

router.get("/:id/notifications", asyncHandler(async (req, res) => {
  const notifs = await StudentNotification.find({ student: req.params.id })
    .populate("subject", "courseCode title")
    .sort("-createdAt").limit(50);
  res.json(notifs);
}));

router.put("/:id/notifications/read", asyncHandler(async (req, res) => {
  await StudentNotification.updateMany({ student: req.params.id }, { isRead: true });
  res.json({ message: "All notifications marked as read" });
}));

router.post("/", authorize("admin", "examcell"), asyncHandler(async (req, res) => {
  res.status(201).json(await Student.create(req.body));
}));

router.put("/:id", asyncHandler(async (req, res) => {
  res.json(await Student.findByIdAndUpdate(req.params.id, req.body, { new: true }));
}));

export default router;
