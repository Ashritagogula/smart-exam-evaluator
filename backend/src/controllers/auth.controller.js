import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const ACCESS_COOKIE  = "au_token";
const REFRESH_COOKIE = "au_refresh";

const ACCESS_TTL_SEC  = 15 * 60;           // 15 minutes
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60; // 7 days

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};

const signAccess  = (id) => jwt.sign({ id, type: "access"  }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL_SEC  });
const signRefresh = (id) => jwt.sign({ id, type: "refresh" }, process.env.JWT_SECRET, { expiresIn: REFRESH_TTL_SEC });

function setAuthCookies(res, userId) {
  res.cookie(ACCESS_COOKIE,  signAccess(userId),  { ...cookieBase, maxAge: ACCESS_TTL_SEC  * 1000 });
  res.cookie(REFRESH_COOKIE, signRefresh(userId), { ...cookieBase, maxAge: REFRESH_TTL_SEC * 1000, path: "/api/auth/refresh" });
}

async function resolveProfile(user) {
  if (!user.roleRef) return null;
  if (user.roleModel === "Faculty") {
    return Faculty.findById(user.roleRef)
      .populate("department", "name code")
      .populate("sectionsMapped", "name")
      .lean();
  }
  if (user.roleModel === "Student") {
    return Student.findById(user.roleRef)
      .populate("department", "name code")
      .populate("section", "name")
      .lean();
  }
  return null;
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

  const profile = await resolveProfile(user);
  setAuthCookies(res, user._id);

  res.json({
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

  const newUser = await User.create({ email, password, name, role, roleRef, roleModel });
  if (roleRef) {
    const Model = roleModel === "Faculty" ? Faculty : Student;
    await Model.findByIdAndUpdate(roleRef, { user: newUser._id });
  }

  setAuthCookies(res, newUser._id);
  res.status(201).json({ user: { id: newUser._id, email: newUser.email, name: newUser.name, role: newUser.role } });
});

// Rotate access token using the long-lived refresh cookie
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ message: "No refresh token" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Refresh token invalid or expired" });
  }

  if (decoded.type !== "refresh") return res.status(401).json({ message: "Invalid token type" });

  const user = await User.findById(decoded.id).select("-password");
  if (!user || !user.isActive) return res.status(401).json({ message: "User not found or inactive" });

  // Issue new access token only (refresh token stays valid until its own expiry)
  res.cookie(ACCESS_COOKIE, signAccess(user._id), { ...cookieBase, maxAge: ACCESS_TTL_SEC * 1000 });
  res.json({ message: "Token refreshed" });
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
  res.clearCookie(ACCESS_COOKIE,  { ...cookieBase });
  res.clearCookie(REFRESH_COOKIE, { ...cookieBase, path: "/api/auth/refresh" });
  res.json({ message: "Logged out successfully" });
});
