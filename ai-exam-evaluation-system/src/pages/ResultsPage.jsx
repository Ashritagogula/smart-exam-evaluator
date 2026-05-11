import { useState, useEffect } from "react";
import { Card, AUTable } from "../components/ui/Card";
import { GoldBtn, OutlineBtn } from "../components/ui/Buttons";
import Badge from "../components/ui/Badge";
import Breadcrumb from "../components/layout/Breadcrumb";
import {
  results as resultsApi,
  examEvents as examEventsApi,
  students as studentsApi,
} from "../services/api.js";
import C from "../constants/colors";

const GRADE_COLOR = {
  O:"#0a8a4a", "A+":"#0a8a4a", A:"#0077b6", "B+":"#0077b6",
  B:"#002366", C:"#e0820a", D:"#e0820a", F:"#c0392b",
};

const inp = {
  padding: "6px 8px", fontSize: 13, border: `1px solid ${C.border}`,
  borderRadius: 5, outline: "none", boxSizing: "border-box", width: "100%",
};

// ── Compute + Declare modal ───────────────────────────────────────────────────
const ComputeModal = ({ event, onClose, onDeclared, toast }) => {
  const [students,   setStudents]   = useState([]);
  const [seeMarks,   setSeeMarks]   = useState({});   // { studentId: number }
  const [computed,   setComputed]   = useState([]);   // FinalResult[]
  const [loading,    setLoading]    = useState(true);
  const [computing,  setComputing]  = useState(false);
  const [declaring,  setDeclaring]  = useState(false);
  const [step,       setStep]       = useState("enter"); // "enter" | "preview"
  const [err,        setErr]        = useState("");

  const subjectId     = event.subjects?.[0]?._id;
  const academicYearId = event.academicYear?._id;
  const semesterId    = event.semester?._id;
  const regulationId  = event.regulation?._id;

  // Load students enrolled in this subject's department
  useEffect(() => {
    if (!event.department?._id) { setLoading(false); return; }
    studentsApi.list({ department: event.department._id })
      .then(list => {
        setStudents(list || []);
        const initMap = {};
        (list || []).forEach(s => { initMap[s._id] = ""; });
        setSeeMarks(initMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [event.department?._id]);

  const compute = async () => {
    if (!subjectId) return setErr("This exam event has no subject linked.");
    setErr(""); setComputing(true);
    try {
      const seeMarksMap = {};
      Object.entries(seeMarks).forEach(([id, val]) => {
        seeMarksMap[id] = parseFloat(val) || 0;
      });
      const res = await resultsApi.computeBulk({
        subjectId, academicYearId, semesterId, regulationId, seeMarksMap,
      });
      setComputed(res.results || []);
      setStep("preview");
    } catch (e) {
      setErr(e.message || "Computation failed.");
    } finally {
      setComputing(false);
    }
  };

  const declare = async () => {
    if (!subjectId) return;
    setDeclaring(true);
    try {
      await resultsApi.declare({ subjectId, academicYearId });
      toast?.(`Results declared for ${event.title || subjectId}!`);
      onDeclared(event._id);
      onClose();
    } catch (e) {
      setErr(e.message || "Declaration failed.");
    } finally {
      setDeclaring(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 12, width: "100%", maxWidth: 780,
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: C.navy, padding: "16px 20px", borderRadius: "12px 12px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>
              {step === "enter" ? "Enter SEE Marks & Compute" : "Computed Results — Preview"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 }}>
              {event.title || event.subjects?.[0]?.title || "Exam Event"} · {event.department?.name || ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: 20 }}>
          {err && (
            <div style={{ background: "#ffe6e6", color: "#b30000", padding: "8px 12px", borderRadius: 6, fontSize: 12, marginBottom: 14 }}>{err}</div>
          )}

          {/* Step 1 — Enter SEE marks */}
          {step === "enter" && (
            <>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>
                Enter the SEE (Semester End Exam) marks out of 100 for each student. Leave blank or 0 if not available. CIE marks are pulled automatically from saved evaluations.
              </div>
              {loading ? (
                <div style={{ padding: 20, textAlign: "center", color: C.textMuted }}>Loading students…</div>
              ) : students.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: C.textMuted }}>No students found for this department.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["Roll No", "Student Name", "SEE Marks (/100)"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={s._id} style={{ borderTop: `1px solid ${C.borderLight}`, background: i % 2 === 0 ? "#fafbff" : "#fff" }}>
                        <td style={{ padding: "7px 10px", fontFamily: "monospace", fontSize: 12, color: C.textMid }}>{s.rollNumber || "—"}</td>
                        <td style={{ padding: "7px 10px", fontWeight: 600, color: C.navy }}>{s.name}</td>
                        <td style={{ padding: "7px 10px", width: 140 }}>
                          <input
                            type="number" min={0} max={100}
                            value={seeMarks[s._id] ?? ""}
                            onChange={e => setSeeMarks(m => ({ ...m, [s._id]: e.target.value }))}
                            placeholder="0–100"
                            style={inp}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <GoldBtn onClick={compute} disabled={computing || loading || !subjectId}>
                  {computing ? "Computing…" : "Compute Results"}
                </GoldBtn>
                <OutlineBtn onClick={onClose}>Cancel</OutlineBtn>
              </div>
            </>
          )}

          {/* Step 2 — Preview computed results */}
          {step === "preview" && (
            <>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>
                Results computed. Review before declaring publicly to students.
              </div>

              {/* Summary stats */}
              {computed.length > 0 && (() => {
                const passed = computed.filter(r => r.isPassed).length;
                const avg    = computed.reduce((a, r) => a + (r.grandTotal || 0), 0) / computed.length;
                return (
                  <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                    {[
                      { label: "Total Students", val: computed.length, color: C.navy },
                      { label: "Passed",  val: passed,                 color: "#0a8a4a" },
                      { label: "Failed",  val: computed.length - passed, color: "#c0392b" },
                      { label: "Average", val: `${avg.toFixed(1)} / 100`, color: C.textMid },
                    ].map(s => (
                      <div key={s.label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 16px", minWidth: 110, textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {["Student", "Roll No", "CIE", "SEE", "Total", "Grade", "Result"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {computed.map((r, i) => (
                    <tr key={r._id || i} style={{ borderTop: `1px solid ${C.borderLight}`, background: i % 2 === 0 ? "#fafbff" : "#fff" }}>
                      <td style={{ padding: "7px 10px", fontWeight: 600, color: C.navy }}>{r.student?.name || "—"}</td>
                      <td style={{ padding: "7px 10px", fontFamily: "monospace", fontSize: 12 }}>{r.student?.rollNumber || "—"}</td>
                      <td style={{ padding: "7px 10px" }}>{r.totalCIE ?? "—"}</td>
                      <td style={{ padding: "7px 10px" }}>{r.totalSEE ?? "—"}</td>
                      <td style={{ padding: "7px 10px", fontWeight: 800, color: C.navy }}>{r.grandTotal ?? "—"}</td>
                      <td style={{ padding: "7px 10px", fontWeight: 900, color: GRADE_COLOR[r.grade] || C.navy }}>{r.grade || "—"}</td>
                      <td style={{ padding: "7px 10px" }}>
                        <Badge text={r.isPassed ? "Pass" : "Fail"} type={r.isPassed ? "success" : "danger"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: "flex", gap: 10 }}>
                <GoldBtn onClick={declare} disabled={declaring}>
                  {declaring ? "Declaring…" : "Declare Results (Publish to Students)"}
                </GoldBtn>
                <OutlineBtn onClick={() => setStep("enter")}>← Re-enter SEE Marks</OutlineBtn>
                <OutlineBtn onClick={onClose}>Close</OutlineBtn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Analytics modal per subject ───────────────────────────────────────────────
const AnalyticsModal = ({ subjectId, subjectTitle, onClose }) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    resultsApi.getAnalytics(subjectId)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subjectId]);

  const grades = data ? Object.entries(data.gradeDistribution || {}).sort((a, b) => a[0].localeCompare(b[0])) : [];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
        <div style={{ background: C.navy, padding: "14px 18px", borderRadius: "12px 12px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>Analytics — {subjectTitle}</div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 6, width: 28, height: 28, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          {loading ? (
            <div style={{ textAlign: "center", color: C.textMuted, padding: 20 }}>Loading…</div>
          ) : !data ? (
            <div style={{ textAlign: "center", color: C.textMuted, padding: 20 }}>No analytics available.</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  { l: "Students", v: data.totalStudents },
                  { l: "Pass %",   v: `${data.passPercentage}%` },
                  { l: "Average",  v: data.averageMarks },
                  { l: "Highest",  v: data.highestMarks },
                  { l: "Lowest",   v: data.lowestMarks },
                  { l: "Failed",   v: data.failCount },
                ].map(s => (
                  <div key={s.l} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: C.navy }}>{s.v}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{s.l}</div>
                  </div>
                ))}
              </div>
              {grades.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", marginBottom: 8 }}>Grade Distribution</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {grades.map(([g, cnt]) => (
                      <div key={g} style={{ background: (GRADE_COLOR[g] || C.navy) + "18", border: `1px solid ${GRADE_COLOR[g] || C.border}`, borderRadius: 6, padding: "6px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: GRADE_COLOR[g] || C.navy }}>{g}</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{cnt} students</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const ResultsPage = ({ toast, role, user }) => {
  const [examEvents,     setExamEvents]    = useState([]);
  const [studentResults, setStudentResults] = useState([]);
  const [loading,        setLoading]       = useState(true);
  const [computeEvent,   setComputeEvent]  = useState(null);
  const [analyticsSubj,  setAnalyticsSubj] = useState(null);

  const isStudent  = role === "student";
  const canCompute = ["admin","examcell","ce"].includes(role);
  const studentId  = user?.profile?._id || user?.profile?.id;

  useEffect(() => {
    if (isStudent && studentId) {
      resultsApi.getForStudent(studentId)
        .then(r => setStudentResults(r))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      examEventsApi.list()
        .then(events => setExamEvents(events || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isStudent, studentId]);

  const handleDeclared = (eventId) => {
    setExamEvents(prev => prev.map(e => e._id === eventId ? { ...e, resultsPublished: true } : e));
  };

  // ── Student view ─────────────────────────────────────────────────────────
  if (isStudent) {
    return (
      <div className="page-anim">
        <Breadcrumb items={["Student Portal", "My Results"]} />
        <Card title="My Examination Results">
          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#6478a0" }}>Loading results…</div>
          ) : studentResults.length > 0 ? (
            <AUTable cols={["Subject", "Code", "Semester", "CIE", "SEE", "Total", "Grade", "Status"]}>
              {studentResults.map(r => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 700, color: "#1a2744" }}>{r.subject?.title || "—"}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{r.subject?.courseCode || "—"}</td>
                  <td>{r.semester?.name || r.semester?.number || "—"}</td>
                  <td style={{ fontWeight: 600 }}>{r.totalCIE ?? "—"}</td>
                  <td style={{ fontWeight: 600 }}>{r.totalSEE ?? "—"}</td>
                  <td style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 15, color: "#002366" }}>
                    {r.isDeclared ? r.grandTotal : "—"}
                  </td>
                  <td>
                    {r.isDeclared
                      ? <span style={{ fontWeight: 900, color: GRADE_COLOR[r.grade] || "#002366" }}>{r.grade}</span>
                      : <span style={{ color: "#6478a0" }}>—</span>}
                  </td>
                  <td>
                    <Badge
                      text={r.isDeclared ? (r.isPassed ? "Pass" : "Fail") : "Pending"}
                      type={r.isDeclared ? (r.isPassed ? "success" : "danger") : "warning"}
                    />
                  </td>
                </tr>
              ))}
            </AUTable>
          ) : (
            <div style={{ padding: "24px", textAlign: "center", color: "#6478a0" }}>
              No results found. Results will appear here once declared by the Exam Cell.
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ── Admin / ExamCell / CE view ────────────────────────────────────────────
  return (
    <div className="page-anim">
      {computeEvent && (
        <ComputeModal
          event={computeEvent}
          onClose={() => setComputeEvent(null)}
          onDeclared={handleDeclared}
          toast={toast}
        />
      )}
      {analyticsSubj && (
        <AnalyticsModal
          subjectId={analyticsSubj.id}
          subjectTitle={analyticsSubj.title}
          onClose={() => setAnalyticsSubj(null)}
        />
      )}

      <Breadcrumb items={["Exam Cell", "Results Management"]} />

      {/* Workflow guide */}
      <div style={{
        display: "flex", gap: 0, marginBottom: 20, borderRadius: 10, overflow: "hidden",
        border: `1px solid ${C.border}`, fontSize: 12,
      }}>
        {[
          { n: "1", label: "Booklets Uploaded", desc: "Clerk uploads scanned answer sheets" },
          { n: "2", label: "AI + Faculty Evaluation", desc: "CIE marks computed from evaluations" },
          { n: "3", label: "Compute Results", desc: "Enter SEE marks → compute grand total" },
          { n: "4", label: "Declare Results", desc: "Publish to students" },
        ].map((s, i) => (
          <div key={s.n} style={{
            flex: 1, padding: "10px 14px",
            background: i === 2 ? C.navy : i === 3 ? "#0a8a4a" : C.bg,
            color: i >= 2 ? "#fff" : C.text,
            borderRight: i < 3 ? `1px solid ${C.border}` : "none",
          }}>
            <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 2, opacity: 0.9 }}>Step {s.n}</div>
            <div style={{ fontWeight: 700, fontSize: 12 }}>{s.label}</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      <Card title={`Exam Events — Results Management (${examEvents.length})`}>
        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#6478a0" }}>Loading…</div>
        ) : examEvents.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "#6478a0" }}>
            No exam events found. Create exams from the Exams page first.
          </div>
        ) : (
          <AUTable cols={["Examination", "Type", "Department", "Semester", "Status", "Actions"]}>
            {examEvents.map(e => {
              const subj = e.subjects?.[0];
              return (
                <tr key={e._id}>
                  <td style={{ fontWeight: 700, color: "#1a2744" }}>{e.title || subj?.title || "Exam"}</td>
                  <td><Badge text={e.examType || e.type || "—"} type="navy" /></td>
                  <td style={{ fontSize: 12 }}>{e.department?.name || e.department?.code || "—"}</td>
                  <td style={{ fontSize: 12 }}>{e.semester?.number ? `Sem ${e.semester.number}` : "—"}</td>
                  <td>
                    <Badge
                      text={e.resultsPublished ? "Declared" : e.status}
                      type={e.resultsPublished ? "success" : e.status === "active" ? "gold" : "warning"}
                    />
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {canCompute && (
                        <GoldBtn
                          onClick={() => setComputeEvent(e)}
                          style={{ padding: "4px 12px", fontSize: 11 }}
                        >
                          {e.resultsPublished ? "Re-Compute" : "Compute & Declare"}
                        </GoldBtn>
                      )}
                      {subj && (
                        <OutlineBtn
                          onClick={() => setAnalyticsSubj({ id: subj._id, title: subj.title || subj.courseCode })}
                          style={{ padding: "4px 10px", fontSize: 11 }}
                        >
                          Analytics
                        </OutlineBtn>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </AUTable>
        )}
      </Card>
    </div>
  );
};

export default ResultsPage;
