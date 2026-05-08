import mongoose from "mongoose";
import { BOOKLET_STATUS } from "../config/constants.js";

const answerBookletSchema = new mongoose.Schema({
  barcode: { type: String, required: true, unique: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  examEvent: { type: mongoose.Schema.Types.ObjectId, ref: "ExamEvent", required: true },
  examType: { type: String, enum: ["IE1", "IE2"], required: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String },
  pageCount: { type: Number, default: 0 },
  assignedFaculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
  assignmentDate: { type: Date },
  status: {
    type: String,
    enum: Object.values(BOOKLET_STATUS),
    default: BOOKLET_STATUS.PENDING,
  },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  uploadDate: { type: Date, default: Date.now },
  version: { type: Number, default: 0 }, // optimistic locking
}, { timestamps: true });

answerBookletSchema.index({ student: 1, subject: 1, examType: 1 });
answerBookletSchema.index({ assignedFaculty: 1, status: 1 });

export default mongoose.model("AnswerBooklet", answerBookletSchema);
