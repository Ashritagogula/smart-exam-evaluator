import mongoose from "mongoose";
import { BUNDLE_STATUS } from "../config/constants.js";

const externalBundleSchema = new mongoose.Schema({
  examEvent: { type: mongoose.Schema.Types.ObjectId, ref: "ExamEvent", required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  examiner: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  booklets: [{ type: mongoose.Schema.Types.ObjectId, ref: "ExternalExamBooklet" }],
  bundleNumber: { type: Number, required: true },
  totalBooklets: { type: Number, default: 0 },
  status: {
    type: String,
    enum: Object.values(BUNDLE_STATUS),
    default: BUNDLE_STATUS.PENDING,
  },
  assignedAt: { type: Date, default: Date.now },
  frozenAt: { type: Date },
  scrutinizedAt: { type: Date },
  dceApprovedAt: { type: Date },
}, { timestamps: true });

externalBundleSchema.index({ examEvent: 1, subject: 1 });
externalBundleSchema.index({ examiner: 1, status: 1 });

export default mongoose.model("ExternalBundle", externalBundleSchema);
