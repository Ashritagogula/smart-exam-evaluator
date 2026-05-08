// src/pages/dashboards/ExternalDashboard.jsx
// Identical to FacultyDashboard EXCEPT:
//  1. No Labs section
//  2. "Freeze All" → "Notify to Scrutinizer"
//  3. Breadcrumbs show "External"
//  4. Highlighted booklets (returned by scrutinizer) shown in orange

import { useState, useEffect, useMemo } from "react";
import StatCard from "../../components/ui/StatCard";
import { Card, Divider } from "../../components/ui/Card";
import { BarChart } from "../../components/ui/Charts";
import Badge from "../../components/ui/Badge";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { dashboard as dashboardApi, externalExam } from "../../services/api.js";

const C = {
  navy:"#002366", blue:"#0077b6", gold:"#f7941d",
  green:"#0a8a4a", danger:"#dc2626", purple:"#6d28d9",
  orange:"#ea580c",
  border:"#d0daf0", bg:"#f0f4fb", card:"#fff",
  text:"#1a2744", sub:"#6478a0", muted:"#94a3b8",
};

function mapBooklet(bk) {
  const ai = bk.aiEvaluation;
  const ee = bk.examinerEvaluation;
  return {
    _id: bk._id,
    id: bk._id,
    barcode: bk.barcode,
    roll: bk.student?.rollNumber || "—",
    name: bk.student?.name || "Student",
    status: bk.status,
    aiTotal: ai?.totalMarks ?? null,
    maxMarks: ai?.maxMarks || 50,
    saved: ee?.finalMarks != null,
    frozenAt: bk.frozenAt || null,
    finalLocked: bk.status === "permanently_frozen",
    returnedByScrutinizer: bk.returnedByScrutinizer || false,
    returnMessage: bk.returnMessage || "",
    questions: (ai?.questionWiseMarks || []).map(q => ({
      q: q.questionNumber,
      max: q.maxMarks,
      ai: q.marksAwarded,
      faculty: ee?.questionWiseMarks?.find(eq => eq.questionNumber === q.questionNumber)?.marksAwarded ?? null,
      text: q.feedback || `Question ${q.questionNumber}`,
    })),
    strong: ai?.strengths || [],
    weak: ai?.weaknesses || [],
    aiNote: ai?.improvements?.[0] || ai?.suggestions?.[0] || "",
  };
}

const sColor = s => ({ ai_evaluated:C.danger, pending:C.muted, frozen:C.purple, final_locked:C.navy, permanently_frozen:C.navy, saved:C.green, notified:C.purple }[s] || C.muted);
const sLabel = s => ({ ai_evaluated:"AI Evaluated", pending:"Pending", frozen:"Notified", final_locked:"Final Locked", permanently_frozen:"Final Locked", saved:"Saved", notified:"Notified to Scrutinizer" }[s] || s);

// ── Schema Spreadsheet ────────────────────────────────────────────────────────
function SchemaSpreadsheet({ booklets, bundleId, onNotifyScrutinizer, allNotified }) {
  const schemaCols = useMemo(() => {
    const first = booklets.find(bk => bk.questions.length > 0);
    if (!first) return [];
    return first.questions.map(q => ({ id: q.q, label: q.q, maxMarks: q.max, co: "—", bloom: "—" }));
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
          {allNotified && <span style={{ background:`${C.purple}22`, color:C.purple, padding:"3px 12px", borderRadius:99, fontSize:11, fontWeight:700 }}>📤 Notified</span>}
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
                  {col.label}<div style={{ fontSize:9, color:"rgba(255,255,255,0.5)", fontWeight:400 }}>/{col.maxMarks}</div>
                </th>
              ))}
              <th style={td({ background:"#1e3a5f", color:"#fff", fontWeight:800, fontSize:12, minWidth:72 })}>Total</th>
              <th style={td({ background:"#1e3a5f", color:"#fff", fontWeight:800, fontSize:12, minWidth:88 })}>Status</th>
            </tr>
            <tr>
              <td colSpan={2} style={td({ background:"#eaf3fb", fontWeight:700, fontSize:10, color:C.blue, textAlign:"left", paddingLeft:14 })}>Course Outcome →</td>
              {schemaCols.map(col => <td key={col.id} style={td({ background:"#eaf3fb", fontWeight:700, fontSize:10, color:C.blue })}>{col.co}</td>)}
              <td style={td({ background:"#eaf3fb" })}></td><td style={td({ background:"#eaf3fb" })}></td>
            </tr>
            <tr>
              <td colSpan={2} style={td({ background:"#f5f3ff", fontWeight:700, fontSize:10, color:C.purple, textAlign:"left", paddingLeft:14 })}>Bloom Level →</td>
              {schemaCols.map(col => <td key={col.id} style={td({ background:"#f5f3ff", fontWeight:700, fontSize:10, color:C.purple })}>{col.bloom}</td>)}
              <td style={td({ background:"#f5f3ff" })}></td><td style={td({ background:"#f5f3ff" })}></td>
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
              const isPending  = bk.status === "pending";
              const rowTotal   = schemaCols.reduce((s, col) => { const v = schemaMarks[bk.id]?.[col.id]; return s + (v !== null && v !== undefined ? v : 0); }, 0);
              const isReturned = bk.returnedByScrutinizer;
              return (
                <tr key={bk.id} style={{ background:isReturned?"#fff7ed":ri%2===0?"#fff":"#fafbff" }}>
                  <td style={td({ fontWeight:700, color:isReturned?C.orange:C.navy, textAlign:"left", paddingLeft:14 })}>
                    {isReturned && <span style={{ marginRight:4 }}>⚠️</span>}{bk.roll}
                  </td>
                  <td style={td({ color:C.text, textAlign:"left" })}>{bk.name}</td>
                  {schemaCols.map(col => {
                    const val      = schemaMarks[bk.id]?.[col.id];
                    const modified = bk.questions.find(q => q.q === col.id)?.faculty !== null;
                    return (
                      <td key={col.id} style={td({ color:modified?C.gold:C.navy, fontWeight:700, background:isPending?"#f9f9f9":"#fff" })}>
                        {isPending ? <span style={{ color:C.muted }}>—</span> : (val !== null && val !== undefined ? val : "—")}
                      </td>
                    );
                  })}
                  <td style={td({ fontWeight:800, fontSize:14, color:isPending?C.muted:rowTotal>=25?C.green:C.danger })}>
                    {isPending ? "—" : `${rowTotal}/${schemaCols.reduce((a, b) => a + b.maxMarks, 0) || 50}`}
                  </td>
                  <td style={td()}>
                    {isReturned ? (
                      <span style={{ background:"#fff7ed", color:C.orange, padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, border:`1px solid ${C.orange}` }}>
                        ⚠ Returned
                      </span>
                    ) : (
                      <span style={{ background:`${sColor(bk.status)}15`, color:sColor(bk.status), padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700 }}>
                        {sLabel(bk.status)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ padding:"16px 20px", background:allNotified?"#f0fdf4":"#f5f3ff", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        {allNotified ? (
          <>
            <div style={{ fontSize:13, color:C.green, fontWeight:700 }}>✅ Marks notified to scrutinizer. Awaiting verification.</div>
            <span style={{ background:"#e6f7ef", color:C.green, padding:"8px 20px", borderRadius:8, fontSize:13, fontWeight:700 }}>📤 Notified to Scrutinizer</span>
          </>
        ) : (
          <>
            <div>
              <div style={{ fontWeight:700, fontSize:13.5, color:C.purple, marginBottom:3 }}>Ready to send for scrutiny?</div>
              <div style={{ fontSize:12, color:C.sub }}>This will notify the scrutinizer to verify all booklet marks.</div>
            </div>
            <button onClick={onNotifyScrutinizer} style={{
              background:`linear-gradient(135deg,${C.purple},#5b21b6)`,
              color:"#fff", border:"none", borderRadius:9, padding:"11px 28px",
              fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit",
              display:"flex", alignItems:"center", gap:8,
              boxShadow:"0 4px 16px rgba(109,40,217,0.35)",
            }}>
              📤 Notify to Scrutinizer
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Booklet Grid ──────────────────────────────────────────────────────────────
function BookletGrid({ bundle, onSelect, activeBookletId }) {
  return (
    <div style={{ background:"#fff", border:`2px solid #e8ecf5`, borderRadius:12, padding:20 }}>
      <div style={{ background:C.navy, borderRadius:9, padding:"12px 18px", marginBottom:16,
        display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
        <div>
          <span style={{ fontWeight:800, fontSize:15, color:"#fff" }}>{bundle.subject} ({bundle.code}) — {bundle.examType}</span>
          <span style={{ marginLeft:12, fontSize:12, color:"rgba(255,255,255,0.5)" }}>Bundle {bundle.id}</span>
        </div>
        <span style={{ background:`${C.gold}22`, color:C.gold, padding:"3px 12px", borderRadius:99, fontSize:12, fontWeight:700 }}>
          {bundle.booklets.filter(b => b.status !== "pending").length}/{bundle.totalBooklets} Evaluated
        </span>
      </div>
      <p style={{ fontSize:12, color:C.sub, marginBottom:14, fontWeight:600 }}>
        Click any booklet to open review. Save &amp; Next navigates through booklets. Finish appears on the last booklet.
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(88px,1fr))", gap:10 }}>
        {bundle.booklets.map((bk, idx) => {
          const frozen   = bk.status === "frozen" || bk.finalLocked;
          const saved    = bk.saved;
          const active   = bk.id === activeBookletId;
          const returned = bk.returnedByScrutinizer;
          const col      = returned ? C.orange : frozen ? C.navy : saved ? C.green : sColor(bk.status);
          return (
            <div key={bk.id}
              onClick={() => onSelect(bk, idx)}
              title={`${bk.roll} — ${bk.name}\n${returned ? "⚠ Returned by Scrutinizer" : sLabel(bk.status)}`}
              style={{
                border:`2.5px solid ${active?C.gold:col}`,
                borderRadius:8, padding:"8px 5px", textAlign:"center", cursor:"pointer",
                background:active?"#fffbeb":returned?"#fff7ed":frozen?"#f0f4ff":saved?"#e6f7ef":"#fff",
                transition:"all .17s", position:"relative", minHeight:68,
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3,
                boxShadow:active?`0 0 0 3px ${C.gold}44`:returned?`0 0 0 2px ${C.orange}44`:"none",
              }}
              onMouseEnter={e=>{if(!active){e.currentTarget.style.background=`${col}10`;e.currentTarget.style.transform="translateY(-2px)";}}}
              onMouseLeave={e=>{e.currentTarget.style.background=active?"#fffbeb":returned?"#fff7ed":frozen?"#f0f4ff":saved?"#e6f7ef":"#fff";e.currentTarget.style.transform="translateY(0)";}}>
              <div style={{ position:"absolute", top:4, right:4, width:6, height:6, borderRadius:"50%", background:active?C.gold:col }} />
              {returned && <div style={{ position:"absolute", top:3, left:3, fontSize:9 }}>⚠️</div>}
              <div style={{ fontSize:9.5, fontWeight:800, color:active?C.gold:col }}>{bk.roll}</div>
              <div style={{ fontSize:8.5, color:C.muted }}>{bk.barcode?.slice(-5)}</div>
              {bk.aiTotal !== null && <div style={{ fontSize:11, fontWeight:700, color:C.navy }}>{bk.aiTotal}/{bk.maxMarks}</div>}
              {saved && !frozen && <div style={{ fontSize:8, color:C.green, fontWeight:700 }}>✓ Saved</div>}
              {returned && <div style={{ fontSize:8, color:C.orange, fontWeight:700 }}>Re-check</div>}
              {bk.status === "pending" && <div style={{ fontSize:9, color:C.muted }}>Pending</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:12, marginTop:14, flexWrap:"wrap" }}>
        {[{c:C.gold,l:"Currently reviewing"},{c:C.danger,l:"AI Evaluated"},{c:C.green,l:"Saved"},{c:C.purple,l:"Frozen"},{c:C.orange,l:"Returned by Scrutinizer"},{c:C.muted,l:"Pending"}].map((l,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:C.sub }}>
            <div style={{ width:10, height:10, borderRadius:2, border:`2px solid ${l.c}` }} />{l.l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Booklet Detail Panel ──────────────────────────────────────────────────────
function BookletDetail({ booklet:initBk, bookletIndex, totalBooklets, bundleId, onClose, onUpdate, onSaveNext, onFinish }) {
  const [bk, setBk]                 = useState({ ...initBk, questions:initBk.questions.map(q => ({...q})) });
  const [modMode, setModMode]       = useState(false);
  const [selectedQ, setSelectedQ]   = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evalProg, setEvalProg]     = useState(0);
  const [toast, setToast]           = useState("");

  const showToast = m => { setToast(m); setTimeout(() => setToast(""), 3200); };
  const isLast    = bookletIndex === totalBooklets - 1;
  const isFrozen  = bk.status === "frozen" || bk.finalLocked;
  const effective = bk.questions.reduce((s, q) => s + (q.faculty !== null ? q.faculty : (q.ai ?? 0)), 0);

  const setQMark = (idx, val) =>
    setBk(p => ({ ...p, questions:p.questions.map((q, i) => i===idx ? {...q, faculty:Math.max(0, Math.min(q.max, +val))} : q) }));

  const doEvaluate = async () => {
    setEvaluating(true); setEvalProg(15);
    try {
      await externalExam.bundles.aiEvaluate(bundleId);
      setEvalProg(70);
      const booklets = await externalExam.booklets.list({ bundle: bundleId });
      setEvalProg(95);
      const fresh = booklets.map(mapBooklet).find(b => b._id === bk._id);
      if (fresh) { setBk(fresh); onUpdate(fresh); }
      setEvalProg(100);
      showToast(`🤖 AI evaluation complete for bundle!`);
    } catch {
      showToast("AI evaluation failed. Please try again.");
    } finally {
      setEvaluating(false);
    }
  };

  const doSaveNext = async () => {
    const modifications = bk.questions.filter(q => q.faculty !== null).map(q => ({ questionNumber: q.q, marksAwarded: q.faculty }));
    const finalMarks = effective;
    try {
      await externalExam.booklets.updateMarks(bk._id, { modifications, finalMarks });
    } catch {}
    const updated = { ...bk, saved:true, returnedByScrutinizer:false };
    setBk(updated); onUpdate(updated);
    showToast(`✅ ${bk.name} saved!`);
    setTimeout(() => onSaveNext(), 700);
  };

  const doFinish = async () => {
    const modifications = bk.questions.filter(q => q.faculty !== null).map(q => ({ questionNumber: q.q, marksAwarded: q.faculty }));
    const finalMarks = effective;
    try {
      await externalExam.booklets.updateMarks(bk._id, { modifications, finalMarks });
    } catch {}
    const updated = { ...bk, saved:true };
    setBk(updated); onUpdate(updated);
    showToast(`✅ Finished! Showing full evaluation schema…`);
    setTimeout(() => onFinish(), 700);
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.52)",zIndex:900,display:"flex",alignItems:"flex-start",justifyContent:"flex-end" }}
      onClick={onClose}>
      <div style={{ width:"min(100vw,820px)",height:"100vh",background:"#fff",overflowY:"auto",boxShadow:"-8px 0 40px rgba(0,0,0,0.22)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background:bk.returnedByScrutinizer?C.orange:C.navy,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10 }}>
          <div>
            <div style={{ fontWeight:800,fontSize:15,color:"#fff" }}>{bk.barcode} — {bk.name}</div>
            <div style={{ fontSize:11.5,color:"rgba(255,255,255,0.65)",marginTop:2 }}>
              {bk.roll} · {bk.barcode} · Booklet {bookletIndex+1} of {totalBooklets}
            </div>
          </div>
          <div style={{ display:"flex",gap:10,alignItems:"center" }}>
            {bk.returnedByScrutinizer ? (
              <span style={{ background:"rgba(255,255,255,0.2)",color:"#fff",padding:"4px 12px",borderRadius:99,fontSize:11,fontWeight:700 }}>⚠ Returned by Scrutinizer</span>
            ) : (
              <span style={{ background:`${sColor(bk.status)}22`,color:sColor(bk.status),padding:"4px 12px",borderRadius:99,fontSize:11,fontWeight:700 }}>{sLabel(bk.status)}</span>
            )}
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:15 }}>✕</button>
          </div>
        </div>

        {/* Scrutinizer return message */}
        {bk.returnedByScrutinizer && bk.returnMessage && (
          <div style={{ background:"#fff7ed",borderBottom:`2px solid ${C.orange}`,padding:"12px 20px",display:"flex",gap:10,alignItems:"flex-start" }}>
            <span style={{ fontSize:20 }}>⚠️</span>
            <div>
              <div style={{ fontWeight:800,fontSize:13,color:C.orange,marginBottom:3 }}>Scrutinizer Message</div>
              <div style={{ fontSize:13,color:"#7c2d12",lineHeight:1.6 }}>{bk.returnMessage}</div>
            </div>
          </div>
        )}

        <div style={{ padding:18,display:"flex",flexDirection:"column",gap:14 }}>
          {/* Question-wise Marks */}
          <div style={{ background:C.bg,borderRadius:10,padding:"14px 16px",border:`1px solid ${bk.returnedByScrutinizer?C.orange:C.border}` }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <div>
                <span style={{ fontWeight:800,fontSize:14,color:C.text }}>Question-wise Marks</span>
                {bk.questions.length > 0 && <span style={{ fontSize:11,fontWeight:400,color:C.sub,marginLeft:10 }}>Click a question to view AI feedback</span>}
              </div>
              {bk.questions.length > 0 && !isFrozen && (
                <button onClick={() => setModMode(p => !p)} style={{ background:modMode?C.gold+"22":"transparent", border:`1.5px solid ${modMode?C.gold:C.border}`, color:modMode?C.gold:C.sub, borderRadius:7,padding:"5px 16px",fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,transition:"all .15s" }}>
                  {modMode ? "✓ Done Modifying" : "✏️ Modify"}
                </button>
              )}
            </div>

            {bk.questions.length === 0 && !evaluating && (
              <div style={{ textAlign:"center",padding:"1.5rem 1rem" }}>
                <div style={{ fontSize:36,marginBottom:10 }}>📋</div>
                <div style={{ fontWeight:700,fontSize:14,color:C.text,marginBottom:6 }}>AI Evaluation Not Done</div>
                <div style={{ fontSize:13,color:C.sub,marginBottom:18,lineHeight:1.6 }}>This bundle hasn&apos;t been evaluated by AI yet.<br/>Click below to trigger AI evaluation for all booklets in this bundle.</div>
                <button onClick={doEvaluate} style={{ background:`linear-gradient(135deg,${C.blue},${C.navy})`,color:"#fff",border:"none",borderRadius:9,padding:"10px 26px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(0,35,102,0.25)" }}>🤖 Evaluate Bundle with AI</button>
                <div style={{ fontSize:11,color:C.muted,marginTop:10 }}>AI will read all scanned booklets in this bundle</div>
              </div>
            )}

            {evaluating && (
              <div style={{ textAlign:"center",padding:"1.5rem 1rem" }}>
                <div style={{ fontSize:36,marginBottom:10 }}>🤖</div>
                <div style={{ fontWeight:700,fontSize:14,color:C.blue,marginBottom:6 }}>AI Evaluating bundle…</div>
                <div style={{ fontSize:13,color:C.sub,marginBottom:14 }}>Reading handwritten answers, matching schema…</div>
                <div style={{ height:8,background:"#e8ecf5",borderRadius:99,overflow:"hidden",maxWidth:300,margin:"0 auto 8px" }}>
                  <div style={{ height:"100%",width:`${evalProg}%`,background:`linear-gradient(90deg,${C.blue},${C.navy})`,borderRadius:99,transition:"width .08s" }} />
                </div>
                <div style={{ fontSize:12,color:C.muted }}>{evalProg}%</div>
              </div>
            )}

            {bk.questions.length > 0 && !evaluating && (
              <>
                {bk.questions.map((q, i) => {
                  const mark       = q.faculty !== null ? q.faculty : (q.ai ?? 0);
                  const pct        = Math.round((mark / q.max) * 100);
                  const isExpanded = selectedQ === q.q;
                  const isZeroFlag = mark === 0 && bk.returnedByScrutinizer;
                  return (
                    <div key={i} style={{ marginBottom:isExpanded?0:10 }}>
                      <div onClick={() => setSelectedQ(isExpanded ? null : q.q)}
                        style={{ display:"flex",alignItems:"center",gap:10,marginBottom:4,cursor:"pointer",padding:"8px 10px",borderRadius:8,
                          background:isExpanded?"#eff6ff":isZeroFlag?"#fff7ed":"transparent",
                          border:`1.5px solid ${isExpanded?C.blue:isZeroFlag?C.orange:"transparent"}`,transition:"all .15s" }}
                        onMouseEnter={e => { if(!isExpanded) e.currentTarget.style.background="#f0f4fb"; }}
                        onMouseLeave={e => { if(!isExpanded) e.currentTarget.style.background=isZeroFlag?"#fff7ed":"transparent"; }}>
                        <div style={{ minWidth:36,fontWeight:800,fontSize:13,color:isExpanded?C.blue:isZeroFlag?C.orange:C.text }}>{q.q}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ height:6,background:"#e8ecf5",borderRadius:99,overflow:"hidden" }}>
                            <div style={{ height:"100%",width:`${pct}%`,background:q.faculty!==null?C.gold:isZeroFlag?C.orange:C.blue,borderRadius:99,transition:"width .3s" }} />
                          </div>
                          <div style={{ fontSize:10.5,color:C.muted,marginTop:2,lineHeight:1.3 }}>{q.text}</div>
                        </div>
                        {modMode && !isFrozen ? (
                          <div style={{ display:"flex",alignItems:"center",gap:4 }} onClick={e => e.stopPropagation()}>
                            <input type="number" min={0} max={q.max} value={q.faculty ?? q.ai} onChange={e => setQMark(i, e.target.value)}
                              style={{ width:48,padding:"3px 6px",borderRadius:6,textAlign:"center",border:`1.5px solid ${q.faculty!==null?C.gold:C.border}`,fontSize:14,fontWeight:800,color:q.faculty!==null?C.gold:C.navy,fontFamily:"inherit",background:q.faculty!==null?"#fffbeb":"#fff" }} />
                            <span style={{ fontSize:11,color:C.sub }}>/{q.max}</span>
                          </div>
                        ) : (
                          <span style={{ fontWeight:800,fontSize:14,color:isZeroFlag?C.orange:q.faculty!==null?C.gold:C.navy }}>
                            {mark}<span style={{ fontWeight:400,fontSize:11,color:C.sub }}>/{q.max}</span>
                          </span>
                        )}
                        {isZeroFlag && <span style={{ fontSize:9,color:C.orange,fontWeight:700 }}>⚠ Flag</span>}
                        {q.faculty !== null && !isZeroFlag && <span style={{ fontSize:9,color:C.gold,fontWeight:700 }}>Mod</span>}
                        <span style={{ fontSize:12,color:isExpanded?C.blue:C.muted }}>{isExpanded ? "▲" : "▼"}</span>
                      </div>
                      {isExpanded && (
                        <div style={{ margin:"0 0 10px",border:`1.5px solid ${C.blue}`,borderTop:"none",borderRadius:"0 0 10px 10px",background:"#fff",overflow:"hidden" }}>
                          <div style={{ padding:"12px 14px",borderBottom:`1px solid ${C.border}` }}>
                            <div style={{ fontSize:11,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8 }}>📝 AI Feedback — {q.q}</div>
                            <div style={{ fontSize:13,color:C.text,lineHeight:1.7,background:"#f8faff",borderRadius:7,padding:"10px 12px",borderLeft:`3px solid ${C.blue}`,fontStyle:"italic" }}>
                              {q.text || "[AI feedback for this question]"}
                            </div>
                          </div>
                          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr" }}>
                            <div style={{ padding:"12px 14px",borderRight:`1px solid ${C.border}`,background:"#f0fdf4" }}>
                              <div style={{ fontSize:11.5,fontWeight:800,color:C.green,marginBottom:8 }}>💪 Strong Points</div>
                              {(bk.strong||[]).length===0?<div style={{ fontSize:12,color:C.muted }}>None noted.</div>:(bk.strong||[]).map((s,j)=>(
                                <div key={j} style={{ display:"flex",gap:6,marginBottom:5 }}><span style={{ color:C.green,fontWeight:700,fontSize:13 }}>✓</span><span style={{ fontSize:12.5,color:"#14532d",lineHeight:1.5 }}>{s}</span></div>
                              ))}
                            </div>
                            <div style={{ padding:"12px 14px",background:"#fef2f2" }}>
                              <div style={{ fontSize:11.5,fontWeight:800,color:C.danger,marginBottom:8 }}>⚠️ Weak Points</div>
                              {(bk.weak||[]).length===0?<div style={{ fontSize:12,color:C.muted }}>None noted.</div>:(bk.weak||[]).map((w,j)=>(
                                <div key={j} style={{ display:"flex",gap:6,marginBottom:5 }}><span style={{ color:C.danger,fontWeight:700,fontSize:13 }}>✗</span><span style={{ fontSize:12.5,color:"#7f1d1d",lineHeight:1.5 }}>{w}</span></div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ marginTop:8,padding:"9px 12px",background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <span style={{ fontWeight:700,fontSize:13,color:C.text }}>Effective Total</span>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:20,fontWeight:900,color:C.navy }}>{effective}<span style={{ fontSize:13,fontWeight:400,color:C.sub }}>/{bk.maxMarks}</span></div>
                    {bk.questions.some(q => q.faculty !== null) && <div style={{ fontSize:10,color:C.gold }}>AI original: {bk.aiTotal}</div>}
                  </div>
                </div>
              </>
            )}
          </div>

          {bk.aiNote && (
            <div style={{ background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"12px 14px" }}>
              <div style={{ fontWeight:800,fontSize:13,color:C.blue,marginBottom:6 }}>🤖 AI Overall Note</div>
              <div style={{ fontSize:13,color:"#1e3a5f",lineHeight:1.6 }}>{bk.aiNote}</div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ background:C.bg,borderRadius:10,padding:"14px 16px",border:`1px solid ${C.border}`,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center" }}>
            <button onClick={() => setPreviewOpen(true)} style={{ background:"transparent",border:`1.5px solid ${C.blue}`,color:C.blue,borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>👁️ Preview Script</button>
            {!isFrozen && !isLast && (
              <button onClick={doSaveNext} style={{ background:`linear-gradient(135deg,${C.green},#0d6e3b)`,border:"none",color:"#fff",borderRadius:8,padding:"8px 20px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6 }}>✅ Save & Next →</button>
            )}
            {!isFrozen && isLast && (
              <button onClick={doFinish} style={{ background:`linear-gradient(135deg,${C.navy},${C.blue})`,border:"none",color:"#fff",borderRadius:8,padding:"8px 24px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 14px rgba(0,35,102,0.3)" }}>🏁 Finish Evaluation</button>
            )}
            {isFrozen && <span style={{ fontSize:13,fontWeight:700,color:C.purple,padding:"8px 14px",background:"#f5f3ff",borderRadius:8 }}>📤 Notified to Scrutinizer</span>}
            <span style={{ marginLeft:"auto",fontSize:11.5,color:C.muted }}>
              {isFrozen ? "Submitted for scrutiny" : isLast ? "Last booklet — click Finish to reveal schema" : "Save & Next to continue evaluation"}
            </span>
          </div>
        </div>

        {previewOpen && (
          <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }} onClick={() => setPreviewOpen(false)}>
            <div style={{ background:"#fff",borderRadius:14,padding:"1.5rem",width:"100%",maxWidth:620,maxHeight:"82vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"1rem",alignItems:"center" }}>
                <div style={{ fontWeight:800,fontSize:16,color:C.text }}>👁️ Script Preview — {bk.name} ({bk.roll})</div>
                <button onClick={() => setPreviewOpen(false)} style={{ background:C.bg,border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:15,color:C.sub }}>✕</button>
              </div>
              {bk.questions.length === 0 ? <div style={{ textAlign:"center",padding:"1.5rem",color:C.muted }}>No data for this booklet.</div> : bk.questions.map((q, i) => (
                <div key={i} style={{ background:C.bg,borderRadius:9,padding:"12px 14px",marginBottom:10,border:`1px solid ${C.border}` }}>
                  <div style={{ fontWeight:700,fontSize:13,color:C.navy,marginBottom:6 }}>
                    {q.q} — <span style={{ fontWeight:400,color:C.sub }}>{q.text}</span>
                    <span style={{ float:"right",fontWeight:800,color:q.faculty!==null?C.gold:C.navy }}>{q.faculty ?? q.ai}/{q.max}</span>
                  </div>
                  <div style={{ fontSize:12.5,color:C.text,lineHeight:1.8,borderLeft:`3px solid ${C.blue}`,paddingLeft:10,fontStyle:"italic" }}>
                    {q.text || "[Scanned answer image for this question would appear here]"}
                  </div>
                </div>
              ))}
              <div style={{ textAlign:"right",marginTop:8 }}>
                <button onClick={() => setPreviewOpen(false)} style={{ background:C.navy,color:"#fff",border:"none",borderRadius:8,padding:"9px 22px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>Close</button>
              </div>
            </div>
          </div>
        )}
        {toast && <div style={{ position:"fixed",bottom:24,right:24,background:C.green,color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13.5,fontWeight:700,boxShadow:"0 8px 32px rgba(0,0,0,0.22)",zIndex:1100,maxWidth:400,lineHeight:1.5 }}>{toast}</div>}
      </div>
    </div>
  );
}

// ── Evaluate Page ─────────────────────────────────────────────────────────────
function EvaluatePage({ user }) {
  const examinerId = user?.profile?._id || user?.profile?.id;
  const [bundles, setBundles]                   = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [activeBundle, setActiveBundle]         = useState(null);
  const [activeBookletIdx, setActiveBookletIdx] = useState(null);
  const [schemaVisible, setSchemaVisible]       = useState(false);
  const [allNotified, setAllNotified]           = useState(false);

  useEffect(() => {
    if (!examinerId) { setLoading(false); return; }
    externalExam.bundles.list({ examiner: examinerId })
      .then(async bndls => {
        const enriched = await Promise.all(
          bndls.map(async b => {
            const booklets = await externalExam.booklets.list({ bundle: b._id }).catch(() => []);
            const mapped   = booklets.map(mapBooklet);
            return {
              id:            b._id,
              subject:       b.subject?.title || "Unknown",
              code:          b.subject?.courseCode || "—",
              examType:      b.examType || "Exam",
              totalBooklets: mapped.length,
              evaluatedCount:mapped.filter(bk => bk.status !== "pending").length,
              status:        mapped.every(bk => bk.status !== "pending") ? "complete" : "in_progress",
              booklets:      mapped,
            };
          })
        );
        setBundles(enriched);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [examinerId]);

  const activeBundleData = bundles.find(b => b.id === activeBundle?.id) || activeBundle;

  const handleUpdate = updated => {
    setBundles(prev => prev.map(b => ({ ...b, booklets:b.booklets.map(bk => bk.id === updated.id ? updated : bk) })));
    setActiveBundle(prev => prev ? { ...prev, booklets:prev.booklets.map(bk => bk.id === updated.id ? updated : bk) } : prev);
  };

  const handleSaveNext = () => {
    const next = (activeBookletIdx ?? 0) + 1;
    if (next < (activeBundleData?.booklets?.length || 0)) setActiveBookletIdx(next);
    else setActiveBookletIdx(null);
  };

  const handleFinish = () => { setActiveBookletIdx(null); setSchemaVisible(true); };

  const handleNotifyScrutinizer = async () => {
    const now      = new Date().toISOString();
    const booklets = activeBundleData?.booklets || [];
    await Promise.all(
      booklets
        .filter(bk => bk.status !== "pending")
        .map(bk => externalExam.booklets.freeze(bk._id).catch(() => {}))
    );
    setBundles(prev => prev.map(b => ({ ...b, booklets:b.booklets.map(bk => ({...bk, status:"frozen", frozenAt:now})) })));
    setActiveBundle(prev => prev ? { ...prev, booklets:prev.booklets.map(bk => ({...bk, status:"frozen", frozenAt:now})) } : prev);
    setAllNotified(true);
  };

  const activeBooklet = activeBundleData?.booklets?.[activeBookletIdx] ?? null;

  if (!activeBundle) {
    return (
      <div className="page-anim">
        <Breadcrumb items={["External", "Evaluate"]} />
        <div style={{ marginBottom:18 }}>
          <div style={{ fontWeight:800,fontSize:18,color:C.text,marginBottom:4 }}>Assigned Bundles</div>
          <div style={{ fontSize:13,color:C.sub }}>Click "Evaluate Bundle" to open booklet grid.</div>
        </div>
        {loading ? (
          <div style={{ padding:"20px",color:C.sub,fontSize:13 }}>Loading bundles…</div>
        ) : bundles.length === 0 ? (
          <div style={{ padding:"24px",textAlign:"center",color:C.sub }}>No bundles assigned yet.</div>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            {bundles.map(b => {
              const pct      = Math.round((b.booklets.filter(bk => bk.status !== "pending").length / Math.max(b.totalBooklets, 1)) * 100);
              const frozen   = b.booklets.filter(bk => bk.status === "frozen" || bk.finalLocked).length;
              const saved    = b.booklets.filter(bk => bk.saved).length;
              const returned = b.booklets.filter(bk => bk.returnedByScrutinizer).length;
              return (
                <div key={b.id} style={{ background:"#fff",border:`1px solid ${returned>0?C.orange:C.border}`,borderRadius:12,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,35,102,0.06)" }}>
                  <div style={{ background:returned>0?C.orange:C.navy,padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}>
                    <div>
                      <span style={{ fontWeight:800,fontSize:14,color:"#fff" }}>{b.subject} ({b.code}) — {b.examType}</span>
                      <span style={{ marginLeft:12,fontSize:12,color:"rgba(255,255,255,0.5)" }}>Bundle {b.id}</span>
                    </div>
                    <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                      {returned > 0 && <span style={{ background:"rgba(255,255,255,0.2)",color:"#fff",padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:700 }}>⚠ {returned} Returned</span>}
                      <span style={{ background:b.status==="complete"?`${C.green}33`:`${C.gold}22`,color:b.status==="complete"?C.green:C.gold,padding:"3px 12px",borderRadius:99,fontSize:12,fontWeight:700 }}>
                        {b.status === "complete" ? "Complete" : "In Progress"}
                      </span>
                    </div>
                  </div>
                  <div style={{ padding:"14px 18px" }}>
                    <div style={{ display:"flex",gap:14,marginBottom:12,flexWrap:"wrap" }}>
                      {[["Total",b.totalBooklets,C.navy],["Evaluated",b.booklets.filter(bk=>bk.status!=="pending").length,C.blue],["Saved",saved,C.green],["Frozen",frozen,C.purple],["Returned",returned,C.orange],["Pending",b.booklets.filter(bk=>bk.status==="pending").length,C.muted]].map(([l,v,c],i)=>(
                        <div key={i} style={{ background:C.bg,borderRadius:8,padding:"8px 14px",border:`1px solid ${C.border}`,minWidth:72,borderTop:`3px solid ${c}` }}>
                          <div style={{ fontSize:10,color:C.sub,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:2 }}>{l}</div>
                          <div style={{ fontSize:18,fontWeight:800,color:c }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom:12 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,color:C.sub,marginBottom:4 }}><span>Progress</span><span style={{ fontWeight:700 }}>{pct}%</span></div>
                      <div style={{ height:7,background:"#e8ecf5",borderRadius:99,overflow:"hidden" }}><div style={{ height:"100%",width:`${pct}%`,background:C.blue,borderRadius:99 }} /></div>
                    </div>
                    <button onClick={() => { setActiveBundle(b); setActiveBookletIdx(null); setSchemaVisible(false); setAllNotified(false); }}
                      style={{ background:`linear-gradient(135deg,${C.navy},${C.blue})`,color:"#fff",border:"none",borderRadius:8,padding:"9px 22px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>
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
      <Breadcrumb items={["External","Evaluate",activeBundle.subject]} />
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10 }}>
        <div>
          <div style={{ fontWeight:800,fontSize:18,color:C.text }}>{activeBundle.subject} — Booklet Evaluation</div>
          <div style={{ fontSize:13,color:C.sub,marginTop:2 }}>Click any booklet to review. Use Save &amp; Next to navigate.</div>
        </div>
        <button onClick={() => { setActiveBundle(null); setActiveBookletIdx(null); setSchemaVisible(false); }}
          style={{ background:C.bg,border:`1px solid ${C.border}`,color:C.sub,borderRadius:8,padding:"7px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
          ← Back to Bundles
        </button>
      </div>
      <BookletGrid bundle={activeBundleData} onSelect={(bk, idx) => setActiveBookletIdx(idx)} activeBookletId={activeBooklet?.id} />
      {schemaVisible && (
        <div style={{ marginTop:20 }}>
          <SchemaSpreadsheet booklets={activeBundleData.booklets} bundleId={activeBundle.id} onNotifyScrutinizer={handleNotifyScrutinizer} allNotified={allNotified} />
        </div>
      )}
      {activeBooklet && (
        <BookletDetail key={activeBooklet.id} booklet={activeBooklet} bookletIndex={activeBookletIdx}
          totalBooklets={activeBundleData.booklets.length} bundleId={activeBundle.id}
          onClose={() => setActiveBookletIdx(null)} onUpdate={handleUpdate}
          onSaveNext={handleSaveNext} onFinish={handleFinish} />
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
const ExternalDashboard = ({ setEvalModal, sec, user }) => {
  const examinerId = user?.profile?._id || user?.profile?.id;

  if (sec === "evaluate" || sec === "assigned") return <EvaluatePage user={user} />;

  const [stats,   setStats]   = useState(null);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examinerId) { setLoading(false); return; }
    Promise.all([
      dashboardApi.getExaminerStats(examinerId).catch(() => null),
      externalExam.bundles.list({ examiner: examinerId }).catch(() => []),
    ]).then(([s, bndls]) => {
      setStats(s);
      setBundles(bndls.slice(0, 6));
    }).finally(() => setLoading(false));
  }, [examinerId]);

  const scoreData = useMemo(() => {
    if (!stats?.scoreDistribution) return [];
    return stats.scoreDistribution.map(d => ({ l: d.range, v: d.count }));
  }, [stats]);

  return (
    <div className="page-anim">
      <Breadcrumb items={["External","Dashboard"]} />
      <div className="stats-grid">
        <StatCard title="Assigned Bundles"  value={loading?"…":stats?.assignedBundles??bundles.length}  sub="End-Sem evaluation"  icon="exam"  accent="navy"  />
        <StatCard title="Evaluated"         value={loading?"…":stats?.evaluatedBooklets??"—"}            sub="Booklets reviewed"    icon="check" accent="green" />
        <StatCard title="Returned by Scrut" value={loading?"…":stats?.returnedBooklets??"—"}             sub="Needs re-evaluation"  icon="edit"  accent="gold"  />
        <StatCard title="AI Agreement"      value={loading?"…":stats?.aiAgreement?`${Math.round(stats.aiAgreement)}%`:"—"} sub="Marks match rate" icon="ai" accent="blue" />
      </div>
      <div className="grid-1-1">
        <Card title="Assigned Bundles — Overview">
          {loading ? (
            <div style={{ padding:"12px",color:C.sub,fontSize:13 }}>Loading bundles…</div>
          ) : bundles.length === 0 ? (
            <div style={{ padding:"12px",color:C.sub,fontSize:13 }}>No bundles assigned.</div>
          ) : bundles.map((b, i) => (
            <div key={b._id || i} className="sheet-row">
              <div>
                <div className="sheet-row-name">{b.subject?.title || "Unknown"} ({b.subject?.courseCode || "—"})</div>
                <div className="sheet-row-sub">{b.examType}</div>
              </div>
              <Badge text={b.status || "pending"} type={b.status === "completed" ? "success" : "warning"} />
            </div>
          ))}
        </Card>
        <Card title="Score Distribution">
          {scoreData.length > 0 ? (
            <>
              <BarChart data={scoreData} />
              <Divider />
              {stats?.bundleAverage != null && (
                <div className="score-row">
                  <span className="score-row-label">Bundle Average</span>
                  <span className="score-row-val" style={{ color:C.text }}>{stats.bundleAverage} / 50</span>
                </div>
              )}
              {stats?.highestScore != null && (
                <div className="score-row">
                  <span className="score-row-label">Highest Score</span>
                  <span className="score-row-val" style={{ color:C.green }}>{stats.highestScore} / 50</span>
                </div>
              )}
              {stats?.passPercentage != null && (
                <div className="score-row">
                  <span className="score-row-label">Pass Percentage</span>
                  <span className="score-row-val" style={{ color:C.blue }}>{stats.passPercentage}%</span>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding:"12px",color:C.sub,fontSize:13 }}>
              {loading ? "Loading…" : "Score distribution will appear after evaluation."}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ExternalDashboard;
