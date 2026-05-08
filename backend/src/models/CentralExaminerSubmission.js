import mongoose from "mongoose";

const centralExaminerSubmissionSchema = new mongoose.Schema({
  examEvent: { type: mongoose.Schema.Types.ObjectId, ref: "ExamEvent", required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true }, // DCE
  statistics: {
    totalStudents: { type: Number },
    passCount: { type: Number },
    failCount: { type: Number },
    absentCount: { type: Number },
    averageMarks: { type: Number },
    highestMarks: { type: Number },
    lowestMarks: { type: Number },
    gradeDistribution: {
      O: { type: Number, default: 0 },  // 90-100
      A: { type: Number, default: 0 },  // 80-89
      B: { type: Number, default: 0 },  // 70-79
      C: { type: Number, default: 0 },  // 60-69
      D: { type: Number, default: 0 },  // 50-59
      F: { type: Number, default: 0 },  // <50
    },
  },
  resultsDeclared: { type: Boolean, default: false },
  declaredAt: { type: Date },
  declaredBy: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" }, // CE
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

centralExaminerSubmissionSchema.index({ examEvent: 1, subject: 1 });

export default mongoose.model("CentralExaminerSubmission", centralExaminerSubmissionSchema);
