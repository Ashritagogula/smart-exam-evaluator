import mongoose from "mongoose";

const cieMarksSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true },
  IE1: {
    marks: { type: Number, default: 0 },
    maxMarks: { type: Number, default: 50 },
  },
  IE2: {
    marks: { type: Number, default: 0 },
    maxMarks: { type: Number, default: 50 },
  },
  // CIE Theory = 80% of higher + 20% of lower, out of 30 (scaled from 50)
  cieTheory: { type: Number, default: 0 },
  LA: { marks: { type: Number, default: 0 }, maxMarks: { type: Number, default: 10 } },
  DDA: { marks: { type: Number, default: 0 }, maxMarks: { type: Number, default: 10 } },
  LT: { marks: { type: Number, default: 0 }, maxMarks: { type: Number, default: 10 } },
  totalCIE: { type: Number, default: 0 },
  isFinal: { type: Boolean, default: false },
}, { timestamps: true });

cieMarksSchema.index({ student: 1, subject: 1 }, { unique: true });

// Calculate CIE theory: 80% of higher + 20% of lower, scaled to 30 from 50
cieMarksSchema.methods.calculateCIETheory = function () {
  const ie1 = this.IE1.marks || 0;
  const ie2 = this.IE2.marks || 0;
  const higher = Math.max(ie1, ie2);
  const lower = Math.min(ie1, ie2);
  const raw = 0.8 * higher + 0.2 * lower; // out of 50
  return Math.round((raw / 50) * 30 * 100) / 100; // scale to 30
};

export default mongoose.model("CIEMarks", cieMarksSchema);
