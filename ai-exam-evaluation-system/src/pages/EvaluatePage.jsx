import { useState, useEffect } from "react";
import { Card, AUTable } from "../components/ui/Card";
import { GoldBtn, OutlineBtn } from "../components/ui/Buttons";
import Badge from "../components/ui/Badge";
import Breadcrumb from "../components/layout/Breadcrumb";
import { internalEval } from "../services/api.js";

const STATUS_TYPE = {
  pending: "warning",
  ai_evaluated: "info",
  faculty_reviewed: "gold",
  frozen: "success",
  permanently_frozen: "success",
};

const EvaluatePage = ({ user, setEvalModal }) => {
  const [booklets, setBooklets] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all");

  const facultyId = user?.profile?._id || user?.profile?.id;

  useEffect(() => {
    if (!facultyId) { setLoading(false); return; }
    internalEval.getFacultyBooklets(facultyId)
      .then(data => setBooklets(data))
      .catch(() => setBooklets([]))
      .finally(() => setLoading(false));
  }, [facultyId]);

  const filtered = filter === "all"
    ? booklets
    : booklets.filter(b => b.status === filter);

  const FILTERS = [
    { key:"all",              label:"All" },
    { key:"pending",          label:"Pending" },
    { key:"ai_evaluated",     label:"AI Done" },
    { key:"faculty_reviewed", label:"Reviewed" },
    { key:"frozen",           label:"Frozen" },
  ];

  return (
    <div className="page-anim">
      <Breadcrumb items={["Faculty", "Evaluation", "Assigned Sheets"]} />

      <div style={{ display:"flex", gap:"8px", marginBottom:"16px", flexWrap:"wrap" }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer",
              background: filter === f.key ? "#002366" : "transparent",
              color:      filter === f.key ? "#fff"    : "#002366",
              border:     filter === f.key ? "1px solid #002366" : "1px solid #d0daf0",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card title={`Assigned Answer Sheets (${filtered.length})`}>
        {loading ? (
          <div style={{ padding:"24px", textAlign:"center", color:"#6478a0" }}>Loading booklets...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:"24px", textAlign:"center", color:"#6478a0" }}>
            {filter === "all" ? "No booklets assigned yet." : `No booklets with status "${filter}".`}
          </div>
        ) : (
          <AUTable cols={["Student","Roll No","Subject","Exam Type","AI Marks","Faculty Marks","Status","Action"]}>
            {filtered.map((b) => {
              const ai  = b.aiEvaluation;
              const fe  = b.facultyEvaluation;
              return (
                <tr key={b._id}>
                  <td style={{ fontWeight:700, color:"#1a2744" }}>{b.student?.name || "—"}</td>
                  <td style={{ fontFamily:"monospace", fontSize:"12px" }}>{b.student?.rollNumber || "—"}</td>
                  <td>{b.subject?.courseCode} – {b.subject?.title}</td>
                  <td><Badge text={b.examType || "—"} type="navy" /></td>
                  <td>
                    {ai
                      ? <><span style={{ fontFamily:"Merriweather,serif", fontSize:"15px", fontWeight:900, color:"#002366" }}>{ai.totalMarks}</span><span style={{ fontSize:"10px", color:"#6478a0" }}>/{ai.maxMarks}</span></>
                      : <span style={{ color:"#6478a0" }}>—</span>
                    }
                  </td>
                  <td>
                    {fe?.finalMarks != null
                      ? <><span style={{ fontFamily:"Merriweather,serif", fontSize:"15px", fontWeight:900, color:"#0a8a4a" }}>{fe.finalMarks}</span><span style={{ fontSize:"10px", color:"#6478a0" }}>/50</span></>
                      : <span style={{ color:"#6478a0" }}>—</span>
                    }
                  </td>
                  <td><Badge text={b.status?.replace(/_/g," ")} type={STATUS_TYPE[b.status] || "info"} /></td>
                  <td>
                    <GoldBtn
                      onClick={() => setEvalModal && setEvalModal(b)}
                      style={{ padding:"5px 14px", fontSize:"12px" }}
                    >
                      Review
                    </GoldBtn>
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

export default EvaluatePage;
