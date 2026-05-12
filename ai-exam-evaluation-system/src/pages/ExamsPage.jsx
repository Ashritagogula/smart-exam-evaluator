import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { examEvents as examEventsApi } from "../services/api.js";
import { Card, AUTable } from "../components/ui/Card";
import { GoldBtn, OutlineBtn } from "../components/ui/Buttons";
import Badge from "../components/ui/Badge";
import Breadcrumb from "../components/layout/Breadcrumb";
import Icon from "../components/ui/Icon";
import C from "../constants/colors";
import CreateExamForm  from "./exams/CreateExamForm.jsx";
import ExamDetailModal from "./exams/ExamDetailModal.jsx";
import EditExamModal   from "./exams/EditExamModal.jsx";

const EXAM_STATUSES = ["upcoming", "active", "completed", "cancelled"];

const ExamsPage = ({ toast }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [show,      setShow]      = useState(false);
  const [exams,     setExams]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [viewExam,  setViewExam]  = useState(null);
  const [editExam,  setEditExam]  = useState(null);
  const [statusMap, setStatusMap] = useState({});

  useEffect(() => {
    examEventsApi.list()
      .then(list => {
        const arr = Array.isArray(list) ? list : [];
        setExams(arr);
        const id = searchParams.get("id");
        if (id) {
          const match = arr.find(e => e._id === id);
          if (match) setViewExam(match);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openView = (exam) => {
    setViewExam(exam);
    setSearchParams({ id: exam._id }, { replace: true });
  };

  const closeView = () => {
    setViewExam(null);
    setSearchParams({}, { replace: true });
  };

  const handleStatusChange = async (id, status) => {
    setStatusMap(p => ({ ...p, [id]: status }));
    try {
      await examEventsApi.updateStatus(id, status);
      setExams(prev => prev.map(e => e._id === id ? { ...e, status } : e));
      toast && toast(`Status updated to "${status}".`);
    } catch (err) {
      toast && toast(err.message || "Status update failed.", "error");
      setStatusMap(p => { const n = { ...p }; delete n[id]; return n; });
    }
  };

  const handleSaved = (updated) => {
    setExams(prev => prev.map(e => e._id === updated._id ? { ...e, ...updated } : e));
  };

  return (
    <div className="page-anim">
      <Breadcrumb items={["Exam Cell", "Examinations"]} />

      {viewExam && <ExamDetailModal exam={viewExam} onClose={closeView} />}
      {editExam  && <EditExamModal  exam={editExam}  onClose={() => setEditExam(null)} onSaved={handleSaved} toast={toast} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <p style={{ fontSize: "13px", color: C.textMuted }}>
          Manage examinations. Subject coordinators are auto-populated from Manage Users assignments.
        </p>
        <GoldBtn onClick={() => setShow(s => !s)}>
          <Icon name="plus" size={14} color="#fff" />
          {show ? "Close Form" : "Create Exam"}
        </GoldBtn>
      </div>

      {show && <CreateExamForm onClose={() => setShow(false)} toast={toast} />}

      <Card title="All Examinations">
        <AUTable cols={["Dept", "Subject", "Sem", "Type", "Date", "Coordinator", "Sheets", "Evaluated", "Status", "Actions"]}>
          {loading ? (
            <tr><td colSpan={10} style={{ textAlign: "center", color: C.textMuted, padding: "20px", fontSize: "13px" }}>Loading examinations…</td></tr>
          ) : exams.length === 0 ? (
            <tr><td colSpan={10} style={{ textAlign: "center", color: C.textMuted, padding: "20px", fontSize: "13px" }}>No examinations found. Create one above.</td></tr>
          ) : exams.map(e => {
            const curStatus = statusMap[e._id] || e.status || "upcoming";
            return (
              <tr key={e._id}>
                <td><Badge text={e.department?.code || e.department?.name || "—"} type="navy" /></td>
                <td style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>
                  {e.title || e.subjects?.[0]?.title || "—"}
                  <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 400 }}>{e.subjects?.[0]?.courseCode || ""}</div>
                </td>
                <td>{e.semester?.number || e.semester?.name || "—"}</td>
                <td><Badge text={e.examType || e.type || "—"} type="gold" /></td>
                <td style={{ fontSize: 12, color: C.textMid }}>{e.examDate ? new Date(e.examDate).toLocaleDateString() : "—"}</td>
                <td style={{ fontSize: 12 }}>
                  {e.assignedTo?.name
                    ? <span style={{ fontWeight: 600, color: C.navy }}>{e.assignedTo.name}</span>
                    : <span style={{ color: C.textMuted }}>—</span>}
                </td>
                <td style={{ fontWeight: 600 }}>{e.totalBooklets ?? "—"}</td>
                <td style={{ fontWeight: 700, color: C.warning }}>{e.evaluatedBooklets ?? "—"}</td>
                <td>
                  <select
                    value={curStatus}
                    onChange={ev => handleStatusChange(e._id, ev.target.value)}
                    style={{
                      padding: "3px 7px", borderRadius: 5,
                      border: `1.5px solid ${curStatus === "completed" ? C.success : curStatus === "active" ? C.warning : curStatus === "cancelled" ? C.danger : C.border}`,
                      fontSize: 11, fontWeight: 700,
                      color: curStatus === "completed" ? C.success : curStatus === "active" ? C.warning : curStatus === "cancelled" ? C.danger : C.textMid,
                      background: "#fff", cursor: "pointer", fontFamily: "inherit", outline: "none",
                    }}>
                    {EXAM_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 5 }}>
                    <OutlineBtn style={{ fontSize: "11px", padding: "4px 10px" }} onClick={() => openView(e)}>View</OutlineBtn>
                    <button onClick={() => setEditExam(e)}
                      style={{ background: C.blueLight, border: `1px solid ${C.border}`, color: C.navy, borderRadius: 5, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </AUTable>
      </Card>
    </div>
  );
};

export default ExamsPage;
