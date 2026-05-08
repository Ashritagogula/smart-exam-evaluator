import mongoose from "mongoose";

const academicYearSchema = new mongoose.Schema({
  year: { type: String, required: true }, // e.g. "2024-25"
  startDate: { type: Date },
  endDate: { type: Date },
  college: { type: mongoose.Schema.Types.ObjectId, ref: "College", required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

academicYearSchema.index({ year: 1, college: 1 }, { unique: true });

export default mongoose.model("AcademicYear", academicYearSchema);
