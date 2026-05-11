import mongoose from "mongoose";

const revaluationEvaluatorSchema = new mongoose.Schema({
  evaluator: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  assignedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  marksAwarded: { type: Number },
  questionWiseMarks: [
    {
      questionNumber: String,
      maxMarks: Number,
      marksAwarded: Number,
      feedback: String,
    }
  ],
  remarks: { type: String },
  isFrozen: { type: Boolean, default: false },
  frozenAt: { type: Date },
}, { _id: true });

const revaluationRequestSchema = new mongoose.Schema({
  booklet: { type: mongoose.Schema.Types.ObjectId, ref: "ExternalExamBooklet", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  examEvent: { type: mongoose.Schema.Types.ObjectId, ref: "ExamEvent", required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },

  requestedAt: { type: Date, default: Date.now },
  reason: { type: String },
  status: {
    type: String,
    enum: ["pending", "assigned", "in_progress", "completed", "rejected"],
    default: "pending",
  },

  // Original marks before revaluation
  originalMarks: { type: Number },
  originalGrade: { type: String },

  // Second evaluator (mandatory for revaluation)
  secondEvaluator: revaluationEvaluatorSchema,

  // Third evaluator assigned only when second differs significantly from original
  thirdEvaluator: revaluationEvaluatorSchema,

  // Final revaluation outcome
  finalMarks: { type: Number },
  finalGrade: { type: String },
  marksVariance: { type: Number },
  isUpgraded: { type: Boolean },

  // Approval chain
  approvedByDCE: { type: Boolean, default: false },
  approvedByDCEAt: { type: Date },
  dce: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },

  declaredAt: { type: Date },
  rejectionReason: { type: String },
}, { timestamps: true });

revaluationRequestSchema.index({ student: 1, subject: 1, examEvent: 1 });
revaluationRequestSchema.index({ status: 1 });

export default mongoose.model("RevaluationRequest", revaluationRequestSchema);
