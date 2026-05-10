import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.routes.js";
import collegeRoutes from "./routes/college.routes.js";
import regulationRoutes from "./routes/regulation.routes.js";
import academicYearRoutes from "./routes/academicYear.routes.js";
import departmentRoutes from "./routes/department.routes.js";
import semesterRoutes from "./routes/semester.routes.js";
import subjectRoutes from "./routes/subject.routes.js";
import sectionRoutes from "./routes/section.routes.js";
import studentRoutes from "./routes/student.routes.js";
import facultyRoutes from "./routes/faculty.routes.js";
import examEventRoutes from "./routes/examEvent.routes.js";
import questionPaperRoutes from "./routes/questionPaper.routes.js";
import evaluationSchemaRoutes from "./routes/evaluationSchema.routes.js";
import answerBookletRoutes from "./routes/answerBooklet.routes.js";
import internalEvalRoutes from "./routes/internalEval.routes.js";
import cieMarksRoutes from "./routes/cieMarks.routes.js";
import labMarksRoutes from "./routes/labMarks.routes.js";
import externalExamRoutes from "./routes/externalExam.routes.js";
import resultsRoutes from "./routes/results.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import ocrRoutes from "./routes/ocr.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import auditLogRoutes from "./routes/auditLog.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static file serving for uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// API Routes
app.use("/api/auth",              authRoutes);
app.use("/api/colleges",          collegeRoutes);
app.use("/api/regulations",       regulationRoutes);
app.use("/api/academic-years",    academicYearRoutes);
app.use("/api/departments",       departmentRoutes);
app.use("/api/semesters",         semesterRoutes);
app.use("/api/subjects",          subjectRoutes);
app.use("/api/sections",          sectionRoutes);
app.use("/api/students",          studentRoutes);
app.use("/api/faculty",           facultyRoutes);
app.use("/api/exam-events",       examEventRoutes);
app.use("/api/question-papers",   questionPaperRoutes);
app.use("/api/evaluation-schemas",evaluationSchemaRoutes);
app.use("/api/answer-booklets",   answerBookletRoutes);
app.use("/api/internal-eval",     internalEvalRoutes);
app.use("/api/cie-marks",         cieMarksRoutes);
app.use("/api/lab-marks",         labMarksRoutes);
app.use("/api/external-exam",     externalExamRoutes);
app.use("/api/results",           resultsRoutes);
app.use("/api/notifications",     notificationRoutes);
app.use("/api/ocr",               ocrRoutes);
app.use("/api/dashboard",         dashboardRoutes);
app.use("/api/audit-logs",        auditLogRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date() }));

app.use(errorHandler);

export default app;
