import mongoose from "mongoose";

const questionPaperSchema = new mongoose.Schema({
  examEvent: { type: mongoose.Schema.Types.ObjectId, ref: "ExamEvent", required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number },
  examType: { type: String, enum: ["IE1", "IE2", "SEE"], required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

questionPaperSchema.index({ examEvent: 1, subject: 1 });

export default mongoose.model("QuestionPaper", questionPaperSchema);
