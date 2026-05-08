import mongoose from "mongoose";

const extModifiedQSchema = new mongoose.Schema({
  questionNumber: { type: String },
  originalMarks: { type: Number },
  modifiedMarks: { type: Number },
  reason: { type: String },
  modifiedAt: { type: Date, default: Date.now },
}, { _id: false });

const externalExaminerEvaluationSchema = new mongoose.Schema({
  booklet: { type: mongoose.Schema.Types.ObjectId, ref: "ExternalExamBooklet", required: true, unique: true },
  examiner: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  aiEvaluation: { type: mongoose.Schema.Types.ObjectId, ref: "ExternalAIEvaluation" },
  modifiedQuestions: [extModifiedQSchema],
  finalMarks: { type: Number },      // out of 100
  scaledFinalMarks: { type: Number },// out of 50
  isFrozen: { type: Boolean, default: false },
  frozenAt: { type: Date },
  version: { type: Number, default: 0 },
}, { timestamps: true });

externalExaminerEvaluationSchema.index({ examiner: 1 });

export default mongoose.model("ExternalExaminerEvaluation", externalExaminerEvaluationSchema);
