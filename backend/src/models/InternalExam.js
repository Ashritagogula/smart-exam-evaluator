import mongoose from "mongoose";

const internalExamSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  examEvent: { type: mongoose.Schema.Types.ObjectId, ref: "ExamEvent", required: true },
  examType: { type: String, enum: ["IE1", "IE2"], required: true },
  booklet: { type: mongoose.Schema.Types.ObjectId, ref: "AnswerBooklet" },
  finalMarks: { type: Number, default: 0 },
  maxMarks: { type: Number, default: 50 },
  isAbsent: { type: Boolean, default: false },
}, { timestamps: true });

internalExamSchema.index({ student: 1, subject: 1, examType: 1 }, { unique: true });

export default mongoose.model("InternalExam", internalExamSchema);
