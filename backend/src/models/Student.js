import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: "Section" },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear" },
  regulation: { type: mongoose.Schema.Types.ObjectId, ref: "Regulation" },
  currentSemester: { type: Number, default: 1, min: 1, max: 8 },
  enrolledSubjects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

studentSchema.index({ department: 1, section: 1 });

export default mongoose.model("Student", studentSchema);
