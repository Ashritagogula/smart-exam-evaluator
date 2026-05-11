import mongoose from "mongoose";

const finalResultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true },
  regulation: { type: mongoose.Schema.Types.ObjectId, ref: "Regulation", required: true },
  cieMarks: { type: mongoose.Schema.Types.ObjectId, ref: "CIEMarks" },
  labMarks: { type: mongoose.Schema.Types.ObjectId, ref: "LabMarks" },
  seeTheoryMarks: { type: Number, default: 0 },   // raw (out of 100)
  seeScaledMarks: { type: Number, default: 0 },   // scaled (out of 50)
  totalCIE: { type: Number, default: 0 },
  totalSEE: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  grade: { type: String, enum: ["O", "A+", "A", "B+", "B", "C", "D", "F", "AB"], default: "F" },
  gradePoints: { type: Number, default: 0 },
  isPassed: { type: Boolean, default: false },
  isAbsent: { type: Boolean, default: false },
  isDeclared: { type: Boolean, default: false },
  declaredAt: { type: Date },
  relativeGradingApplied: { type: Boolean, default: false },
  classMean:   { type: Number },
  classStdDev: { type: Number },
  blockchainTxHash:      { type: String },
  blockchainNotarizedAt: { type: Date },
  erpSyncedAt:           { type: Date },
}, { timestamps: true });

finalResultSchema.index({ student: 1, subject: 1 }, { unique: true });
finalResultSchema.index({ student: 1, academicYear: 1, semester: 1 });

// Grade calculation helper
finalResultSchema.methods.calculateGrade = function (total, max = 100) {
  const pct = (total / max) * 100;
  if (pct >= 90) return { grade: "O",  gp: 10 };
  if (pct >= 80) return { grade: "A+", gp: 9  };
  if (pct >= 70) return { grade: "A",  gp: 8  };
  if (pct >= 60) return { grade: "B+", gp: 7  };
  if (pct >= 55) return { grade: "B",  gp: 6  };
  if (pct >= 50) return { grade: "C",  gp: 5  };
  if (pct >= 45) return { grade: "D",  gp: 4  };
  return            { grade: "F",  gp: 0  };
};

export default mongoose.model("FinalResult", finalResultSchema);
