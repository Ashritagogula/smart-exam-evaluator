import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { BarChart, DonutChart, LineSparkline } from "../components/ui/Charts";
import Breadcrumb from "../components/layout/Breadcrumb";
import { dashboard as dashboardApi, results as resultsApi, examEvents as examEventsApi } from "../services/api.js";

const AnalyticsPage = ({ user }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [overview,  setOverview]  = useState(null);
  const [results,   setResults]   = useState([]);
  const [events,    setEvents]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get("subject") || "");

  useEffect(() => {
    Promise.all([
      dashboardApi.getOverview(),
      resultsApi.list({ isDeclared: true }),
      examEventsApi.list(),
    ])
      .then(([ov, res, ev]) => {
        setOverview(ov);
        setResults(Array.isArray(res) ? res : []);
        setEvents(Array.isArray(ev) ? ev : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
    if (subjectId) setSearchParams({ subject: subjectId }, { replace: true });
    else setSearchParams({}, { replace: true });
  };

  // Unique subjects from loaded events
  const subjectOptions = events.reduce((acc, e) => {
    (e.subjects || []).forEach(s => {
      if (s._id && !acc.find(o => o._id === s._id)) acc.push(s);
    });
    return acc;
  }, []);

  // Apply subject filter
  const filteredResults = selectedSubject
    ? results.filter(r => (r.subject?._id || r.subject) === selectedSubject)
    : results;

  // Grade distribution from real results
  const GRADES = ["O","A+","A","B+","B","C","D","F"];
  const gradeCounts = GRADES.map(g => ({
    l: g,
    v: filteredResults.filter(r => r.grade === g).length,
  }));

  // Pass/Fail split
  const total  = filteredResults.length;
  const passed = filteredResults.filter(r => r.isPassed).length;
  const failed = total - passed;
  const passPct = total > 0 ? Math.round((passed / total) * 100) : 0;

  // Avg marks per declared result
  const avgMarks = total > 0
    ? Math.round(filteredResults.reduce((a, r) => a + (r.grandTotal || 0), 0) / total)
    : 0;

  // Booklet progress trend (spread totalBooklets across 9 points)
  const bookletBase = overview?.totalBooklets || 0;
  const trendData = [0.5,0.55,0.58,0.65,0.68,0.74,0.80,0.88,1].map(f =>
    Math.round(bookletBase * f)
  );

  // Performance bands from declared results
  const fullAgree  = filteredResults.filter(r => r.grandTotal >= 80).length;
  const minorDiff  = filteredResults.filter(r => r.grandTotal >= 60 && r.grandTotal < 80).length;
  const modDiff    = filteredResults.filter(r => r.grandTotal >= 40 && r.grandTotal < 60).length;
  const majorDiff  = filteredResults.filter(r => r.grandTotal < 40).length;

  const agreePct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div className="page-anim">
      <Breadcrumb items={["Analytics", "Performance Reports"]} />

      {/* Subject filter with URL-backed state */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#6478a0" }}>Filter by Subject:</label>
        <select
          value={selectedSubject}
          onChange={e => handleSubjectChange(e.target.value)}
          style={{
            padding: "5px 10px", fontSize: 12, borderRadius: 6,
            border: "1px solid #d0daf0", outline: "none",
            background: "#fff", color: "#1a2744", cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <option value="">All Subjects</option>
          {subjectOptions.map(s => (
            <option key={s._id} value={s._id}>
              {s.courseCode ? `${s.courseCode} — ` : ""}{s.title || s.courseCode || s._id}
            </option>
          ))}
        </select>
        {selectedSubject && (
          <button
            onClick={() => handleSubjectChange("")}
            style={{
              fontSize: 11, color: "#6478a0", background: "none",
              border: "1px solid #d0daf0", borderRadius: 5, padding: "4px 8px",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="stats-grid" style={{ marginBottom:"16px" }}>
        {[
          ["Total Students",  overview?.totalStudents  ?? "—", "#002366"],
          ["Total Faculty",   overview?.totalFaculty   ?? "—", "#0077b6"],
          ["Results Declared",overview?.declaredResults ?? "—", "#0a8a4a"],
          ["Pass Rate",       total > 0 ? `${passPct}%` : "—", "#e0820a"],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background:"#fff", borderRadius:10, padding:"16px 20px", boxShadow:"0 2px 8px rgba(0,35,102,0.07)", borderTop:`3px solid ${c}` }}>
            <div style={{ fontSize:"22px", fontWeight:900, color:c, fontFamily:"Merriweather,serif" }}>{loading ? "…" : v}</div>
            <div style={{ fontSize:"12px", color:"#6478a0", marginTop:4 }}>{l}</div>
          </div>
        ))}
      </div>

      <div className="grid-1-1 mb-16">
        <Card title="Evaluation Progress Trend">
          {loading ? (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>Loading...</div>
          ) : (
            <>
              <LineSparkline data={trendData} color="#002366" />
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:"4px" }}>
                {["Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr"].map(m => (
                  <span key={m} style={{ fontSize:"9px", color:"#6478a0" }}>{m}</span>
                ))}
              </div>
            </>
          )}
        </Card>
        <Card title="Grade Distribution">
          {loading ? (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>Loading...</div>
          ) : (
            <BarChart data={gradeCounts} color="#002366" />
          )}
        </Card>
      </div>

      <div className="grid-2-1 mb-16">
        <Card title="Pass / Fail Analysis">
          {loading ? (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>Loading...</div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:"32px", padding:"8px" }}>
              <DonutChart pct={passPct} color="#0a8a4a" size={100} label="Pass" />
              <div style={{ flex:1 }}>
                {[
                  ["Passed",  passed,  "#0a8a4a"],
                  ["Failed",  failed,  "#c0392b"],
                  ["Total",   total,   "#002366"],
                  ["Avg Marks", avgMarks, "#0077b6"],
                ].map(([l, v, c]) => (
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #edf0f8" }}>
                    <span style={{ fontSize:12, color:"#6478a0" }}>{l}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:c }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="Performance Bands">
          {loading ? (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>Loading...</div>
          ) : (
            <div className="analytics-agreement-grid">
              {[
                ["80–100", agreePct(fullAgree),  "#0a8a4a"],
                ["60–79",  agreePct(minorDiff),  "#0077b6"],
                ["40–59",  agreePct(modDiff),    "#e0820a"],
                ["<40",    agreePct(majorDiff),  "#c0392b"],
              ].map(([l, p, c]) => (
                <div key={l} className="analytics-agreement-card" style={{ borderTopColor:c }}>
                  <DonutChart pct={p} color={c} size={72} />
                  <div className="analytics-agreement-label">{l}%</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Exam Events Overview">
        {loading ? (
          <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>Loading...</div>
        ) : events.length > 0 ? (
          <table className="au-table">
            <thead><tr className="au-table-head">
              {["Title","Type","Department","Status"].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {events.slice(0, 8).map(e => (
                <tr key={e._id}>
                  <td style={{ fontWeight:600, color:"#1a2744" }}>{e.title || e.subjects?.[0]?.title || "Exam"}</td>
                  <td>{e.examType}</td>
                  <td>{e.department?.name || e.department?.code || "—"}</td>
                  <td>
                    <span style={{
                      padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                      background: e.status==="completed"?"#e8f8f0":e.status==="active"?"#fff8e6":"#edf0f8",
                      color:      e.status==="completed"?"#0a8a4a":e.status==="active"?"#e0820a":"#6478a0",
                    }}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>No exam events found.</div>
        )}
      </Card>
    </div>
  );
};

export default AnalyticsPage;
