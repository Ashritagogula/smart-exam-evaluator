import mongoose from "mongoose";

const regulationSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true }, // e.g. "R24"
  name: { type: String, required: true },
  year: { type: Number, required: true },
  college: { type: mongoose.Schema.Types.ObjectId, ref: "College", required: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

regulationSchema.index({ code: 1, college: 1 }, { unique: true });

export default mongoose.model("Regulation", regulationSchema);
