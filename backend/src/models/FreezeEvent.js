import mongoose from "mongoose";

const freezeEventSchema = new mongoose.Schema({
  booklet: { type: mongoose.Schema.Types.ObjectId, ref: "AnswerBooklet", required: true },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  type: { type: String, enum: ["temporary", "permanent"], required: true },
  frozenAt: { type: Date, default: Date.now },
  unfrozenAt: { type: Date },
  permanentFreezeScheduledAt: { type: Date },
  reason: { type: String },
}, { timestamps: true });

freezeEventSchema.index({ booklet: 1 });

export default mongoose.model("FreezeEvent", freezeEventSchema);
