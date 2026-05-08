import mongoose from "mongoose";

const modifiedQuestionSchema = new mongoose.Schema({
  questionNumber: { type: String },
  subQuestion: { type: String },
  originalMarks: { type: Number },
  modifiedMarks: { type: Number },
  reason: { type: String },
  modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
  modifiedAt: { type: Date, default: Date.now },
}, { _id: false });

const facultyEvaluationSchema = new mongoose.Schema({
  booklet: { type: mongoose.Schema.Types.ObjectId, ref: "AnswerBooklet", required: true, unique: true },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  aiEvaluation: { type: mongoose.Schema.Types.ObjectId, ref: "AIEvaluation" },
  modifiedQuestions: [modifiedQuestionSchema],
  finalMarks: { type: Number },
  isFrozen: { type: Boolean, default: false },
  frozenAt: { type: Date },
  frozenBy: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
  isPermanentlyFrozen: { type: Boolean, default: false },
  permanentFreezeAt: { type: Date },
  reviewWindowExpiresAt: { type: Date }, // frozenAt + 48h
  version: { type: Number, default: 0 }, // optimistic locking
}, { timestamps: true });

facultyEvaluationSchema.index({ faculty: 1, isFrozen: 1 });
facultyEvaluationSchema.index({ reviewWindowExpiresAt: 1 }); // for cron job

export default mongoose.model("FacultyEvaluation", facultyEvaluationSchema);
