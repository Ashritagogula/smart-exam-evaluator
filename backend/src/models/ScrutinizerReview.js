import mongoose from "mongoose";

const questionCheckSchema = new mongoose.Schema({
  questionNumber: { type: String },
  isMarked: { type: Boolean },
  hasIssue: { type: Boolean, default: false },
  issueDescription: { type: String },
}, { _id: false });

const scrutinizerReviewSchema = new mongoose.Schema({
  booklet: { type: mongoose.Schema.Types.ObjectId, ref: "ExternalExamBooklet", required: true },
  scrutinizer: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  questionChecks: [questionCheckSchema],
  isApproved: { type: Boolean, default: false },
  hasIssues: { type: Boolean, default: false },
  issuesSummary: { type: String },
  unfreezeTriggered: { type: Boolean, default: false },
  unfreezeNotifiedExaminer: { type: Boolean, default: false },
  reviewedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
}, { timestamps: true });

scrutinizerReviewSchema.index({ booklet: 1 });
scrutinizerReviewSchema.index({ scrutinizer: 1, isApproved: 1 });

export default mongoose.model("ScrutinizerReview", scrutinizerReviewSchema);
