import express from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import EvaluationSchema from "../models/EvaluationSchema.js";

const router = express.Router();
router.use(authenticate);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
};

router.get("/", asyncHandler(async (req, res) => {
  const { examEvent, subject } = req.query;
  const filter = {};
  if (examEvent) filter.examEvent = examEvent;
  if (subject) filter.subject = subject;
  res.json(await EvaluationSchema.find(filter)
    .populate("subject", "courseCode title")
    .populate("uploadedBy", "name"));
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const schema = await EvaluationSchema.findById(req.params.id)
    .populate("examEvent subject uploadedBy");
  if (!schema) return res.status(404).json({ message: "Schema not found" });
  res.json(schema);
}));

router.post(
  "/",
  authorize("subject_coordinator", "faculty", "examcell"),
  body("examEventId").isMongoId().withMessage("examEventId must be a valid Mongo ObjectId"),
  body("subjectId").isMongoId().withMessage("subjectId must be a valid Mongo ObjectId"),
  body("totalMarks").isFloat({ gt: 0 }).withMessage("totalMarks must be a positive number"),
  body("questions").isArray({ min: 1 }).withMessage("questions must be a non-empty array"),
  body("examType").notEmpty().withMessage("examType is required"),
  validate,
  asyncHandler(async (req, res) => {
    const uploadedBy = req.body.facultyId || req.user.roleRef;
    const schema = await EvaluationSchema.findOneAndUpdate(
      { examEvent: req.body.examEventId, subject: req.body.subjectId },
      {
        examEvent: req.body.examEventId,
        subject: req.body.subjectId,
        uploadedBy,
        questions: req.body.questions,
        totalMarks: req.body.totalMarks,
        examType: req.body.examType,
        isActive: true,
      },
      { upsert: true, new: true }
    );
    res.status(201).json(schema);
  })
);

export default router;
