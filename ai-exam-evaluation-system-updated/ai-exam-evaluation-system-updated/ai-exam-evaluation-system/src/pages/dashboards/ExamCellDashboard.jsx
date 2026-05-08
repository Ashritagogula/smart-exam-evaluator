import { useState, useEffect } from "react";
import StatCard from "../../components/ui/StatCard";
import { Card } from "../../components/ui/Card";
import { ProgressBar } from "../../components/ui/Charts";
import { GoldBtn, OutlineBtn } from "../../components/ui/Buttons";
import Badge from "../../components/ui/Badge";
import Breadcrumb from "../../components/layout/Breadcrumb";
import Icon from "../../components/ui/Icon";
import { dashboard as dashboardApi, examEvents as examEventsApi, faculty as facultyApi } from "../../services/api.js";

const ExamCellDashboard = ({ onNav, user }) => {
  const [stats, setStats]       = useState({ totalExamEvents:0, totalBooklets:0, pendingBooklets:0, frozenBooklets:0 });
  const [events, setEvents]     = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.getOverview(),
      examEventsApi.list({ status: "active" }),
      facultyApi.list({ role: "faculty" }),
    ])
      .then(([ov, ev, fac]) => {
        setStats(ov);
        setEvents(ev.slice(0, 4));
        setFaculties(fac.slice(0, 4));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-anim">
      <Breadcrumb items={["Exam Cell", "Dashboard"]} />
      <div className="stats-grid">
        <StatCard title="Active Exams"      value={loading ? "…" : stats.totalExamEvents}  sub="Created exam events"       icon="exam"   accent="navy"  />
        <StatCard title="Sheets Uploaded"   value={loading ? "…" : stats.totalBooklets}    sub={`Pending: ${stats.pendingBooklets}`} icon="upload" accent="gold" />
        <StatCard title="Evaluations Done"  value={loading ? "…" : stats.frozenBooklets}   sub="Frozen / completed"        icon="check"  accent="green" />
        <StatCard title="Total Faculty"     value={loading ? "…" : stats.totalFaculty}     sub="Active faculty members"    icon="users"  accent="blue"  />
      </div>

      <div className="grid-3-2 mb-16">
        <Card
          title="Evaluation Progress"
          action={<OutlineBtn onClick={() => onNav("exams")} style={{ background:"transparent", color:"rgba(255,255,255,0.7)", border:"1px solid rgba(255,255,255,0.25)", fontSize:"11px", padding:"4px 12px" }}>View All</OutlineBtn>}
        >
          {loading ? (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>Loading...</div>
          ) : events.length > 0 ? events.map((e) => (
            <div key={e._id} style={{ marginBottom:"14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
                <span style={{ fontSize:"12px", fontWeight:600, color:"#1a2744" }}>
                  {e.title || e.subjects?.[0]?.title || "Exam"} — {e.department?.code || "—"}
                </span>
                <Badge text={e.status} type={e.status==="completed"?"success":e.status==="active"?"warning":"info"} />
              </div>
              <ProgressBar val={e.status === "completed" ? 100 : 60} max={100} color={e.status==="completed"?"#0a8a4a":"#002366"} />
            </div>
          )) : (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>No active exams. Create one from Exams page.</div>
          )}
        </Card>

        <Card title="Quick Actions">
          <div className="quick-actions-grid">
            {[["Create Exam","plus","exams"],["Upload Sheets","upload","upload"],["Assign Faculty","users","examusers"],["Publish Results","star","results"]].map(([l,ic,s]) => (
              <button key={l} className="quick-action-btn" onClick={() => onNav(s)}>
                <Icon name={ic} size={22} color="#002366" />
                <div className="quick-action-label">{l}</div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Faculty Assignment Status">
        <table className="au-table">
          <thead><tr className="au-table-head">
            {["Faculty","Department","Role","Status"].map(h => <th key={h}>{h}</th>)}
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign:"center", padding:"16px", color:"#6478a0" }}>Loading faculty...</td></tr>
            ) : faculties.length > 0 ? faculties.map((f, i) => (
              <tr key={f._id || i}>
                <td style={{ fontWeight:600, color:"#1a2744" }}>{f.name}</td>
                <td>{f.department?.name || f.department?.code || "—"}</td>
                <td><Badge text={f.primaryRole} type="navy" /></td>
                <td><Badge text={f.isActive ? "Active" : "Inactive"} type={f.isActive ? "success" : "danger"} /></td>
              </tr>
            )) : (
              <tr><td colSpan={4} style={{ textAlign:"center", padding:"12px", color:"#6478a0" }}>No faculty found</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default ExamCellDashboard;
