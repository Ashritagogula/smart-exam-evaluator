import mongoose from "mongoose";

const questionMarkSchema = new mongoose.Schema({
  questionNumber: { type: String },
  subQuestion: { type: String },
  maxMarks: { type: Number },
  marksAwarded: { type: Number },
  status: { type: String, enum: ["correct", "partial", "wrong", "not_attempted"] },
  feedback: { type: String },
}, { _id: false });

const aiEvaluationSchema = new mongoose.Schema({
  booklet: { type: mongoose.Schema.Types.ObjectId, ref: "AnswerBooklet", required: true, unique: true },
  questionWiseMarks: [questionMarkSchema],
  totalMarks: { type: Number, required: true },
  maxMarks: { type: Number, required: true },
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  improvements: [{ type: String }],
  mistakes: [{ type: String }],
  suggestions: [{ type: String }],
  aiModel: { type: String, default: "gemini-2.5-flash" },
  processedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// booklet unique index already created by schema field

export default mongoose.model("AIEvaluation", aiEvaluationSchema);
