/**
 * AI-Powered Analytics & Predictive Reporting Service
 *
 * Provides institutional analytics on student performance trends, subject-wise
 * pass/fail rates, faculty evaluation efficiency, and predictive insights using
 * statistical modeling and Gemini AI narrative generation.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import FinalResult from "../models/FinalResult.js";
import CIEMarks from "../models/CIEMarks.js";
import AIEvaluation from "../models/AIEvaluation.js";
import ExternalAIEvaluation from "../models/ExternalAIEvaluation.js";
import FacultyEvaluation from "../models/FacultyEvaluation.js";
import Student from "../models/Student.js";

// ─── STATISTICAL HELPERS ─────────────────────────────────────────────────────

const mean = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const stdDev = (arr) => {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / (arr.length || 1));
};
const median = (arr) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// ─── SUBJECT PERFORMANCE ANALYTICS ──────────────────────────────────────────

/**
 * Compute comprehensive performance analytics for a subject.
 */
export const getSubjectAnalytics = async (subjectId, academicYearId) => {
  const filter = { subject: subjectId, isDeclared: true };
  if (academicYearId) filter.academicYear = academicYearId;

  const results = await FinalResult.find(filter).lean();
  const marks = results.map(r => r.grandTotal);
  const passCount = results.filter(r => r.isPassed).length;

  const gradeDistribution = results.reduce((acc, r) => {
    acc[r.grade] = (acc[r.grade] || 0) + 1;
    return acc;
  }, {});

  const cieMarks = await CIEMarks.find({ subject: subjectId }).lean();
  const cieValues = cieMarks.map(c => c.totalCIE || 0);

  return {
    subjectId,
    academicYearId,
    totalStudents:    results.length,
    passCount,
    failCount:        results.length - passCount,
    passPercentage:   results.length ? Math.round(passCount / results.length * 100) : 0,
    averageMarks:     Math.round(mean(marks) * 100) / 100,
    medianMarks:      Math.round(median(marks) * 100) / 100,
    stdDevMarks:      Math.round(stdDev(marks) * 100) / 100,
    highestMarks:     Math.max(...marks, 0),
    lowestMarks:      Math.min(...marks, 0),
    gradeDistribution,
    averageCIE:       Math.round(mean(cieValues) * 100) / 100,
    computedAt:       new Date(),
  };
};

// ─── FACULTY EVALUATION EFFICIENCY ───────────────────────────────────────────

/**
 * Measure faculty evaluation efficiency: AI vs human marks agreement,
 * average modification rate, and evaluation turnaround time.
 */
export const getFacultyEvaluationStats = async (facultyId, subjectId) => {
  const filter = { faculty: facultyId };
  if (subjectId) filter.subject = subjectId;

  const evals = await FacultyEvaluation.find(filter)
    .populate("booklet")
    .populate("aiEvaluation")
    .lean();

  const agreementScores = [];
  const modificationCounts = [];
  const turnaroundTimes = [];

  for (const fe of evals) {
    const aiEval = fe.aiEvaluation;
    if (aiEval && aiEval.totalMarks !== undefined && fe.finalMarks !== undefined) {
      const maxM = aiEval.maxMarks || 100;
      const diff = Math.abs(aiEval.totalMarks - fe.finalMarks) / maxM;
      agreementScores.push(1 - diff);
    }
    modificationCounts.push(fe.modifiedQuestions?.length || 0);
    if (fe.createdAt && fe.frozenAt) {
      turnaroundTimes.push((new Date(fe.frozenAt) - new Date(fe.createdAt)) / 3600000);
    }
  }

  return {
    facultyId,
    subjectId,
    totalEvaluations:     evals.length,
    averageAIAgreement:   Math.round(mean(agreementScores) * 100),
    averageModifications: Math.round(mean(modificationCounts) * 100) / 100,
    averageTurnaroundHrs: Math.round(mean(turnaroundTimes) * 100) / 100,
    computedAt:           new Date(),
  };
};

// ─── STUDENT PERFORMANCE TRENDS ──────────────────────────────────────────────

/**
 * Analyze a student's academic trajectory across semesters.
 */
export const getStudentPerformanceTrend = async (studentId) => {
  const results = await FinalResult.find({ student: studentId, isDeclared: true })
    .populate("subject", "courseCode title credits")
    .populate("semester", "number name")
    .sort("semester.number")
    .lean();

  const bySemester = results.reduce((acc, r) => {
    const sem = r.semester?.number || "unknown";
    if (!acc[sem]) acc[sem] = [];
    acc[sem].push(r);
    return acc;
  }, {});

  const trend = Object.entries(bySemester).map(([sem, rs]) => ({
    semester:      sem,
    averageMarks:  Math.round(mean(rs.map(r => r.grandTotal)) * 100) / 100,
    sgpa:          Math.round(mean(rs.map(r => r.gradePoints)) * 100) / 100,
    passCount:     rs.filter(r => r.isPassed).length,
    totalSubjects: rs.length,
  }));

  const cgpa = results.length
    ? Math.round(mean(results.map(r => r.gradePoints)) * 100) / 100
    : 0;

  return { studentId, trend, cgpa, computedAt: new Date() };
};

// ─── PREDICTIVE ANALYTICS ─────────────────────────────────────────────────────

/**
 * Predict students at risk of failing based on CIE marks.
 * Uses a simple threshold model: students with CIE < 40% of max are at risk.
 */
export const identifyAtRiskStudents = async (subjectId, academicYearId) => {
  const cieRecords = await CIEMarks.find({ subject: subjectId })
    .populate("student", "rollNumber name")
    .lean();

  const atRisk = cieRecords
    .filter(c => (c.totalCIE || 0) < 12)
    .map(c => ({
      studentId:   c.student?._id,
      rollNumber:  c.student?.rollNumber,
      name:        c.student?.name,
      totalCIE:    c.totalCIE || 0,
      riskLevel:   (c.totalCIE || 0) < 8 ? "high" : "moderate",
    }));

  return {
    subjectId,
    academicYearId,
    totalStudents:      cieRecords.length,
    atRiskCount:        atRisk.length,
    atRiskPercentage:   cieRecords.length ? Math.round(atRisk.length / cieRecords.length * 100) : 0,
    atRiskStudents:     atRisk,
    computedAt:         new Date(),
  };
};

// ─── AI NARRATIVE GENERATION ─────────────────────────────────────────────────

/**
 * Generate a natural-language institutional analytics report using Gemini AI.
 * Takes aggregated statistics and returns a readable executive summary.
 */
export const generateAnalyticsNarrative = async (stats) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
You are an academic data analyst. Based on the following exam statistics, write a concise
institutional performance report (3-5 paragraphs). Highlight strengths, concerns, and
actionable recommendations.

Statistics:
${JSON.stringify(stats, null, 2)}

Return plain text narrative only. No JSON, no markdown headers.
`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return result.response.text();
};

// ─── INSTITUTION-WIDE REPORT ─────────────────────────────────────────────────

/**
 * Generate a full institutional report for an academic year.
 */
export const generateInstitutionReport = async (academicYearId) => {
  const allResults = await FinalResult.find({ academicYear: academicYearId, isDeclared: true }).lean();
  const marks = allResults.map(r => r.grandTotal);

  const gradeDistribution = allResults.reduce((acc, r) => {
    acc[r.grade] = (acc[r.grade] || 0) + 1;
    return acc;
  }, {});

  const totalStudents = await Student.countDocuments();

  const stats = {
    academicYearId,
    totalStudents,
    totalDeclaredResults: allResults.length,
    overallPassPercentage: allResults.length
      ? Math.round(allResults.filter(r => r.isPassed).length / allResults.length * 100)
      : 0,
    averageMarks:      Math.round(mean(marks) * 100) / 100,
    medianMarks:       Math.round(median(marks) * 100) / 100,
    stdDevMarks:       Math.round(stdDev(marks) * 100) / 100,
    gradeDistribution,
    generatedAt:       new Date(),
  };

  const narrative = await generateAnalyticsNarrative(stats);
  return { ...stats, narrative };
};
