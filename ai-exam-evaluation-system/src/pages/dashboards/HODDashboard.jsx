import { useState, useEffect } from "react";
import StatCard from "../../components/ui/StatCard";
import { Card } from "../../components/ui/Card";
import { ProgressBar } from "../../components/ui/Charts";
import Badge from "../../components/ui/Badge";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { dashboard as dashboardApi, students as studentsApi, faculty as facultyApi, subjects as subjectsApi } from "../../services/api.js";

const HODDashboard = ({ user }) => {
  const [overview,    setOverview]    = useState(null);
  const [subjects,    setSubjects]    = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [bookletStats, setBookletStats] = useState({ total:0, pending:0, evaluated:0, frozen:0 });
  const [loading,     setLoading]     = useState(true);

  const deptId = user?.profile?.department?._id || user?.profile?.department;

  useEffect(() => {
    const params = deptId ? { department: deptId } : {};
    Promise.all([
      dashboardApi.getOverview(),
      subjectsApi.list(params),
      facultyApi.list(params),
      studentsApi.list(params),
    ])
      .then(([ov, subs, facs, studs]) => {
        setOverview({ ...ov, deptStudents: studs.length, deptFaculty: facs.length });
        setSubjects(subs.slice(0, 6));
        setFacultyList(facs.slice(0, 6));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deptId]);

  // Fetch booklet stats for faculty in this department once faculty list is loaded
  useEffect(() => {
    if (facultyList.length === 0) return;
    const counts = { total:0, pending:0, evaluated:0, frozen:0 };
    Promise.all(
      facultyList.map(f =>
        dashboardApi.getFacultyStats(f._id).catch(() => ({ assigned:0, pending:0, evaluated:0, frozen:0 }))
      )
    ).then(results => {
      results.forEach(r => {
        counts.total     += r.assigned  || 0;
        counts.pending   += r.pending   || 0;
        counts.evaluated += r.evaluated || 0;
        counts.frozen    += r.frozen    || 0;
      });
      setBookletStats(counts);
    });
  }, [facultyList]);

  return (
    <div className="page-anim">
      <Breadcrumb items={["HOD", user?.profile?.department?.name || "Department", "Dashboard"]} />
      <div className="stats-grid">
        <StatCard title="Dept Students" value={loading ? "…" : overview?.deptStudents ?? "—"} sub="Enrolled students"   icon="cap"   accent="navy"  />
        <StatCard title="Faculty Count" value={loading ? "…" : overview?.deptFaculty  ?? "—"} sub="Active faculty"     icon="users" accent="blue"  />
        <StatCard title="Booklets"      value={loading ? "…" : bookletStats.total}             sub={`${bookletStats.pending} pending`} icon="exam" accent="gold" />
        <StatCard title="Frozen"        value={loading ? "…" : bookletStats.frozen}            sub="Evaluation complete" icon="check" accent="green" />
      </div>

      <div className="grid-1-1">
        <Card title="Subject Overview">
          {loading ? (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>Loading subjects...</div>
          ) : subjects.length > 0 ? subjects.map((s) => (
            <div key={s._id} style={{ marginBottom:"14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
                <span style={{ fontSize:"12px", fontWeight:600, color:"#1a2744" }}>
                  {s.title} <span style={{ color:"#6478a0", fontWeight:400 }}>({s.courseCode})</span>
                </span>
                <Badge text={s.type} type="navy" />
              </div>
              <ProgressBar val={s.credits?.L || s.credits?.total || 3} max={6} color="#002366" />
            </div>
          )) : (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>No subjects found for this department.</div>
          )}
        </Card>

        <Card title="Faculty Evaluation Status">
          {loading ? (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>Loading faculty...</div>
          ) : facultyList.length > 0 ? facultyList.map((f, i) => (
            <div key={f._id || i} style={{ padding:"8px 0", borderBottom:"1px solid #edf0f8" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:600, color:"#1a2744", fontSize:13 }}>{f.name}</div>
                  <div style={{ fontSize:11, color:"#6478a0" }}>{f.designation || f.primaryRole}</div>
                </div>
                <Badge text={f.primaryRole} type={f.primaryRole === "hod" ? "gold" : "navy"} />
              </div>
            </div>
          )) : (
            <div style={{ padding:"12px", color:"#6478a0", fontSize:13 }}>No faculty found.</div>
          )}

          {!loading && bookletStats.total > 0 && (
            <div style={{ marginTop:"12px", padding:"10px", background:"#f8faff", borderRadius:8 }}>
              <div style={{ fontSize:11, color:"#6478a0", marginBottom:6 }}>Department Evaluation Progress</div>
              <ProgressBar
                val={bookletStats.frozen + bookletStats.evaluated}
                max={bookletStats.total}
                color="#002366"
              />
              <div style={{ display:"flex", gap:"12px", marginTop:6, fontSize:11, color:"#6478a0" }}>
                <span>Frozen: <strong style={{ color:"#0a8a4a" }}>{bookletStats.frozen}</strong></span>
                <span>Evaluated: <strong style={{ color:"#0077b6" }}>{bookletStats.evaluated}</strong></span>
                <span>Pending: <strong style={{ color:"#e0820a" }}>{bookletStats.pending}</strong></span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default HODDashboard;
