import { useState, useEffect } from "react";
import StatCard from "../../components/ui/StatCard";
import { Card } from "../../components/ui/Card";
import { BarChart } from "../../components/ui/Charts";
import Badge from "../../components/ui/Badge";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { dashboard as dashboardApi, results as resultsApi, notifications as notifApi } from "../../services/api.js";

const GRADE_COLOR = { O:"#0a8a4a", "A+":"#0a8a4a", A:"#0077b6", "B+":"#0077b6", B:"#002366", C:"#e0820a", D:"#e0820a", F:"#c0392b" };

const StudentDashboard = ({ user }) => {
  const [stats,         setStats]    = useState(null);
  const [results,       setResults]  = useState([]);
  const [notifications, setNotifs]   = useState([]);
  const [loading,       setLoading]  = useState(true);

  const studentId = user?.profile?._id || user?.id;

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    Promise.all([
      dashboardApi.getStudentStats(studentId),
      resultsApi.getForStudent(studentId),
      notifApi.getForStudent(studentId),
    ])
      .then(([st, res, notifs]) => {
        setStats(st);
        setResults(res);
        setNotifs(notifs.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);

  const profile = user?.profile || {};
  const displayName  = user?.name || profile.name || "Student";
  const rollNumber   = profile.rollNumber || "—";
  const department   = profile.department?.code || profile.department?.name || "—";
  const semester     = profile.currentSemester || "—";
  const section      = profile.section?.name || "—";

  const chartData = results.slice(0, 6).map(r => ({
    l: r.subject?.courseCode || r.subject?.title?.slice(0, 4) || "?",
    v: r.grandTotal ? Math.round((r.grandTotal / 100) * 100) : 0,
  }));

  const sgpa = stats?.sgpa ?? (results.length
    ? (results.reduce((a, r) => a + (r.gradePoints || 0), 0) / results.length).toFixed(2)
    : "—");

  return (
    <div className="page-anim">
      <Breadcrumb items={["Student Portal", "Dashboard"]} />

      <div className="student-banner">
        <div className="student-avatar-lg">{user?.av || displayName.slice(0, 2).toUpperCase()}</div>
        <div style={{ flex:1 }}>
          <div className="student-banner-name">{displayName}</div>
          <div className="student-banner-sub">
            {rollNumber} &bull; {department} &bull; Semester {semester} &bull; Section {section}
          </div>
          <div style={{ display:"flex", gap:"8px", marginTop:"8px" }}>
            <Badge text={`SGPA: ${sgpa}`} type="gold" />
            <Badge text={`Semester ${semester}`} type="navy" />
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div className="student-cgpa-val">{sgpa}</div>
          <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.45)" }}>SGPA</div>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="SGPA"          value={loading ? "…" : sgpa}                       sub="Current semester"    icon="star"  accent="gold"  />
        <StatCard title="Subjects"      value={loading ? "…" : stats?.totalSubjects ?? results.length} sub="Enrolled" icon="exam"  accent="navy"  />
        <StatCard title="Declared"      value={loading ? "…" : stats?.declaredResults ?? results.filter(r=>r.isDeclared).length} sub="Results out" icon="chart" accent="blue" />
        <StatCard title="Notifications" value={loading ? "…" : stats?.pendingNotifications ?? notifications.filter(n=>!n.isRead).length} sub="Unread" icon="ai" accent="green" />
      </div>

      <div className="grid-1-1">
        <Card title="Recent Examination Results">
          {loading ? (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>Loading results...</div>
          ) : results.length > 0 ? results.slice(0, 5).map((r) => (
            <div key={r._id} className="result-row">
              <div>
                <div className="result-subject">{r.subject?.title || r.subject?.courseCode || "Subject"}</div>
                <div className="result-sub">
                  {r.isDeclared
                    ? `${r.grandTotal ?? "—"}/100 marks · CIE: ${r.totalCIE ?? "—"} · SEE: ${r.totalSEE ?? "—"}`
                    : "Result not yet declared"}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div className="result-grade" style={{ color: GRADE_COLOR[r.grade] || "#002366" }}>
                  {r.isDeclared ? r.grade : "—"}
                </div>
                <div className="result-pct">
                  {r.isDeclared && r.grandTotal != null ? `${Math.round(r.grandTotal)}%` : "Pending"}
                </div>
              </div>
            </div>
          )) : (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>No results available yet.</div>
          )}
        </Card>

        <Card title="Subject-wise Performance">
          {loading ? (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>Loading...</div>
          ) : chartData.length > 0 ? (
            <BarChart data={chartData} />
          ) : (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>No declared results to chart yet.</div>
          )}
        </Card>
      </div>

      {notifications.length > 0 && (
        <Card title="Recent Notifications" style={{ marginTop:"16px" }}>
          {notifications.map((n, i) => (
            <div key={n._id || i} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"10px 0", borderBottom:"1px solid #edf0f8" }}>
              <div>
                <div style={{ fontWeight:600, color:"#1a2744", fontSize:13 }}>{n.title || "Notification"}</div>
                <div style={{ fontSize:12, color:"#6478a0", marginTop:2 }}>{n.message}</div>
              </div>
              <Badge text={n.isRead ? "Read" : "New"} type={n.isRead ? "info" : "gold"} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

export default StudentDashboard;
