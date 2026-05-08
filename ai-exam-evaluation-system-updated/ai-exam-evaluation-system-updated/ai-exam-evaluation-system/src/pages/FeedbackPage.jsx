import { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/Charts";
import Badge from "../components/ui/Badge";
import Breadcrumb from "../components/layout/Breadcrumb";
import { internalEval, answerBooklets } from "../services/api.js";

const FeedbackPage = ({ user }) => {
  const [booklets,  setBooklets]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [aiEval,    setAiEval]    = useState(null);
  const [facEval,   setFacEval]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [evalLoading, setEvalLoading] = useState(false);

  const studentId = user?.profile?._id || user?.profile?.id || user?.id;

  useEffect(() => {
    answerBooklets.list(studentId ? { student: studentId } : {})
      .then(bs => {
        const evaluated = bs.filter(b => ["ai_evaluated","faculty_reviewed","frozen","permanently_frozen"].includes(b.status));
        setBooklets(evaluated);
        if (evaluated.length > 0) loadEval(evaluated[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);

  const loadEval = (booklet) => {
    setSelected(booklet);
    setAiEval(null);
    setFacEval(null);
    setEvalLoading(true);
    Promise.all([
      internalEval.getAIEval(booklet._id).catch(() => null),
      internalEval.getFacultyEval(booklet._id).catch(() => null),
    ])
      .then(([ai, fe]) => { setAiEval(ai); setFacEval(fe); })
      .finally(() => setEvalLoading(false));
  };

  if (loading) {
    return (
      <div className="page-anim">
        <Breadcrumb items={["Student Portal", "AI Feedback"]} />
        <div style={{ padding:"40px", textAlign:"center", color:"#6478a0" }}>Loading your evaluations...</div>
      </div>
    );
  }

  if (booklets.length === 0) {
    return (
      <div className="page-anim">
        <Breadcrumb items={["Student Portal", "AI Feedback"]} />
        <div style={{ padding:"40px", textAlign:"center", color:"#6478a0" }}>
          No evaluated answer sheets available yet. Check back after your faculty reviews your answers.
        </div>
      </div>
    );
  }

  const totalMarks  = facEval?.finalMarks ?? aiEval?.totalMarks;
  const maxMarks    = aiEval?.maxMarks ?? 50;
  const pct         = totalMarks != null ? Math.round((totalMarks / maxMarks) * 100) : null;

  const gradeLabel = pct == null ? "—"
    : pct >= 90 ? "Outstanding"
    : pct >= 80 ? "Excellent"
    : pct >= 70 ? "Very Good"
    : pct >= 60 ? "Good"
    : pct >= 50 ? "Average"
    : "Needs Improvement";

  return (
    <div className="page-anim" style={{ maxWidth:"720px" }}>
      <Breadcrumb items={["Student Portal", "AI Feedback", selected?.subject?.title || "—"]} />

      {/* Booklet selector */}
      {booklets.length > 1 && (
        <div style={{ display:"flex", gap:"8px", marginBottom:"16px", flexWrap:"wrap" }}>
          {booklets.map(b => (
            <button
              key={b._id}
              onClick={() => loadEval(b)}
              style={{
                padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer",
                background: selected?._id === b._id ? "#002366" : "transparent",
                color:      selected?._id === b._id ? "#fff"    : "#002366",
                border:     selected?._id === b._id ? "1px solid #002366" : "1px solid #d0daf0",
              }}
            >
              {b.subject?.courseCode || b.subject?.title || "Exam"} – {b.examType}
            </button>
          ))}
        </div>
      )}

      <Card title={`Evaluation Feedback — ${selected?.subject?.title || selected?.subject?.courseCode || "Answer Sheet"}`}>
        {evalLoading ? (
          <div style={{ padding:"24px", textAlign:"center", color:"#6478a0" }}>Loading feedback...</div>
        ) : (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
              <div>
                <div style={{ fontFamily:"Merriweather,serif", fontSize:"15px", fontWeight:900, color:"#1a2744" }}>
                  {selected?.subject?.title} — {selected?.examType}
                </div>
                <div style={{ fontSize:"12px", color:"#6478a0", marginTop:"2px" }}>
                  Faculty: {facEval?.faculty?.name || "Pending review"} &nbsp;|&nbsp;
                  Status: {selected?.status?.replace(/_/g," ")}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"Merriweather,serif", fontSize:"36px", fontWeight:900, color:"#002366", lineHeight:1 }}>
                  {totalMarks ?? "—"}
                  <span style={{ fontSize:"16px", color:"#6478a0", fontWeight:400 }}>/{maxMarks}</span>
                </div>
                {pct != null && <Badge text={`${pct}% — ${gradeLabel}`} type={pct >= 70 ? "success" : pct >= 50 ? "gold" : "danger"} />}
              </div>
            </div>

            {aiEval ? (
              <>
                <div className="feedback-scores-grid">
                  {[
                    ["AI Score",      aiEval.totalMarks != null ? `${aiEval.totalMarks}/${aiEval.maxMarks}` : "—", "#002366"],
                    ["Faculty Score",  facEval?.finalMarks != null ? `${facEval.finalMarks}/${maxMarks}` : "Pending", "#0077b6"],
                    ["Questions",     aiEval.questionWiseMarks?.length ?? "—", "#f7941d"],
                  ].map(([l, v, c]) => (
                    <div key={l} className="feedback-score-card" style={{ borderTopColor:c }}>
                      <div className="feedback-score-val" style={{ color:c }}>{v}</div>
                      <div className="feedback-score-label">{l}</div>
                    </div>
                  ))}
                </div>

                {aiEval.questionWiseMarks?.length > 0 && (
                  <div style={{ marginBottom:"16px" }}>
                    <div style={{ fontSize:"12px", fontWeight:700, color:"#1a2744", marginBottom:"8px" }}>Question-wise Breakdown</div>
                    {aiEval.questionWiseMarks.map((q, i) => (
                      <div key={i} style={{ marginBottom:"10px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", marginBottom:"3px" }}>
                          <span style={{ fontWeight:600, color:"#1a2744" }}>Q{q.questionNumber || i+1}: {q.feedback?.slice(0, 60) || ""}</span>
                          <span style={{ color:"#6478a0" }}>{q.marksAwarded}/{q.maxMarks}</span>
                        </div>
                        <ProgressBar val={q.marksAwarded || 0} max={q.maxMarks || 1}
                          color={q.status === "correct" ? "#0a8a4a" : q.status === "partial" ? "#f7941d" : "#c0392b"} />
                      </div>
                    ))}
                  </div>
                )}

                <div className="feedback-analysis-grid">
                  <div className="feedback-box feedback-box-success">
                    <div className="feedback-box-head" style={{ color:"#0a8a4a" }}>✓ STRONG POINTS</div>
                    {aiEval.strengths?.length > 0
                      ? aiEval.strengths.map((p, i) => (
                          <div key={i} className="feedback-point" style={{ borderLeftColor:"#0a8a4a" }}>{p}</div>
                        ))
                      : <div className="feedback-point" style={{ color:"#6478a0" }}>No strengths recorded.</div>
                    }
                  </div>
                  <div className="feedback-box feedback-box-danger">
                    <div className="feedback-box-head" style={{ color:"#c0392b" }}>✗ AREAS TO IMPROVE</div>
                    {aiEval.weaknesses?.length > 0
                      ? aiEval.weaknesses.map((p, i) => (
                          <div key={i} className="feedback-point" style={{ borderLeftColor:"#c0392b" }}>{p}</div>
                        ))
                      : <div className="feedback-point" style={{ color:"#6478a0" }}>No weaknesses recorded.</div>
                    }
                  </div>
                </div>

                {aiEval.suggestions?.length > 0 && (
                  <div className="feedback-suggest">
                    <div className="feedback-suggest-head">AI Recommendation</div>
                    {aiEval.suggestions.map((s, i) => (
                      <p key={i} className="feedback-suggest-text">{s}</p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding:"24px", textAlign:"center", color:"#6478a0" }}>
                AI evaluation not yet available for this booklet.
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default FeedbackPage;
