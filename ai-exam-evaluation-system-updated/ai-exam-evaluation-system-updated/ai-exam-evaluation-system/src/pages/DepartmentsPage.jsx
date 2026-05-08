import { useState, useEffect } from "react";
import Icon from "../components/ui/Icon";
import Breadcrumb from "../components/layout/Breadcrumb";
import { departments as deptsApi, students as studentsApi, faculty as facultyApi } from "../services/api.js";

const COLORS = ["#002366","#0077b6","#e0820a","#0a8a4a","#6d28d9","#0d4a8a"];

const DepartmentsPage = ({ user }) => {
  const [depts,   setDepts]   = useState([]);
  const [counts,  setCounts]  = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    deptsApi.list()
      .then(async ds => {
        setDepts(ds);
        // Fetch student/faculty counts per department in parallel
        const results = await Promise.all(
          ds.map(d => Promise.all([
            studentsApi.list({ department: d._id }).then(s => s.length).catch(() => 0),
            facultyApi.list({ department: d._id }).then(f => f.length).catch(() => 0),
          ]))
        );
        const countMap = {};
        ds.forEach((d, i) => {
          countMap[d._id] = { students: results[i][0], faculty: results[i][1] };
        });
        setCounts(countMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-anim">
        <Breadcrumb items={["Admin", "Departments"]} />
        <div style={{ textAlign:"center", padding:"40px", color:"#6478a0" }}>Loading departments...</div>
      </div>
    );
  }

  return (
    <div className="page-anim">
      <Breadcrumb items={["Admin", "Departments"]} />
      {depts.length === 0 ? (
        <div style={{ textAlign:"center", padding:"40px", color:"#6478a0" }}>
          No departments found. Add departments from the admin panel.
        </div>
      ) : (
        <div className="departments-grid">
          {depts.map((d, i) => {
            const c = counts[d._id] || { students:0, faculty:0 };
            return (
              <div key={d._id} className="dept-full-card">
                <div className="dept-full-header" style={{ background: COLORS[i % COLORS.length] }}>
                  <span className="dept-full-code">{d.code}</span>
                  <Icon name="dept" size={18} color="rgba(255,255,255,0.6)" />
                </div>
                <div className="dept-full-body">
                  <div className="dept-full-name">{d.name}</div>
                  <div className="dept-full-hod">
                    HOD: {d.hod?.name || "Not assigned"}
                  </div>
                  <div className="dept-full-stats">
                    <div className="dept-stat-box">
                      <div className="dept-stat-val" style={{ color: COLORS[i % COLORS.length] }}>{c.students}</div>
                      <div className="dept-stat-label">Students</div>
                    </div>
                    <div className="dept-stat-box">
                      <div className="dept-stat-val" style={{ color: COLORS[i % COLORS.length] }}>{c.faculty}</div>
                      <div className="dept-stat-label">Faculty</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DepartmentsPage;
