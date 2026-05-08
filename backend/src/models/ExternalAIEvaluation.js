import mongoose from "mongoose";

const extQuestionMarkSchema = new mongoose.Schema({
  questionNumber: { type: String },
  subQuestion: { type: String },
  maxMarks: { type: Number },       // out of 100
  marksAwarded: { type: Number },   // out of 100
  scaledMarks: { type: Number },    // out of 50 (marksAwarded / 2)
  status: { type: String, enum: ["correct", "partial", "wrong", "not_attempted"] },
  feedback: { type: String },
}, { _id: false });

const externalAIEvaluationSchema = new mongoose.Schema({
  booklet: { type: mongoose.Schema.Types.ObjectId, ref: "ExternalExamBooklet", required: true, unique: true },
  questionWiseMarks: [extQuestionMarkSchema],
  totalMarks: { type: Number },      // out of 100
  scaledTotal: { type: Number },     // out of 50
  maxMarks: { type: Number, default: 100 },
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  improvements: [{ type: String }],
  mistakes: [{ type: String }],
  suggestions: [{ type: String }],
  aiModel: { type: String, default: "gemini-2.5-flash" },
  processedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// booklet unique index already created by schema field

export default mongoose.model("ExternalAIEvaluation", externalAIEvaluationSchema);
