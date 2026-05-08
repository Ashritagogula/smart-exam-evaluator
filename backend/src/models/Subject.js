import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
  courseCode: { type: String, required: true, uppercase: true },
  title: { type: String, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true },
  regulation: { type: mongoose.Schema.Types.ObjectId, ref: "Regulation", required: true },
  credits: {
    L: { type: Number, default: 0 },
    T: { type: Number, default: 0 },
    P: { type: Number, default: 0 },
  },
  type: {
    type: String,
    enum: ["Theory", "Lab", "Minor", "Employability", "Research", "Other"],
    default: "Theory",
  },
  cieConfig: {
    IE1Max:  { type: Number, default: 50 },
    IE2Max:  { type: Number, default: 50 },
    LAMax:   { type: Number, default: 10 },
    DDAMax:  { type: Number, default: 10 },
    LTMax:   { type: Number, default: 10 },
    TMMax:   { type: Number, default: 30 }, // CIE theory max
  },
  seeConfig: {
    TEMax:   { type: Number, default: 50 }, // scaled SEE theory
    PEMax:   { type: Number, default: 50 }, // practical
    TMMax:   { type: Number, default: 50 },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

subjectSchema.index({ courseCode: 1, regulation: 1 }, { unique: true });
subjectSchema.index({ department: 1, semester: 1 });

export default mongoose.model("Subject", subjectSchema);
