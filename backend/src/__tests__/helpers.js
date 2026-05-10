import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import Subject from "../models/Subject.js";
import ExamEvent from "../models/ExamEvent.js";
import AnswerBooklet from "../models/AnswerBooklet.js";
import FacultyEvaluation from "../models/FacultyEvaluation.js";

const secret = () => process.env.JWT_SECRET || "test-secret-key-for-vitest";
const fakeId = () => new mongoose.Types.ObjectId();

export const createUser = async (role, overrides = {}) => {
  return User.create({
    email: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`,
    password: "password123",
    name: `Test ${role}`,
    role,
    isActive: true,
    ...overrides,
  });
};

export const tokenFor = (user) =>
  jwt.sign({ id: user._id }, secret(), { expiresIn: "1h" });

export const createFaculty = async (overrides = {}) => {
  return Faculty.create({
    employeeId: `EMP-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    name: "Test Faculty",
    email: `faculty-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`,
    primaryRole: "faculty",
    roles: ["faculty"],
    isActive: true,
    ...overrides,
  });
};

export const createStudent = async (overrides = {}) => {
  return Student.create({
    rollNumber: `ROLL-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    name: "Test Student",
    email: `student-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`,
    department: fakeId(),
    isActive: true,
    ...overrides,
  });
};

export const createSubject = async (overrides = {}) => {
  return Subject.create({
    courseCode: `CS${Date.now()}`.slice(-8).toUpperCase(),
    title: "Test Subject",
    type: "Theory",
    department: fakeId(),
    semester: fakeId(),
    regulation: fakeId(),
    ...overrides,
  });
};

export const createExamEvent = async (overrides = {}) => {
  const creatorId = fakeId();
  return ExamEvent.create({
    type: "internal",
    examType: "IE1",
    status: "active",
    college: fakeId(),
    regulation: fakeId(),
    academicYear: fakeId(),
    semester: fakeId(),
    department: fakeId(),
    createdBy: creatorId,
    ...overrides,
  });
};

export const createAnswerBooklet = async (studentId, subjectId, examEventId, overrides = {}) => {
  return AnswerBooklet.create({
    barcode: `BC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    student: studentId,
    subject: subjectId,
    examEvent: examEventId,
    examType: "IE1",
    fileUrl: "/uploads/test-booklet.pdf",
    status: "faculty_reviewed",
    ...overrides,
  });
};

export const createFacultyEvaluation = async (bookletId, facultyId, overrides = {}) => {
  return FacultyEvaluation.create({
    booklet: bookletId,
    faculty: facultyId,
    finalMarks: 35,
    modifiedQuestions: [],
    isFrozen: false,
    version: 1,
    ...overrides,
  });
};
