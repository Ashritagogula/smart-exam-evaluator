import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import College from "../models/College.js";

const router = express.Router();
router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const colleges = await College.find({ isActive: true })
    .populate("vc", "name email")
    .populate("chairman", "name email")
    .populate("principal", "name email")
    .populate("examCellAdmin", "name email")
    .populate("ce", "name email")
    .sort("name");
  res.json(colleges);
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const college = await College.findById(req.params.id)
    .populate("vc", "name email")
    .populate("chairman", "name email")
    .populate("principal", "name email")
    .populate("examCellAdmin", "name email")
    .populate("ce", "name email");
  if (!college) return res.status(404).json({ message: "College not found" });
  res.json(college);
}));

router.post("/", authorize("admin"), asyncHandler(async (req, res) => {
  const college = await College.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(college);
}));

router.put("/:id", authorize("admin"), asyncHandler(async (req, res) => {
  const college = await College.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(college);
}));

router.delete("/:id", authorize("admin"), asyncHandler(async (req, res) => {
  await College.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ message: "College deactivated" });
}));

export default router;
