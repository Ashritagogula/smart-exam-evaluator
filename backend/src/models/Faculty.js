import mongoose from "mongoose";
import { ROLES } from "../config/constants.js";

const facultyRoles = [
  ROLES.FACULTY, ROLES.SUBJECT_COORDINATOR, ROLES.HOD, ROLES.DCE,
  ROLES.CE, ROLES.SCRUTINIZER, ROLES.EXTERNAL, ROLES.EXAM_CELL,
  ROLES.CLERK, ROLES.PRINCIPAL, ROLES.VC, ROLES.CHAIRMAN, ROLES.ADMIN,
];

const facultySchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  designation: { type: String },
  qualifications: [{ type: String }],
  roles: [{
    type: String,
    enum: facultyRoles,
  }],
  primaryRole: { type: String, enum: facultyRoles, required: true },
  subjectsTaught: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],
  sectionsMapped: [{ type: mongoose.Schema.Types.ObjectId, ref: "Section" }],
  notificationPrefs: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

facultySchema.index({ department: 1 });
facultySchema.index({ primaryRole: 1 });

export default mongoose.model("Faculty", facultySchema);
