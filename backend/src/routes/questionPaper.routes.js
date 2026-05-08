import express from "express";
import path from "path";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { uploadSinglePDF } from "../middleware/upload.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import QuestionPaper from "../models/QuestionPaper.js";
import Faculty from "../models/Faculty.js";

const router = express.Router();
router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const { examEvent, subject } = req.query;
  const filter = { isActive: true };
  if (examEvent) filter.examEvent = examEvent;
  if (subject) filter.subject = subject;
  res.json(await QuestionPaper.find(filter)
    .populate("subject", "courseCode title")
    .populate("uploadedBy", "name employeeId")
    .sort("-createdAt"));
}));

const uploadMiddleware = uploadSinglePDF("question_papers");

router.post("/upload", authorize("subject_coordinator", "faculty", "examcell"), (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  let uploadedBy = req.body.facultyId;
  if (!uploadedBy && req.user.roleRef) uploadedBy = req.user.roleRef;

  const qp = await QuestionPaper.create({
    examEvent: req.body.examEventId,
    subject: req.body.subjectId,
    uploadedBy,
    fileUrl: `/uploads/question_papers/${req.file.filename}`,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    examType: req.body.examType,
  });
  res.status(201).json(qp);
}));

router.delete("/:id", authorize("subject_coordinator", "examcell"), asyncHandler(async (req, res) => {
  await QuestionPaper.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ message: "Question paper removed" });
}));

export default router;
