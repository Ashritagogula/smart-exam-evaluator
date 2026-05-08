export const ROLES = {
  ADMIN: "admin",
  EXAM_CELL: "examcell",
  FACULTY: "faculty",
  SUBJECT_COORDINATOR: "subject_coordinator",
  HOD: "hod",
  PRINCIPAL: "principal",
  VC: "vc",
  STUDENT: "student",
  DCE: "dce",
  CE: "ce",
  CLERK: "clerk",
  SCRUTINIZER: "scrutinizer",
  EXTERNAL: "external",
  CHAIRMAN: "chairman"
};

export const EXAM_TYPES = {
  IE1: "IE1",
  IE2: "IE2",
  SEE: "SEE",
};

export const BOOKLET_STATUS = {
  PENDING: "pending",
  AI_EVALUATED: "ai_evaluated",
  FACULTY_REVIEWED: "faculty_reviewed",
  FROZEN: "frozen",
  PERMANENTLY_FROZEN: "permanently_frozen",
};

export const EXTERNAL_BOOKLET_STATUS = {
  PENDING: "pending",
  AI_EVALUATED: "ai_evaluated",
  EXAMINER_REVIEWED: "examiner_reviewed",
  FROZEN: "frozen",
  SCRUTINIZED: "scrutinized",
  DCE_APPROVED: "dce_approved",
};

export const BUNDLE_STATUS = {
  PENDING: "pending",
  EVALUATING: "evaluating",
  EVALUATED: "evaluated",
  FROZEN: "frozen",
  SCRUTINIZED: "scrutinized",
  DCE_APPROVED: "dce_approved",
};

export const REVIEW_WINDOW_HOURS = 48; // 2-day review window
