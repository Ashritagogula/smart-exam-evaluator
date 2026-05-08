import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Department from "../models/Department.js";

const router = express.Router();
router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const { college } = req.query;
  const filter = { isActive: true };
  if (college) filter.college = college;
  res.json(await Department.find(filter).populate("college", "name code").populate("hod", "name employeeId").sort("name"));
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const dept = await Department.findById(req.params.id).populate("college", "name code").populate("hod", "name");
  if (!dept) return res.status(404).json({ message: "Department not found" });
  res.json(dept);
}));

router.post("/", authorize("admin"), asyncHandler(async (req, res) => {
  res.status(201).json(await Department.create(req.body));
}));

router.put("/:id", authorize("admin", "hod"), asyncHandler(async (req, res) => {
  res.json(await Department.findByIdAndUpdate(req.params.id, req.body, { new: true }));
}));

export default router;
