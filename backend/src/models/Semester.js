import mongoose from "mongoose";

const semesterSchema = new mongoose.Schema({
  number: { type: Number, required: true, min: 1, max: 8 },
  name: { type: String }, // e.g. "Semester I"
  regulation: { type: mongoose.Schema.Types.ObjectId, ref: "Regulation", required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },
  startDate: { type: Date },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

semesterSchema.index({ number: 1, regulation: 1, academicYear: 1 }, { unique: true });

export default mongoose.model("Semester", semesterSchema);
