import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Subject from "../models/Subject.js";

const router = express.Router();
router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const { department, semester, regulation } = req.query;
  const filter = { isActive: true };
  if (department) filter.department = department;
  if (semester) filter.semester = semester;
  if (regulation) filter.regulation = regulation;
  res.json(await Subject.find(filter)
    .populate("department", "name code")
    .populate("semester", "number name")
    .sort("courseCode"));
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id)
    .populate("department regulation semester");
  if (!subject) return res.status(404).json({ message: "Subject not found" });
  res.json(subject);
}));

router.post("/", authorize("admin"), asyncHandler(async (req, res) => {
  res.status(201).json(await Subject.create(req.body));
}));

router.put("/:id", authorize("admin"), asyncHandler(async (req, res) => {
  res.json(await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true }));
}));

export default router;
