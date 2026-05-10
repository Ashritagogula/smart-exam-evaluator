import mongoose from "mongoose";
import CIEMarks from "../models/CIEMarks.js";
import InternalExam from "../models/InternalExam.js";
import FinalResult from "../models/FinalResult.js";
import LabMarks from "../models/LabMarks.js";

// CIE Theory: 80% higher + 20% lower, scaled to cieMax (default 30) from 50
export const computeCIETheory = (ie1, ie2, maxIE = 50, cieMax = 30) => {
  const higher = Math.max(ie1, ie2);
  const lower  = Math.min(ie1, ie2);
  const raw = 0.8 * higher + 0.2 * lower;
  return Math.round((raw / maxIE) * cieMax * 100) / 100;
};

// Scale SEE marks: paper out of 100 → scaled to 50
export const scaleSEEMarks = (marksOutOf100) =>
  Math.round((marksOutOf100 / 100) * 50 * 100) / 100;

// Grade from percentage
export const getGrade = (marks, maxMarks) => {
  const pct = maxMarks > 0 ? (marks / maxMarks) * 100 : 0;
  if (pct >= 90) return { grade: "O",  gradePoints: 10 };
  if (pct >= 80) return { grade: "A+", gradePoints: 9  };
  if (pct >= 70) return { grade: "A",  gradePoints: 8  };
  if (pct >= 60) return { grade: "B+", gradePoints: 7  };
  if (pct >= 55) return { grade: "B",  gradePoints: 6  };
  if (pct >= 50) return { grade: "C",  gradePoints: 5  };
  if (pct >= 45) return { grade: "D",  gradePoints: 4  };
  return            { grade: "F",  gradePoints: 0  };
};

// Update/create CIE marks after an internal exam is frozen
export const updateCIEMarks = async (studentId, subjectId, academicYearId, semesterId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const ie1Doc = await InternalExam.findOne({ student: studentId, subject: subjectId, examType: "IE1" }).session(session);
    const ie2Doc = await InternalExam.findOne({ student: studentId, subject: subjectId, examType: "IE2" }).session(session);

    const ie1 = ie1Doc?.finalMarks ?? 0;
    const ie2 = ie2Doc?.finalMarks ?? 0;
    const cieTheory = computeCIETheory(ie1, ie2);

    await CIEMarks.findOneAndUpdate(
      { student: studentId, subject: subjectId },
      {
        $set: {
          "IE1.marks": ie1,
          "IE2.marks": ie2,
          cieTheory,
          academicYear: academicYearId,
          semester: semesterId,
        }
      },
      { upsert: true, new: true, session }
    );

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// ─── RELATIVE GRADING ────────────────────────────────────────────────────────

// Map a z-score to a grade using standard deviation thresholds
export const computeRelativeGrade = (marks, classMean, classStdDev) => {
  if (classStdDev === 0) return getGrade(marks, 100);
  const z = (marks - classMean) / classStdDev;
  if (z >= 1.5)  return { grade: "O",  gradePoints: 10 };
  if (z >= 1.0)  return { grade: "A+", gradePoints: 9  };
  if (z >= 0.5)  return { grade: "A",  gradePoints: 8  };
  if (z >= 0.0)  return { grade: "B+", gradePoints: 7  };
  if (z >= -0.5) return { grade: "B",  gradePoints: 6  };
  if (z >= -1.0) return { grade: "C",  gradePoints: 5  };
  if (z >= -1.5) return { grade: "D",  gradePoints: 4  };
  return               { grade: "F",  gradePoints: 0  };
};

// Apply relative grading to all results for a given subject + academic year
export const applyRelativeGrading = async (subjectId, academicYearId) => {
  const resultDocs = await FinalResult.find({ subject: subjectId, academicYear: academicYearId });
  if (!resultDocs.length) return { updated: 0 };

  const allMarks = resultDocs.map(r => r.grandTotal);
  const mean = allMarks.reduce((a, b) => a + b, 0) / allMarks.length;
  const variance = allMarks.reduce((s, m) => s + Math.pow(m - mean, 2), 0) / allMarks.length;
  const stdDev = Math.sqrt(variance);
  const roundedMean   = Math.round(mean   * 100) / 100;
  const roundedStdDev = Math.round(stdDev * 100) / 100;

  for (const result of resultDocs) {
    const { grade, gradePoints } = computeRelativeGrade(result.grandTotal, mean, stdDev);
    await FinalResult.findByIdAndUpdate(result._id, {
      grade, gradePoints, isPassed: gradePoints > 0,
      relativeGradingApplied: true,
      classMean:   roundedMean,
      classStdDev: roundedStdDev,
    });
  }
  return { updated: resultDocs.length, classMean: roundedMean, classStdDev: roundedStdDev };
};

// ─────────────────────────────────────────────────────────────────────────────

// Compute and store final result
export const computeFinalResult = async (studentId, subjectId, options = {}) => {
  const cieDoc = await CIEMarks.findOne({ student: studentId, subject: subjectId });
  const labDoc = await LabMarks.findOne({ student: studentId, subject: subjectId });

  const cieTotal = cieDoc?.totalCIE ?? 0;
  const seeTh = options.seeTheoryMarks ?? 0;
  const seeLab = labDoc?.totalLabMarks ?? 0;
  const grandTotal = cieTotal + seeTh + seeLab;
  const { grade, gradePoints } = getGrade(grandTotal, 100);

  return {
    totalCIE: cieTotal,
    totalSEE: seeTh,
    grandTotal,
    grade,
    gradePoints,
    isPassed: gradePoints > 0,
  };
};
