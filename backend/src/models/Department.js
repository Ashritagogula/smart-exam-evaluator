import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, uppercase: true }, // e.g. "CSE"
  college: { type: mongoose.Schema.Types.ObjectId, ref: "College", required: true },
  hod: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

departmentSchema.index({ code: 1, college: 1 }, { unique: true });

export default mongoose.model("Department", departmentSchema);
