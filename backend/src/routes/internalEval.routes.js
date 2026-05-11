import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import AnswerBooklet from "../models/AnswerBooklet.js";
import AIEvaluation from "../models/AIEvaluation.js";
import FacultyEvaluation from "../models/FacultyEvaluation.js";
import {
  aiEvaluateBooklet,
  modifyMarks,
  freezeBooklet,
  unfreezeBooklet,
} from "../controllers/internalEval.controller.js";

const router = express.Router();
router.use(authenticate);

router.get("/booklet/:bookletId/ai-eval", asyncHandler(async (req, res) => {
  const ai = await AIEvaluation.findOne({ booklet: req.params.bookletId });
  if (!ai) return res.status(404).json({ message: "AI evaluation not found" });
  res.json(ai);
}));

router.get("/booklet/:bookletId/faculty-eval", asyncHandler(async (req, res) => {
  const fe = await FacultyEvaluation.findOne({ booklet: req.params.bookletId })
    .populate("faculty", "name employeeId")
    .populate("aiEvaluation");
  res.json(fe);
}));

router.get("/faculty/:facultyId/booklets", asyncHandler(async (req, res) => {
  const { status, subject } = req.query;
  const filter = { assignedFaculty: req.params.facultyId };
  if (status) filter.status = status;
  if (subject) filter.subject = subject;
  const booklets = await AnswerBooklet.find(filter)
    .populate("student", "rollNumber name")
    .populate("subject", "courseCode title")
    .populate("examEvent", "examType title");

  const result = await Promise.all(booklets.map(async (b) => {
    const ai = await AIEvaluation.findOne({ booklet: b._id }).lean();
    const fe = await FacultyEvaluation.findOne({ booklet: b._id }).lean();
    return { ...b.toObject(), aiEvaluation: ai, facultyEvaluation: fe };
  }));
  res.json(result);
}));

router.post("/booklet/:bookletId/ai-evaluate", asyncHandler(aiEvaluateBooklet));

router.put("/booklet/:bookletId/marks",
  authorize("faculty", "subject_coordinator", "hod"),
  asyncHandler(modifyMarks)
);

router.post("/booklet/:bookletId/freeze",
  authorize("faculty", "subject_coordinator", "hod"),
  asyncHandler(freezeBooklet)
);

router.post("/booklet/:bookletId/unfreeze",
  authorize("faculty", "subject_coordinator", "hod"),
  asyncHandler(unfreezeBooklet)
);

export default router;
