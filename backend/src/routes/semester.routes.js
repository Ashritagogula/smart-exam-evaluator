import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Semester from "../models/Semester.js";

const router = express.Router();
router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const { regulation, academicYear } = req.query;
  const filter = { isActive: true };
  if (regulation) filter.regulation = regulation;
  if (academicYear) filter.academicYear = academicYear;
  res.json(await Semester.find(filter).populate("regulation", "code name").sort("number"));
}));

router.post("/", authorize("admin"), asyncHandler(async (req, res) => {
  res.status(201).json(await Semester.create(req.body));
}));

export default router;
