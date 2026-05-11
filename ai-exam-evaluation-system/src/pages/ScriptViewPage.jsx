import { useState, useEffect } from "react";
import Breadcrumb from "../components/layout/Breadcrumb";
import { answerBooklets } from "../services/api.js";

const C = {
  navy: "#002366", blue: "#0077b6", gold: "#f7941d",
  green: "#0a8a4a", danger: "#dc2626", border: "#d0daf0",
  bg: "#f0f4fb", card: "#ffffff", text: "#1a2744", sub: "#6478a0", muted: "#94a3b8",
};

const statusColor = (s) => ({
  permanently_frozen: C.green, frozen: C.green,
  ai_evaluated: C.gold, faculty_evaluated: C.blue,
  uploaded: C.muted, pending: C.muted,
}[s] || C.muted);

const Pill = ({ children, color = C.blue }) => (
  <span style={{
    display: "inline-block", padding: "2px 9px", borderRadius: 99,
    fontSize: 11, fontWeight: 700, color, background: `${color}18`,
  }}>
    {children}
  </span>
);

// Modal to view the scanned booklet file + AI/faculty evaluation
function ScriptModal({ booklet, onClose }) {
  const fileUrl = booklet.fileUrl ? `/uploads/booklets/${booklet.fileUrl.split("/").pop()}` : null;
  const ai      = booklet.aiEvaluation;
  const faculty = booklet.facultyEvaluation;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,50,0.55)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      zIndex: 9999, overflowY: "auto", padding: "32px 16px",
    }} onClick={onClose}>
      <div style={{
        background: C.card, borderRadius: 14, width: "100%", maxWidth: 900,
        boxShadow: "0 20px 60px rgba(0,0,50,0.35)", overflow: "hidden",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: C.navy, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>
            Script View — {booklet.subject?.courseCode} | {booklet.student?.rollNumber || booklet.barcode}
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.12)", border: "none", color: "#fff",
            borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16,
          }}>✕</button>
        </div>

        <div style={{ padding: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Script preview */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Answer Script
            </div>
            {fileUrl ? (
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                <iframe
                  src={fileUrl}
                  title="Answer Script"
                  style={{ width: "100%", height: 480, border: "none", display: "block" }}
                />
                <div style={{ padding: "8px 12px", background: C.bg, borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: C.blue, fontWeight: 700, textDecoration: "none" }}>
                    Open in New Tab ↗
                  </a>
                </div>
              </div>
            ) : (
              <div style={{
                background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 10,
                padding: "48px 24px", textAlign: "center", color: C.muted, fontSize: 13,
              }}>
                Script file not available for this booklet.
              </div>
            )}
          </div>

          {/* Evaluation details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Booklet info */}
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Booklet Info
              </div>
              {[
                ["Student", booklet.student?.name],
                ["Roll No.", booklet.student?.rollNumber],
                ["Subject", booklet.subject?.title],
                ["Exam Type", booklet.examType],
                ["Status", booklet.status],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                  <span style={{ color: C.sub, fontWeight: 600 }}>{label}</span>
                  <span style={{ color: C.text, fontWeight: 700 }}>{value || "—"}</span>
                </div>
              ))}
            </div>

            {/* AI Evaluation */}
            {ai && (
              <div style={{ background: "#eff6ff", border: `1px solid ${C.blue}33`, borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  AI Evaluation
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: C.sub }}>Total Marks</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: C.blue }}>{ai.totalMarks} / {ai.maxMarks}</span>
                </div>
                {(ai.questionWiseMarks || []).map((q, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", borderBottom: `1px solid #e0e8f8` }}>
                    <span style={{ color: C.sub }}>Q{q.questionNumber}</span>
                    <span style={{ fontWeight: 700, color: C.navy }}>{q.marksAwarded} / {q.maxMarks}</span>
                  </div>
                ))}
                {ai.strengths?.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: C.green }}>
                    <strong>Strengths:</strong> {ai.strengths.slice(0, 2).join("; ")}
                  </div>
                )}
              </div>
            )}

            {/* Faculty Evaluation */}
            {faculty && (
              <div style={{ background: "#f0fdf4", border: `1px solid ${C.green}33`, borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Faculty Evaluation
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: C.sub }}>Final Marks</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: C.green }}>{faculty.finalMarks}</span>
                </div>
                {(faculty.modifiedQuestions || []).length > 0 && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                    {faculty.modifiedQuestions.length} question(s) modified from AI assessment.
                  </div>
                )}
              </div>
            )}

            {!ai && !faculty && (
              <div style={{ background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 10, padding: "24px", textAlign: "center", color: C.muted, fontSize: 13 }}>
                Evaluation not yet completed.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ScriptViewPage = ({ user }) => {
  const [booklets, setBooklets] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [viewing,  setViewing]  = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const studentId = user?.profile?._id || user?.id;

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    answerBooklets.list({ student: studentId })
      .then(data => setBooklets(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);

  const openScript = async (booklet) => {
    setDetailLoading(true);
    try {
      const detail = await fetch(`/api/answer-booklets/${booklet._id}/view`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("au_token")}` },
      }).then(r => r.json());
      setViewing(detail);
    } catch {
      setViewing(booklet);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 840 }}>
      {viewing && <ScriptModal booklet={viewing} onClose={() => setViewing(null)} />}

      <Breadcrumb items={["Student Portal", "My Answer Scripts"]} />
      <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 4 }}>My Answer Scripts</div>
      <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>
        View your scanned answer booklets along with AI and faculty evaluation details.
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.sub }}>Loading…</div>
      ) : booklets.length === 0 ? (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: "48px", textAlign: "center",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 14, color: C.muted }}>No answer scripts found for your account.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {booklets.map((b, i) => (
            <div key={b._id || i} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
              boxShadow: "0 2px 8px rgba(0,35,102,0.05)",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: C.bg,
                border: `1px solid ${C.border}`, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 20, flexShrink: 0,
              }}>📋</div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>
                  {b.subject?.title || b.subject?.courseCode || "Unknown Subject"}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Pill color={C.navy}>{b.examType || "IE"}</Pill>
                  <Pill color={statusColor(b.status)}>{b.status || "pending"}</Pill>
                  {b.subject?.courseCode && <Pill color={C.blue}>{b.subject.courseCode}</Pill>}
                </div>
              </div>

              <div style={{ fontSize: 11, color: C.muted, textAlign: "right", marginRight: 12 }}>
                {b.uploadDate ? new Date(b.uploadDate).toLocaleDateString() : "—"}
              </div>

              <button
                onClick={() => openScript(b)}
                disabled={detailLoading}
                style={{
                  background: `linear-gradient(135deg, ${C.navy}, ${C.blue})`,
                  color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px",
                  fontSize: 12, fontWeight: 700, cursor: detailLoading ? "not-allowed" : "pointer",
                  opacity: detailLoading ? 0.7 : 1, whiteSpace: "nowrap", fontFamily: "inherit",
                }}
              >
                View Script
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScriptViewPage;
