const BASE_URL = "/api";

let _refreshing = null; // deduplicate concurrent refresh attempts

async function tryRefresh() {
  if (_refreshing) return _refreshing;
  _refreshing = fetch(`${BASE_URL}/auth/refresh`, { method: "POST", credentials: "include" })
    .then(r => r.ok)
    .catch(() => false)
    .finally(() => { _refreshing = null; });
  return _refreshing;
}

// Base fetch wrapper — credentials:"include" sends/receives httpOnly cookies automatically
async function request(path, options = {}, _retry = true) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401 && _retry && path !== "/auth/refresh") {
    const refreshed = await tryRefresh();
    if (refreshed) return request(path, options, false);
    window.dispatchEvent(new Event("auth:logout"));
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

// FormData request (no Content-Type header — browser sets it with boundary)
async function requestForm(path, formData, method = "POST") {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: "include",
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const auth = {
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: async () => {
    try { await request("/auth/logout", { method: "POST" }); } catch {}
  },
  getMe: () => request("/auth/me"),
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
};

// ─── COLLEGES ─────────────────────────────────────────────────────────────────

export const colleges = {
  list: () => request("/colleges"),
  get: (id) => request(`/colleges/${id}`),
  create: (body) => request("/colleges", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) => request(`/colleges/${id}`, { method: "PUT", body: JSON.stringify(body) }),
};

// ─── REGULATIONS ──────────────────────────────────────────────────────────────

export const regulations = {
  list: (params = {}) => request(`/regulations?${new URLSearchParams(params)}`),
  create: (body) => request("/regulations", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) => request(`/regulations/${id}`, { method: "PUT", body: JSON.stringify(body) }),
};

// ─── ACADEMIC YEARS ───────────────────────────────────────────────────────────

export const academicYears = {
  list: (params = {}) => request(`/academic-years?${new URLSearchParams(params)}`),
  create: (body) => request("/academic-years", { method: "POST", body: JSON.stringify(body) }),
};

// ─── DEPARTMENTS ──────────────────────────────────────────────────────────────

export const departments = {
  list: (params = {}) => request(`/departments?${new URLSearchParams(params)}`),
  get: (id) => request(`/departments/${id}`),
  create: (body) => request("/departments", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) => request(`/departments/${id}`, { method: "PUT", body: JSON.stringify(body) }),
};

// ─── SEMESTERS ────────────────────────────────────────────────────────────────

export const semesters = {
  list: (params = {}) => request(`/semesters?${new URLSearchParams(params)}`),
  create: (body) => request("/semesters", { method: "POST", body: JSON.stringify(body) }),
};

// ─── SUBJECTS ─────────────────────────────────────────────────────────────────

export const subjects = {
  list: (params = {}) => request(`/subjects?${new URLSearchParams(params)}`),
  get: (id) => request(`/subjects/${id}`),
  create: (body) => request("/subjects", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) => request(`/subjects/${id}`, { method: "PUT", body: JSON.stringify(body) }),
};

// ─── SECTIONS ─────────────────────────────────────────────────────────────────

export const sections = {
  list: (params = {}) => request(`/sections?${new URLSearchParams(params)}`),
  getStudents: (id) => request(`/sections/${id}/students`),
  create: (body) => request("/sections", { method: "POST", body: JSON.stringify(body) }),
  addStudent: (id, studentId) => request(`/sections/${id}/add-student`, { method: "POST", body: JSON.stringify({ studentId }) }),
};

// ─── STUDENTS ─────────────────────────────────────────────────────────────────

export const students = {
  list: (params = {}) => request(`/students?${new URLSearchParams(params)}`),
  get: (id) => request(`/students/${id}`),
  create: (body) => request("/students", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) => request(`/students/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  getResults: (id) => request(`/students/${id}/results`),
  getNotifications: (id) => request(`/students/${id}/notifications`),
  markAllRead: (id) => request(`/students/${id}/notifications/read`, { method: "PUT" }),
};

// ─── FACULTY ──────────────────────────────────────────────────────────────────

export const faculty = {
  list: (params = {}) => request(`/faculty?${new URLSearchParams(params)}`),
  get: (id) => request(`/faculty/${id}`),
  create: (body) => request("/faculty", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) => request(`/faculty/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  getAssignments: (id) => request(`/faculty/${id}/assignments`),
  getMappings: (id) => request(`/faculty/${id}/subject-mappings`),
  getAllMappings: (params = {}) => request(`/faculty/mappings?${new URLSearchParams(params)}`),
  createMapping: (body) => request("/faculty/subject-mapping", { method: "POST", body: JSON.stringify(body) }),
};

// ─── EXAM EVENTS ──────────────────────────────────────────────────────────────

export const examEvents = {
  list: (params = {}) => request(`/exam-events?${new URLSearchParams(params)}`),
  get: (id) => request(`/exam-events/${id}`),
  create: (body) => request("/exam-events", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) => request(`/exam-events/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  updateStatus: (id, status) => request(`/exam-events/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

// ─── QUESTION PAPERS ──────────────────────────────────────────────────────────

export const questionPapers = {
  list: (params = {}) => request(`/question-papers?${new URLSearchParams(params)}`),
  upload: (formData) => requestForm("/question-papers/upload", formData),
  delete: (id) => request(`/question-papers/${id}`, { method: "DELETE" }),
};

// ─── EVALUATION SCHEMAS ───────────────────────────────────────────────────────

export const evaluationSchemas = {
  list: (params = {}) => request(`/evaluation-schemas?${new URLSearchParams(params)}`),
  get: (id) => request(`/evaluation-schemas/${id}`),
  create: (body) => request("/evaluation-schemas", { method: "POST", body: JSON.stringify(body) }),
};

// ─── ANSWER BOOKLETS ──────────────────────────────────────────────────────────

export const answerBooklets = {
  list: (params = {}) => request(`/answer-booklets?${new URLSearchParams(params)}`),
  get: (id) => request(`/answer-booklets/${id}`),
  uploadBulk: (formData) => requestForm("/answer-booklets/upload-bulk", formData),
  assign: (id, facultyId) => request(`/answer-booklets/${id}/assign`, { method: "PATCH", body: JSON.stringify({ facultyId }) }),
  bulkAssign: (bookletIds, facultyId) => request("/answer-booklets/bulk-assign", { method: "POST", body: JSON.stringify({ bookletIds, facultyId }) }),
};

// ─── INTERNAL EVALUATION ──────────────────────────────────────────────────────

export const internalEval = {
  getAIEval: (bookletId) => request(`/internal-eval/booklet/${bookletId}/ai-eval`),
  getFacultyEval: (bookletId) => request(`/internal-eval/booklet/${bookletId}/faculty-eval`),
  getFacultyBooklets: (facultyId, params = {}) =>
    request(`/internal-eval/faculty/${facultyId}/booklets?${new URLSearchParams(params)}`),
  triggerAI: (bookletId, body = {}) =>
    request(`/internal-eval/booklet/${bookletId}/ai-evaluate`, { method: "POST", body: JSON.stringify(body) }),
  updateMarks: (bookletId, body) =>
    request(`/internal-eval/booklet/${bookletId}/marks`, { method: "PUT", body: JSON.stringify(body) }),
  freeze: (bookletId, body = {}) =>
    request(`/internal-eval/booklet/${bookletId}/freeze`, { method: "POST", body: JSON.stringify(body) }),
  unfreeze: (bookletId) =>
    request(`/internal-eval/booklet/${bookletId}/unfreeze`, { method: "POST" }),
};

// ─── CIE MARKS ────────────────────────────────────────────────────────────────

export const cieMarks = {
  list: (params = {}) => request(`/cie-marks?${new URLSearchParams(params)}`),
  getForStudent: (studentId, subjectId) =>
    request(`/cie-marks/student/${studentId}/subject/${subjectId}`),
  update: (studentId, subjectId, body) =>
    request(`/cie-marks/student/${studentId}/subject/${subjectId}`, { method: "PUT", body: JSON.stringify(body) }),
  compute: (body) => request("/cie-marks/compute", { method: "POST", body: JSON.stringify(body) }),
};

// ─── LAB MARKS ────────────────────────────────────────────────────────────────

export const labMarks = {
  list: (params = {}) => request(`/lab-marks?${new URLSearchParams(params)}`),
  getForStudent: (studentId, subjectId) =>
    request(`/lab-marks/student/${studentId}/subject/${subjectId}`),
  save: (body) => request("/lab-marks", { method: "POST", body: JSON.stringify(body) }),
  saveBulk: (entries) => request("/lab-marks/bulk", { method: "POST", body: JSON.stringify({ entries }) }),
  submit: (id) => request(`/lab-marks/${id}/submit`, { method: "PATCH" }),
};

// ─── EXTERNAL EXAM ────────────────────────────────────────────────────────────

export const externalExam = {
  booklets: {
    list: (params = {}) => request(`/external-exam/booklets?${new URLSearchParams(params)}`),
    upload: (formData) => requestForm("/external-exam/booklets/upload", formData),
    updateMarks: (bookletId, body) =>
      request(`/external-exam/booklets/${bookletId}/marks`, { method: "PUT", body: JSON.stringify(body) }),
    freeze: (bookletId, body = {}) =>
      request(`/external-exam/booklets/${bookletId}/freeze`, { method: "POST", body: JSON.stringify(body) }),
  },
  bundles: {
    list: (params = {}) => request(`/external-exam/bundles?${new URLSearchParams(params)}`),
    create: (body) => request("/external-exam/bundles/create", { method: "POST", body: JSON.stringify(body) }),
    aiEvaluate: (bundleId) =>
      request(`/external-exam/bundles/${bundleId}/ai-evaluate`, { method: "POST" }),
  },
  scrutinizer: {
    getPending: () => request("/external-exam/scrutinizer/pending"),
    review: (bookletId, body) =>
      request(`/external-exam/scrutinizer/review/${bookletId}`, { method: "POST", body: JSON.stringify(body) }),
  },
  dce: {
    getPending: (params = {}) => request(`/external-exam/dce/pending?${new URLSearchParams(params)}`),
    getRandomSample: (params = {}) => request(`/external-exam/dce/random-sample?${new URLSearchParams(params)}`),
    review: (body) => request("/external-exam/dce/review", { method: "POST", body: JSON.stringify(body) }),
  },
  central: {
    submit: (body) => request("/external-exam/central/submit", { method: "POST", body: JSON.stringify(body) }),
    declare: (body) => request("/external-exam/central/declare", { method: "POST", body: JSON.stringify(body) }),
    getSubmissions: (params = {}) => request(`/external-exam/central/submissions?${new URLSearchParams(params)}`),
  },
};

// ─── RESULTS ──────────────────────────────────────────────────────────────────

export const results = {
  list: (params = {}) => request(`/results?${new URLSearchParams(params)}`),
  getForStudent: (studentId) => request(`/results/student/${studentId}`),
  compute: (body) => request("/results/compute", { method: "POST", body: JSON.stringify(body) }),
  computeBulk: (body) => request("/results/compute-bulk", { method: "POST", body: JSON.stringify(body) }),
  declare: (body) => request("/results/declare", { method: "POST", body: JSON.stringify(body) }),
  getAnalytics: (subjectId, params = {}) =>
    request(`/results/analytics/${subjectId}?${new URLSearchParams(params)}`),
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export const notifications = {
  getForStudent: (studentId) => request(`/notifications/student/${studentId}`),
  getUnreadCount: (studentId) => request(`/notifications/unread-count/${studentId}`),
  markRead: (id) => request(`/notifications/${id}/read`, { method: "PUT" }),
  markAllRead: (studentId) => request(`/notifications/student/${studentId}/read-all`, { method: "PUT" }),
};

// ─── SCRIPT VIEW ──────────────────────────────────────────────────────────────

export const scriptView = {
  getInternalBooklet: (id) => request(`/answer-booklets/${id}/view`),
  listByStudent: (studentId) => request(`/answer-booklets?student=${studentId}`),
  listByFaculty: (facultyId) => request(`/answer-booklets?faculty=${facultyId}`),
};

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

export const auditLogs = {
  list: (params = {}) => request(`/audit-logs?${new URLSearchParams(params)}`),
};

// ─── OCR ──────────────────────────────────────────────────────────────────────

export const ocr = {
  evaluate: (formData) => requestForm("/ocr/evaluate", formData),
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export const dashboard = {
  getOverview: () => request("/dashboard/overview"),
  getFacultyStats: (facultyId) => request(`/dashboard/faculty/${facultyId}`),
  getExaminerStats: (examinerId) => request(`/dashboard/examiner/${examinerId}`),
  getDCEStats: (examEventId) => request(`/dashboard/dce/${examEventId}`),
  getDeptStats: (deptId, params = {}) =>
    request(`/dashboard/department/${deptId}?${new URLSearchParams(params)}`),
  getStudentStats: (studentId) => request(`/dashboard/student/${studentId}`),
};

// ─── HEALTH ───────────────────────────────────────────────────────────────────

export const health = () => request("/health");

export default {
  auth, colleges, regulations, academicYears, departments, semesters,
  subjects, sections, students, faculty, examEvents, questionPapers,
  evaluationSchemas, answerBooklets, internalEval, cieMarks, labMarks,
  externalExam, results, notifications, scriptView, auditLogs, ocr, dashboard, health,
};
