import StudentNotification from "../models/StudentNotification.js";
import { emitToStudent } from "./sse.service.js";

export const sendStudentNotification = async ({
  studentId, userId, type, subjectId, bookletId, message, title, reviewWindowExpiresAt,
}) => {
  const notif = await StudentNotification.create({
    student: studentId,
    user: userId,
    type,
    subject: subjectId,
    booklet: bookletId,
    message,
    title: title || type.replace(/_/g, " ").toUpperCase(),
    deliveryStatus: "sent",
    sentAt: new Date(),
    reviewWindowExpiresAt,
  });
  emitToStudent(studentId, "notification", notif);
  return notif;
};

export const getUnreadCount = async (studentId) => {
  return StudentNotification.countDocuments({ student: studentId, isRead: false });
};
