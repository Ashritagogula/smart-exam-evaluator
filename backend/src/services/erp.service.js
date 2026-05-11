/**
 * ERP/LMS Integration Adapter
 *
 * Provides a standardized adapter layer for integrating AEES with university
 * ERP systems (SAP, Oracle, in-house) and Learning Management Systems (Moodle, Canvas).
 * All outbound calls use the configured ERP_BASE_URL environment variable.
 */

const ERP_BASE_URL   = process.env.ERP_BASE_URL   || "";
const ERP_API_KEY    = process.env.ERP_API_KEY     || "";
const LMS_BASE_URL   = process.env.LMS_BASE_URL    || "";
const LMS_API_KEY    = process.env.LMS_API_KEY     || "";

async function erpPost(endpoint, payload) {
  if (!ERP_BASE_URL) throw new Error("ERP_BASE_URL is not configured");
  const res = await fetch(`${ERP_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": ERP_API_KEY,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ERP sync failed [${res.status}]: ${text}`);
  }
  return res.json();
}

async function lmsPost(endpoint, payload) {
  if (!LMS_BASE_URL) throw new Error("LMS_BASE_URL is not configured");
  const res = await fetch(`${LMS_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LMS_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LMS sync failed [${res.status}]: ${text}`);
  }
  return res.json();
}

/**
 * Push a student's declared final result to the university ERP.
 * Called automatically after CE declares results.
 */
export const syncResultToERP = async (result) => {
  const payload = {
    rollNumber:    result.student?.rollNumber,
    courseCode:    result.subject?.courseCode,
    academicYear:  result.academicYear?.year,
    semester:      result.semester?.number,
    totalMarks:    result.grandTotal,
    grade:         result.grade,
    gradePoints:   result.gradePoints,
    isPassed:      result.isPassed,
    declaredAt:    result.declaredAt,
    source:        "AEES",
  };
  return erpPost("/api/v1/results/sync", payload);
};

/**
 * Sync CIE (internal marks) to ERP for attendance/progress records.
 */
export const syncCIEToERP = async (cieMarks) => {
  const payload = {
    rollNumber:  cieMarks.student?.rollNumber,
    courseCode:  cieMarks.subject?.courseCode,
    ie1Marks:    cieMarks.IE1?.marks,
    ie2Marks:    cieMarks.IE2?.marks,
    cieTheory:   cieMarks.cieTheory,
    source:      "AEES",
  };
  return erpPost("/api/v1/cie-marks/sync", payload);
};

/**
 * Push student enrollment data from ERP into AEES (used during onboarding).
 * Returns normalized student objects ready for AEES Student model creation.
 */
export const fetchStudentsFromERP = async (academicYearCode, semesterNumber) => {
  if (!ERP_BASE_URL) throw new Error("ERP_BASE_URL is not configured");
  const res = await fetch(
    `${ERP_BASE_URL}/api/v1/students?academicYear=${academicYearCode}&semester=${semesterNumber}`,
    { headers: { "X-Api-Key": ERP_API_KEY } }
  );
  if (!res.ok) throw new Error(`ERP fetch failed [${res.status}]`);
  const data = await res.json();
  return (data.students || []).map(s => ({
    rollNumber:  s.rollNo || s.roll_number,
    name:        s.name,
    email:       s.email,
    phone:       s.mobile,
    department:  s.departmentCode,
    regulation:  s.regulationCode,
    semester:    s.semester,
  }));
};

/**
 * Sync faculty subject mappings from LMS course enrollments.
 */
export const syncFacultyMappingsFromLMS = async (courseId) => {
  if (!LMS_BASE_URL) throw new Error("LMS_BASE_URL is not configured");
  const res = await fetch(
    `${LMS_BASE_URL}/api/courses/${courseId}/instructors`,
    { headers: { "Authorization": `Bearer ${LMS_API_KEY}` } }
  );
  if (!res.ok) throw new Error(`LMS fetch failed [${res.status}]`);
  const data = await res.json();
  return (data.instructors || []).map(i => ({
    employeeId: i.staffId || i.employee_id,
    name:       i.name,
    email:      i.email,
    courseCode: i.courseCode,
  }));
};

/**
 * Push grade report to LMS gradebook after results are declared.
 */
export const pushGradesToLMS = async (subjectCode, gradeEntries) => {
  const payload = {
    courseCode: subjectCode,
    grades: gradeEntries.map(e => ({
      rollNumber: e.student?.rollNumber,
      grade:      e.grade,
      marks:      e.grandTotal,
      isPassed:   e.isPassed,
    })),
    syncedAt: new Date().toISOString(),
    source:   "AEES",
  };
  return lmsPost(`/api/gradebook/bulk-update`, payload);
};
