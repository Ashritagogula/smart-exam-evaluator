import { useState, useEffect } from "react";
import StatCard from "../../components/ui/StatCard";
import { Card } from "../../components/ui/Card";
import { BarChart, DonutChart, ProgressBar } from "../../components/ui/Charts";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { dashboard as dashboardApi, departments as deptsApi, examEvents as examEventsApi } from "../../services/api.js";

const AdminDashboard = ({ user }) => {
  const [stats,   setStats]   = useState(null);
  const [depts,   setDepts]   = useState([]);
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.getOverview(),
      deptsApi.list(),
      examEventsApi.list(),
    ])
      .then(([ov, ds, ev]) => {
        setStats(ov);
        setDepts(ds.slice(0, 5));
        setEvents(ev);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const DEPT_COLORS = ["#002366","#0077b6","#e0820a","#0d4a8a","#0a8a4a"];

  // Build 7-day activity from events (mock per-day from totals)
  const weekDays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const bookletVal = stats?.totalBooklets || 0;
  const activityData = weekDays.map((l, i) => ({
    l,
    v: Math.max(0, Math.round(bookletVal / 7 * (0.7 + Math.sin(i) * 0.3))),
  }));

  const aiPct = stats
    ? Math.round((stats.frozenBooklets / Math.max(stats.totalBooklets, 1)) * 100)
    : 0;

  return (
    <div className="page-anim">
      <Breadcrumb items={["Admin", "Dashboard"]} />
      <div className="stats-grid">
        <StatCard title="Total Students"  value={loading ? "…" : stats?.totalStudents ?? "—"}  sub="Active this semester"    icon="cap"   accent="navy"  />
        <StatCard title="Total Faculty"   value={loading ? "…" : stats?.totalFaculty ?? "—"}   sub="Across all departments"  icon="users" accent="blue"  />
        <StatCard title="Exams Conducted" value={loading ? "…" : stats?.totalExamEvents ?? "—"} sub="Created exam events"    icon="exam"  accent="gold"  />
        <StatCard title="AI Evaluations"  value={loading ? "…" : stats?.totalBooklets ?? "—"}  sub={`${stats?.frozenBooklets ?? 0} frozen`} icon="ai" accent="green" />
      </div>

      <div className="grid-2-1 mb-16">
        <Card title="Evaluation Activity — Booklet Progress">
          {loading ? (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>Loading...</div>
          ) : (
            <BarChart data={activityData} />
          )}
        </Card>
        <Card title="Evaluation Completion">
          {loading ? (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>Loading...</div>
          ) : (
            <div style={{ display:"flex", justifyContent:"space-around", paddingTop:"8px" }}>
              <DonutChart pct={aiPct} color="#0a8a4a" label="Frozen" />
              <DonutChart
                pct={stats ? Math.round((stats.declaredResults / Math.max(stats.totalResults, 1)) * 100) : 0}
                color="#0077b6"
                label="Declared"
              />
              <DonutChart
                pct={stats ? Math.round(((stats.totalBooklets - stats.pendingBooklets) / Math.max(stats.totalBooklets, 1)) * 100) : 0}
                color="#f7941d"
                label="Processed"
              />
            </div>
          )}
        </Card>
      </div>

      <Card title="Department Overview">
        {loading ? (
          <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>Loading departments...</div>
        ) : depts.length > 0 ? (
          <div className="dept-overview-grid">
            {depts.map((d, i) => (
              <div key={d._id} className="dept-card" style={{ borderTopColor: DEPT_COLORS[i % DEPT_COLORS.length] }}>
                <div className="dept-card-code" style={{ color: DEPT_COLORS[i % DEPT_COLORS.length] }}>{d.code}</div>
                <div className="dept-card-info">{d.name}</div>
                <div style={{ fontSize:"11px", color:"#6478a0", marginTop:"4px" }}>
                  HOD: {d.hod?.name || "Not assigned"}
                </div>
                <ProgressBar val={i + 1} max={depts.length + 1} color={DEPT_COLORS[i % DEPT_COLORS.length]} showPct={false} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>No departments found. Add departments from the admin panel.</div>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboard;
