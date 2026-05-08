// src/pages/dashboards/DCEDashboard.jsx
import { useState, useEffect } from "react";
import Breadcrumb from "../../components/layout/Breadcrumb";
import C from "../../constants/colors";
import { externalExam, dashboard, academicYears, departments, subjects } from "../../services/api.js";

// ─── palette shortcuts ────────────────────────────────────────────────────────
const P = {
  navy:   "#002366", blue:   "#0077b6", gold:   "#f7941d",
  green:  "#0a8a4a", danger: "#dc2626", purple: "#6d28d9",
  border: "#d0daf0", bg:     "#f0f4fb", card:   "#ffffff",
  text:   "#1a2744", sub:    "#6478a0", muted:  "#94a3b8",
};

// ─── shared tiny components ───────────────────────────────────────────────────
const Pill = ({ children, color = P.blue }) => (
  <span style={{ display:"inline-block", padding:"2px 9px", borderRadius:99,
    fontSize:11, fontWeight:700, color, background:`${color}18`, whiteSpace:"nowrap" }}>
    {children}
  </span>
);

const Btn = ({ children, onClick, color=P.navy, bg, disabled, style:x={} }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: disabled?"#e8ecf5": bg||`linear-gradient(135deg,${color},${color}cc)`,
    color: disabled?"#94a3b8":"#fff", border:"none", borderRadius:8,
    padding:"8px 20px", fontSize:13, fontWeight:700, cursor:disabled?"not-allowed":"pointer",
    fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, ...x,
  }}>{children}</button>
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

// ─── Simple bar chart using divs ──────────────────────────────────────────────
const BarChart = ({ data, color=P.blue, height=120 }) => {
  const max = Math.max(...data.map(d=>d.v), 1);
  return (
    <div style={{ display:"flex", gap:8, alignItems:"flex-end", height }}>
      {data.map((d,i)=>(
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{ fontSize:10, fontWeight:700, color:P.text }}>{d.v}</div>
          <div style={{ width:"100%", borderRadius:"4px 4px 0 0", background:color,
            height: `${(d.v/max)*80}%`, minHeight:4, transition:"height .4s" }} />
          <div style={{ fontSize:10, color:P.muted, textAlign:"center", whiteSpace:"nowrap" }}>{d.l}</div>
        </div>
      ))}
    </div>
  );
};

// ─── Donut / pie via conic-gradient ──────────────────────────────────────────
const DonutChart = ({ segments, size=100 }) => {
  let cum = 0;
  const gradient = segments.map(s => {
    const start = cum; cum += s.pct;
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
// DASHBOARD SECTION — stats + charts
// ─────────────────────────────────────────────────────────────────────────────
function DashboardSection() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboard.getOverview()
      .then(data => setStats(data))
      .catch(err => console.error("DCE overview error:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <Breadcrumb items={["DCE","Dashboard"]} />
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

  const yearwise    = stats?.yearwise    || [];
  const semwise     = stats?.semwise     || [];
  const deptwise    = stats?.deptwise    || [];
  const passPercent  = stats?.passPercent  ?? 0;
  const failPercent  = stats?.failPercent  ?? 0;
  const absentees    = stats?.absenteeRate ?? stats?.absentees ?? 0;
  const completionPct = stats?.completionPct ?? 0;
  const passCount    = stats?.passCount    ?? 0;
  const failCount    = stats?.failCount    ?? 0;
  const totalStudents = stats?.totalStudents ?? 0;

  return (
    <div>
      <Breadcrumb items={["DCE","Dashboard"]} />

      {/* Stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:20 }}>
        <StatBox label="Total Students"     value={totalStudents.toLocaleString()}    color={P.navy}   />
        <StatBox label="Exams Completed"    value={`${completionPct}%`} color={P.blue} sub="of scheduled exams" />
        <StatBox label="Absentee Rate"      value={`${absentees}%`}     color={P.gold} />
        <StatBox label="Pass Count"         value={passCount}    color={P.green} sub={`${passPercent}% pass rate`} />
        <StatBox label="Fail Count"         value={failCount}    color={P.danger} sub={`${failPercent}% fail rate`} />
      </div>

      {/* Charts row 1 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))", gap:16, marginBottom:16 }}>
        <Card title="📅 Year-wise Students">
          {yearwise.length > 0 ? <BarChart data={yearwise} color={P.navy} /> : <div style={{ color:P.muted, fontSize:13 }}>No data available.</div>}
        </Card>
        <Card title="📚 Sem-wise Strength">
          {semwise.length > 0 ? <BarChart data={semwise} color={P.blue} /> : <div style={{ color:P.muted, fontSize:13 }}>No data available.</div>}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))", gap:16, marginBottom:16 }}>
        <Card title="🏛️ Department-wise Students">
          {deptwise.length > 0 ? <BarChart data={deptwise} color={P.gold} /> : <div style={{ color:P.muted, fontSize:13 }}>No data available.</div>}
        </Card>

        {/* Pass/Fail donut */}
        <Card title="🎯 Pass / Fail Distribution">
          <div style={{ display:"flex", alignItems:"center", gap:24 }}>
            <DonutChart size={110} segments={[
              {pct:passPercent, color:P.green},
              {pct:failPercent, color:P.danger},
            ]} />
            <div style={{ flex:1 }}>
              {[
                {label:"Pass",  pct:passPercent,  count:passCount,  color:P.green },
                {label:"Fail",  pct:failPercent,  count:failCount,  color:P.danger},
              ].map((r,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <div style={{ width:14, height:14, borderRadius:3, background:r.color, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:P.text }}>{r.label} — {r.count} students</div>
                    <div style={{ height:6, background:"#e8ecf5", borderRadius:99, marginTop:4, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${r.pct}%`, background:r.color, borderRadius:99 }} />
                    </div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:800, color:r.color }}>{r.pct}%</div>
                </div>
              ))}
              <div style={{ fontSize:12, color:P.sub, marginTop:4 }}>
                Absentees: <strong style={{ color:P.gold }}>{absentees}%</strong> avg per exam
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Completion donut */}
      <Card title="✅ Exam Completion Status">
        <div style={{ display:"flex", alignItems:"center", gap:24 }}>
          <DonutChart size={90} segments={[
            {pct:completionPct, color:P.green},
            {pct:100-completionPct, color:"#e8ecf5"},
          ]} />
          <div>
            <div style={{ fontSize:22, fontWeight:800, color:P.green }}>{completionPct}%</div>
            <div style={{ fontSize:13, color:P.sub }}>of scheduled exams completed</div>
            <div style={{ fontSize:12, color:P.danger, marginTop:4 }}>
              {100-completionPct}% still in progress or pending
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKLET DETAIL — shown below grid when a booklet is clicked
// ─────────────────────────────────────────────────────────────────────────────
function BookletDetail({ booklet, onAccept, onReject, onClose }) {
  const [rejectMsg, setRejectMsg] = useState("");
  const [rejecting, setRejecting] = useState(false);

  return (
    <div style={{ background:P.card, border:`1px solid ${P.border}`, borderRadius:12,
      marginTop:16, overflow:"hidden", boxShadow:"0 4px 20px rgba(0,35,102,0.12)" }}>
      <div style={{ background:P.navy, padding:"12px 18px", display:"flex",
        justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontWeight:800, fontSize:14, color:"#fff" }}>
          📋 Booklet Detail — {booklet.id} | {booklet.roll} | {booklet.name}
        </span>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)",
          border:"none", color:"#fff", borderRadius:7, width:28, height:28,
          cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>✕</button>
      </div>

      <div style={{ padding:"1.25rem" }}>
        {/* Info row */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
          <Pill color={P.navy}>{booklet.roll}</Pill>
          <Pill color={P.blue}>{booklet.subject}</Pill>
          <Pill color={P.gold}>Marks: {booklet.marks}/{booklet.max}</Pill>
          <Pill color={booklet.marks>=booklet.max*0.5?P.green:P.danger}>
            {booklet.marks>=booklet.max*0.5?"PASS":"FAIL"}
          </Pill>
        </div>

        {/* Simulated answer sheet preview */}
        <div style={{ background:"#f8faff", border:`1px solid ${P.border}`, borderRadius:10,
          padding:"1rem", marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:P.blue, textTransform:"uppercase",
            letterSpacing:"0.06em", marginBottom:10 }}>📄 Answer Sheet Preview</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:8 }}>
            {["Q1","Q2","Q3","Q4","Q5"].map((q,i)=>{
              const qmarks = Math.floor(Math.random()*8)+2;
              return (
                <div key={q} style={{ background:"#fff", border:`1px solid ${P.border}`,
                  borderRadius:8, padding:"10px 12px" }}>
                  <div style={{ fontWeight:700, fontSize:13, color:P.navy, marginBottom:4 }}>{q}</div>
                  <div style={{ height:5, background:"#e8ecf5", borderRadius:99, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${(qmarks/10)*100}%`, background:P.blue, borderRadius:99 }} />
                  </div>
                  <div style={{ fontSize:11, color:P.muted, marginTop:4 }}>{qmarks}/10</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reject reason input */}
        {rejecting && (
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:P.danger,
              textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>
              Rejection Reason (sent to Scrutinizer) *
            </label>
            <textarea rows={3} value={rejectMsg} onChange={e=>setRejectMsg(e.target.value)}
              placeholder="Describe why this booklet is being rejected and sent back to scrutinizer..."
              style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:`1px solid ${P.border}`,
                fontSize:13, fontFamily:"inherit", color:P.text, resize:"vertical",
                outline:"none", boxSizing:"border-box" }} />
          </div>
        )}

        {/* Action buttons */}
        {booklet.status==="pending" && (
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <Btn color={P.green} onClick={onAccept}>✅ Accept</Btn>
            {!rejecting
              ? <Btn color={P.danger} onClick={()=>setRejecting(true)}>❌ Reject</Btn>
              : <>
                  <Btn color={P.danger} disabled={!rejectMsg.trim()}
                    onClick={()=>{ if(rejectMsg.trim()){ onReject(rejectMsg); setRejecting(false); } }}>
                    ❌ Confirm Reject & Notify Scrutinizer
                  </Btn>
                  <Btn color={P.muted} bg="#e8ecf5" style={{ color:P.sub }}
                    onClick={()=>{ setRejecting(false); setRejectMsg(""); }}>
                    Cancel
                  </Btn>
                </>
            }
          </div>
        )}

        {booklet.status==="accepted" && (
          <div style={{ background:"#e6f7ef", border:"1px solid #86efac", borderRadius:8,
            padding:"10px 14px", fontSize:13, fontWeight:700, color:P.green }}>
            ✅ Accepted by DCE
          </div>
        )}
        {booklet.status==="rejected" && (
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8,
            padding:"10px 14px", fontSize:13, color:P.danger }}>
            <strong>❌ Rejected.</strong> Reason sent to Scrutinizer: <em>"{booklet.rejectMsg}"</em>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE RANDOM SHEETS SECTION
// Flow: Year → Departments → Subjects → Booklet cards → Detail
// ─────────────────────────────────────────────────────────────────────────────
function GenerateRandomSection({ dceNotifications, setDceNotifications }) {
  const [years,        setYears]        = useState([]);
  const [selYear,      setSelYear]      = useState(null);
  const [depts,        setDepts]        = useState([]);
  const [selDept,      setSelDept]      = useState(null);
  const [subjs,        setSubjs]        = useState([]);
  const [selSubj,      setSelSubj]      = useState(null);
  const [sampleN,      setSampleN]      = useState(5);
  const [booklets,     setBooklets]     = useState([]);
  const [selBk,        setSelBk]        = useState(null);
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingSubjs, setLoadingSubjs] = useState(false);
  const [loadingBkls,  setLoadingBkls]  = useState(false);

  // subject accept/reject states: { yearId: { deptId: { subjectId: "pending"|"accepted"|"rejected" } } }
  const [subjStatus, setSubjStatus] = useState({});
  const [deptStatus, setDeptStatus] = useState({});

  // Fetch academic years on mount
  useEffect(() => {
    academicYears.list()
      .then(data => setYears(Array.isArray(data) ? data : []))
      .catch(err => console.error("academicYears.list error:", err))
      .finally(() => setLoadingYears(false));
  }, []);

  // Fetch departments when year changes
  useEffect(() => {
    if (!selYear) { setDepts([]); return; }
    setLoadingDepts(true);
    setDepts([]);
    setSelDept(null);
    setSubjs([]);
    setSelSubj(null);
    setBooklets([]);
    setSelBk(null);
    departments.list({ college: selYear.college })
      .then(data => setDepts(Array.isArray(data) ? data : []))
      .catch(err => console.error("departments.list error:", err))
      .finally(() => setLoadingDepts(false));
  }, [selYear]);

  // Fetch subjects when dept changes
  useEffect(() => {
    if (!selDept) { setSubjs([]); return; }
    setLoadingSubjs(true);
    setSubjs([]);
    setSelSubj(null);
    setBooklets([]);
    setSelBk(null);
    subjects.list({ departmentId: selDept._id })
      .then(data => setSubjs(Array.isArray(data) ? data : []))
      .catch(err => console.error("subjects.list error:", err))
      .finally(() => setLoadingSubjs(false));
  }, [selDept]);

  const getSubjSt = (yId, dId, sId) => subjStatus[yId]?.[dId]?.[sId] || "pending";
  const getDeptSt = (yId, dId)      => deptStatus[yId]?.[dId] || "pending";
  const getYearSt = (yId) => {
    if (!depts.length) return "pending";
    if (depts.every(d => getDeptSt(yId, d._id) === "accepted")) return "accepted";
    if (depts.some(d  => getDeptSt(yId, d._id) === "rejected"))  return "partial";
    return "pending";
  };

  const generate = async () => {
    if (!selSubj) return;
    setLoadingBkls(true);
    setBooklets([]);
    setSelBk(null);
    try {
      const data = await externalExam.dce.getPending({ subjectId: selSubj._id, count: sampleN });
      setBooklets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("dce.getPending error:", err);
    } finally {
      setLoadingBkls(false);
    }
  };

  const acceptBk = async () => {
    try {
      await externalExam.dce.review({ bookletId: selBk._id || selBk.id, action: "approve" });
      setBooklets(p => p.map(b => (b._id || b.id) === (selBk._id || selBk.id) ? { ...b, status:"accepted" } : b));
      setSelBk(prev => ({ ...prev, status:"accepted" }));
    } catch (err) {
      console.error("dce.review accept error:", err);
    }
  };

  const rejectBk = async (msg) => {
    try {
      await externalExam.dce.review({ bookletId: selBk._id || selBk.id, action: "send_back", reason: msg });
      setBooklets(p => p.map(b => (b._id || b.id) === (selBk._id || selBk.id) ? { ...b, status:"rejected", rejectMsg:msg } : b));
      setSelBk(prev => ({ ...prev, status:"rejected", rejectMsg:msg }));
    } catch (err) {
      console.error("dce.review reject error:", err);
    }
  };

  // When all booklets of a subject are decided
  const allDone     = booklets.length > 0 && booklets.every(b => b.status !== "pending");
  const allAccepted = booklets.every(b => b.status === "accepted");

  const acceptSubject = () => {
    if (!selYear || !selDept || !selSubj) return;
    const yId = selYear._id, dId = selDept._id, sId = selSubj._id;
    setSubjStatus(p => ({
      ...p,
      [yId]: { ...p[yId], [dId]: { ...(p[yId]?.[dId] || {}), [sId]: "accepted" } },
    }));
    // Check if all subjects of dept are accepted
    const remainingSubjs = subjs.filter(s => s._id !== sId);
    const prevStates = (subjStatus[yId] || {})[dId] || {};
    const allSubjAccepted = remainingSubjs.every(s => (prevStates[s._id] || "pending") === "accepted");
    if (allSubjAccepted) {
      setDeptStatus(p => ({ ...p, [yId]: { ...(p[yId] || {}), [dId]: "accepted" } }));
    }
  };

  const yst = selYear ? getYearSt(selYear._id) : null;
  const canSendToCE = yst === "accepted";

  const sendToCE = async () => {
    if (!selYear) return;
    try {
      await externalExam.dce.review({ yearId: selYear._id, action: "approve_to_ce" });
      setYears(p => p.map(y => y._id === selYear._id ? { ...y, highlight:true } : y));
      setDceNotifications(p => [{
        id:Date.now(), time:new Date().toLocaleString(),
        msg:`✅ Results for ${selYear.label} sent to Controller of Examination (CE).`,
        type:"success",
      }, ...p]);
      alert(`Results for ${selYear.label} sent to CE!`);
    } catch (err) {
      console.error("sendToCE error:", err);
      alert(`Error sending to CE: ${err.message}`);
    }
  };

  return (
    <div>
      <Breadcrumb items={["DCE","Generate Random Sheets"]} />
      <div style={{ fontWeight:800, fontSize:18, color:P.text, marginBottom:4 }}>Generate Random Answer Sheets</div>
      <div style={{ fontSize:13, color:P.sub, marginBottom:20 }}>
        Select Year → Department → Subject → Generate sample booklets for spot-check.
      </div>

      {/* ── STEP 1: Year cards ── */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontWeight:700, fontSize:13, color:P.navy, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.06em" }}>
          Step 1 — Select Academic Year
        </div>
        {loadingYears ? (
          <div style={{ color:P.muted, fontSize:13 }}>Loading years…</div>
        ) : (
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {years.map(y => {
              const yst = getYearSt(y._id);
              const isActive = selYear?._id === y._id;
              const borderC  = yst==="accepted"?P.green:isActive?P.gold:P.border;
              const bgC      = yst==="accepted"?"#e6f7ef":isActive?"#fffbeb":P.card;
              return (
                <div key={y._id} onClick={() => setSelYear(y)}
                  style={{ border:`2.5px solid ${borderC}`, borderRadius:12, padding:"18px 24px",
                    cursor:"pointer", background:bgC, minWidth:140, textAlign:"center",
                    transition:"all .15s", boxShadow:isActive?`0 0 0 3px ${P.gold}33`:"none" }}>
                  <div style={{ fontSize:24, marginBottom:4 }}>📅</div>
                  <div style={{ fontWeight:800, fontSize:15, color:yst==="accepted"?P.green:P.text }}>{y.label}</div>
                  <div style={{ fontSize:11, color:P.muted, marginTop:3 }}>Reg: {y.regulation}</div>
                  {yst==="accepted" && <div style={{ fontSize:11, color:P.green, fontWeight:700, marginTop:6 }}>✅ All departments verified</div>}
                </div>
              );
            })}
            {years.length === 0 && (
              <div style={{ color:P.muted, fontSize:13 }}>No academic years found.</div>
            )}
          </div>
        )}

        {/* Send to CE button appears when year is all-accepted */}
        {selYear && canSendToCE && (
          <div style={{ marginTop:14, background:"#e6f7ef", border:"1px solid #86efac", borderRadius:10,
            padding:"12px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:P.green }}>✅ All departments verified for {selYear.label}</div>
              <div style={{ fontSize:12, color:P.sub, marginTop:2 }}>Ready to send results to Controller of Examination</div>
            </div>
            <Btn color={P.green} onClick={sendToCE}>
              📤 Send Results to CE
            </Btn>
          </div>
        )}
      </div>

      {/* ── STEP 2: Department cards ── */}
      {selYear && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:13, color:P.navy, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.06em" }}>
            Step 2 — Select Department ({selYear.label})
          </div>
          {loadingDepts ? (
            <div style={{ color:P.muted, fontSize:13 }}>Loading departments…</div>
          ) : (
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              {depts.map(d => {
                const dst = getDeptSt(selYear._id, d._id);
                const isActive = selDept?._id === d._id;
                const borderC  = dst==="accepted"?P.green:isActive?P.gold:P.border;
                const bgC      = dst==="accepted"?"#e6f7ef":isActive?"#fffbeb":P.card;
                return (
                  <div key={d._id} onClick={() => setSelDept(d)}
                    style={{ border:`2.5px solid ${borderC}`, borderRadius:12, padding:"14px 20px",
                      cursor:"pointer", background:bgC, minWidth:110, textAlign:"center",
                      transition:"all .15s", boxShadow:isActive?`0 0 0 3px ${P.gold}33`:"none" }}>
                    <div style={{ fontSize:22, marginBottom:4 }}>🏛️</div>
                    <div style={{ fontWeight:800, fontSize:14, color:dst==="accepted"?P.green:P.text }}>{d.name || d.code}</div>
                    {dst==="accepted" && <div style={{ fontSize:10, color:P.green, fontWeight:700, marginTop:4 }}>✅ Accepted</div>}
                  </div>
                );
              })}
              {depts.length === 0 && !loadingDepts && (
                <div style={{ color:P.muted, fontSize:13 }}>No departments found for this year.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Subject list ── */}
      {selDept && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:13, color:P.navy, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.06em" }}>
            Step 3 — Select Subject ({selDept.name || selDept.code})
          </div>
          {loadingSubjs ? (
            <div style={{ color:P.muted, fontSize:13 }}>Loading subjects…</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {subjs.map(s => {
                const sst = getSubjSt(selYear._id, selDept._id, s._id);
                const isActive = selSubj?._id === s._id;
                const borderC  = sst==="accepted"?P.green:sst==="rejected"?P.danger:isActive?P.gold:P.border;
                const bgC      = sst==="accepted"?"#e6f7ef":sst==="rejected"?"#fef2f2":isActive?"#fffbeb":P.card;
                return (
                  <div key={s._id} onClick={() => { setSelSubj(s); setBooklets([]); setSelBk(null); }}
                    style={{ border:`2px solid ${borderC}`, borderRadius:10, padding:"11px 18px",
                      cursor:"pointer", background:bgC, display:"flex", justifyContent:"space-between",
                      alignItems:"center", transition:"all .15s" }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13.5, color:sst==="accepted"?P.green:sst==="rejected"?P.danger:P.text }}>
                        📖 {s.name}
                      </div>
                      <div style={{ fontSize:11, color:P.muted, marginTop:2 }}>
                        {selDept.name || selDept.code} — {selYear?.label} — {selYear?.regulation}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      {sst==="accepted" && <Pill color={P.green}>✅ Accepted</Pill>}
                      {sst==="rejected" && <Pill color={P.danger}>❌ Rejected</Pill>}
                      {sst==="pending"  && isActive && <Pill color={P.gold}>Generating…</Pill>}
                    </div>
                  </div>
                );
              })}
              {subjs.length === 0 && !loadingSubjs && (
                <div style={{ color:P.muted, fontSize:13 }}>No subjects found for this department.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 4: Generate booklets ── */}
      {selSubj && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:13, color:P.navy, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.06em" }}>
            Step 4 — Generate Sample Booklets for "{selSubj.name}"
          </div>
          <div style={{ background:P.card, border:`1px solid ${P.border}`, borderRadius:12,
            padding:"1rem 1.25rem", marginBottom:14 }}>
            <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
              <div style={{ fontSize:13, fontWeight:600, color:P.text }}>Sample size:</div>
              {[5,10,15,20].map(n=>(
                <button key={n} onClick={()=>setSampleN(n)} style={{
                  padding:"6px 16px", borderRadius:7, border:`1.5px solid ${sampleN===n?P.navy:P.border}`,
                  background:sampleN===n?P.navy:P.card, color:sampleN===n?"#fff":P.sub,
                  fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit",
                }}>{n}</button>
              ))}
              <Btn color={P.blue} onClick={generate} disabled={loadingBkls} style={{ marginLeft:8 }}>
                {loadingBkls ? "Loading…" : `🎲 Generate ${sampleN} Random Booklets`}
              </Btn>
            </div>
          </div>

          {/* Booklet grid */}
          {booklets.length > 0 && (
            <div>
              <div style={{ background:"#fff", border:`2px solid #e8ecf5`, borderRadius:12, padding:20 }}>
                <div style={{ background:P.navy, borderRadius:9, padding:"11px 18px", marginBottom:14,
                  display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontWeight:800, fontSize:14, color:"#fff" }}>
                    {selSubj.name} — Random Sample ({booklets.length} booklets)
                  </span>
                  <div style={{ display:"flex", gap:8 }}>
                    <Pill color="#93c5fd">{booklets.filter(b=>b.status==="accepted").length} Accepted</Pill>
                    <Pill color="#fca5a5">{booklets.filter(b=>b.status==="rejected").length} Rejected</Pill>
                    <Pill color="#94a3b8">{booklets.filter(b=>b.status==="pending").length} Pending</Pill>
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(88px,1fr))", gap:10 }}>
                  {booklets.map(bk => {
                    const bkId   = bk._id || bk.id;
                    const selId  = selBk?._id || selBk?.id;
                    const isActive = selId === bkId;
                    const col = bk.status==="accepted"?P.green:bk.status==="rejected"?P.danger:"#dc2626";
                    const bg  = isActive?"#fffbeb":bk.status==="accepted"?"#e6f7ef":bk.status==="rejected"?"#fef2f2":"#fff";
                    return (
                      <div key={bkId} onClick={()=>setSelBk(bk)}
                        style={{ border:`2.5px solid ${isActive?P.gold:col}`,
                          borderRadius:8, padding:"8px 5px", textAlign:"center",
                          cursor:"pointer", background:bg, minHeight:68,
                          display:"flex", flexDirection:"column", alignItems:"center",
                          justifyContent:"center", gap:3, transition:"all .17s",
                          boxShadow:isActive?`0 0 0 3px ${P.gold}44`:"none",
                          position:"relative" }}>
                        <div style={{ position:"absolute", top:4, right:4, width:6, height:6,
                          borderRadius:"50%", background:isActive?P.gold:col }} />
                        <div style={{ fontSize:9.5, fontWeight:800, color:isActive?P.gold:col }}>{bk.roll}</div>
                        <div style={{ fontSize:8.5, color:P.muted }}>{bk.id || bk._id}</div>
                        <div style={{ fontSize:11, fontWeight:700, color:P.navy }}>{bk.marks}/{bk.max}</div>
                        {bk.status==="accepted" && <div style={{ fontSize:8, color:P.green, fontWeight:700 }}>✓ Accepted</div>}
                        {bk.status==="rejected" && <div style={{ fontSize:8, color:P.danger, fontWeight:700 }}>✗ Rejected</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Booklet detail — appears below grid */}
              {selBk && (
                <BookletDetail
                  booklet={selBk}
                  onAccept={acceptBk}
                  onReject={rejectBk}
                  onClose={()=>setSelBk(null)}
                />
              )}

              {/* Accept all booklets → accept subject */}
              {allDone && allAccepted && getSubjSt(selYear?._id, selDept?._id, selSubj?._id) !== "accepted" && (
                <div style={{ marginTop:14, background:"#e6f7ef", border:"1px solid #86efac",
                  borderRadius:10, padding:"12px 18px", display:"flex",
                  justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:P.green }}>
                      ✅ All sampled booklets accepted
                    </div>
                    <div style={{ fontSize:12, color:P.sub, marginTop:2 }}>
                      Mark "{selSubj.name}" as accepted for {selDept.name || selDept.code}?
                    </div>
                  </div>
                  <Btn color={P.green} onClick={acceptSubject}>
                    ✅ Accept Subject
                  </Btn>
                </div>
              )}
            </div>
          )}
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
      <Breadcrumb items={["DCE","Notifications"]} />
      <div style={{ fontWeight:800, fontSize:18, color:P.text, marginBottom:4 }}>Notifications</div>
      <div style={{ fontSize:13, color:P.sub, marginBottom:20 }}>
        Updates from the Controller of Examination (CE) and system alerts.
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
// MAIN DCE DASHBOARD EXPORT
// ─────────────────────────────────────────────────────────────────────────────
const DCEDashboard = ({ sec = "dashboard" }) => {
  const [dceNotifications, setDceNotifications] = useState([]);

  if(sec==="random") return <GenerateRandomSection dceNotifications={dceNotifications} setDceNotifications={setDceNotifications} />;
  if(sec==="notif")  return <NotificationsSection  notifications={dceNotifications} />;
  return <DashboardSection />;
};

export default DCEDashboard;
