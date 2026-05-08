import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import AcademicYear from "../models/AcademicYear.js";

const router = express.Router();
router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const { college } = req.query;
  const filter = { isActive: true };
  if (college) filter.college = college;
  res.json(await AcademicYear.find(filter).populate("college", "name code").sort("-year"));
}));

router.post("/", authorize("admin", "examcell"), asyncHandler(async (req, res) => {
  res.status(201).json(await AcademicYear.create(req.body));
}));

export default router;
