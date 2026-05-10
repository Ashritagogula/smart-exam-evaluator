import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  action:      { type: String, required: true },
  entity:      { type: String, required: true },
  entityId:    { type: mongoose.Schema.Types.ObjectId },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  role:        { type: String },
  details:     { type: mongoose.Schema.Types.Mixed },
  ipAddress:   { type: String },
  timestamp:   { type: Date, default: Date.now },
});

auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ timestamp: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
