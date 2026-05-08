import mongoose from "mongoose";
import { EXTERNAL_BOOKLET_STATUS } from "../config/constants.js";

const externalExamBookletSchema = new mongoose.Schema({
  barcode: { type: String, required: true, unique: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  examEvent: { type: mongoose.Schema.Types.ObjectId, ref: "ExamEvent", required: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String },
  pageCount: { type: Number, default: 0 },
  bundle: { type: mongoose.Schema.Types.ObjectId, ref: "ExternalBundle" },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: {
    type: String,
    enum: Object.values(EXTERNAL_BOOKLET_STATUS),
    default: EXTERNAL_BOOKLET_STATUS.PENDING,
  },
  uploadDate: { type: Date, default: Date.now },
  version: { type: Number, default: 0 },
}, { timestamps: true });

externalExamBookletSchema.index({ bundle: 1 });
externalExamBookletSchema.index({ status: 1 });

export default mongoose.model("ExternalExamBooklet", externalExamBookletSchema);
