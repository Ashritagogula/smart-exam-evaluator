import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

  // Populate role-specific profile
  let profile = null;
  if (user.roleRef) {
    if (user.roleModel === "Faculty") {
      profile = await Faculty.findById(user.roleRef)
        .populate("department", "name code")
        .populate("sectionsMapped", "name")
        .lean();
    } else if (user.roleModel === "Student") {
      profile = await Student.findById(user.roleRef)
        .populate("department", "name code")
        .populate("section", "name")
        .lean();
    }
  }

  const token = signToken(user._id);
  res.json({
    token,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar || user.name?.split(" ").map(n => n[0]).join("").toUpperCase(),
      profile,
    },
  });
});

export const register = asyncHandler(async (req, res) => {
  const { email, password, name, role, employeeId, rollNumber } = req.body;
  if (!email || !password || !name || !role) {
    return res.status(400).json({ message: "email, password, name, role are required" });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ message: "Email already registered" });

  let roleRef = null, roleModel = null;

  if (["faculty", "subject_coordinator", "hod", "dce", "ce", "scrutinizer", "external", "examcell", "clerk", "principal", "vc", "chairman", "admin"].includes(role)) {
    const faculty = await Faculty.create({
      employeeId: employeeId || `EMP${Date.now()}`,
      name, email, primaryRole: role, roles: [role],
      ...(req.body.department && { department: req.body.department }),
    });
    roleRef = faculty._id;
    roleModel = "Faculty";
  } else if (role === "student") {
    const student = await Student.create({
      rollNumber: rollNumber || `ROLL${Date.now()}`,
      name, email,
      department: req.body.department,
      academicYear: req.body.academicYear,
      regulation: req.body.regulation,
      ...(req.body.currentSemester && { currentSemester: req.body.currentSemester }),
    });
    roleRef = student._id;
    roleModel = "Student";
  }

  const user = await User.create({ email, password, name, role, roleRef, roleModel });
  if (roleRef) {
    const Model = roleModel === "Faculty" ? Faculty : Student;
    await Model.findByIdAndUpdate(roleRef, { user: user._id });
  }

  const token = signToken(user._id);
  res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
});

export const getMe = asyncHandler(async (req, res) => {
  let profile = null;
  if (req.user.roleRef) {
    const Model = req.user.roleModel === "Faculty" ? Faculty : Student;
    profile = await Model.findById(req.user.roleRef)
      .populate("department", "name code").lean();
  }
  res.json({ user: { ...req.user.toObject(), profile } });
});

export const logout = asyncHandler(async (req, res) => {
  res.json({ message: "Logged out successfully" });
});
