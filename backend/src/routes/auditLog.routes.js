import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import AuditLog from "../models/AuditLog.js";

const router = express.Router();
router.use(authenticate);

router.get("/", authorize("admin", "examcell", "dce", "ce"), asyncHandler(async (req, res) => {
  const { entity, entityId, performedBy, action, from, to, limit = 50, skip = 0 } = req.query;
  const filter = {};
  if (entity) filter.entity = entity;
  if (entityId) filter.entityId = entityId;
  if (performedBy) filter.performedBy = performedBy;
  if (action) filter.action = new RegExp(action, "i");
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to)   filter.timestamp.$lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("performedBy", "name email role")
      .sort({ timestamp: -1 })
      .skip(Number(skip))
      .limit(Number(limit)),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ total, logs });
}));

export default router;
