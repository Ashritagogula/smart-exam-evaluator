import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import StudentNotification from "../models/StudentNotification.js";

const router = express.Router();
router.use(authenticate);

router.get("/student/:studentId", asyncHandler(async (req, res) => {
  const notifs = await StudentNotification.find({ student: req.params.studentId })
    .populate("subject", "courseCode title")
    .sort("-createdAt").limit(50);
  res.json(notifs);
}));

router.get("/unread-count/:studentId", asyncHandler(async (req, res) => {
  const count = await StudentNotification.countDocuments({ student: req.params.studentId, isRead: false });
  res.json({ count });
}));

router.put("/:id/read", asyncHandler(async (req, res) => {
  await StudentNotification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ message: "Marked as read" });
}));

router.put("/student/:studentId/read-all", asyncHandler(async (req, res) => {
  await StudentNotification.updateMany({ student: req.params.studentId }, { isRead: true });
  res.json({ message: "All notifications marked as read" });
}));

export default router;
