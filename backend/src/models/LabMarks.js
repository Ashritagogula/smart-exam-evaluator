import mongoose from "mongoose";

const labMarksSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true },
  internalLabMarks: { type: Number, default: 0 },
  internalLabMax: { type: Number, default: 25 },
  internalVivaMarks: { type: Number, default: 0 },
  internalVivaMax: { type: Number, default: 25 },
  externalLabMarks: { type: Number, default: 0 },
  externalLabMax: { type: Number, default: 25 },
  externalVivaMarks: { type: Number, default: 0 },
  externalVivaMax: { type: Number, default: 25 },
  totalLabMarks: { type: Number, default: 0 },
  totalMax: { type: Number, default: 100 },
  isSubmitted: { type: Boolean, default: false },
  submittedAt: { type: Date },
}, { timestamps: true });

labMarksSchema.index({ student: 1, subject: 1 }, { unique: true });

export default mongoose.model("LabMarks", labMarksSchema);
