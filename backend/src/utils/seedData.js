import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/database.js";
import User from "../models/User.js";
import College from "../models/College.js";
import Regulation from "../models/Regulation.js";
import AcademicYear from "../models/AcademicYear.js";
import Department from "../models/Department.js";
import Semester from "../models/Semester.js";
import Subject from "../models/Subject.js";
import Section from "../models/Section.js";
import Student from "../models/Student.js";
import Faculty from "../models/Faculty.js";

async function seed() {
  await connectDB();
  console.log("🌱 Seeding database...");

  // College
  const college = await College.findOneAndUpdate(
    { code: "AU" },
    { name: "Aditya University", code: "AU", address: "Surampalem, AP", email: "info@aditya.ac.in" },
    { upsert: true, new: true }
  );
  console.log("✅ College:", college.name);

  // Regulation
  const regulation = await Regulation.findOneAndUpdate(
    { code: "R24", college: college._id },
    { code: "R24", name: "Regulation 2024", year: 2024, college: college._id },
    { upsert: true, new: true }
  );

  // Academic Year
  const academicYear = await AcademicYear.findOneAndUpdate(
    { year: "2024-25", college: college._id },
    { year: "2024-25", college: college._id, isActive: true },
    { upsert: true, new: true }
  );

  // Department
  const dept = await Department.findOneAndUpdate(
    { code: "CSE", college: college._id },
    { name: "Computer Science & Engineering", code: "CSE", college: college._id },
    { upsert: true, new: true }
  );

  // Semester
  const sem3 = await Semester.findOneAndUpdate(
    { number: 3, regulation: regulation._id },
    { number: 3, name: "Semester III", regulation: regulation._id, academicYear: academicYear._id },
    { upsert: true, new: true }
  );

  // Subjects
  const subjectsData = [
    { courseCode: "CSE301", title: "Data Structures", type: "Theory", credits: { L: 3, T: 1, P: 0 } },
    { courseCode: "CSE302", title: "Operating Systems", type: "Theory", credits: { L: 3, T: 1, P: 0 } },
    { courseCode: "CSE303", title: "Database Management Systems", type: "Theory", credits: { L: 3, T: 1, P: 0 } },
    { courseCode: "CSE304", title: "Computer Networks", type: "Theory", credits: { L: 3, T: 1, P: 0 } },
    { courseCode: "CSE305L", title: "DS Lab", type: "Lab", credits: { L: 0, T: 0, P: 2 } },
  ];

  const subjects = [];
  for (const s of subjectsData) {
    const sub = await Subject.findOneAndUpdate(
      { courseCode: s.courseCode, regulation: regulation._id },
      { ...s, department: dept._id, semester: sem3._id, regulation: regulation._id },
      { upsert: true, new: true }
    );
    subjects.push(sub);
  }

  // Section
  const sectionA = await Section.findOneAndUpdate(
    { name: "A", department: dept._id, semester: sem3._id, academicYear: academicYear._id },
    { name: "A", department: dept._id, semester: sem3._id, academicYear: academicYear._id, capacity: 60 },
    { upsert: true, new: true }
  );

  // Students
  const studentsData = [
    { rollNumber: "22CSE001", name: "Arjun Sharma", email: "arjun@student.aditya.ac.in" },
    { rollNumber: "22CSE002", name: "Priya Reddy", email: "priya@student.aditya.ac.in" },
    { rollNumber: "22CSE003", name: "Karan Patel", email: "karan@student.aditya.ac.in" },
    { rollNumber: "22CSE004", name: "Ananya Kumar", email: "ananya@student.aditya.ac.in" },
    { rollNumber: "22CSE005", name: "Rohit Verma", email: "rohit@student.aditya.ac.in" },
  ];

  const studentDocs = [];
  for (const s of studentsData) {
    const user = await User.findOneAndUpdate(
      { email: s.email },
      { email: s.email, password: await bcrypt.hash("student123", 12), name: s.name, role: "student", roleModel: "Student" },
      { upsert: true, new: true }
    );
    const student = await Student.findOneAndUpdate(
      { rollNumber: s.rollNumber },
      {
        ...s, department: dept._id, section: sectionA._id,
        academicYear: academicYear._id, regulation: regulation._id,
        currentSemester: 3, user: user._id,
        enrolledSubjects: subjects.map(s => s._id),
      },
      { upsert: true, new: true }
    );
    await User.findByIdAndUpdate(user._id, { roleRef: student._id });
    studentDocs.push(student);
  }
  await Section.findByIdAndUpdate(sectionA._id, { students: studentDocs.map(s => s._id) });

  // Faculty
  const facultyData = [
    { employeeId: "F001", name: "Prof. S. Lakshmi", email: "lakshmi@faculty.aditya.ac.in", primaryRole: "faculty", roles: ["faculty"] },
    { employeeId: "F002", name: "Dr. R. Krishnamurthy", email: "krishna@faculty.aditya.ac.in", primaryRole: "hod", roles: ["hod", "faculty"] },
    { employeeId: "F003", name: "Mrs. K. Devi", email: "devi@examcell.aditya.ac.in", primaryRole: "examcell", roles: ["examcell"] },
    { employeeId: "F004", name: "Dr. T. Subramanyam", email: "subramanyam@dce.aditya.ac.in", primaryRole: "dce", roles: ["dce"] },
    { employeeId: "F005", name: "Prof. G. Venkataraman", email: "venkat@ce.aditya.ac.in", primaryRole: "ce", roles: ["ce"] },
    { employeeId: "F006", name: "Exam Clerk", email: "clerk@aditya.ac.in", primaryRole: "clerk", roles: ["clerk"] },
    { employeeId: "F007", name: "External Examiner", email: "external@aditya.ac.in", primaryRole: "external", roles: ["external"] },
    { employeeId: "F008", name: "Dr. V. Scrutinizer", email: "scrutinizer@aditya.ac.in", primaryRole: "scrutinizer", roles: ["scrutinizer"] },
    { employeeId: "F009", name: "Dr. Subject Coordinator", email: "coordinator@aditya.ac.in", primaryRole: "subject_coordinator", roles: ["subject_coordinator", "faculty"] },
    { employeeId: "ADM001", name: "Dr. S. Ramaswamy", email: "admin@aditya.ac.in", primaryRole: "admin", roles: ["admin"] },
    { employeeId: "F010", name: "Dr. P. Anand", email: "principal@aditya.ac.in", primaryRole: "principal", roles: ["principal"] },
    { employeeId: "F011", name: "Prof. V. Sundaram", email: "vc@aditya.ac.in", primaryRole: "vc", roles: ["vc"] },
  ];

  // Passwords map
  const passwords = {
    admin: "admin123", examcell: "examcell123", faculty: "faculty123",
    hod: "hod123", principal: "principal123", vc: "vc123",
    dce: "dce123", ce: "ce123", clerk: "clerk123",
    external: "external123", scrutinizer: "scrutinizer123",
    subject_coordinator: "coordinator123",
  };

  for (const f of facultyData) {
    const password = passwords[f.primaryRole] || "password123";
    const user = await User.findOneAndUpdate(
      { email: f.email },
      { email: f.email, password: await bcrypt.hash(password, 12), name: f.name, role: f.primaryRole, roleModel: "Faculty" },
      { upsert: true, new: true }
    );
    const faculty = await Faculty.findOneAndUpdate(
      { employeeId: f.employeeId },
      { ...f, department: ["hod", "faculty", "subject_coordinator"].includes(f.primaryRole) ? dept._id : undefined, user: user._id },
      { upsert: true, new: true }
    );
    await User.findByIdAndUpdate(user._id, { roleRef: faculty._id });
  }

  console.log("✅ Seed complete!");
  console.log("\n📋 LOGIN CREDENTIALS:");
  console.log("admin: admin@aditya.ac.in / admin123");
  console.log("examcell: devi@examcell.aditya.ac.in / examcell123");
  console.log("faculty: lakshmi@faculty.aditya.ac.in / faculty123");
  console.log("hod: krishna@faculty.aditya.ac.in / hod123");
  console.log("student: arjun@student.aditya.ac.in / student123");
  console.log("dce: subramanyam@dce.aditya.ac.in / dce123");
  console.log("ce: venkat@ce.aditya.ac.in / ce123");
  console.log("clerk: clerk@aditya.ac.in / clerk123");
  console.log("external: external@aditya.ac.in / external123");
  console.log("scrutinizer: scrutinizer@aditya.ac.in / scrutinizer123");
  console.log("coordinator: coordinator@aditya.ac.in / coordinator123");

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
