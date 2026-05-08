import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { uploadBooklets } from "../middleware/upload.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import AnswerBooklet from "../models/AnswerBooklet.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();
router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const { examEvent, faculty, status, subject, student } = req.query;
  const filter = {};
  if (examEvent) filter.examEvent = examEvent;
  if (faculty) filter.assignedFaculty = faculty;
  if (status) filter.status = status;
  if (subject) filter.subject = subject;
  if (student) filter.student = student;
  res.json(await AnswerBooklet.find(filter)
    .populate("student", "rollNumber name")
    .populate("subject", "courseCode title")
    .populate("assignedFaculty", "name employeeId")
    .sort("-uploadDate"));
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const b = await AnswerBooklet.findById(req.params.id)
    .populate("student subject examEvent assignedFaculty");
  if (!b) return res.status(404).json({ message: "Booklet not found" });
  res.json(b);
}));

// Bulk upload by clerk
router.post("/upload-bulk", authorize("clerk", "examcell", "admin"), (req, res, next) => {
  uploadBooklets(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, asyncHandler(async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ message: "No booklets uploaded" });
  const { examEventId, subjectId, examType, barcodeMap } = req.body;
  const barcodes = barcodeMap ? JSON.parse(barcodeMap) : {};

  const created = [];
  for (const file of req.files) {
    const barcode = barcodes[file.originalname] || `BC-${uuidv4().slice(0, 8).toUpperCase()}`;
    const b = await AnswerBooklet.create({
      barcode,
      student: barcodes[`${file.originalname}_student`],
      subject: subjectId,
      examEvent: examEventId,
      examType: examType || "IE1",
      fileUrl: `/uploads/booklets/${file.filename}`,
      fileName: file.originalname,
      uploadedBy: req.user._id,
    });
    created.push(b);
  }
  res.status(201).json({ message: `${created.length} booklets uploaded`, booklets: created });
}));

// Assign booklet to faculty
router.patch("/:id/assign", authorize("clerk", "examcell", "admin"), asyncHandler(async (req, res) => {
  const { facultyId } = req.body;
  const b = await AnswerBooklet.findByIdAndUpdate(req.params.id, {
    assignedFaculty: facultyId,
    assignmentDate: new Date(),
  }, { new: true });
  res.json(b);
}));

// Bulk assign booklets to a faculty
router.post("/bulk-assign", authorize("clerk", "examcell", "admin"), asyncHandler(async (req, res) => {
  const { bookletIds, facultyId } = req.body;
  await AnswerBooklet.updateMany(
    { _id: { $in: bookletIds } },
    { assignedFaculty: facultyId, assignmentDate: new Date() }
  );
  res.json({ message: `${bookletIds.length} booklets assigned` });
}));

export default router;
