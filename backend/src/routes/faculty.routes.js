import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Faculty from "../models/Faculty.js";
import FacultySubjectMapping from "../models/FacultySubjectMapping.js";
import AnswerBooklet from "../models/AnswerBooklet.js";

const router = express.Router();
router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const { department, role, search } = req.query;
  const filter = { isActive: true };
  if (department) filter.department = department;
  if (role) filter.primaryRole = role;
  if (search) filter.$or = [
    { name: { $regex: search, $options: "i" } },
    { email: { $regex: search, $options: "i" } },
    { employeeId: { $regex: search, $options: "i" } },
  ];
  res.json(await Faculty.find(filter)
    .populate("department", "name code")
    .sort("name")
    .limit(100));
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const faculty = await Faculty.findById(req.params.id)
    .populate("department", "name code")
    .populate("subjectsTaught", "courseCode title")
    .populate("sectionsMapped", "name");
  if (!faculty) return res.status(404).json({ message: "Faculty not found" });
  res.json(faculty);
}));

router.get("/:id/assignments", asyncHandler(async (req, res) => {
  const booklets = await AnswerBooklet.find({ assignedFaculty: req.params.id })
    .populate("student", "rollNumber name")
    .populate("subject", "courseCode title")
    .sort("-uploadDate");
  res.json(booklets);
}));

router.get("/:id/subject-mappings", asyncHandler(async (req, res) => {
  const mappings = await FacultySubjectMapping.find({ faculty: req.params.id, isActive: true })
    .populate("subject", "courseCode title")
    .populate("section", "name")
    .populate("semester", "number name");
  res.json(mappings);
}));

router.post("/", authorize("admin", "hod"), asyncHandler(async (req, res) => {
  res.status(201).json(await Faculty.create(req.body));
}));

router.put("/:id", asyncHandler(async (req, res) => {
  res.json(await Faculty.findByIdAndUpdate(req.params.id, req.body, { new: true }));
}));

router.post("/subject-mapping", authorize("admin", "hod", "examcell"), asyncHandler(async (req, res) => {
  const mapping = await FacultySubjectMapping.create(req.body);
  await Faculty.findByIdAndUpdate(req.body.faculty, {
    $addToSet: {
      subjectsTaught: req.body.subject,
      sectionsMapped: req.body.section,
    }
  });
  res.status(201).json(mapping);
}));

export default router;
