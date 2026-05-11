import { useState, useEffect, useMemo } from "react";
import StatCard from "../../components/ui/StatCard";
import { Card, Divider } from "../../components/ui/Card";
import { BarChart } from "../../components/ui/Charts";
import { GoldBtn } from "../../components/ui/Buttons";
import Badge from "../../components/ui/Badge";
import Breadcrumb from "../../components/layout/Breadcrumb";
import {
  dashboard as dashboardApi,
  internalEval as evalApi,
  students as studentsApi,
  subjects as subjectsApi,
  labMarks as labMarksApi,
  academicYears as academicYearsApi,
  semesters as semestersApi,
} from "../../services/api.js";

const C = {
  navy:"#002366", blue:"#0077b6", gold:"#f7941d",
  green:"#0a8a4a", danger:"#dc2626", purple:"#6d28d9",
  border:"#d0daf0", bg:"#f0f4fb", card:"#fff",
  text:"#1a2744", sub:"#6478a0", muted:"#94a3b8",
};

const sColor = s => ({ ai_evaluated:C.danger, pending:C.muted, frozen:C.purple, permanently_frozen:C.navy, saved:C.green, faculty_reviewed:C.blue }[s] || C.muted);
const sLabel = s => ({ ai_evaluated:"AI Evaluated", pending:"Pending", frozen:"Frozen", permanently_frozen:"Permanently Frozen", saved:"Saved", faculty_reviewed:"Reviewed" }[s] || s);

// Map API booklet → UI booklet format
function mapBooklet(bk) {
  const ai = bk.aiEvaluation;
  const fe = bk.facultyEvaluation;
  return {
    _id:         bk._id,
    id:          bk._id,
    barcode:     bk.barcode,
    roll:        bk.student?.rollNumber || "—",
    name:        bk.student?.name       || "Student",
    status:      bk.status,
    aiTotal:     ai?.totalMarks ?? null,
    maxMarks:    ai?.maxMarks   || 50,
    saved:       fe?.finalMarks != null,
    frozenAt:    fe?.frozenAt   || null,
    finalLocked: bk.status === "permanently_frozen",
    questions:   (ai?.questionWiseMarks || []).map(q => ({
      q:       q.questionNumber,
      max:     q.maxMarks,
      ai:      q.marksAwarded,
      faculty: fe?.modifiedQuestions?.find(m => m.questionNumber === q.questionNumber)?.marksAwarded ?? null,
      text:    q.feedback || `Question ${q.questionNumber}`,
    })),
    strong:  ai?.strengths   || [],
    weak:    ai?.weaknesses  || [],
    aiNote:  ai?.improvements?.[0] || ai?.suggestions?.[0] || "",
  };
}

// Group flat booklet array into bundles by examEvent+subject
function groupIntoBundles(booklets) {
  const map = {};
  for (const bk of booklets) {
    const key = `${bk.examEvent?._id || "no-event"}-${bk.subject?._id || "no-subj"}`;
    if (!map[key]) {
      map[key] = {
        id:           key,
        subject:      bk.subject?.title    || "Unknown",
        code:         bk.subject?.courseCode || "—",
        examType:     bk.examEvent?.examType || bk.examType || "Exam",
        totalBooklets: 0,
        evaluatedCount: 0,
        booklets:     [],
      };
    }
    map[key].booklets.push(mapBooklet(bk));
    map[key].totalBooklets++;
    if (bk.status !== "pending") map[key].evaluatedCount++;
  }
  return Object.values(map).map(b => ({
    ...b,
    status: b.evaluatedCount === b.totalBooklets ? "complete" : "in_progress",
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA SPREADSHEET
// ─────────────────────────────────────────────────────────────────────────────
function SchemaSpreadsheet({ booklets, onFreezeAll, allFrozen }) {
  const schemaCols = useMemo(() => {
    const sample = booklets.find(b => b.questions?.length > 0);
    return (sample?.questions || []).map(q => ({ id: q.q, label: q.q, maxMarks: q.max }));
  }, [booklets]);

  const schemaMarks = useMemo(() => {
    const init = {};
    booklets.forEach(bk => {
      init[bk.id] = {};
      schemaCols.forEach(col => {
        const q = bk.questions.find(q => q.q === col.id);
        init[bk.id][col.id] = q ? (q.faculty !== null ? q.faculty : q.ai) : null;
      });
    });
    return init;
  }, [booklets, schemaCols]);

  const td = (x = {}) => ({ border:`1px solid #d0daf0`, padding:"7px 9px", textAlign:"center", fontSize:13, whiteSpace:"nowrap", ...x });

  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,35,102,0.09)" }}>
      <div style={{ background:C.navy, padding:"13px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
        <span style={{ fontWeight:800, fontSize:15, color:"#fff" }}>📊 Evaluation Schema — Final Marks</span>
        <div style={{ display:"flex", gap:8 }}>
          <span style={{ background:"#e6f7ef", color:C.green, padding:"3px 12px", borderRadius:99, fontSize:11, fontWeight:700 }}>🤖 AI auto-filled</span>
          {allFrozen && <span style={{ background:`${C.purple}22`, color:C.purple, padding:"3px 12px", borderRadius:99, fontSize:11, fontWeight:700 }}>🔒 Frozen</span>}
        </div>
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse", fontSize:13, minWidth:"100%" }}>
          <thead>
            <tr>
              <th style={td({ background:"#1e3a5f", color:"#fff", fontWeight:800, fontSize:12, textAlign:"left", paddingLeft:14, minWidth:100 })}>Student ID</th>
              <th style={td({ background:"#1e3a5f", color:"#fff", fontWeight:800, fontSize:12, textAlign:"left", minWidth:130 })}>Name</th>
              {schemaCols.map(col => (
                <th key={col.id} style={td({ background:"#1e3a5f", color:"#fff", fontWeight:800, fontSize:12, minWidth:54 })}>
                  {col.label}
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.5)", fontWeight:400 }}>/{col.maxMarks}</div>
                </th>
              ))}
              <th style={td({ background:"#1e3a5f", color:"#fff", fontWeight:800, fontSize:12, minWidth:72 })}>Total</th>
              <th style={td({ background:"#1e3a5f", color:"#fff", fontWeight:800, fontSize:12, minWidth:88 })}>Status</th>
            </tr>
            <tr>
              <td colSpan={2} style={td({ background:"#fff4e0", fontWeight:800, fontSize:11, color:"#92400e", textAlign:"left", paddingLeft:14 })}>Max Marks ↓</td>
              {schemaCols.map(col => <td key={col.id} style={td({ background:"#fff4e0", fontWeight:900, fontSize:14, color:"#92400e" })}>{col.maxMarks}</td>)}
              <td style={td({ background:"#fff4e0", fontWeight:900, fontSize:14, color:"#92400e" })}>{schemaCols.reduce((a, b) => a + b.maxMarks, 0)}</td>
              <td style={td({ background:"#fff4e0" })}></td>
            </tr>
          </thead>
          <tbody>
            {booklets.map((bk, ri) => {
              const isPending = bk.status === "pending";
              const rowTotal  = schemaCols.reduce((s, col) => {
                const v = schemaMarks[bk.id]?.[col.id];
                return s + (v != null ? v : 0);
              }, 0);
              return (
                <tr key={bk.id} style={{ background:ri%2===0?"#fff":"#fafbff" }}>
                  <td style={td({ fontWeight:700, color:C.navy, textAlign:"left", paddingLeft:14 })}>{bk.roll}</td>
                  <td style={td({ color:C.text, textAlign:"left" })}>{bk.name}</td>
                  {schemaCols.map(col => {
                    const val = schemaMarks[bk.id]?.[col.id];
                    const modified = bk.questions.find(q => q.q === col.id)?.faculty !== null;
                    return (
                      <td key={col.id} style={td({ color:modified?C.gold:C.navy, fontWeight:700, background:isPending?"#f9f9f9":"#fff" })}>
                        {isPending ? <span style={{ color:C.muted }}>—</span> : (val != null ? val : "—")}
                      </td>
                    );
                  })}
                  <td style={td({ fontWeight:800, fontSize:14, color:isPending?C.muted:rowTotal>=25?C.green:C.danger })}>
                    {isPending ? "—" : `${rowTotal}/${schemaCols.reduce((a,b)=>a+b.maxMarks,0)}`}
                  </td>
                  <td style={td()}>
                    <span style={{ background:`${sColor(bk.status)}15`, color:sColor(bk.status), padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700 }}>
                      {sLabel(bk.status)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ padding:"16px 20px", background:allFrozen?"#f0fdf4":"#f5f3ff", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        {allFrozen ? (
          <>
            <div style={{ fontSize:13, color:C.green, fontWeight:700 }}>✅ All marks frozen. Students have been notified. 2-day review window is active.</div>
            <span style={{ background:"#e6f7ef", color:C.green, padding:"8px 20px", borderRadius:8, fontSize:13, fontWeight:700 }}>🔒 Frozen & Notified</span>
          </>
        ) : (
          <>
            <div>
              <div style={{ fontWeight:700, fontSize:13.5, color:C.purple, marginBottom:3 }}>Ready to notify students?</div>
              <div style={{ fontSize:12, color:C.sub }}>This will lock all marks and send notifications to every student.</div>
            </div>
            <button onClick={onFreezeAll} style={{ background:`linear-gradient(135deg,${C.purple},#5b21b6)`, color:"#fff", border:"none", borderRadius:9, padding:"11px 28px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 16px rgba(109,40,217,0.35)" }}>
              🔒 Freeze All & Notify Students
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKLET GRID
// ─────────────────────────────────────────────────────────────────────────────
function BookletGrid({ bundle, onSelect, activeBookletId }) {
  return (
    <div style={{ background:"#fff", border:`2px solid #e8ecf5`, borderRadius:12, padding:20 }}>
      <div style={{ background:C.navy, borderRadius:9, padding:"12px 18px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
        <div>
          <span style={{ fontWeight:800, fontSize:15, color:"#fff" }}>{bundle.subject} ({bundle.code}) — {bundle.examType}</span>
          <span style={{ marginLeft:12, fontSize:12, color:"rgba(255,255,255,0.5)" }}>Bundle</span>
        </div>
        <span style={{ background:`${C.gold}22`, color:C.gold, padding:"3px 12px", borderRadius:99, fontSize:12, fontWeight:700 }}>
          {bundle.booklets.filter(b => b.status !== "pending").length}/{bundle.totalBooklets} Evaluated
        </span>
      </div>
      <p style={{ fontSize:12, color:C.sub, marginBottom:14, fontWeight:600 }}>
        Click any booklet to open review. Save & Next navigates through booklets.
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(88px,1fr))", gap:10 }}>
        {bundle.booklets.map((bk, idx) => {
          const frozen = bk.status === "frozen" || bk.finalLocked;
          const saved  = bk.saved;
          const active = bk.id === activeBookletId;
          const col    = frozen ? C.navy : saved ? C.green : sColor(bk.status);
          return (
            <div key={bk.id} onClick={() => onSelect(bk, idx)} title={`${bk.roll} — ${bk.name}\n${sLabel(bk.status)}`}
              style={{ border:`2.5px solid ${active?C.gold:col}`, borderRadius:8, padding:"8px 5px", textAlign:"center", cursor:"pointer", background:active?"#fffbeb":frozen?"#f0f4ff":saved?"#e6f7ef":"#fff", transition:"all .17s", position:"relative", minHeight:68, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, boxShadow:active?`0 0 0 3px ${C.gold}44`:"none" }}
              onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background=`${col}10`; e.currentTarget.style.transform="translateY(-2px)"; }}}
              onMouseLeave={e=>{ e.currentTarget.style.background=active?"#fffbeb":frozen?"#f0f4ff":saved?"#e6f7ef":"#fff"; e.currentTarget.style.transform="translateY(0)"; }}>
              <div style={{ position:"absolute", top:4, right:4, width:6, height:6, borderRadius:"50%", background:active?C.gold:col }} />
              <div style={{ fontSize:9.5, fontWeight:800, color:active?C.gold:col }}>{bk.roll}</div>
              <div style={{ fontSize:8.5, color:C.muted }}>{bk.barcode?.slice(-5) || "—"}</div>
              {bk.aiTotal !== null && <div style={{ fontSize:11, fontWeight:700, color:C.navy }}>{bk.aiTotal}/{bk.maxMarks}</div>}
              {saved && !frozen && <div style={{ fontSize:8, color:C.green, fontWeight:700 }}>✓ Saved</div>}
              {bk.status === "pending" && <div style={{ fontSize:9, color:C.muted }}>Pending</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:12, marginTop:14, flexWrap:"wrap" }}>
        {[{c:C.gold,l:"Reviewing"},{c:C.danger,l:"AI Evaluated"},{c:C.green,l:"Saved"},{c:C.purple,l:"Frozen"},{c:C.muted,l:"Pending"}].map((l,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:C.sub }}>
            <div style={{ width:10, height:10, borderRadius:2, border:`2px solid ${l.c}` }} />{l.l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKLET DETAIL PANEL
// ─────────────────────────────────────────────────────────────────────────────
function BookletDetail({ booklet:initBk, bookletIndex, totalBooklets, onClose, onUpdate, onSaveNext, onFinish }) {
  const [bk,          setBk]          = useState({ ...initBk, questions:initBk.questions.map(q=>({...q})) });
  const [modMode,     setModMode]     = useState(false);
  const [selectedQ,   setSelectedQ]   = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [evaluating,  setEvaluating]  = useState(false);
  const [evalProg,    setEvalProg]    = useState(0);
  const [toast,       setToast]       = useState("");
  const [saving,      setSaving]      = useState(false);

  const showToast = m => { setToast(m); setTimeout(() => setToast(""), 3200); };

  const isLast   = bookletIndex === totalBooklets - 1;
  const isFrozen = bk.status === "frozen" || bk.finalLocked;
  const effective = bk.questions.reduce((s, q) => s + (q.faculty !== null ? q.faculty : q.ai), 0);

  const setQMark = (idx, val) =>
    setBk(p => ({ ...p, questions:p.questions.map((q,i) => i===idx ? {...q, faculty:Math.max(0,Math.min(q.max,+val))} : q) }));

  // AI Evaluate — calls real API
  const doEvaluate = async () => {
    if (!bk._id) { showToast("❌ Booklet ID missing."); return; }
    setEvaluating(true); setEvalProg(15);
    try {
      setEvalProg(40);
      const aiEval = await evalApi.triggerAI(bk._id);
      setEvalProg(85);
      const questions = (aiEval.questionWiseMarks || []).map(q => ({
        q: q.questionNumber, max: q.maxMarks, ai: q.marksAwarded, faculty: null,
        text: q.feedback || `Question ${q.questionNumber}`,
      }));
      const updated = {
        ...bk, status:"ai_evaluated",
        aiTotal: aiEval.totalMarks,
        questions,
        strong:  aiEval.strengths   || [],
        weak:    aiEval.weaknesses  || [],
        aiNote:  aiEval.improvements?.[0] || aiEval.suggestions?.[0] || "",
      };
      setBk(updated); onUpdate(updated); setEvalProg(100);
      showToast(`🤖 AI evaluation complete for ${bk.name}!`);
    } catch {
      showToast("❌ AI evaluation failed. Check booklet file and answer key.");
    } finally {
      setEvaluating(false);
    }
  };

  // Save & Next — calls real API
  const doSaveNext = async () => {
    setSaving(true);
    const modifications = bk.questions.filter(q => q.faculty !== null).map(q => ({ questionNumber:q.q, marksAwarded:q.faculty }));
    if (bk._id && modifications.length > 0) {
      try {
        await evalApi.updateMarks(bk._id, { modifications, finalMarks:effective });
      } catch {}
    }
    const updated = { ...bk, saved:true }; setBk(updated); onUpdate(updated);
    showToast(`✅ ${bk.name} saved!`);
    setSaving(false);
    setTimeout(() => onSaveNext(), 700);
  };

  // Finish — save last booklet then reveal schema
  const doFinish = async () => {
    setSaving(true);
    const modifications = bk.questions.filter(q => q.faculty !== null).map(q => ({ questionNumber:q.q, marksAwarded:q.faculty }));
    if (bk._id && modifications.length > 0) {
      try {
        await evalApi.updateMarks(bk._id, { modifications, finalMarks:effective });
      } catch {}
    }
    const updated = { ...bk, saved:true }; setBk(updated); onUpdate(updated);
    showToast("✅ Finished! Showing evaluation schema…");
    setSaving(false);
    setTimeout(() => onFinish(), 700);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.52)", zIndex:900, display:"flex", alignItems:"flex-start", justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ width:"min(100vw,820px)", height:"100vh", background:"#fff", overflowY:"auto", boxShadow:"-8px 0 40px rgba(0,0,0,0.22)" }} onClick={e => e.stopPropagation()}>

        <div style={{ background:C.navy, padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:10 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:"#fff" }}>{bk.name}</div>
            <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.5)", marginTop:2 }}>{bk.roll} · {bk.barcode} · Booklet {bookletIndex+1} of {totalBooklets}</div>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ background:`${sColor(bk.status)}22`, color:sColor(bk.status), padding:"4px 12px", borderRadius:99, fontSize:11, fontWeight:700 }}>{sLabel(bk.status)}</span>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none", color:"#fff", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:15 }}>✕</button>
          </div>
        </div>

        <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ background:C.bg, borderRadius:10, padding:"14px 16px", border:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div>
                <span style={{ fontWeight:800, fontSize:14, color:C.text }}>Question-wise Marks</span>
                {bk.questions.length > 0 && <span style={{ fontSize:11, fontWeight:400, color:C.sub, marginLeft:10 }}>Click a question to view feedback</span>}
              </div>
              {bk.questions.length > 0 && !isFrozen && (
                <button onClick={() => setModMode(p => !p)} style={{ background:modMode?C.gold+"22":"transparent", border:`1.5px solid ${modMode?C.gold:C.border}`, color:modMode?C.gold:C.sub, borderRadius:7, padding:"5px 16px", fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}>
                  {modMode ? "✓ Done Modifying" : "✏️ Modify"}
                </button>
              )}
            </div>

            {bk.questions.length === 0 && !evaluating && (
              <div style={{ textAlign:"center", padding:"1.5rem 1rem" }}>
                <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
                <div style={{ fontWeight:700, fontSize:14, color:C.text, marginBottom:6 }}>AI Evaluation Not Done</div>
                <div style={{ fontSize:13, color:C.sub, marginBottom:18, lineHeight:1.6 }}>Click below to trigger AI evaluation for <strong>{bk.name}</strong>.</div>
                <button onClick={doEvaluate} style={{ background:`linear-gradient(135deg,${C.blue},${C.navy})`, color:"#fff", border:"none", borderRadius:9, padding:"10px 26px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(0,35,102,0.25)" }}>
                  🤖 Evaluate with AI
                </button>
                <div style={{ fontSize:11, color:C.muted, marginTop:10 }}>AI will read the scanned booklet and fill marks per question</div>
              </div>
            )}

            {evaluating && (
              <div style={{ textAlign:"center", padding:"1.5rem 1rem" }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🤖</div>
                <div style={{ fontWeight:700, fontSize:14, color:C.blue, marginBottom:6 }}>AI Evaluating {bk.name}'s Booklet…</div>
                <div style={{ fontSize:13, color:C.sub, marginBottom:14 }}>Reading handwritten answers, matching schema…</div>
                <div style={{ height:8, background:"#e8ecf5", borderRadius:99, overflow:"hidden", maxWidth:300, margin:"0 auto 8px" }}>
                  <div style={{ height:"100%", width:`${evalProg}%`, background:`linear-gradient(90deg,${C.blue},${C.navy})`, borderRadius:99, transition:"width .3s" }} />
                </div>
                <div style={{ fontSize:12, color:C.muted }}>{evalProg}%</div>
              </div>
            )}

            {bk.questions.length > 0 && !evaluating && (
              <>
                {bk.questions.map((q, i) => {
                  const mark       = q.faculty !== null ? q.faculty : q.ai;
                  const pct        = Math.round((mark / q.max) * 100);
                  const isExpanded = selectedQ === q.q;
                  return (
                    <div key={i} style={{ marginBottom:isExpanded?0:10 }}>
                      <div onClick={() => setSelectedQ(isExpanded ? null : q.q)}
                        style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4, cursor:"pointer", padding:"8px 10px", borderRadius:8, background:isExpanded?"#eff6ff":"transparent", border:`1.5px solid ${isExpanded?C.blue:"transparent"}`, transition:"all .15s" }}
                        onMouseEnter={e=>{ if(!isExpanded) e.currentTarget.style.background="#f0f4fb"; }}
                        onMouseLeave={e=>{ if(!isExpanded) e.currentTarget.style.background="transparent"; }}>
                        <div style={{ minWidth:36, fontWeight:800, fontSize:13, color:isExpanded?C.blue:C.text }}>{q.q}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ height:6, background:"#e8ecf5", borderRadius:99, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background:q.faculty!==null?C.gold:C.blue, borderRadius:99, transition:"width .3s" }} />
                          </div>
                          <div style={{ fontSize:10.5, color:C.muted, marginTop:2, lineHeight:1.3 }}>{q.text}</div>
                        </div>
                        {modMode && !isFrozen ? (
                          <div style={{ display:"flex", alignItems:"center", gap:4 }} onClick={e => e.stopPropagation()}>
                            <input type="number" min={0} max={q.max} value={q.faculty ?? q.ai}
                              onChange={e => setQMark(i, e.target.value)}
                              style={{ width:48, padding:"3px 6px", borderRadius:6, textAlign:"center", border:`1.5px solid ${q.faculty!==null?C.gold:C.border}`, fontSize:14, fontWeight:800, color:q.faculty!==null?C.gold:C.navy, fontFamily:"inherit", background:q.faculty!==null?"#fffbeb":"#fff" }} />
                            <span style={{ fontSize:11, color:C.sub }}>/{q.max}</span>
                          </div>
                        ) : (
                          <span style={{ fontWeight:800, fontSize:14, color:q.faculty!==null?C.gold:C.navy }}>
                            {mark}<span style={{ fontWeight:400, fontSize:11, color:C.sub }}>/{q.max}</span>
                          </span>
                        )}
                        {q.faculty !== null && <span style={{ fontSize:9, color:C.gold, fontWeight:700 }}>Mod</span>}
                        <span style={{ fontSize:12, color:isExpanded?C.blue:C.muted }}>{isExpanded?"▲":"▼"}</span>
                      </div>

                      {isExpanded && (
                        <div style={{ margin:"0 0 10px", border:`1.5px solid ${C.blue}`, borderTop:"none", borderRadius:"0 0 10px 10px", background:"#fff", overflow:"hidden" }}>
                          <div style={{ padding:"12px 14px", borderBottom:`1px solid ${C.border}` }}>
                            <div style={{ fontSize:11, fontWeight:700, color:C.blue, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>📝 AI Feedback — {q.q}</div>
                            <div style={{ fontSize:13, color:C.text, lineHeight:1.7, background:"#f8faff", borderRadius:7, padding:"10px 12px", borderLeft:`3px solid ${C.blue}`, fontStyle:"italic" }}>
                              {q.text || "[No detailed feedback available]"}
                            </div>
                          </div>
                          {(q.strong?.length > 0 || q.weak?.length > 0) && (
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
                              <div style={{ padding:"12px 14px", borderRight:`1px solid ${C.border}`, background:"#f0fdf4" }}>
                                <div style={{ fontSize:11.5, fontWeight:800, color:C.green, marginBottom:8 }}>💪 Strong Points</div>
                                {(q.strong || []).length === 0
                                  ? <div style={{ fontSize:12, color:C.muted }}>None noted.</div>
                                  : (q.strong || []).map((s, j) => (
                                    <div key={j} style={{ display:"flex", gap:6, marginBottom:5 }}>
                                      <span style={{ color:C.green, fontWeight:700, fontSize:13 }}>✓</span>
                                      <span style={{ fontSize:12.5, color:"#14532d", lineHeight:1.5 }}>{s}</span>
                                    </div>
                                  ))}
                              </div>
                              <div style={{ padding:"12px 14px", background:"#fef2f2" }}>
                                <div style={{ fontSize:11.5, fontWeight:800, color:C.danger, marginBottom:8 }}>⚠️ Weak Points</div>
                                {(q.weak || []).length === 0
                                  ? <div style={{ fontSize:12, color:C.muted }}>None noted.</div>
                                  : (q.weak || []).map((w, j) => (
                                    <div key={j} style={{ display:"flex", gap:6, marginBottom:5 }}>
                                      <span style={{ color:C.danger, fontWeight:700, fontSize:13 }}>✗</span>
                                      <span style={{ fontSize:12.5, color:"#7f1d1d", lineHeight:1.5 }}>{w}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div style={{ marginTop:8, padding:"9px 12px", background:"#fff", border:`1px solid ${C.border}`, borderRadius:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontWeight:700, fontSize:13, color:C.text }}>Effective Total</span>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:20, fontWeight:900, color:C.navy }}>{effective}<span style={{ fontSize:13, fontWeight:400, color:C.sub }}>/{bk.maxMarks}</span></div>
                    {bk.questions.some(q => q.faculty !== null) && <div style={{ fontSize:10, color:C.gold }}>AI original: {bk.aiTotal}</div>}
                  </div>
                </div>
              </>
            )}
          </div>

          {bk.aiNote && (
            <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"12px 14px" }}>
              <div style={{ fontWeight:800, fontSize:13, color:C.blue, marginBottom:6 }}>🤖 AI Overall Note</div>
              <div style={{ fontSize:13, color:"#1e3a5f", lineHeight:1.6 }}>{bk.aiNote}</div>
            </div>
          )}

          {(bk.strong?.length > 0 || bk.weak?.length > 0) && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:10, padding:"12px 14px" }}>
                <div style={{ fontWeight:800, fontSize:13, color:C.green, marginBottom:8 }}>💪 Overall Strengths</div>
                {(bk.strong || []).map((s, i) => <div key={i} style={{ fontSize:12.5, color:"#14532d", marginBottom:4 }}>✓ {s}</div>)}
              </div>
              <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"12px 14px" }}>
                <div style={{ fontWeight:800, fontSize:13, color:C.danger, marginBottom:8 }}>⚠️ Overall Weaknesses</div>
                {(bk.weak || []).map((w, i) => <div key={i} style={{ fontSize:12.5, color:"#7f1d1d", marginBottom:4 }}>✗ {w}</div>)}
              </div>
            </div>
          )}

          <div style={{ background:C.bg, borderRadius:10, padding:"14px 16px", border:`1px solid ${C.border}`, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
            <button onClick={() => setPreviewOpen(true)} style={{ background:"transparent", border:`1.5px solid ${C.blue}`, color:C.blue, borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              👁️ Preview Script
            </button>
            {!isFrozen && !isLast && (
              <button onClick={doSaveNext} disabled={saving} style={{ background:`linear-gradient(135deg,${C.green},#0d6e3b)`, border:"none", color:"#fff", borderRadius:8, padding:"8px 20px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
                {saving ? "Saving…" : "✅ Save & Next →"}
              </button>
            )}
            {!isFrozen && isLast && (
              <button onClick={doFinish} disabled={saving} style={{ background:`linear-gradient(135deg,${C.navy},${C.blue})`, border:"none", color:"#fff", borderRadius:8, padding:"8px 24px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, boxShadow:"0 4px 14px rgba(0,35,102,0.3)" }}>
                {saving ? "Saving…" : "🏁 Finish Evaluation"}
              </button>
            )}
            {isFrozen && <span style={{ fontSize:13, fontWeight:700, color:C.purple, padding:"8px 14px", background:"#f5f3ff", borderRadius:8 }}>🔒 Marks Frozen</span>}
            <span style={{ marginLeft:"auto", fontSize:11.5, color:C.muted }}>
              {isFrozen ? "Marks locked — 2-day review window active" : isLast ? "Last booklet — click Finish to reveal schema" : "Save & Next to continue evaluation"}
            </span>
          </div>
        </div>
      </div>

      {previewOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={() => setPreviewOpen(false)}>
          <div style={{ background:"#fff", borderRadius:14, padding:"1.5rem", width:"100%", maxWidth:620, maxHeight:"82vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"1rem", alignItems:"center" }}>
              <div style={{ fontWeight:800, fontSize:16, color:C.text }}>👁️ Script Preview — {bk.name} ({bk.roll})</div>
              <button onClick={() => setPreviewOpen(false)} style={{ background:C.bg, border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:15, color:C.sub }}>✕</button>
            </div>
            {bk.questions.length === 0
              ? <div style={{ textAlign:"center", padding:"1.5rem", color:C.muted }}>No evaluation data for this booklet.</div>
              : bk.questions.map((q, i) => (
                <div key={i} style={{ background:C.bg, borderRadius:9, padding:"12px 14px", marginBottom:10, border:`1px solid ${C.border}` }}>
                  <div style={{ fontWeight:700, fontSize:13, color:C.navy, marginBottom:6 }}>
                    {q.q} — <span style={{ fontWeight:400, color:C.sub }}>{q.text}</span>
                    <span style={{ float:"right", fontWeight:800, color:q.faculty!==null?C.gold:C.navy }}>{q.faculty ?? q.ai}/{q.max}</span>
                  </div>
                </div>
              ))}
            <div style={{ textAlign:"right", marginTop:8 }}>
              <button onClick={() => setPreviewOpen(false)} style={{ background:C.navy, color:"#fff", border:"none", borderRadius:8, padding:"9px 22px", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, background:C.green, color:"#fff", padding:"12px 20px", borderRadius:10, fontSize:13.5, fontWeight:700, boxShadow:"0 8px 32px rgba(0,0,0,0.22)", zIndex:1100, maxWidth:400, lineHeight:1.5 }}>{toast}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EVALUATE PAGE
// ─────────────────────────────────────────────────────────────────────────────
function EvaluatePage({ user }) {
  const [bundles,          setBundles]          = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [activeBundle,     setActiveBundle]     = useState(null);
  const [activeBookletIdx, setActiveBookletIdx] = useState(null);
  const [schemaVisible,    setSchemaVisible]    = useState(false);
  const [allFrozen,        setAllFrozen]        = useState(false);

  const facultyId = user?.profile?._id;

  useEffect(() => {
    if (!facultyId) { setLoading(false); return; }
    evalApi.getFacultyBooklets(facultyId)
      .then(booklets => setBundles(groupIntoBundles(booklets)))
      .catch(() => setBundles([]))
      .finally(() => setLoading(false));
  }, [facultyId]);

  const activeBundleData = bundles.find(b => b.id === activeBundle?.id) || activeBundle;

  const handleUpdate = updated => {
    setBundles(prev => prev.map(b => ({ ...b, booklets:b.booklets.map(bk => bk.id===updated.id ? updated : bk) })));
    setActiveBundle(prev => prev ? { ...prev, booklets:prev.booklets.map(bk => bk.id===updated.id ? updated : bk) } : prev);
  };

  const handleSaveNext = () => {
    const next = (activeBookletIdx ?? 0) + 1;
    if (next < (activeBundleData?.booklets?.length || 0)) setActiveBookletIdx(next);
    else setActiveBookletIdx(null);
  };

  const handleFinish = () => { setActiveBookletIdx(null); setSchemaVisible(true); };

  const handleFreezeAll = async () => {
    const now = new Date().toISOString();
    if (activeBundleData?.booklets) {
      await Promise.allSettled(
        activeBundleData.booklets.map(bk => bk._id ? evalApi.freeze(bk._id) : Promise.resolve())
      );
    }
    setBundles(prev => prev.map(b => ({ ...b, booklets:b.booklets.map(bk => ({...bk, status:"frozen", frozenAt:now})) })));
    setActiveBundle(prev => prev ? { ...prev, booklets:prev.booklets.map(bk => ({...bk, status:"frozen", frozenAt:now})) } : prev);
    setAllFrozen(true);
  };

  const activeBooklet = activeBundleData?.booklets?.[activeBookletIdx] ?? null;

  if (loading) {
    return (
      <div className="page-anim">
        <Breadcrumb items={["Faculty","Evaluate"]} />
        <div style={{ padding:"40px", textAlign:"center", color:C.sub }}>Loading assigned bundles…</div>
      </div>
    );
  }

  if (!activeBundle) {
    return (
      <div className="page-anim">
        <Breadcrumb items={["Faculty","Evaluate"]} />
        <div style={{ marginBottom:18 }}>
          <div style={{ fontWeight:800, fontSize:18, color:C.text, marginBottom:4 }}>Assigned Bundles</div>
          <div style={{ fontSize:13, color:C.sub }}>Click "Evaluate Bundle" to open booklet grid.</div>
        </div>
        {bundles.length === 0 ? (
          <div style={{ padding:"40px", textAlign:"center", color:C.sub, background:"#fff", borderRadius:12, border:`1px solid ${C.border}` }}>
            No bundles assigned yet.
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {bundles.map(b => {
              const pct    = Math.round((b.booklets.filter(bk => bk.status !== "pending").length / b.totalBooklets) * 100);
              const frozen = b.booklets.filter(bk => bk.status === "frozen" || bk.finalLocked).length;
              const saved  = b.booklets.filter(bk => bk.saved).length;
              return (
                <div key={b.id} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,35,102,0.06)" }}>
                  <div style={{ background:C.navy, padding:"12px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                    <div>
                      <span style={{ fontWeight:800, fontSize:14, color:"#fff" }}>{b.subject} ({b.code}) — {b.examType}</span>
                    </div>
                    <span style={{ background:b.status==="complete"?`${C.green}33`:`${C.gold}22`, color:b.status==="complete"?C.green:C.gold, padding:"3px 12px", borderRadius:99, fontSize:12, fontWeight:700 }}>
                      {b.status === "complete" ? "Complete" : "In Progress"}
                    </span>
                  </div>
                  <div style={{ padding:"14px 18px" }}>
                    <div style={{ display:"flex", gap:14, marginBottom:12, flexWrap:"wrap" }}>
                      {[["Total",b.totalBooklets,C.navy],["Evaluated",b.booklets.filter(bk=>bk.status!=="pending").length,C.blue],["Saved",saved,C.green],["Frozen",frozen,C.purple],["Pending",b.booklets.filter(bk=>bk.status==="pending").length,C.muted]].map(([l,v,c],i) => (
                        <div key={i} style={{ background:C.bg, borderRadius:8, padding:"8px 14px", border:`1px solid ${C.border}`, minWidth:72, borderTop:`3px solid ${c}` }}>
                          <div style={{ fontSize:10, color:C.sub, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }}>{l}</div>
                          <div style={{ fontSize:18, fontWeight:800, color:c }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom:12 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:C.sub, marginBottom:4 }}>
                        <span>Progress</span><span style={{ fontWeight:700 }}>{pct}%</span>
                      </div>
                      <div style={{ height:7, background:"#e8ecf5", borderRadius:99, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:C.blue, borderRadius:99 }} />
                      </div>
                    </div>
                    <button onClick={() => { setActiveBundle(b); setActiveBookletIdx(null); setSchemaVisible(false); setAllFrozen(false); }}
                      style={{ background:`linear-gradient(135deg,${C.navy},${C.blue})`, color:"#fff", border:"none", borderRadius:8, padding:"9px 22px", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                      📋 Evaluate Bundle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-anim">
      <Breadcrumb items={["Faculty","Evaluate",activeBundle.subject]} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:18, color:C.text }}>{activeBundle.subject} — Booklet Evaluation</div>
          <div style={{ fontSize:13, color:C.sub, marginTop:2 }}>Click any booklet to review. Use Save & Next to navigate.</div>
        </div>
        <button onClick={() => { setActiveBundle(null); setActiveBookletIdx(null); setSchemaVisible(false); }}
          style={{ background:C.bg, border:`1px solid ${C.border}`, color:C.sub, borderRadius:8, padding:"7px 16px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          ← Back to Bundles
        </button>
      </div>
      <BookletGrid bundle={activeBundleData} onSelect={(bk,idx) => setActiveBookletIdx(idx)} activeBookletId={activeBooklet?.id} />
      {schemaVisible && (
        <div style={{ marginTop:20 }}>
          <SchemaSpreadsheet booklets={activeBundleData.booklets} onFreezeAll={handleFreezeAll} allFrozen={allFrozen} />
        </div>
      )}
      {activeBooklet && (
        <BookletDetail key={activeBooklet.id} booklet={activeBooklet} bookletIndex={activeBookletIdx}
          totalBooklets={activeBundleData.booklets.length}
          onClose={() => setActiveBookletIdx(null)} onUpdate={handleUpdate}
          onSaveNext={handleSaveNext} onFinish={handleFinish} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LABS PAGE
// ─────────────────────────────────────────────────────────────────────────────
function LabsPage({ user }) {
  const facultyId = user?.profile?._id;
  const deptId    = user?.profile?.department?._id || user?.profile?.department;

  const [labSubjects,  setLabSubjects]  = useState([]);
  const [students,     setStudents]     = useState([]);
  const [academicYears,setAcYears]      = useState([]);
  const [semesters,    setSemesters]    = useState([]);
  const [selSubject,   setSelSubject]   = useState("");
  const [selAcYear,    setSelAcYear]    = useState("");
  const [selSem,       setSelSem]       = useState("");
  const [labMarksState,setLabMarksState]= useState({});
  const [labMarkIds,   setLabMarkIds]   = useState({});
  const [saved,        setSaved]        = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState("");

  const showToast = m => { setToast(m); setTimeout(() => setToast(""), 3200); };

  // Load lab subjects, academic years, semesters, students
  useEffect(() => {
    const params = deptId ? { department: deptId } : {};
    Promise.all([
      subjectsApi.list({ ...params, type: "lab" }),
      academicYearsApi.list(),
      semestersApi.list(),
      studentsApi.list(params),
    ])
      .then(([subs, ayears, sems, studs]) => {
        setLabSubjects(subs);
        setAcYears(ayears);
        setSemesters(sems);
        setStudents(studs);
        const init = {};
        studs.forEach(s => { init[s._id] = { intExam:"", intViva:"", extExam:"", extViva:"" }; });
        setLabMarksState(init);
        if (ayears.length) setSelAcYear(ayears[0]._id);
        if (sems.length)   setSelSem(sems[0]._id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deptId]);

  // Load existing marks when subject changes
  useEffect(() => {
    if (!selSubject || students.length === 0) return;
    Promise.all(
      students.map(s =>
        labMarksApi.getForStudent(s._id, selSubject)
          .then(lm => ({ id: s._id, lm }))
          .catch(() => ({ id: s._id, lm: null }))
      )
    ).then(results => {
      const marks = {};
      const ids   = {};
      results.forEach(({ id, lm }) => {
        marks[id] = {
          intExam: lm?.internalLabMarks  ?? "",
          intViva:  lm?.internalVivaMarks ?? "",
          extExam:  lm?.externalLabMarks  ?? "",
          extViva:  lm?.externalVivaMarks ?? "",
        };
        if (lm?._id) ids[id] = lm._id;
      });
      setLabMarksState(marks);
      setLabMarkIds(ids);
      setSaved(false);
    });
  }, [selSubject, students]);

  const updateMark = (sid, field, val) => {
    setSaved(false);
    setLabMarksState(p => ({ ...p, [sid]: { ...p[sid], [field]: val === "" ? "" : Math.max(0, Math.min(25, +val)) } }));
  };

  const getTotal = sid => ["intExam","intViva","extExam","extViva"].reduce((s, k) => s + (+labMarksState[sid]?.[k] || 0), 0);

  const handleSave = async () => {
    if (!selSubject) { showToast("Please select a subject first."); return; }
    if (!selAcYear)  { showToast("Please select an academic year."); return; }
    setSaving(true);
    const entries = students
      .filter(s => { const m = labMarksState[s._id]; return m && (m.intExam !== "" || m.intViva !== "" || m.extExam !== "" || m.extViva !== ""); })
      .map(s => {
        const m = labMarksState[s._id];
        return {
          studentId:         s._id,
          subjectId:         selSubject,
          facultyId:         facultyId,
          academicYearId:    selAcYear,
          semesterId:        selSem || undefined,
          internalLabMarks:  +m.intExam  || 0,
          internalVivaMarks: +m.intViva  || 0,
          externalLabMarks:  +m.extExam  || 0,
          externalVivaMarks: +m.extViva  || 0,
        };
      });
    try {
      const res = await labMarksApi.saveBulk(entries);
      // Capture returned IDs for submit step
      const saved_entries = res?.entries || res?.data || res || [];
      if (Array.isArray(saved_entries)) {
        const ids = { ...labMarkIds };
        saved_entries.forEach(lm => { if (lm?.student && lm?._id) ids[lm.student] = lm._id; });
        setLabMarkIds(ids);
      }
      setSaved(true);
      showToast("✅ Lab marks saved successfully!");
    } catch {
      showToast("❌ Failed to save lab marks. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitFinal = async () => {
    const ids = Object.values(labMarkIds);
    if (ids.length === 0) { showToast("Save marks first before submitting."); return; }
    setSubmitting(true);
    let ok = 0, fail = 0;
    await Promise.allSettled(ids.map(id => labMarksApi.submit(id).then(() => ok++).catch(() => fail++)));
    setSubmitting(false);
    if (fail === 0) showToast(`✅ ${ok} record(s) submitted for final approval!`);
    else showToast(`⚠️ ${ok} submitted, ${fail} failed.`);
  };

  const th = (x = {}) => ({ padding:"10px 12px", fontWeight:700, fontSize:11, color:"#fff", textTransform:"uppercase", letterSpacing:"0.06em", textAlign:"center", background:C.navy, border:"1px solid rgba(255,255,255,0.1)", whiteSpace:"nowrap", ...x });
  const td = (x = {}) => ({ padding:"9px 10px", border:`1px solid ${C.border}`, textAlign:"center", fontSize:13, ...x });

  return (
    <div className="page-anim">
      <Breadcrumb items={["Faculty","Labs"]} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:18, color:C.text, marginBottom:4 }}>Lab Marks Entry</div>
          <div style={{ fontSize:13, color:C.sub }}>Select subject, then enter marks manually. Max 25 per column.</div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <select value={selSubject} onChange={e => setSelSubject(e.target.value)}
            style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, color:C.text, fontFamily:"inherit", background:"#fff", cursor:"pointer" }}>
            <option value="">Select Subject</option>
            {labSubjects.map(s => <option key={s._id} value={s._id}>{s.title} ({s.courseCode})</option>)}
          </select>
          <select value={selAcYear} onChange={e => setSelAcYear(e.target.value)}
            style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, color:C.text, fontFamily:"inherit", background:"#fff", cursor:"pointer" }}>
            <option value="">Academic Year</option>
            {academicYears.map(a => <option key={a._id} value={a._id}>{a.year}</option>)}
          </select>
          <select value={selSem} onChange={e => setSelSem(e.target.value)}
            style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, color:C.text, fontFamily:"inherit", background:"#fff", cursor:"pointer" }}>
            <option value="">Semester</option>
            {semesters.map(s => <option key={s._id} value={s._id}>Sem {s.number}</option>)}
          </select>
          <button onClick={handleSave} disabled={saving || !selSubject}
            style={{ background:`linear-gradient(135deg,${C.navy},${C.blue})`, color:"#fff", border:"none", borderRadius:8, padding:"9px 22px", fontWeight:700, fontSize:13, cursor:saving||!selSubject?"not-allowed":"pointer", fontFamily:"inherit", opacity:saving||!selSubject?0.7:1 }}>
            {saving ? "Saving…" : "💾 Save Marks"}
          </button>
          {saved && (
            <button onClick={handleSubmitFinal} disabled={submitting}
              style={{ background:`linear-gradient(135deg,${C.green},#077a41)`, color:"#fff", border:"none", borderRadius:8, padding:"9px 22px", fontWeight:700, fontSize:13, cursor:submitting?"not-allowed":"pointer", fontFamily:"inherit", opacity:submitting?0.7:1 }}>
              {submitting ? "Submitting…" : "✅ Submit Final"}
            </button>
          )}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:18 }}>
        {[
          ["Total Students",  students.length,                                                               C.navy],
          ["Marks Entered",   students.filter(s => labMarksState[s._id]?.intExam !== "").length,             C.green],
          ["Pending",         students.filter(s => labMarksState[s._id]?.intExam === "").length,             C.gold],
          ["Max Total",       "100",                                                                          C.blue],
        ].map(([l,v,c],i) => (
          <div key={i} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px", borderTop:`3px solid ${c}`, boxShadow:"0 2px 6px rgba(0,35,102,0.05)" }}>
            <div style={{ fontSize:10, color:C.sub, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:22, fontWeight:800, color:c }}>{loading ? "…" : v}</div>
          </div>
        ))}
      </div>

      <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,35,102,0.06)" }}>
        <div style={{ background:C.navy, padding:"11px 18px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontWeight:800, fontSize:14, color:"#fff" }}>
            {selSubject ? (labSubjects.find(s => s._id === selSubject)?.title || "Lab Marks") : "Select a subject above"}
          </span>
          {saved && <span style={{ background:"#e6f7ef", color:C.green, padding:"3px 12px", borderRadius:99, fontSize:11, fontWeight:700 }}>✓ Saved</span>}
        </div>

        {loading ? (
          <div style={{ padding:"32px", textAlign:"center", color:C.sub }}>Loading students…</div>
        ) : students.length === 0 ? (
          <div style={{ padding:"32px", textAlign:"center", color:C.sub }}>No students found for your department.</div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ borderCollapse:"collapse", width:"100%", fontSize:13 }}>
              <thead>
                <tr>
                  <th style={th({ textAlign:"left", paddingLeft:16, minWidth:100, background:"#1e3a5f" })}>Student ID</th>
                  <th style={th({ textAlign:"left", minWidth:140, background:"#1e3a5f" })}>Student Name</th>
                  <th style={th({ background:"#0d4a8a" })}><div>Internal Exam</div><div style={{ fontSize:9, color:"rgba(255,255,255,0.6)", fontWeight:400 }}>Max 25</div></th>
                  <th style={th({ background:"#0d4a8a" })}><div>Internal Viva</div><div style={{ fontSize:9, color:"rgba(255,255,255,0.6)", fontWeight:400 }}>Max 25</div></th>
                  <th style={th({ background:"#145a8a" })}><div>External Exam</div><div style={{ fontSize:9, color:"rgba(255,255,255,0.6)", fontWeight:400 }}>Max 25</div></th>
                  <th style={th({ background:"#145a8a" })}><div>External Viva</div><div style={{ fontSize:9, color:"rgba(255,255,255,0.6)", fontWeight:400 }}>Max 25</div></th>
                  <th style={th({ background:"#0a3d6b" })}>Total /100</th>
                </tr>
              </thead>
              <tbody>
                {students.map((stu, ri) => {
                  const m = labMarksState[stu._id] || { intExam:"", intViva:"", extExam:"", extViva:"" };
                  const total = getTotal(stu._id);
                  const any   = m.intExam !== "" || m.intViva !== "" || m.extExam !== "" || m.extViva !== "";
                  return (
                    <tr key={stu._id} style={{ background:ri%2===0?"#fff":"#fafbff", borderBottom:`1px solid ${C.border}` }}>
                      <td style={td({ textAlign:"left", paddingLeft:16, fontWeight:700, color:C.navy })}>{stu.rollNumber}</td>
                      <td style={td({ textAlign:"left", color:C.text })}>{stu.name}</td>
                      {[["intExam","#f0f8ff","#0d4a8a"],["intViva","#f0f8ff","#0d4a8a"],["extExam","#f5faff","#145a8a"],["extViva","#f5faff","#145a8a"]].map(([field, bg, bc]) => (
                        <td key={field} style={td({ background:bg })}>
                          <input type="number" min={0} max={25} value={m[field]} placeholder="—"
                            onChange={e => updateMark(stu._id, field, e.target.value)}
                            style={{ width:54, padding:"5px 6px", borderRadius:7, textAlign:"center", border:`1.5px solid ${m[field]!==""?bc:C.border}`, fontSize:14, fontWeight:700, color:C.navy, fontFamily:"inherit", background:"transparent" }} />
                        </td>
                      ))}
                      <td style={td({ fontWeight:800, fontSize:15, color:!any?C.muted:total>=60?C.green:total>=40?C.gold:C.danger, background:any?(total>=60?"#f0fdf4":total>=40?"#fffbeb":"#fef2f2"):"#f9f9f9" })}>
                        {any ? total : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:"#f0f4fb" }}>
                  <td colSpan={2} style={td({ textAlign:"left", paddingLeft:16, fontWeight:800, color:C.navy })}>Class Average</td>
                  {["intExam","intViva","extExam","extViva"].map(k => {
                    const vals = students.map(s => labMarksState[s._id]?.[k]).filter(v => v !== "" && v != null);
                    return <td key={k} style={td({ fontWeight:700, color:C.blue })}>{vals.length ? (vals.reduce((a, b) => a + (+b), 0) / vals.length).toFixed(1) : "—"}</td>;
                  })}
                  <td style={td({ fontWeight:800, color:C.navy })}>
                    {(() => { const f = students.filter(s => labMarksState[s._id]?.intExam !== "").length; if (!f) return "—"; return (students.map(s => getTotal(s._id)).reduce((a, b) => a + b, 0) / f).toFixed(1); })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div style={{ padding:"10px 18px", background:"#eaf3fb", borderTop:`1px solid ${C.border}`, fontSize:12.5, color:C.blue, display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:16 }}>📝</span>
          <span>All fields manually entered. Max 25 per column. Total auto-calculated (max 100). Click <strong>Save Marks</strong> when done.</span>
        </div>
      </div>

      {toast && <div style={{ position:"fixed", bottom:24, right:24, background:C.green, color:"#fff", padding:"12px 20px", borderRadius:10, fontSize:13.5, fontWeight:700, boxShadow:"0 8px 32px rgba(0,0,0,0.22)", zIndex:1100, maxWidth:360, lineHeight:1.5 }}>{toast}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
const FacultyDashboard = ({ setEvalModal, sec, user }) => {
  const [stats,    setStats]    = useState({ assigned:0, pending:0, evaluated:0, frozen:0 });
  const [booklets, setBooklets] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const facultyId = user?.profile?._id || user?.id;
    if (!facultyId) { setLoading(false); return; }
    Promise.all([
      dashboardApi.getFacultyStats(facultyId),
      evalApi.getFacultyBooklets(facultyId, { status:"ai_evaluated" }),
    ])
      .then(([s, bks]) => { setStats(s); setBooklets(bks.slice(0, 5)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (sec === "evaluate" || sec === "assigned") return <EvaluatePage user={user} />;
  if (sec === "labs")                           return <LabsPage user={user} />;

  // Score distribution from booklets
  const chartData = (() => {
    const ranges = [[0,20],[21,30],[31,40],[41,45],[46,50]];
    return ranges.map(([lo,hi]) => ({
      l: `${lo}–${hi}`,
      v: booklets.filter(b => { const t = b.aiEvaluation?.totalMarks ?? 0; return t >= lo && t <= hi; }).length,
    }));
  })();

  const avgMarks = booklets.length
    ? (booklets.reduce((s, b) => s + (b.aiEvaluation?.totalMarks || 0), 0) / booklets.length).toFixed(1)
    : "—";
  const highest  = booklets.length ? Math.max(...booklets.map(b => b.aiEvaluation?.totalMarks || 0)) : "—";
  const maxMark  = booklets[0]?.aiEvaluation?.maxMarks || 50;

  return (
    <div className="page-anim">
      <Breadcrumb items={["Faculty","Dashboard"]} />
      <div className="stats-grid">
        <StatCard title="Assigned Sheets" value={loading ? "…" : stats.assigned  || "—"} sub="Total booklets assigned" icon="exam"  accent="navy"  />
        <StatCard title="Evaluated"       value={loading ? "…" : stats.evaluated || "—"} sub="AI + faculty reviewed"  icon="check" accent="green" />
        <StatCard title="Pending"         value={loading ? "…" : stats.pending   || "—"} sub="Awaiting evaluation"    icon="edit"  accent="gold"  />
        <StatCard title="Frozen"          value={loading ? "…" : stats.frozen    || "—"} sub="Marks locked"           icon="ai"    accent="blue"  />
      </div>
      <div className="grid-1-1">
        <Card title="Answer Sheets — Pending Review">
          {loading ? (
            <div style={{ padding:"12px", color:C.sub, fontSize:13 }}>Loading…</div>
          ) : booklets.length > 0 ? booklets.map(bk => (
            <div key={bk._id} className="sheet-row">
              <div>
                <div className="sheet-row-name">{bk.student?.name || "Student"}</div>
                <div className="sheet-row-sub">
                  {bk.student?.rollNumber} &bull; AI: <strong style={{ color:C.navy }}>{bk.aiEvaluation?.totalMarks ?? "—"}/{bk.aiEvaluation?.maxMarks ?? 50}</strong>
                </div>
              </div>
              <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                <Badge text={bk.status?.replace(/_/g," ")} type={bk.status==="frozen"?"success":bk.status==="ai_evaluated"?"gold":"info"} />
                <GoldBtn onClick={() => setEvalModal && setEvalModal(bk)} style={{ padding:"6px 14px", fontSize:"12px" }}>Review</GoldBtn>
              </div>
            </div>
          )) : (
            <div style={{ padding:"12px", color:C.sub, fontSize:13 }}>No pending booklets. All caught up!</div>
          )}
        </Card>
        <Card title="Score Distribution — Assigned Booklets">
          {loading ? (
            <div style={{ padding:"12px", color:C.sub, fontSize:13 }}>Loading…</div>
          ) : (
            <>
              <BarChart data={chartData} />
              <Divider />
              {[
                ["Class Average",     `${avgMarks} / ${maxMark}`, C.text],
                ["Highest Score",     `${highest} / ${maxMark}`,  C.green],
                ["Pass Percentage",   stats.assigned > 0 ? `${Math.round((stats.evaluated + stats.frozen) / stats.assigned * 100)}%` : "—", C.blue],
              ].map(([l, v, c]) => (
                <div key={l} className="score-row">
                  <span className="score-row-label">{l}</span>
                  <span className="score-row-val" style={{ color:c }}>{v}</span>
                </div>
              ))}
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default FacultyDashboard;
