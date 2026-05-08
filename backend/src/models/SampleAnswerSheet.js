import mongoose from "mongoose";

const sampleAnswerSheetSchema = new mongoose.Schema({
  examEvent: { type: mongoose.Schema.Types.ObjectId, ref: "ExamEvent", required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  examType: { type: String, enum: ["IE1", "IE2", "SEE"], required: true },
}, { timestamps: true });

export default mongoose.model("SampleAnswerSheet", sampleAnswerSheetSchema);
