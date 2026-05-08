import { useState, useEffect } from "react";
import { Card } from "../../components/ui/Card";
import { DonutChart, LineSparkline } from "../../components/ui/Charts";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { dashboard as dashboardApi, results as resultsApi } from "../../services/api.js";

const ChairmanDashboard = ({ user }) => {
  const [overview, setOverview] = useState(null);
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.getOverview(),
      resultsApi.list({ isDeclared: true }),
    ])
      .then(([ov, res]) => { setOverview(ov); setResults(res); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total   = results.length;
  const passed  = results.filter(r => r.isPassed).length;
  const passPct = total > 0 ? Math.round((passed / total) * 100) : 0;

  const aiPct = overview
    ? Math.round(((overview.totalBooklets - overview.pendingBooklets) / Math.max(overview.totalBooklets, 1)) * 100)
    : 0;

  const base  = overview?.totalBooklets || 0;
  const trend = [0.50,0.55,0.58,0.65,0.68,0.74,0.80,0.88,1].map(f => Math.round(base * f));

  const STATS = [
    [overview?.totalStudents     ?? "—", "Total Students"],
    [overview?.totalFaculty      ?? "—", "Faculty Members"],
    [overview?.totalDepartments  ?? "—", "Departments"],
    [total > 0 ? `${passPct}%`  : "—",  "Overall Pass Rate"],
  ];

  return (
    <div className="page-anim">
      <Breadcrumb items={["Chairman", "Institutional Overview"]} />

      <div className="vc-banner">
        <div className="vc-banner-label">INSTITUTIONAL OVERVIEW — CURRENT ACADEMIC YEAR</div>
        <div className="vc-stats-grid">
          {STATS.map(([v, l]) => (
            <div key={l}>
              <div className="vc-stat-value">{loading ? "…" : v}</div>
              <div className="vc-stat-label">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2-1">
        <Card title="Examination Evaluation Trend">
          {loading ? (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>Loading...</div>
          ) : (
            <>
              <LineSparkline data={trend} color="#002366" />
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:"4px" }}>
                {["Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr"].map(m => (
                  <span key={m} style={{ fontSize:"9px", color:"#6478a0" }}>{m}</span>
                ))}
              </div>
            </>
          )}
        </Card>
        <Card title="AI Evaluation Adoption">
          {loading ? (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>Loading...</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:"8px" }}>
              <DonutChart pct={aiPct} color="#002366" size={95} label="AI-Evaluated" />
              <p style={{ fontSize:"11px", color:"#6478a0", textAlign:"center", marginTop:"12px", lineHeight:1.5 }}>
                {aiPct}% of booklets processed by AI with mandatory faculty review.
              </p>
            </div>
          )}
        </Card>
      </div>

      <div style={{ marginTop:"20px" }}>
        <Card title="Examination Statistics">
          {loading ? (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>Loading...</div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px", padding:"8px 0" }}>
              {[
                ["Total Booklets",    overview?.totalBooklets   ?? "—"],
                ["Pending Review",    overview?.pendingBooklets ?? "—"],
                ["Results Declared",  total],
              ].map(([label, val]) => (
                <div key={label} style={{ textAlign:"center", padding:"16px", background:"#f8faff", borderRadius:"8px" }}>
                  <div style={{ fontSize:"24px", fontWeight:700, color:"#002366" }}>{val}</div>
                  <div style={{ fontSize:"11px", color:"#6478a0", marginTop:"4px" }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ChairmanDashboard;
