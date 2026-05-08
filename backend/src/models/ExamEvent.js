import mongoose from "mongoose";

const examEventSchema = new mongoose.Schema({
  type: { type: String, enum: ["internal", "external"], required: true },
  examType: { type: String, enum: ["IE1", "IE2", "SEE"], required: true },
  college: { type: mongoose.Schema.Types.ObjectId, ref: "College", required: true },
  regulation: { type: mongoose.Schema.Types.ObjectId, ref: "Regulation", required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: {
    type: String,
    enum: ["draft", "active", "evaluation_in_progress", "completed", "frozen"],
    default: "draft",
  },
  examDate: { type: Date },
  title: { type: String },
  description: { type: String },
}, { timestamps: true });

examEventSchema.index({ type: 1, department: 1, academicYear: 1, examType: 1 });
examEventSchema.index({ status: 1 });

export default mongoose.model("ExamEvent", examEventSchema);
