import mongoose from "mongoose";

const mappingSchema = new mongoose.Schema({
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

mappingSchema.index({ faculty: 1, subject: 1, section: 1, academicYear: 1 }, { unique: true });

export default mongoose.model("FacultySubjectMapping", mappingSchema);
