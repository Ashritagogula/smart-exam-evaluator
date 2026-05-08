import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Regulation from "../models/Regulation.js";

const router = express.Router();
router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const { college } = req.query;
  const filter = { isActive: true };
  if (college) filter.college = college;
  res.json(await Regulation.find(filter).populate("college", "name code").sort("-year"));
}));

router.post("/", authorize("admin"), asyncHandler(async (req, res) => {
  const reg = await Regulation.create(req.body);
  res.status(201).json(reg);
}));

router.put("/:id", authorize("admin"), asyncHandler(async (req, res) => {
  res.json(await Regulation.findByIdAndUpdate(req.params.id, req.body, { new: true }));
}));

export default router;
