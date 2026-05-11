import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import StudentNotification from "../models/StudentNotification.js";
import { subscribeStudent } from "../services/sse.service.js";

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

// Server-Sent Events stream — pushes notifications to the student in real time
router.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write("event: connected\ndata: {}\n\n");

  const studentId = req.user?.roleRef?.toString();
  if (!studentId) {
    res.end();
    return;
  }

  const unsubscribe = subscribeStudent(studentId, ({ event, data }) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  });

  // Keep-alive heartbeat so proxies don't close idle connections
  const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

export default router;
