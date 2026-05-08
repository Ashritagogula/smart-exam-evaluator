import mongoose from "mongoose";

const commLogSchema = new mongoose.Schema({
  message: { type: String },
  sentTo: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
  sentAt: { type: Date, default: Date.now },
}, { _id: false });

const dceReviewSchema = new mongoose.Schema({
  examEvent: { type: mongoose.Schema.Types.ObjectId, ref: "ExamEvent", required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  dce: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  sampledBooklets: [{ type: mongoose.Schema.Types.ObjectId, ref: "ExternalExamBooklet" }],
  reviewNotes: { type: String },
  hasCorrections: { type: Boolean, default: false },
  correctionDetails: { type: String },
  communicationLog: [commLogSchema],
  isApproved: { type: Boolean, default: false },
  approvedAt: { type: Date },
  statisticsSentToCE: { type: Boolean, default: false },
  statisticsSentAt: { type: Date },
}, { timestamps: true });

dceReviewSchema.index({ examEvent: 1, subject: 1 });

export default mongoose.model("DCEReview", dceReviewSchema);
