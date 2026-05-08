import mongoose from "mongoose";

const studentNotificationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: {
    type: String,
    enum: ["freeze", "permanent_freeze", "result_declared", "review_window", "marks_updated"],
    required: true,
  },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
  booklet: { type: mongoose.Schema.Types.ObjectId, ref: "AnswerBooklet" },
  message: { type: String, required: true },
  title: { type: String },
  isRead: { type: Boolean, default: false },
  deliveryStatus: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
  sentAt: { type: Date },
  reviewWindowExpiresAt: { type: Date },
}, { timestamps: true });

studentNotificationSchema.index({ student: 1, isRead: 1 });
studentNotificationSchema.index({ deliveryStatus: 1 });

export default mongoose.model("StudentNotification", studentNotificationSchema);
