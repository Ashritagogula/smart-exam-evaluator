import FinalResult from "../models/FinalResult.js";
import CIEMarks from "../models/CIEMarks.js";
import LabMarks from "../models/LabMarks.js";
import Student from "../models/Student.js";
import AcademicYear from "../models/AcademicYear.js";
import { getGrade, applyRelativeGrading } from "../services/marks.service.js";

export const computeResult = async (req, res) => {
  const { studentId, subjectId, academicYearId, semesterId, regulationId, seeTheoryMarks } = req.body;

  const [cie, lab] = await Promise.all([
    CIEMarks.findOne({ student: studentId, subject: subjectId }),
    LabMarks.findOne({ student: studentId, subject: subjectId }),
  ]);

  const totalCIE  = cie?.totalCIE || 0;
  const seeScaled = Math.round((seeTheoryMarks || 0) / 100 * 50 * 100) / 100;
  const labTotal  = lab?.totalLabMarks || 0;
  const grandTotal = totalCIE + seeScaled + labTotal;
  const { grade, gradePoints } = getGrade(grandTotal, 100);

  const result = await FinalResult.findOneAndUpdate(
    { student: studentId, subject: subjectId },
    {
      student: studentId, subject: subjectId,
      academicYear: academicYearId, semester: semesterId, regulation: regulationId,
      cieMarks: cie?._id, labMarks: lab?._id,
      seeTheoryMarks: seeTheoryMarks || 0, seeScaledMarks: seeScaled,
      totalCIE, totalSEE: seeScaled, grandTotal, grade, gradePoints,
      isPassed: gradePoints > 0,
    },
    { upsert: true, new: true }
  );
  res.json(result);
};

export const computeBulkResults = async (req, res) => {
  const { subjectId, academicYearId, semesterId, regulationId, seeMarksMap } = req.body;
  const students = await Student.find({ enrolledSubjects: subjectId });
  const results = [];

  for (const student of students) {
    const seeTheoryMarks = seeMarksMap?.[student._id.toString()] || 0;
    const [cie, lab] = await Promise.all([
      CIEMarks.findOne({ student: student._id, subject: subjectId }),
      LabMarks.findOne({ student: student._id, subject: subjectId }),
    ]);
    const totalCIE   = cie?.totalCIE || 0;
    const seeScaled  = Math.round(seeTheoryMarks / 100 * 50 * 100) / 100;
    const grandTotal = totalCIE + seeScaled + (lab?.totalLabMarks || 0);
    const { grade, gradePoints } = getGrade(grandTotal, 100);
    const r = await FinalResult.findOneAndUpdate(
      { student: student._id, subject: subjectId },
      {
        student: student._id, subject: subjectId,
        academicYear: academicYearId, semester: semesterId, regulation: regulationId,
        cieMarks: cie?._id, labMarks: lab?._id,
        seeTheoryMarks, seeScaledMarks: seeScaled, totalCIE, totalSEE: seeScaled,
        grandTotal, grade, gradePoints, isPassed: gradePoints > 0,
      },
      { upsert: true, new: true }
    );
    results.push(r);
  }
  res.json({ message: `Computed ${results.length} results`, results });
};

export const declareResults = async (req, res) => {
  const { subjectId, academicYearId } = req.body;
  if (req.college) {
    const ay = await AcademicYear.findById(academicYearId);
    if (!ay || ay.college.toString() !== req.college._id.toString())
      return res.status(403).json({ message: "Academic year does not belong to your college" });
  }
  await FinalResult.updateMany(
    { subject: subjectId, academicYear: academicYearId },
    { isDeclared: true, declaredAt: new Date() }
  );
  res.json({ message: "Results declared" });
};

export const applyRelativeGradingHandler = async (req, res) => {
  const { subjectId, academicYearId } = req.body;
  if (!subjectId || !academicYearId)
    return res.status(400).json({ message: "subjectId and academicYearId are required" });
  const outcome = await applyRelativeGrading(subjectId, academicYearId);
  res.json({ message: `Relative grading applied to ${outcome.updated} students`, ...outcome });
};
