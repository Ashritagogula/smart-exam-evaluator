import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true }, // "A", "B", etc.
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester" },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  capacity: { type: Number, default: 60 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

sectionSchema.index({ name: 1, department: 1 }, { unique: true });

export default mongoose.model("Section", sectionSchema);
