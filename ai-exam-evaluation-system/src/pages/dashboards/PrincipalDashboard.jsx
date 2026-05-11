import { useState, useEffect } from "react";
import StatCard from "../../components/ui/StatCard";
import { Card } from "../../components/ui/Card";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { dashboard as dashboardApi, departments as deptsApi, results as resultsApi } from "../../services/api.js";

const PrincipalDashboard = ({ user }) => {
  const [overview, setOverview] = useState(null);
  const [depts,    setDepts]    = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.getOverview(),
      deptsApi.list(),
    ])
      .then(([ov, ds]) => {
        setOverview(ov);
        setDepts(ds.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total  = overview?.totalResults || 0;
  const decl   = overview?.declaredResults || 0;
  const passPct = loading ? "—" : (total > 0 ? `${Math.round((decl / total) * 100)}%` : "—");

  const COLORS = ["#002366","#0077b6","#e0820a","#0d4a8a","#0a8a4a"];

  return (
    <div className="page-anim">
      <Breadcrumb items={["Principal", "Dashboard"]} />
      <div className="stats-grid">
        <StatCard title="Total Students"  value={loading ? "…" : overview?.totalStudents  ?? "—"} sub="All departments"    icon="cap"   accent="navy"  />
        <StatCard title="Departments"     value={loading ? "…" : depts.length}                    sub="Academic depts"     icon="dept"  accent="blue"  />
        <StatCard title="Results Declared" value={loading ? "…" : passPct}                        sub="Of total results"   icon="trend" accent="gold"  />
        <StatCard title="AI Evaluations"  value={loading ? "…" : overview?.totalBooklets  ?? "—"} sub={`${overview?.frozenBooklets ?? 0} frozen`} icon="ai" accent="green" />
      </div>

      <Card title="Department Overview">
        {loading ? (
          <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>Loading departments...</div>
        ) : depts.length > 0 ? (
          <div className="dept-perf-grid">
            {depts.map((d, i) => (
              <div key={d._id} className="perf-card" style={{ borderTopColor: COLORS[i % COLORS.length] }}>
                <div className="perf-card-avg" style={{ color: COLORS[i % COLORS.length] }}>{d.code}</div>
                <div className="perf-card-sub">{d.name}</div>
                <div className="perf-card-code">{d.hod?.name || "HOD: —"}</div>
                <div className="perf-card-pass" style={{ marginTop:4, color: COLORS[i % COLORS.length] }}>
                  {overview?.totalFaculty ? `${Math.ceil(overview.totalFaculty / Math.max(depts.length, 1))} faculty (est.)` : "—"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>No departments found.</div>
        )}
      </Card>
    </div>
  );
};

export default PrincipalDashboard;
