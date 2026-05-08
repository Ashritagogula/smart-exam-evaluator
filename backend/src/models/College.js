import mongoose from "mongoose";

const collegeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  address: { type: String },
  phone: { type: String },
  email: { type: String },
  logo: { type: String },
  vc:            { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
  chairman:      { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
  principal:     { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
  examCellAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
  ce:            { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

// code unique index already created by schema field

export default mongoose.model("College", collegeSchema);
