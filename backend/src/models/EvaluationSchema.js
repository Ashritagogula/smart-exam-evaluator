import mongoose from "mongoose";

const questionEntrySchema = new mongoose.Schema({
  questionNumber: { type: String, required: true }, // "1", "2a", "2b"
  subQuestion: { type: String },
  maxMarks: { type: Number, required: true },
  description: { type: String },
  isOptional: { type: Boolean, default: false },
}, { _id: false });

const evaluationSchemaModel = new mongoose.Schema({
  examEvent: { type: mongoose.Schema.Types.ObjectId, ref: "ExamEvent", required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  questions: [questionEntrySchema],
  totalMarks: { type: Number, required: true },
  examType: { type: String, enum: ["IE1", "IE2", "SEE"], required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

evaluationSchemaModel.index({ examEvent: 1, subject: 1 }, { unique: true });

export default mongoose.model("EvaluationSchema", evaluationSchemaModel);
