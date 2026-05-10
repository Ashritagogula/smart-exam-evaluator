import { useState, useEffect } from "react";
import StatCard from "../../components/ui/StatCard";
import { Card } from "../../components/ui/Card";
import { BarChart } from "../../components/ui/Charts";
import Badge from "../../components/ui/Badge";
import Breadcrumb from "../../components/layout/Breadcrumb";
import {
  dashboard as dashboardApi,
  results as resultsApi,
  notifications as notifApi,
} from "../../services/api.js";

const GRADE_COLOR = {
  O: "#0a8a4a",
  "A+": "#0a8a4a",
  A: "#0077b6",
  "B+": "#0077b6",
  B: "#002366",
  C: "#e0820a",
  D: "#e0820a",
  F: "#c0392b",
};

const StudentDashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [results, setResults] = useState([]);
  const [notifications, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const studentId = user?.profile?._id || user?.id;

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

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

  const displayName = user?.name || profile.name || "Student";
  const rollNumber = profile.rollNumber || "—";
  const department =
    profile.department?.code || profile.department?.name || "—";
  const semester = profile.currentSemester || "—";
  const section = profile.section?.name || "—";

  const chartData = results.slice(0, 6).map((r) => ({
    l:
      r.subject?.courseCode ||
      r.subject?.title?.slice(0, 4) ||
      "?",
    v: r.grandTotal
      ? Math.round((r.grandTotal / 100) * 100)
      : 0,
  }));

  const sgpa =
    stats?.sgpa ??
    (results.length
      ? (
          results.reduce(
            (a, r) => a + (r.gradePoints || 0),
            0
          ) / results.length
        ).toFixed(2)
      : "—");

  return (
    <>
      <style>{`
        *{
          box-sizing:border-box;
          margin:0;
          padding:0;
        }

        .student-dashboard-container{
          width:100%;
          max-width:100%;
          overflow-x:hidden;
          padding:14px;
        }

        .student-banner{
          width:100%;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:18px;
          padding:22px;
          border-radius:22px;
          background:linear-gradient(135deg,#001f5c,#0047ab);
          color:#fff;
          margin-bottom:18px;
          min-height:170px;
        }

        .student-banner-left{
          display:flex;
          align-items:center;
          gap:16px;
          flex:1;
          min-width:0;
        }

        .student-avatar-lg{
          width:72px;
          aspect-ratio:1/1;
          border-radius:50%;
          background:rgba(255,255,255,0.16);
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:24px;
          font-weight:700;
          flex-shrink:0;
        }

        .student-content{
          flex:1;
          min-width:0;
        }

        .student-banner-name{
          font-size:28px;
          font-weight:700;
          line-height:1.2;
          word-break:break-word;
        }

        .student-banner-sub{
          margin-top:8px;
          font-size:13px;
          line-height:1.7;
          color:rgba(255,255,255,0.8);
          word-break:break-word;
        }

        .badge-wrap{
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          margin-top:12px;
        }

        .sgpa-box{
          min-width:120px;
          display:flex;
          flex-direction:column;
          align-items:flex-end;
          justify-content:center;
          flex-shrink:0;
        }

        .student-cgpa-val{
          font-size:44px;
          font-weight:700;
          line-height:1;
          white-space:nowrap;
        }

        .sgpa-label{
          margin-top:5px;
          font-size:11px;
          color:rgba(255,255,255,0.65);
          letter-spacing:1px;
        }

        .stats-grid{
          width:100%;
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:14px;
          margin-bottom:18px;
        }

        .grid-1-1{
          width:100%;
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:18px;
          align-items:start;
        }

        .result-row{
          width:100%;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:14px;
          padding:14px 0;
          border-bottom:1px solid #edf0f8;
        }

        .result-left{
          flex:1;
          min-width:0;
        }

        .result-subject{
          font-size:14px;
          font-weight:600;
          color:#16213e;
          line-height:1.5;
          word-break:break-word;
        }

        .result-sub{
          font-size:12px;
          color:#64748b;
          margin-top:4px;
          line-height:1.6;
          word-break:break-word;
        }

        .result-right{
          text-align:right;
          flex-shrink:0;
        }

        .result-grade{
          font-size:19px;
          font-weight:700;
          line-height:1;
        }

        .result-pct{
          margin-top:5px;
          font-size:11px;
          color:#64748b;
        }

        .notification-row{
          width:100%;
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:12px;
          padding:13px 0;
          border-bottom:1px solid #edf0f8;
        }

        .notification-content{
          flex:1;
          min-width:0;
        }

        .notification-title{
          font-size:13px;
          font-weight:600;
          color:#16213e;
          line-height:1.5;
          word-break:break-word;
        }

        .notification-message{
          margin-top:3px;
          font-size:12px;
          color:#64748b;
          line-height:1.6;
          word-break:break-word;
        }

        

        /* =========================== */
        /* ======= RESPONSIVE ======== */
        /* =========================== */

        @media(max-width:1200px){

          .stats-grid{
            grid-template-columns:repeat(2,1fr);
          }

          .student-banner-name{
            font-size:25px;
          }

          .student-cgpa-val{
            font-size:40px;
          }
        }

        @media(max-width:992px){

          .grid-1-1{
            grid-template-columns:1fr;
          }

          .student-banner{
            padding:18px;
          }

          .student-banner-name{
            font-size:23px;
          }

          .student-cgpa-val{
            font-size:36px;
          }
        }

        @media(max-width:768px){

          .student-dashboard-container{
            padding:10px;
          }

          .student-banner{
            flex-direction:column;
            align-items:flex-start;
            gap:16px;
            padding:16px;
          }

          .student-banner-left{
            width:100%;
            align-items:flex-start;
          }

          .student-avatar-lg{
            width:62px;
            font-size:20px;
          }

          .student-banner-name{
            font-size:20px;
          }

          .student-banner-sub{
            font-size:12px;
          }

          .sgpa-box{
            width:100%;
            align-items:flex-start;
          }

          .student-cgpa-val{
            font-size:32px;
          }

          .stats-grid{
            grid-template-columns:1fr 1fr;
            gap:12px;
          }
        }

        @media(max-width:576px){

          .student-dashboard-container{
            padding:8px;
          }

          .student-banner{
            border-radius:18px;
            padding:14px;
          }

          .student-avatar-lg{
            width:56px;
            font-size:18px;
          }

          .student-banner-name{
            font-size:18px;
          }

          .student-banner-sub{
            font-size:11px;
            line-height:1.7;
          }

          .student-cgpa-val{
            font-size:28px;
          }

          .stats-grid{
            grid-template-columns:1fr;
          }

          .result-row{
            flex-direction:column;
            align-items:flex-start;
          }

          .result-right{
            width:100%;
            text-align:left;
          }

          .notification-row{
            flex-direction:column;
            align-items:flex-start;
          }
        }

        @media(max-width:400px){

          .student-banner-name{
            font-size:16px;
          }

          .student-banner-sub{
            font-size:10px;
          }

          .student-cgpa-val{
            font-size:24px;
          }

          .result-subject{
            font-size:13px;
          }

          .result-sub{
            font-size:11px;
          }

          .notification-title{
            font-size:12px;
          }

          .notification-message{
            font-size:11px;
          }
        }
      `}</style>

      <div className="page-anim student-dashboard-container">

        <Breadcrumb items={["Student Portal", "Dashboard"]} />

        <div className="student-banner">

          <div className="student-banner-left">

            <div className="student-avatar-lg">
              {user?.av ||
                displayName.slice(0, 2).toUpperCase()}
            </div>

            <div className="student-content">

              <div className="student-banner-name">
                {displayName}
              </div>

              <div className="student-banner-sub">
                {rollNumber} • {department} • Semester {semester} • Section {section}
              </div>

              <div className="badge-wrap">
                <Badge text={`SGPA: ${sgpa}`} type="gold" />
                <Badge text={`Semester ${semester}`} type="navy" />
              </div>

            </div>
          </div>

          <div className="sgpa-box">
            <div className="student-cgpa-val">
              {sgpa}
            </div>

            <div className="sgpa-label">
              CURRENT SGPA
            </div>
          </div>

        </div>

        <div className="stats-grid">

          <StatCard
            title="SGPA"
            value={loading ? "…" : sgpa}
            sub="Current semester"
            icon="star"
            accent="gold"
          />

          <StatCard
            title="Subjects"
            value={
              loading
                ? "…"
                : stats?.totalSubjects ??
                  results.length
            }
            sub="Enrolled"
            icon="exam"
            accent="navy"
          />

          <StatCard
            title="Declared"
            value={
              loading
                ? "…"
                : stats?.declaredResults ??
                  results.filter((r) => r.isDeclared).length
            }
            sub="Results out"
            icon="chart"
            accent="blue"
          />

          <StatCard
            title="Notifications"
            value={
              loading
                ? "…"
                : stats?.pendingNotifications ??
                  notifications.filter((n) => !n.isRead).length
            }
            sub="Unread"
            icon="ai"
            accent="green"
          />

        </div>

        <div className="grid-1-1">

          <Card title="Recent Examination Results">

            {loading ? (

              <div style={{padding:"12px",fontSize:13,color:"#64748b"}}>
                Loading results...
              </div>

            ) : results.length > 0 ? (

              results.slice(0,5).map((r) => (

                <div key={r._id} className="result-row">

                  <div className="result-left">

                    <div className="result-subject">
                      {r.subject?.title ||
                        r.subject?.courseCode ||
                        "Subject"}
                    </div>

                    <div className="result-sub">

                      {r.isDeclared
                        ? `${r.grandTotal ?? "—"}/100 marks · CIE: ${
                            r.totalCIE ?? "—"
                          } · SEE: ${r.totalSEE ?? "—"}`
                        : "Result not yet declared"}

                    </div>

                  </div>

                  <div className="result-right">

                    <div
                      className="result-grade"
                      style={{
                        color:
                          GRADE_COLOR[r.grade] || "#002366",
                      }}
                    >
                      {r.isDeclared ? r.grade : "—"}
                    </div>

                    <div className="result-pct">
                      {r.isDeclared &&
                      r.grandTotal != null
                        ? `${Math.round(r.grandTotal)}%`
                        : "Pending"}
                    </div>

                  </div>

                </div>

              ))

            ) : (

              <div style={{padding:"12px",fontSize:13,color:"#64748b"}}>
                No results available yet.
              </div>

            )}

          </Card>

          <Card title="Subject-wise Performance">

            {loading ? (

              <div style={{padding:"12px",fontSize:13,color:"#64748b"}}>
                Loading...
              </div>

            ) : chartData.length > 0 ? (

              <div style={{width:"100%",overflowX:"auto"}}>
                <BarChart data={chartData} />
              </div>

            ) : (

              <div style={{padding:"12px",fontSize:13,color:"#64748b"}}>
                No declared results to chart yet.
              </div>

            )}

          </Card>

        </div>

        {notifications.length > 0 && (

          <Card
            title="Recent Notifications"
            style={{marginTop:"18px"}}
          >

            {notifications.map((n, i) => (

              <div
                key={n._id || i}
                className="notification-row"
              >

                <div className="notification-content">

                  <div className="notification-title">
                    {n.title || "Notification"}
                  </div>

                  <div className="notification-message">
                    {n.message}
                  </div>

                </div>

                <Badge
                  text={n.isRead ? "Read" : "New"}
                  type={n.isRead ? "info" : "gold"}
                />

              </div>

            ))}

          </Card>

        )}

      </div>
    </>
  );
};

export default StudentDashboard;