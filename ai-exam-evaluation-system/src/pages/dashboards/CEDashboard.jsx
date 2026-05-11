// src/pages/dashboards/CEDashboard.jsx
import { useState, useEffect } from "react";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { externalExam, dashboard } from "../../services/api.js";

const P = {
  navy:"#002366", blue:"#0077b6", gold:"#f7941d",
  green:"#0a8a4a", danger:"#dc2626", purple:"#6d28d9",
  border:"#d0daf0", bg:"#f0f4fb", card:"#ffffff",
  text:"#1a2744", sub:"#6478a0", muted:"#94a3b8",
};

// ─── shared primitives ────────────────────────────────────────────────────────
const Pill = ({ children, color=P.blue }) => (
  <span style={{ display:"inline-block", padding:"2px 9px", borderRadius:99,
    fontSize:11, fontWeight:700, color, background:`${color}18`, whiteSpace:"nowrap" }}>
    {children}
  </span>
);

const Card = ({ children, title, style={} }) => (
  <div style={{ background:P.card, border:`1px solid ${P.border}`, borderRadius:12,
    boxShadow:"0 2px 10px rgba(0,35,102,0.07)", overflow:"hidden", ...style }}>
    {title && (
      <div style={{ background:P.navy, padding:"11px 18px" }}>
        <span style={{ fontWeight:800, fontSize:14, color:"#fff" }}>{title}</span>
      </div>
    )}
    <div style={{ padding:"1.1rem 1.25rem" }}>{children}</div>
  </div>
);

const StatBox = ({ label, value, sub, color=P.navy }) => (
  <div style={{ background:P.card, border:`1px solid ${P.border}`, borderRadius:10,
    padding:"14px 18px", borderTop:`3px solid ${color}`,
    boxShadow:"0 2px 8px rgba(0,35,102,0.05)" }}>
    <div style={{ fontSize:10, color:P.sub, fontWeight:700, textTransform:"uppercase",
      letterSpacing:"0.06em", marginBottom:5 }}>{label}</div>
    <div style={{ fontSize:24, fontWeight:800, color:P.text, lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:P.muted, marginTop:4 }}>{sub}</div>}
  </div>
);

const BarChart = ({ data, color=P.blue, height=120 }) => {
  const max = Math.max(...data.map(d=>d.v), 1);
  return (
    <div style={{ display:"flex", gap:8, alignItems:"flex-end", height }}>
      {data.map((d,i)=>(
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{ fontSize:10, fontWeight:700, color:P.text }}>{d.v}</div>
          <div style={{ width:"100%", borderRadius:"4px 4px 0 0", background:color,
            height:`${(d.v/max)*80}%`, minHeight:4, transition:"height .4s" }} />
          <div style={{ fontSize:10, color:P.muted, textAlign:"center", whiteSpace:"nowrap" }}>{d.l}</div>
        </div>
      ))}
    </div>
  );
};

const DonutChart = ({ segments, size=100 }) => {
  let cum=0;
  const gradient = segments.map(s=>{
    const start=cum; cum+=s.pct;
    return `${s.color} ${start}% ${cum}%`;
  }).join(", ");
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <div style={{ width:size, height:size, borderRadius:"50%",
        background:`conic-gradient(${gradient})` }} />
      <div style={{ position:"absolute", inset:"22%", borderRadius:"50%", background:P.card }} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD SECTION — full stats + publish/sendback per batch
// ─────────────────────────────────────────────────────────────────────────────
function DashboardSection({ ceNotifications, setCeNotifications }) {
  const [stats,       setStats]       = useState(null);
  const [batches,     setBatches]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectMsg,   setRejectMsg]   = useState("");
  const [publishModal,setPublishModal]= useState(null);
  const [toast,       setToast]       = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [overviewData, submissionsData] = await Promise.all([
          dashboard.getOverview(),
          externalExam.central.getSubmissions({ status: "dce_approved" }),
        ]);
        setStats(overviewData);
        setBatches(Array.isArray(submissionsData) ? submissionsData : []);
      } catch (err) {
        console.error("CEDashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const showToast = (m,c=P.green) => { setToast({m,c}); setTimeout(()=>setToast(""),3500); };

  const publishResults = async (batch) => {
    try {
      await externalExam.central.declare({ submissionId: batch._id, action: "publish" });
      setBatches(p=>p.map(b=>b._id===batch._id?{...b,status:"published"}:b));
      setCeNotifications(p=>[{
        id:Date.now(), type:"success", time:new Date().toLocaleString(),
        msg:`📤 CE sent results to DCE: ${batch.examEvent?.subject} (${batch.examEvent?.department} — ${batch.examEvent?.academicYear} Sem ${batch.examEvent?.semester}) has been published to students.`,
      },...p]);
      showToast(`✅ Results published for ${batch.examEvent?.subject}!`);
      setPublishModal(null);
    } catch (err) {
      showToast(`Error: ${err.message}`, P.danger);
    }
  };

  const sendBackToDCE = async (batch) => {
    if(!rejectMsg.trim()) return;
    try {
      await externalExam.central.declare({ submissionId: batch._id, action: "send_back", reason: rejectMsg });
      setBatches(p=>p.map(b=>b._id===batch._id?{...b,status:"sent_back",sendBackMsg:rejectMsg}:b));
      setCeNotifications(p=>[{
        id:Date.now(), type:"danger", time:new Date().toLocaleString(),
        msg:`❌ CE sent back ${batch.examEvent?.subject} (${batch.examEvent?.department}) to DCE. Reason: "${rejectMsg}"`,
      },...p]);
      showToast(`❌ Sent back to DCE: ${batch.examEvent?.subject}`, P.danger);
      setRejectModal(null); setRejectMsg("");
    } catch (err) {
      showToast(`Error: ${err.message}`, P.danger);
    }
  };

  if (loading) {
    return (
      <div>
        <Breadcrumb items={["CE","Dashboard"]} />
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
          height:300, flexDirection:"column", gap:16 }}>
          <div style={{ width:44, height:44, borderRadius:"50%",
            border:`4px solid ${P.border}`, borderTopColor:P.navy,
            animation:"spin 0.9s linear infinite" }} />
          <div style={{ fontSize:14, color:P.sub }}>Loading dashboard data…</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  const yearwise  = stats?.yearwise  || [];
  const semwise   = stats?.semwise   || [];
  const deptwise  = stats?.deptwise  || [];
  const subjwise  = stats?.subjwise  || [];
  const passCount    = stats?.passCount    ?? 0;
  const failCount    = stats?.failCount    ?? 0;
  const passPercent  = stats?.passPercent  ?? 0;
  const failPercent  = stats?.failPercent  ?? 0;
  const completionPct = stats?.completionPct ?? 0;
  const absentees    = stats?.absenteeRate ?? stats?.absentees ?? 0;
  const totalStudents = stats?.totalStudents ?? 0;

  return (
    <div>
      <Breadcrumb items={["CE","Dashboard"]} />

      {/* Stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))", gap:12, marginBottom:20 }}>
        <StatBox label="Total Students"  value={totalStudents.toLocaleString()}   color={P.navy}  />
        <StatBox label="Completion"      value={`${completionPct}%`} color={P.blue} sub="of scheduled exams" />
        <StatBox label="Absentee Rate"   value={`${absentees}%`} color={P.gold} />
        <StatBox label="Pass Count"      value={passCount} color={P.green} sub={`${passPercent}%`} />
        <StatBox label="Fail Count"      value={failCount} color={P.danger} sub={`${failPercent}%`} />
      </div>

      {/* Charts row 1 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16, marginBottom:16 }}>
        <Card title="📅 Year-wise Students">
          {yearwise.length > 0 ? <BarChart data={yearwise} color={P.navy} /> : <div style={{ color:P.muted, fontSize:13 }}>No data available.</div>}
        </Card>
        <Card title="📚 Sem-wise Strength">
          {semwise.length > 0 ? <BarChart data={semwise} color={P.blue} /> : <div style={{ color:P.muted, fontSize:13 }}>No data available.</div>}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16, marginBottom:16 }}>
        <Card title="🏛️ Department-wise Students">
          {deptwise.length > 0 ? <BarChart data={deptwise} color={P.gold} /> : <div style={{ color:P.muted, fontSize:13 }}>No data available.</div>}
        </Card>
        <Card title="📖 Subject-wise Pass %">
          {subjwise.length > 0 ? <BarChart data={subjwise} color={P.green} /> : <div style={{ color:P.muted, fontSize:13 }}>No data available.</div>}
        </Card>
      </div>

      {/* Donut charts */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16, marginBottom:20 }}>
        <Card title="🎯 Pass / Fail Distribution">
          <div style={{ display:"flex", alignItems:"center", gap:24 }}>
            <DonutChart size={100} segments={[
              {pct:passPercent, color:P.green},
              {pct:failPercent, color:P.danger},
            ]} />
            <div style={{ flex:1 }}>
              {[
                {l:"Pass", pct:passPercent, c:passCount, color:P.green},
                {l:"Fail", pct:failPercent, c:failCount, color:P.danger},
              ].map((r,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div style={{ width:13, height:13, borderRadius:3, background:r.color, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:P.text }}>{r.l} — {r.c}</div>
                    <div style={{ height:5, background:"#e8ecf5", borderRadius:99, marginTop:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${r.pct}%`, background:r.color, borderRadius:99 }} />
                    </div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:800, color:r.color }}>{r.pct}%</div>
                </div>
              ))}
              <div style={{ fontSize:12, color:P.sub }}>
                Absentees avg: <strong style={{ color:P.gold }}>{absentees}%</strong>
              </div>
            </div>
          </div>
        </Card>

        <Card title="✅ Exam Completion">
          <div style={{ display:"flex", alignItems:"center", gap:24 }}>
            <DonutChart size={90} segments={[
              {pct:completionPct, color:P.green},
              {pct:100-completionPct, color:"#e8ecf5"},
            ]} />
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:P.green }}>{completionPct}%</div>
              <div style={{ fontSize:13, color:P.sub }}>exams completed</div>
              <div style={{ fontSize:12, color:P.danger, marginTop:4 }}>
                {100-completionPct}% still in progress
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── DCE-approved batches with Publish / Send Back ── */}
      <Card title="📋 DCE-Approved Batches — Action Required" style={{ marginBottom:16 }}>
        <div style={{ fontSize:13, color:P.sub, marginBottom:14 }}>
          These batches have been verified by the DCE. Use <strong style={{ color:P.green }}>Publish Results</strong> to declare results to students, or <strong style={{ color:P.danger }}>Send Back to DCE</strong> if further review is needed.
        </div>
        {batches.length === 0 && (
          <div style={{ textAlign:"center", padding:"2rem", color:P.muted, fontSize:13 }}>
            No DCE-approved batches pending action.
          </div>
        )}
        {batches.map(b=>{
          const subject    = b.examEvent?.subject    || "—";
          const dept       = b.examEvent?.department || "—";
          const sem        = b.examEvent?.semester   || "—";
          const year       = b.examEvent?.academicYear || "—";
          const dceOfficer = b.dceOfficer || "—";
          const dceAt      = b.dceAt ? new Date(b.dceAt).toLocaleString() : "—";
          const isDone     = b.status === "published";
          const isSentBk   = b.status === "sent_back";
          return (
            <div key={b._id} style={{
              border:`1px solid ${isDone?P.green:isSentBk?P.danger:P.border}`,
              borderRadius:10, marginBottom:12, overflow:"hidden",
              background:isDone?"#e6f7ef":isSentBk?"#fef2f2":"#fff",
            }}>
              <div style={{ background:P.navy, padding:"10px 16px",
                display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                <div>
                  <span style={{ fontWeight:800, fontSize:14, color:"#fff" }}>{subject}</span>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginLeft:10 }}>
                    {dept} · Sem {sem} · {year}
                  </span>
                </div>
                <Pill color={isDone?P.green:isSentBk?P.danger:P.gold}>
                  {isDone?"✅ Published":isSentBk?"❌ Sent Back to DCE":"🕐 Awaiting Action"}
                </Pill>
              </div>
              <div style={{ padding:"12px 16px" }}>
                <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:12 }}>
                  {[["Students",b.students],["Avg Marks",b.avgMarks != null ? `${b.avgMarks}/50` : "—"],["Pass Rate",b.passRate != null ? `${b.passRate}%` : "—"],["Absentees",b.absentees ?? "—"]].map(([l,v],i)=>(
                    <div key={i} style={{ background:P.bg, borderRadius:8, padding:"8px 14px",
                      border:`1px solid ${P.border}`, minWidth:80, textAlign:"center" }}>
                      <div style={{ fontSize:10, color:P.sub, fontWeight:700, textTransform:"uppercase",
                        letterSpacing:"0.05em", marginBottom:2 }}>{l}</div>
                      <div style={{ fontSize:16, fontWeight:800, color:P.navy }}>{v}</div>
                    </div>
                  ))}
                  <div style={{ fontSize:12, color:P.muted, alignSelf:"center" }}>
                    DCE: <strong style={{ color:P.text }}>{dceOfficer}</strong><br/>
                    Verified at: {dceAt}
                  </div>
                </div>

                {/* Sent back message */}
                {isSentBk && (
                  <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8,
                    padding:"10px 14px", marginBottom:10, fontSize:13, color:P.danger }}>
                    <strong>Reason sent to DCE:</strong> {b.sendBackMsg}
                  </div>
                )}

                {/* Action buttons */}
                {!isDone && !isSentBk && (
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                    {/* Green: Publish Results */}
                    <button onClick={()=>setPublishModal(b)} style={{
                      background:`linear-gradient(135deg,${P.green},#0d6e3b)`,
                      color:"#fff", border:"none", borderRadius:8, padding:"9px 22px",
                      fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"center", gap:7,
                      boxShadow:"0 4px 12px rgba(10,138,74,0.3)",
                    }}>
                      📤 Publish Results
                    </button>
                    {/* Red: Send Back to DCE */}
                    <button onClick={()=>setRejectModal(b)} style={{
                      background:`linear-gradient(135deg,${P.danger},#a52b20)`,
                      color:"#fff", border:"none", borderRadius:8, padding:"9px 22px",
                      fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"center", gap:7,
                      boxShadow:"0 4px 12px rgba(220,38,38,0.3)",
                    }}>
                      ↩ Send Back to DCE
                    </button>
                  </div>
                )}

                {isDone && (
                  <div style={{ fontWeight:700, fontSize:13, color:P.green }}>
                    ✅ Results published to students.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      {/* Publish confirmation modal */}
      {publishModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,35,102,0.55)", zIndex:900,
          display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
          onClick={()=>setPublishModal(null)}>
          <div style={{ background:P.card, borderRadius:14, width:"100%", maxWidth:440,
            boxShadow:"0 20px 60px rgba(0,0,0,0.28)", overflow:"hidden" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ background:P.green, padding:"14px 20px" }}>
              <div style={{ fontWeight:800, fontSize:16, color:"#fff" }}>📤 Publish Results</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", marginTop:3 }}>This will declare results to all students</div>
            </div>
            <div style={{ padding:"1.25rem" }}>
              <div style={{ background:P.bg, borderRadius:9, padding:"12px 14px", marginBottom:14, fontSize:13, color:P.text }}>
                <strong>{publishModal.examEvent?.subject}</strong> — {publishModal.examEvent?.department} Sem {publishModal.examEvent?.semester} ({publishModal.examEvent?.academicYear})<br/>
                {publishModal.students} students · Avg: {publishModal.avgMarks}/50 · Pass: {publishModal.passRate}%
              </div>
              <div style={{ fontSize:13, color:P.sub, marginBottom:16, lineHeight:1.6 }}>
                Once published, all enrolled students will immediately see their results. This action cannot be undone.
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setPublishModal(null)} style={{ flex:1, padding:"9px",
                  background:P.bg, border:`1px solid ${P.border}`, borderRadius:8,
                  fontWeight:700, fontSize:13, cursor:"pointer", color:P.sub, fontFamily:"inherit" }}>
                  Cancel
                </button>
                <button onClick={()=>publishResults(publishModal)} style={{ flex:1, padding:"9px",
                  background:`linear-gradient(135deg,${P.green},#0d6e3b)`, border:"none",
                  borderRadius:8, color:"#fff", fontWeight:700, fontSize:13,
                  cursor:"pointer", fontFamily:"inherit" }}>
                  ✅ Confirm Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send back to DCE modal */}
      {rejectModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,35,102,0.55)", zIndex:900,
          display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
          onClick={()=>{ setRejectModal(null); setRejectMsg(""); }}>
          <div style={{ background:P.card, borderRadius:14, width:"100%", maxWidth:460,
            boxShadow:"0 20px 60px rgba(0,0,0,0.28)", overflow:"hidden" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ background:P.danger, padding:"14px 20px" }}>
              <div style={{ fontWeight:800, fontSize:16, color:"#fff" }}>↩ Send Back to DCE</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", marginTop:3 }}>DCE will be notified with your message</div>
            </div>
            <div style={{ padding:"1.25rem" }}>
              <div style={{ background:P.bg, borderRadius:9, padding:"12px 14px", marginBottom:14, fontSize:13, color:P.text }}>
                <strong>{rejectModal.examEvent?.subject}</strong> — {rejectModal.examEvent?.department} Sem {rejectModal.examEvent?.semester}<br/>
                DCE Officer: {rejectModal.dceOfficer}
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:P.danger,
                  textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>
                  Reason for sending back *
                </label>
                <textarea rows={4} value={rejectMsg} onChange={e=>setRejectMsg(e.target.value)}
                  placeholder="Describe the issue. This message will be sent to the DCE..."
                  style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:`1px solid ${P.border}`,
                    fontSize:13, fontFamily:"inherit", color:P.text, resize:"vertical",
                    outline:"none", boxSizing:"border-box" }} />
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>{ setRejectModal(null); setRejectMsg(""); }} style={{ flex:1, padding:"9px",
                  background:P.bg, border:`1px solid ${P.border}`, borderRadius:8,
                  fontWeight:700, fontSize:13, cursor:"pointer", color:P.sub, fontFamily:"inherit" }}>
                  Cancel
                </button>
                <button onClick={()=>sendBackToDCE(rejectModal)} disabled={!rejectMsg.trim()} style={{ flex:1, padding:"9px",
                  background:rejectMsg.trim()?`linear-gradient(135deg,${P.danger},#a52b20)`:"#e8ecf5",
                  border:"none", borderRadius:8, color:rejectMsg.trim()?"#fff":P.muted,
                  fontWeight:700, fontSize:13, cursor:rejectMsg.trim()?"pointer":"not-allowed",
                  fontFamily:"inherit" }}>
                  ↩ Send Back to DCE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, background:toast.c, color:"#fff",
          padding:"12px 20px", borderRadius:10, fontSize:13.5, fontWeight:700,
          boxShadow:"0 8px 32px rgba(0,0,0,0.22)", zIndex:1100, maxWidth:360, lineHeight:1.5 }}>
          {toast.m}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS SECTION
// ─────────────────────────────────────────────────────────────────────────────
function NotificationsSection({ notifications }) {
  const typeColor = t=>({ success:P.green, danger:P.danger, info:P.blue, warning:P.gold }[t]||P.blue);
  return (
    <div>
      <Breadcrumb items={["CE","Notifications"]} />
      <div style={{ fontWeight:800, fontSize:18, color:P.text, marginBottom:4 }}>Notifications</div>
      <div style={{ fontSize:13, color:P.sub, marginBottom:20 }}>
        Alerts when DCE approves and sends results to CE.
      </div>

      {notifications.length===0 ? (
        <div style={{ background:P.card, border:`1px solid ${P.border}`, borderRadius:12,
          padding:"3rem", textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>🔔</div>
          <div style={{ fontSize:14, color:P.muted }}>No notifications yet.</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {notifications.map((n,i)=>(
            <div key={i} style={{ background:P.card, border:`1px solid ${P.border}`,
              borderRadius:10, padding:"14px 18px", display:"flex", gap:14,
              alignItems:"flex-start", boxShadow:"0 1px 4px rgba(0,35,102,0.06)",
              borderLeft:`4px solid ${typeColor(n.type)}` }}>
              <div style={{ width:9, height:9, borderRadius:"50%",
                background:typeColor(n.type), marginTop:5, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13.5, color:P.text, lineHeight:1.6 }}>{n.msg}</div>
                <div style={{ fontSize:11, color:P.muted, marginTop:4 }}>{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CE DASHBOARD EXPORT
// ─────────────────────────────────────────────────────────────────────────────
const CEDashboard = ({ sec = "dashboard" }) => {
  const [ceNotifications, setCeNotifications] = useState([]);

  if(sec==="notif") return <NotificationsSection notifications={ceNotifications} />;
  return <DashboardSection ceNotifications={ceNotifications} setCeNotifications={setCeNotifications} />;
};

export default CEDashboard;
