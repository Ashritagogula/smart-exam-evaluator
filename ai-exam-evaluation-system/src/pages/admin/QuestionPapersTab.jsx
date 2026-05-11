import { useState, useEffect } from "react";
import { questionPapers as questionPapersApi } from "../../services/api.js";
import { Card } from "../../components/ui/Card";
import C from "../../constants/colors";

const QuestionPapersTab = ({ toast }) => {
  const [papers,   setPapers]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    questionPapersApi.list()
      .then(data => setPapers(Array.isArray(data) ? data : data.questionPapers || data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete question paper "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await questionPapersApi.delete(id);
      setPapers(prev => prev.filter(p => p._id !== id));
      toast.show("Question paper deleted.");
    } catch (e) {
      toast.show(e.message || "Failed to delete.", "error");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card title="Question Papers">
      {loading ? (
        <div style={{ padding: "16px", color: C.textMuted, fontSize: 13 }}>Loading…</div>
      ) : papers.length === 0 ? (
        <div style={{ padding: "16px", color: C.textMuted, fontSize: 13 }}>
          No question papers uploaded yet. Upload them via the Exams page.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.bg }}>
              {["Subject", "Exam Event", "Uploaded By", "Date", "Action"].map(h => (
                <th key={h} style={{ padding: "9px 10px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {papers.map((p, i) => (
              <tr key={p._id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbff", borderBottom: `1px solid ${C.borderLight}` }}>
                <td style={{ padding: "9px 10px", fontWeight: 600 }}>
                  {p.subject?.title || p.subject?.courseCode || p.subject || "—"}
                </td>
                <td style={{ padding: "9px 10px", color: C.textMid }}>
                  {p.examEvent?.name || p.examEvent?.examType || p.examEvent || "—"}
                </td>
                <td style={{ padding: "9px 10px", color: C.textMid }}>
                  {p.uploadedBy?.name || p.uploadedBy || "—"}
                </td>
                <td style={{ padding: "9px 10px", color: C.textMuted, fontSize: 11 }}>
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                </td>
                <td style={{ padding: "9px 10px" }}>
                  <button
                    onClick={() => handleDelete(p._id, p.subject?.title || p._id)}
                    disabled={deleting === p._id}
                    style={{ background: "transparent", border: `1px solid ${C.danger}`, color: C.danger, borderRadius: 5, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: deleting === p._id ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: deleting === p._id ? 0.5 : 1 }}>
                    {deleting === p._id ? "Deleting…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
};

export default QuestionPapersTab;
