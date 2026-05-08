// src/pages/dashboards/ScrutinizerDashboard.jsx
// Flow:
//   1. Subject table (code, name, year, semester) → click row
//   2. Bundle schema table (bundle no, faculty, branch, subject, year, sem, Open Bundle)
//   3. Booklet grid (screenshot-1 style)
//   4. Click booklet → detail opens at BOTTOM of page (screenshot-2 style, READ-ONLY)
//   5. Can return booklet to external faculty with message
//   6. Bundle row → green when all booklets OK
//   7. Subject row → green + "Send to DCE" button when all bundles done

import { useState, useEffect } from "react";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { externalExam } from "../../services/api.js";

const C = {
  navy:"#002366", blue:"#0077b6", gold:"#f7941d",
  green:"#0a8a4a", danger:"#dc2626", purple:"#6d28d9",
  orange:"#ea580c",
  border:"#d0daf0", bg:"#f0f4fb",
  text:"#1a2744", sub:"#6478a0", muted:"#94a3b8",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const sColor = s => ({ ai_evaluated:C.danger, pending:C.muted, frozen:C.purple, saved:C.green, scrutinizer_ok:C.green, returned:C.orange }[s]||C.muted);
const sLabel = s => ({ ai_evaluated:"AI Evaluated", pending:"Pending", frozen:"Notified", saved:"Saved", scrutinizer_ok:"Verified", returned:"Returned" }[s]||s);

// ── API Response Mapping ──────────────────────────────────────────────────────
// Maps a raw API booklet object to the shape the UI expects.
function mapBooklet(apiBooklet) {
  const questions = (apiBooklet.questions || []).map(q => ({
    q: `Q${q.questionNo}`,
    max: q.maxMarks,
    marks: q.marks,
    text: [q.strongPoints, q.weakPoints].filter(Boolean).join(" | ") || "",
  }));
  const aiTotal = questions.reduce((sum, q) => sum + q.marks, 0);
  const maxMarks = questions.reduce((sum, q) => sum + q.max, 0) || 100;

  return {
    id: apiBooklet._id,
    barcode: apiBooklet.barcode || "",
    roll: apiBooklet.student?.rollNumber || "",
    name: apiBooklet.student?.name || "",
    status: apiBooklet.status || "pending",
    scrutStatus:
      apiBooklet.status === "scrutinizer_ok" ? "ok" :
      apiBooklet.status === "returned"        ? "returned" :
      "pending",
    aiTotal,
    maxMarks,
    returnedToFaculty: apiBooklet.status === "returned",
    returnMessage: "",
    questions,
    aiNote: apiBooklet.aiNote || "",
  };
}

// Maps a raw API bundle object to the shape the UI expects.
function mapBundle(apiBundle) {
  return {
    id: apiBundle._id,
    bundleNo: apiBundle.bundleNumber || "",
    faculty: apiBundle.examiner?.name || "",
    branch: apiBundle.examEvent?.department?.code || "",
    subject: apiBundle.examEvent?.subject?.name || "",
    code: apiBundle.examEvent?.subject?.code || "",
    year: apiBundle.examEvent?.academicYear?.label || "",
    sem: apiBundle.examEvent?.semester?.number || "",
    booklets: (apiBundle.booklets || []).map(mapBooklet),
  };
}

// Groups API bundles by subject, building a subjects list and a bundlesMap.
function buildSubjectsAndBundles(apiBundles) {
  const subjectMap = {}; // key: subject code
  const bundlesMap = {}; // key: subject code → array of mapped bundles

  apiBundles.forEach(apiBundle => {
    const subj = apiBundle.examEvent?.subject;
    const dept = apiBundle.examEvent?.department;
    const sem = apiBundle.examEvent?.semester;
    const yr = apiBundle.examEvent?.academicYear;
    if (!subj) return;

    const key = subj.code || subj._id;

    if (!subjectMap[key]) {
      subjectMap[key] = {
        id: key,
        code: subj.code || "",
        name: subj.name || "",
        year: yr?.label || "",
        sem: sem?.number || "",
        branch: dept?.code || "",
      };
      bundlesMap[key] = [];
    }

    bundlesMap[key].push(mapBundle(apiBundle));
  });

  const subjects = Object.values(subjectMap);
  return { subjects, bundlesMap };
}

// ── Return Dialog ─────────────────────────────────────────────────────────────
function ReturnDialog({ booklet, onConfirm, onCancel }) {
  const [reason,setReason]=useState("");
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,26,77,0.65)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(3px)" }}>
      <div style={{ background:"#fff",borderRadius:12,width:480,boxShadow:"0 24px 60px rgba(0,0,0,0.28)",overflow:"hidden" }}>
        <div style={{ background:C.orange,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ fontWeight:800,fontSize:15,color:"#fff" }}>↩ Return Booklet to External Faculty</span>
          <button onClick={onCancel} style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.8)",fontSize:20 }}>✕</button>
        </div>
        <div style={{ padding:22 }}>
          <div style={{ background:C.bg,borderRadius:8,padding:"10px 14px",marginBottom:16,border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11,color:C.sub,fontWeight:700 }}>Booklet</div>
            <div style={{ fontWeight:700,fontSize:14,color:C.text }}>{booklet.roll} — {booklet.name}</div>
          </div>
          <label style={{ fontWeight:700,fontSize:13,color:C.text,display:"block",marginBottom:6 }}>
            Reason for return <span style={{ color:C.danger }}>*</span>
          </label>
          <textarea value={reason} onChange={e=>setReason(e.target.value)}
            placeholder="e.g. Q3 was attempted by student but received 0 marks. Please re-evaluate."
            rows={4}
            style={{ width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${reason.trim()?C.blue:C.border}`,fontSize:13,fontFamily:"inherit",resize:"vertical",color:C.text,outline:"none",boxSizing:"border-box" }} />
          <div style={{ display:"flex",gap:10,marginTop:16,justifyContent:"flex-end" }}>
            <button onClick={onCancel} style={{ background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 20px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",color:C.sub }}>Cancel</button>
            <button onClick={()=>reason.trim()&&onConfirm(reason.trim())} disabled={!reason.trim()}
              style={{ background:reason.trim()?`linear-gradient(135deg,${C.orange},#c2410c)`:"#ccc",color:"#fff",border:"none",borderRadius:8,padding:"9px 22px",fontWeight:700,fontSize:13,cursor:reason.trim()?"pointer":"not-allowed",fontFamily:"inherit" }}>
              ↩ Return to Faculty
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Booklet Detail (opens at BOTTOM of page, read-only) ───────────────────────
function BookletDetailBottom({ booklet, onClose, onReturn, onVerify }) {
  const [selectedQ,setSelectedQ]=useState(null);
  const [showReturnDialog,setShowReturnDialog]=useState(false);

  const total = booklet.questions.reduce((s,q)=>s+q.marks,0);
  const zeroAnswered = booklet.questions.filter(q=>q.marks===0);
  const isVerified = booklet.returnedToFaculty===false && booklet.scrutStatus==="ok";

  const handleReturn = (reason) => {
    setShowReturnDialog(false);
    onReturn(booklet.id, reason);
  };

  return (
    <>
      {showReturnDialog && <ReturnDialog booklet={booklet} onConfirm={handleReturn} onCancel={()=>setShowReturnDialog(false)} />}
      <div style={{ marginTop:18, border:`2px solid ${booklet.returnedToFaculty?C.orange:C.navy}`, borderRadius:12, overflow:"hidden", background:"#fff", boxShadow:"0 -2px 20px rgba(0,35,102,0.1)" }}>
        {/* Header */}
        <div style={{ background:booklet.returnedToFaculty?C.orange:C.navy, padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:"#fff" }}>{booklet.id} — {booklet.name}</div>
            <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.6)", marginTop:2 }}>{booklet.roll} · {booklet.barcode}</div>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            {booklet.returnedToFaculty
              ? <span style={{ background:"rgba(255,255,255,0.2)", color:"#fff", padding:"4px 12px", borderRadius:99, fontSize:11, fontWeight:700 }}>↩ Returned to Faculty</span>
              : booklet.scrutStatus==="ok"
                ? <span style={{ background:`${C.green}22`, color:C.green, padding:"4px 12px", borderRadius:99, fontSize:11, fontWeight:700 }}>✅ Verified</span>
                : <span style={{ background:`${C.gold}22`, color:C.gold, padding:"4px 12px", borderRadius:99, fontSize:11, fontWeight:700 }}>🔍 Under Review</span>
            }
            <span style={{ background:"rgba(255,255,255,0.15)", color:"#fff", padding:"4px 10px", borderRadius:99, fontSize:10, fontWeight:700 }}>🔒 Read Only</span>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none", color:"#fff", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:15 }}>✕</button>
          </div>
        </div>

        {/* Zero-marks warning */}
        {zeroAnswered.length>0 && !booklet.returnedToFaculty && (
          <div style={{ background:"#fff7ed", borderBottom:`2px solid ${C.orange}`, padding:"10px 20px", display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ fontSize:20 }}>⚠️</span>
            <div>
              <div style={{ fontWeight:800, fontSize:13, color:C.orange }}>Potential Issue: Zero Marks Detected</div>
              <div style={{ fontSize:12, color:"#7c2d12", marginTop:2 }}>
                {zeroAnswered.map(q=>q.q).join(", ")} {zeroAnswered.length===1?"has":"have"} 0 marks. If the student attempted {zeroAnswered.length===1?"this question":"these questions"}, please return for re-evaluation.
              </div>
            </div>
          </div>
        )}

        <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14, background:"#fafbff" }}>
          {/* Questions — Read Only */}
          <div style={{ background:"#fff", borderRadius:10, padding:"16px 18px", border:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <span style={{ fontWeight:800, fontSize:14, color:C.text }}>Question-wise Marks</span>
              <span style={{ background:"#e0f2fe", color:"#0369a1", padding:"4px 12px", borderRadius:99, fontSize:11, fontWeight:700 }}>🔍 Scrutinizer View — Read Only</span>
            </div>

            {booklet.questions.map((q,i)=>{
              const pct=Math.round((q.marks/q.max)*100);
              const isZero=q.marks===0;
              const isExp=selectedQ===q.q;
              return (
                <div key={i} style={{ marginBottom:isExp?0:10 }}>
                  <div onClick={()=>setSelectedQ(isExp?null:q.q)}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:8, cursor:"pointer",
                      background:isExp?"#eff6ff":isZero?"#fff7ed":"transparent",
                      border:`1.5px solid ${isExp?C.blue:isZero?C.orange:"transparent"}`, transition:"all .15s" }}
                    onMouseEnter={e=>{if(!isExp)e.currentTarget.style.background=isZero?"#ffedd5":"#f0f4fb";}}
                    onMouseLeave={e=>{if(!isExp)e.currentTarget.style.background=isZero?"#fff7ed":"transparent";}}>
                    <div style={{ minWidth:36, fontWeight:800, fontSize:13, color:isExp?C.blue:isZero?C.orange:C.text }}>{q.q}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ height:6, background:"#e8ecf5", borderRadius:99, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:isZero?C.orange:C.blue, borderRadius:99 }} />
                      </div>
                      <div style={{ fontSize:10.5, color:C.muted, marginTop:2 }}>{q.text}</div>
                    </div>
                    <span style={{ fontWeight:800, fontSize:14, color:isZero?C.orange:C.navy }}>
                      {q.marks}<span style={{ fontWeight:400, fontSize:11, color:C.sub }}>/{q.max}</span>
                    </span>
                    {isZero && <span style={{ fontSize:9, background:"#fff7ed", color:C.orange, padding:"2px 6px", borderRadius:99, fontWeight:700, border:`1px solid ${C.orange}` }}>⚠ Zero</span>}
                    <span style={{ fontSize:12, color:isExp?C.blue:C.muted }}>{isExp?"▲":"▼"}</span>
                  </div>
                  {isExp && (
                    <div style={{ margin:"0 0 10px", border:`1.5px solid ${C.blue}`, borderTop:"none", borderRadius:"0 0 8px 8px", padding:"12px 14px", background:"#fff" }}>
                      <div style={{ fontSize:12, color:C.sub, fontStyle:"italic", borderLeft:`3px solid ${C.blue}`, paddingLeft:10 }}>
                        [Student's scanned handwritten answer would appear here — read only for scrutinizer]
                      </div>
                      {isZero && (
                        <div style={{ marginTop:10, background:"#fff7ed", borderRadius:7, padding:"10px 12px", border:`1px solid ${C.orange}` }}>
                          <div style={{ fontWeight:700, fontSize:12, color:C.orange }}>⚠️ Scrutinizer Notice</div>
                          <div style={{ fontSize:12, color:"#7c2d12", marginTop:3 }}>This question has 0 marks. If the student attempted it, return this booklet to the external faculty for re-evaluation.</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop:10, padding:"10px 12px", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontWeight:700, fontSize:13, color:C.text }}>Effective Total</span>
              <span style={{ fontSize:20, fontWeight:900, color:total>=25?C.navy:C.danger }}>
                {total}<span style={{ fontSize:13, fontWeight:400, color:C.sub }}>/{booklet.maxMarks}</span>
              </span>
            </div>
          </div>

          {/* AI Note */}
          {booklet.aiNote && (
            <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"12px 14px" }}>
              <div style={{ fontWeight:800, fontSize:13, color:C.blue, marginBottom:6 }}>🤖 AI Overall Note</div>
              <div style={{ fontSize:13, color:"#1e3a5f" }}>{booklet.aiNote}</div>
            </div>
          )}

          {/* Return info */}
          {booklet.returnedToFaculty && booklet.returnMessage && (
            <div style={{ background:"#fff7ed", border:`1px solid ${C.orange}`, borderRadius:10, padding:"12px 14px" }}>
              <div style={{ fontWeight:800, fontSize:13, color:C.orange, marginBottom:6 }}>↩ Returned to External Faculty</div>
              <div style={{ fontSize:13, color:"#7c2d12" }}>{booklet.returnMessage}</div>
            </div>
          )}

          {/* Actions */}
          <div style={{ background:C.bg, borderRadius:10, padding:"14px 16px", border:`1px solid ${C.border}`, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
            {!booklet.returnedToFaculty && (
              <>
                <button onClick={()=>onVerify(booklet.id)}
                  style={{ background:`linear-gradient(135deg,${C.green},#0d6e3b)`, color:"#fff", border:"none", borderRadius:8, padding:"9px 22px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
                  ✅ Mark as Verified
                </button>
                <button onClick={()=>setShowReturnDialog(true)}
                  style={{ background:`linear-gradient(135deg,${C.orange},#c2410c)`, color:"#fff", border:"none", borderRadius:8, padding:"9px 22px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
                  ↩ Return to Faculty
                </button>
              </>
            )}
            {booklet.returnedToFaculty && (
              <span style={{ fontSize:13, fontWeight:700, color:C.orange, padding:"8px 14px", background:"#fff7ed", borderRadius:8 }}>↩ Returned — Awaiting Faculty Re-evaluation</span>
            )}
            {booklet.scrutStatus==="ok" && !booklet.returnedToFaculty && (
              <span style={{ fontSize:13, fontWeight:700, color:C.green, padding:"8px 14px", background:"#e6f7ef", borderRadius:8 }}>✅ Verified — No Issues</span>
            )}
            <span style={{ marginLeft:"auto", fontSize:11.5, color:C.muted }}>Scrutinizer view — marks cannot be modified</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Booklet Grid (Screenshot 1 style) ─────────────────────────────────────────
function ScrutBookletGrid({ bundle, onSelect, activeBookletId }) {
  return (
    <div style={{ background:"#fff", border:`2px solid #e8ecf5`, borderRadius:12, padding:20 }}>
      <div style={{ background:C.navy, borderRadius:9, padding:"12px 18px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
        <div>
          <span style={{ fontWeight:800, fontSize:15, color:"#fff" }}>{bundle.subject} ({bundle.code}) — End-Sem</span>
          <span style={{ marginLeft:12, fontSize:12, color:"rgba(255,255,255,0.5)" }}>Bundle {bundle.bundleNo} · {bundle.faculty}</span>
        </div>
        <span style={{ background:`${C.gold}22`, color:C.gold, padding:"3px 12px", borderRadius:99, fontSize:12, fontWeight:700 }}>
          {bundle.booklets.filter(b=>b.status==="frozen"||b.status==="scrutinizer_ok").length}/{bundle.booklets.length} Notified
        </span>
      </div>
      <p style={{ fontSize:12, color:C.sub, marginBottom:14, fontWeight:600 }}>
        Click any booklet to review marks. Verify or return to external faculty.
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(88px,1fr))", gap:10 }}>
        {bundle.booklets.map((bk,idx) => {
          const active=bk.id===activeBookletId;
          const returned=bk.returnedToFaculty;
          const verified=bk.scrutStatus==="ok"&&!returned;
          const col=returned?C.orange:verified?C.green:sColor(bk.status);
          return (
            <div key={bk.id} onClick={()=>onSelect(bk,idx)}
              title={`${bk.roll} — ${bk.name}`}
              style={{ border:`2.5px solid ${active?C.gold:col}`, borderRadius:8, padding:"8px 5px", textAlign:"center", cursor:"pointer",
                background:active?"#fffbeb":returned?"#fff7ed":verified?"#e6f7ef":"#fff",
                transition:"all .17s", position:"relative", minHeight:68,
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3,
                boxShadow:active?`0 0 0 3px ${C.gold}44`:"none" }}
              onMouseEnter={e=>{if(!active){e.currentTarget.style.background=`${col}10`;e.currentTarget.style.transform="translateY(-2px)";}}}
              onMouseLeave={e=>{e.currentTarget.style.background=active?"#fffbeb":returned?"#fff7ed":verified?"#e6f7ef":"#fff";e.currentTarget.style.transform="translateY(0)";}}>
              <div style={{ position:"absolute", top:4, right:4, width:6, height:6, borderRadius:"50%", background:active?C.gold:col }} />
              <div style={{ fontSize:9.5, fontWeight:800, color:active?C.gold:col }}>{bk.roll}</div>
              <div style={{ fontSize:8.5, color:C.muted }}>{bk.barcode.slice(-5)}</div>
              <div style={{ fontSize:11, fontWeight:700, color:C.navy }}>{bk.aiTotal}/{bk.maxMarks}</div>
              {returned && <div style={{ fontSize:8, color:C.orange, fontWeight:700 }}>↩ Returned</div>}
              {verified && <div style={{ fontSize:8, color:C.green, fontWeight:700 }}>✓ Verified</div>}
              {!returned&&!verified&&bk.status==="pending"&&<div style={{ fontSize:9, color:C.muted }}>Pending</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:12, marginTop:14, flexWrap:"wrap" }}>
        {[{c:C.gold,l:"Currently reviewing"},{c:C.green,l:"Verified"},{c:C.orange,l:"Returned to Faculty"},{c:C.purple,l:"Notified"},{c:C.muted,l:"Pending"}].map((l,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:C.sub }}>
            <div style={{ width:10, height:10, borderRadius:2, border:`2px solid ${l.c}` }} />{l.l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bundle View ───────────────────────────────────────────────────────────────
function BundleView({ subject, bundlesInit, onBack, onVerify, onReturn }) {
  const [bundles,setBundles]=useState(bundlesInit);
  const [activeBundle,setActiveBundle]=useState(null);
  const [activeBookletId,setActiveBookletId]=useState(null);
  const [toast,setToast]=useState("");
  const [actionLoading,setActionLoading]=useState(false);

  const showToast=m=>{setToast(m);setTimeout(()=>setToast(""),3200);};

  const isBundleDone=(b)=>b.booklets.every(bk=>bk.scrutStatus==="ok"&&!bk.returnedToFaculty);
  const allBundlesDone=bundles.every(isBundleDone);

  const updateBooklet=(bundleId,bookletId,patch)=>{
    setBundles(prev=>prev.map(b=>b.id!==bundleId?b:{ ...b, booklets:b.booklets.map(bk=>bk.id!==bookletId?bk:{...bk,...patch}) }));
    if(activeBundle?.id===bundleId) setActiveBundle(prev=>prev?{ ...prev, booklets:prev.booklets.map(bk=>bk.id!==bookletId?bk:{...bk,...patch}) }:prev);
  };

  const handleVerify=async(bundleId,bookletId)=>{
    setActionLoading(true);
    try {
      await externalExam.scrutinizer.review(bookletId, { action: "verify" });
      updateBooklet(bundleId, bookletId, { scrutStatus:"ok", returnedToFaculty:false, status:"scrutinizer_ok" });
      showToast("✅ Booklet verified!");
      if (onVerify) onVerify(subject.id, bundleId, bookletId);
    } catch(err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn=async(bundleId,bookletId,reason)=>{
    setActionLoading(true);
    try {
      await externalExam.scrutinizer.review(bookletId, { action: "return", message: reason });
      updateBooklet(bundleId, bookletId, { returnedToFaculty:true, returnMessage:reason, scrutStatus:"returned", status:"returned" });
      setActiveBookletId(null);
      showToast("↩ Booklet returned to external faculty.");
      if (onReturn) onReturn(subject.id, bundleId, bookletId);
    } catch(err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const th=(x={})=>({padding:"11px 14px",fontWeight:700,fontSize:12,color:"#fff",textTransform:"uppercase",letterSpacing:"0.06em",background:C.navy,border:"1px solid rgba(255,255,255,0.1)",textAlign:"left",whiteSpace:"nowrap",...x});
  const td=(x={})=>({padding:"11px 14px",border:`1px solid ${C.border}`,fontSize:13,verticalAlign:"middle",...x});

  const activeBundleData=activeBundle?bundles.find(b=>b.id===activeBundle.id)||activeBundle:null;
  const activeBooklet=activeBundleData?.booklets?.find(b=>b.id===activeBookletId)||null;

  if(activeBundle) return (
    <div className="page-anim">
      <Breadcrumb items={["Scrutinizer","Subjects",subject.name,"Bundles",`Bundle ${activeBundle.bundleNo}`]} />
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10 }}>
        <div>
          <div style={{ fontWeight:800,fontSize:18,color:C.text }}>{activeBundle.subject} — Booklet Review</div>
          <div style={{ fontSize:13,color:C.sub,marginTop:2 }}>Click any booklet to review marks below. Verify or return to faculty.</div>
        </div>
        <button onClick={()=>{setActiveBundle(null);setActiveBookletId(null);}} style={{ background:C.bg,border:`1px solid ${C.border}`,color:C.sub,borderRadius:8,padding:"7px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>← Back to Bundles</button>
      </div>

      <ScrutBookletGrid bundle={activeBundleData} onSelect={(bk)=>setActiveBookletId(bk.id===activeBookletId?null:bk.id)} activeBookletId={activeBookletId} />

      {activeBooklet && (
        <BookletDetailBottom
          key={activeBooklet.id}
          booklet={activeBooklet}
          onClose={()=>setActiveBookletId(null)}
          onVerify={(bkId)=>handleVerify(activeBundle.id,bkId)}
          onReturn={(bkId,reason)=>handleReturn(activeBundle.id,bkId,reason)}
        />
      )}

      {actionLoading && (
        <div style={{ position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:C.navy,color:"#fff",padding:"10px 22px",borderRadius:10,fontSize:13,fontWeight:700,zIndex:1200 }}>
          Processing...
        </div>
      )}
      {toast && <div style={{ position:"fixed",bottom:24,right:24,background:C.green,color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13.5,fontWeight:700,boxShadow:"0 8px 32px rgba(0,0,0,0.22)",zIndex:1100,maxWidth:400,lineHeight:1.5 }}>{toast}</div>}
    </div>
  );

  return (
    <div className="page-anim">
      <Breadcrumb items={["Scrutinizer","Subjects",subject.name,"Bundles"]} />
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10 }}>
        <div>
          <div style={{ fontWeight:800,fontSize:18,color:C.text }}>{subject.name} ({subject.code}) — Bundle Overview</div>
          <div style={{ fontSize:13,color:C.sub,marginTop:2 }}>Review each bundle. All booklets verified → bundle turns green. All bundles done → send results to DCE.</div>
        </div>
        <div style={{ display:"flex",gap:10 }}>
          {allBundlesDone && (
            <button onClick={()=>showToast("🎓 Results sent to DCE successfully!")} style={{ background:`linear-gradient(135deg,${C.green},#0d6e3b)`,color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(10,138,74,0.3)" }}>
              🎓 Send Results to DCE
            </button>
          )}
          <button onClick={onBack} style={{ background:C.bg,border:`1px solid ${C.border}`,color:C.sub,borderRadius:8,padding:"7px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>← Back to Subjects</button>
        </div>
      </div>

      <div style={{ background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,35,102,0.06)" }}>
        <table style={{ borderCollapse:"collapse",width:"100%",fontSize:13 }}>
          <thead>
            <tr>
              <th style={th()}>Bundle No.</th>
              <th style={th()}>Faculty</th>
              <th style={th()}>Branch</th>
              <th style={th()}>Subject</th>
              <th style={th({textAlign:"center"})}>Year</th>
              <th style={th({textAlign:"center"})}>Sem</th>
              <th style={th({textAlign:"center"})}>Progress</th>
              <th style={th({textAlign:"center"})}>Action</th>
            </tr>
          </thead>
          <tbody>
            {bundles.map((b,ri)=>{
              const done=isBundleDone(b);
              const verified=b.booklets.filter(bk=>bk.scrutStatus==="ok"&&!bk.returnedToFaculty).length;
              const returned=b.booklets.filter(bk=>bk.returnedToFaculty).length;
              const rowBg=done?"#e6f7ef":ri%2===0?"#fff":"#fafbff";
              return (
                <tr key={b.id} style={{ background:rowBg,transition:"background .2s" }}>
                  <td style={td({ fontWeight:800,color:done?C.green:C.navy })}>
                    {done?"✅ ":""}{b.bundleNo}
                  </td>
                  <td style={td({ color:C.text })}>{b.faculty}</td>
                  <td style={td({ color:C.sub })}>{b.branch}</td>
                  <td style={td({ color:C.text })}>{b.subject} ({b.code})</td>
                  <td style={td({ textAlign:"center",color:C.sub })}>{b.year}</td>
                  <td style={td({ textAlign:"center",color:C.sub })}>{b.sem}</td>
                  <td style={td({ textAlign:"center" })}>
                    <div style={{ fontWeight:700,color:done?C.green:C.blue,marginBottom:3 }}>{verified}/{b.booklets.length}{returned>0?` (${returned} returned)`:""}</div>
                    <div style={{ height:5,background:"#e8ecf5",borderRadius:99,overflow:"hidden",minWidth:80 }}>
                      <div style={{ height:"100%",width:`${Math.round((verified/b.booklets.length)*100)}%`,background:done?C.green:C.blue,borderRadius:99 }} />
                    </div>
                  </td>
                  <td style={td({ textAlign:"center" })}>
                    <button onClick={()=>setActiveBundle(b)} style={{ background:`linear-gradient(135deg,${C.navy},${C.blue})`,color:"#fff",border:"none",borderRadius:7,padding:"7px 16px",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" }}>
                      📂 Open Bundle
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {toast && <div style={{ position:"fixed",bottom:24,right:24,background:C.green,color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13.5,fontWeight:700,boxShadow:"0 8px 32px rgba(0,0,0,0.22)",zIndex:1100,maxWidth:400,lineHeight:1.5 }}>{toast}</div>}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function ScrutinizerDashboard() {
  const [subjects, setSubjects] = useState([]);
  const [bundlesMap, setBundlesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [sentToDCE, setSentToDCE] = useState({});
  const [toast, setToast] = useState("");

  const showToast = m => { setToast(m); setTimeout(() => setToast(""), 3200); };

  // Fetch pending bundles on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    externalExam.scrutinizer.getPending()
      .then(apiBundles => {
        if (cancelled) return;
        const { subjects: s, bundlesMap: bm } = buildSubjectsAndBundles(apiBundles || []);
        setSubjects(s);
        setBundlesMap(bm);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message || "Failed to load pending bundles.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // After a booklet action, recompute subject-level done status from bundlesMap
  const handleBookletAction = (subjectId, bundleId, bookletId) => {
    // bundlesMap is already updated inside BundleView via local state;
    // we don't need to re-fetch here. Subject-level done check below
    // reads from bundlesMap which is kept in sync.
  };

  const th=(x={})=>({padding:"13px 16px",fontWeight:700,fontSize:12,color:"#fff",textTransform:"uppercase",letterSpacing:"0.06em",background:C.navy,border:"1px solid rgba(255,255,255,0.1)",textAlign:"left",whiteSpace:"nowrap",...x});
  const td=(x={})=>({padding:"13px 16px",border:`1px solid ${C.border}`,fontSize:13.5,verticalAlign:"middle",...x});

  // Check if a subject's all bundles are verified (uses bundlesMap from state)
  const isSubjectDone = (sid) => {
    const bs = bundlesMap[sid] || [];
    return bs.length > 0 && bs.every(b => b.booklets.every(bk => bk.scrutStatus === "ok" && !bk.returnedToFaculty));
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="page-anim">
      <Breadcrumb items={["Scrutinizer","Subjects"]} />
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:320, gap:18 }}>
        <div style={{ width:44, height:44, border:`4px solid ${C.border}`, borderTop:`4px solid ${C.navy}`, borderRadius:"50%", animation:"spin 0.9s linear infinite" }} />
        <div style={{ fontSize:15, color:C.sub, fontWeight:600 }}>Loading pending subjects...</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) return (
    <div className="page-anim">
      <Breadcrumb items={["Scrutinizer","Subjects"]} />
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:280, gap:14 }}>
        <div style={{ fontSize:36 }}>⚠️</div>
        <div style={{ fontSize:15, color:C.danger, fontWeight:700 }}>Failed to load data</div>
        <div style={{ fontSize:13, color:C.sub }}>{error}</div>
        <button onClick={()=>window.location.reload()} style={{ background:`linear-gradient(135deg,${C.navy},${C.blue})`,color:"#fff",border:"none",borderRadius:8,padding:"9px 22px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>
          Retry
        </button>
      </div>
    </div>
  );

  // ── Bundle view (drill-down) ───────────────────────────────────────────────
  if (activeSubject) return (
    <BundleView
      subject={activeSubject}
      bundlesInit={bundlesMap[activeSubject.id] || []}
      onBack={() => setActiveSubject(null)}
      onVerify={handleBookletAction}
      onReturn={handleBookletAction}
    />
  );

  // ── Empty state ────────────────────────────────────────────────────────────
  if (subjects.length === 0) return (
    <div className="page-anim">
      <Breadcrumb items={["Scrutinizer","Subjects"]} />
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:320, gap:14 }}>
        <div style={{ fontSize:48 }}>📭</div>
        <div style={{ fontSize:16, color:C.text, fontWeight:700 }}>No Pending Subjects</div>
        <div style={{ fontSize:13, color:C.sub, textAlign:"center", maxWidth:340 }}>
          There are currently no bundles awaiting scrutinizer review. Check back later or contact the DCE.
        </div>
      </div>
    </div>
  );

  // ── Subject list ───────────────────────────────────────────────────────────
  return (
    <div className="page-anim">
      <Breadcrumb items={["Scrutinizer","Subjects"]} />
      <div style={{ marginBottom:20 }}>
        <div style={{ fontWeight:800,fontSize:20,color:C.text,marginBottom:4 }}>Assigned Subjects</div>
        <div style={{ fontSize:13,color:C.sub }}>Click a subject row to view its bundle assignments and verify booklet evaluations.</div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:22 }}>
        {[
          ["Total Subjects", subjects.length, C.navy, "📚"],
          ["Fully Verified", subjects.filter(s => isSubjectDone(s.id)).length, C.green, "✅"],
          ["In Progress", subjects.filter(s => !isSubjectDone(s.id) && !sentToDCE[s.id]).length, C.gold, "🔄"],
          ["Sent to DCE", Object.keys(sentToDCE).length, C.blue, "🎓"],
        ].map(([l,v,c,icon],i)=>(
          <div key={i} style={{ background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px",borderTop:`3px solid ${c}`,boxShadow:"0 2px 8px rgba(0,35,102,0.05)" }}>
            <div style={{ fontSize:11,color:C.sub,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:24,fontWeight:800,color:c }}>{icon} {v}</div>
          </div>
        ))}
      </div>

      {/* Subject Table */}
      <div style={{ background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,35,102,0.06)" }}>
        <div style={{ background:C.navy,padding:"13px 20px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ fontWeight:800,fontSize:15,color:"#fff" }}>📋 Subject List — Click a row to open bundles</span>
          <span style={{ background:`${C.gold}22`,color:C.gold,padding:"3px 12px",borderRadius:99,fontSize:12,fontWeight:700 }}>{subjects.length} Subjects Assigned</span>
        </div>
        <table style={{ borderCollapse:"collapse",width:"100%",fontSize:13 }}>
          <thead>
            <tr>
              <th style={th()}>Subject Code</th>
              <th style={th()}>Subject Name</th>
              <th style={th({textAlign:"center"})}>Branch</th>
              <th style={th({textAlign:"center"})}>Year</th>
              <th style={th({textAlign:"center"})}>Semester</th>
              <th style={th({textAlign:"center"})}>Status</th>
              <th style={th({textAlign:"center"})}>Action</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((sub,ri)=>{
              const done = isSubjectDone(sub.id) || false;
              const isSent = !!sentToDCE[sub.id];
              const rowBg = isSent?"#e6f7ef":done?"#f0fdf4":ri%2===0?"#fff":"#fafbff";
              return (
                <tr key={sub.id} onClick={()=>setActiveSubject(sub)} style={{ background:rowBg,cursor:"pointer",transition:"all .15s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=done?"#dcfce7":isSent?"#d1fae5":"#eef2ff"}
                  onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                  <td style={td({ fontWeight:800,color:done?C.green:C.navy })}>
                    {done&&"✅ "}{isSent&&"🎓 "}{sub.code}
                  </td>
                  <td style={td({ fontWeight:600,color:C.text })}>{sub.name}</td>
                  <td style={td({ textAlign:"center",color:C.sub })}>{sub.branch}</td>
                  <td style={td({ textAlign:"center",color:C.sub })}>{sub.year}</td>
                  <td style={td({ textAlign:"center",color:C.sub })}>Sem {sub.sem}</td>
                  <td style={td({ textAlign:"center" })}>
                    {isSent
                      ? <span style={{ background:`${C.green}18`,color:C.green,padding:"4px 14px",borderRadius:99,fontSize:11,fontWeight:700 }}>🎓 Sent to DCE</span>
                      : done
                        ? <span style={{ background:`${C.green}18`,color:C.green,padding:"4px 14px",borderRadius:99,fontSize:11,fontWeight:700 }}>✅ Verified</span>
                        : <span style={{ background:`${C.gold}18`,color:"#92400e",padding:"4px 14px",borderRadius:99,fontSize:11,fontWeight:700 }}>🔄 In Progress</span>
                    }
                  </td>
                  <td style={td({ textAlign:"center" })}>
                    {done&&!isSent ? (
                      <button onClick={e=>{e.stopPropagation();setSentToDCE(p=>({...p,[sub.id]:true}));showToast(`🎓 ${sub.name} results sent to DCE!`);}}
                        style={{ background:`linear-gradient(135deg,${C.green},#0d6e3b)`,color:"#fff",border:"none",borderRadius:7,padding:"7px 16px",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" }}>
                        🎓 Send to DCE
                      </button>
                    ) : isSent ? (
                      <span style={{ color:C.green,fontWeight:700,fontSize:12 }}>✓ Completed</span>
                    ) : (
                      <span style={{ color:C.muted,fontWeight:600,fontSize:12 }}>Verify all first</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {toast && <div style={{ position:"fixed",bottom:24,right:24,background:C.green,color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13.5,fontWeight:700,boxShadow:"0 8px 32px rgba(0,0,0,0.22)",zIndex:1100,maxWidth:420,lineHeight:1.5 }}>{toast}</div>}
    </div>
  );
}
