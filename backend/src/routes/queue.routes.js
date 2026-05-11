import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { getJobStatus, isQueueEnabled, bookletQueue, bundleQueue } from "../services/queue.service.js";

const router = Router();

router.get("/status", authenticate, authorize("admin", "exam_cell"), async (req, res) => {
  if (!isQueueEnabled) {
    return res.json({ enabled: false, message: "Queue not configured — REDIS_URL not set" });
  }
  const [bookletCounts, bundleCounts] = await Promise.all([
    bookletQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
    bundleQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
  ]);
  res.json({
    enabled: true,
    queues: {
      bookletEvaluation: bookletCounts,
      bundleEvaluation: bundleCounts,
    },
  });
});

router.get("/job/:type/:id", authenticate, async (req, res) => {
  const { type, id } = req.params;
  if (!["booklet", "bundle"].includes(type)) {
    return res.status(400).json({ message: "type must be booklet or bundle" });
  }
  const status = await getJobStatus(type, id);
  if (!status) return res.status(404).json({ message: "Job not found" });
  res.json(status);
});

export default router;
