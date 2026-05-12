// src/pages/dashboards/Scdashboard.jsx
// Subject Coordinator Dashboard — Full 4-Step Wizard
// Uses only project-native CSS classes + inline styles. No extra imports needed.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from "react";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { faculty as facultyApi, students as studentsApi } from "../../services/api.js";

// ── Project colour palette (matches index.css + existing dashboards) ──────────
const C = {
  navy:   "#002366",
  blue:   "#0077b6",
  gold:   "#f7941d",
  green:  "#0a8a4a",
  danger: "#dc2626",
  purple: "#6d28d9",
  border: "#d0daf0",
  bg:     "#f0f4fb",
  card:   "#ffffff",
  text:   "#1a2744",
  sub:    "#6478a0",
  muted:  "#94a3b8",
};

// ── Question columns for this 16-mark paper (from the uploaded QP images) ─────
//    1a/2a are OR pair (5M), 1b/2b are OR pair (3M)
//    3a/4a are OR pair (3M), 3b/4b are OR pair (5M)
const INIT_COLS = [
  { id:"c1a", label:"1a", maxMarks:5, co:"CO1", bloom:"L2", isOR:false, orPair:"1a/2a" },
  { id:"c1b", label:"1b", maxMarks:3, co:"CO1", bloom:"L3", isOR:false, orPair:"1b/2b" },
  { id:"c2a", label:"2a", maxMarks:5, co:"CO1", bloom:"L2", isOR:true,  orPair:"1a/2a" },
  { id:"c2b", label:"2b", maxMarks:3, co:"CO1", bloom:"L3", isOR:true,  orPair:"1b/2b" },
  { id:"c3a", label:"3a", maxMarks:3, co:"CO2", bloom:"L2", isOR:false, orPair:"3a/4a" },
  { id:"c3b", label:"3b", maxMarks:5, co:"CO2", bloom:"L3", isOR:false, orPair:"3b/4b" },
  { id:"c4a", label:"4a", maxMarks:3, co:"CO2", bloom:"L2", isOR:true,  orPair:"3a/4a" },
  { id:"c4b", label:"4b", maxMarks:5, co:"CO2", bloom:"L3", isOR:true,  orPair:"3b/4b" },
];

// Student rows are loaded from the API in the main component and passed as props.

const CO_OPTS = ["CO1","CO2","CO3","CO4","CO5","CO6"];
const BL_OPTS = ["L1","L2","L3","L4","L5","L6"];
const WIZARD_STEPS = ["Upload QP", "Upload Answer Key", "Build Schema", "Preview & Publish"];

// ─────────────────────────────────────────────────────────────────────────────
// SMALL SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const Pill = ({ children, color = C.blue }) => (
  <span style={{
    display:"inline-block", padding:"2px 10px", borderRadius:99,
    fontSize:11, fontWeight:700, color, background:`${color}18`, whiteSpace:"nowrap",
  }}>{children}</span>
);

const Btn = ({ children, onClick, variant="primary", size="md", disabled, style:x={} }) => {
  const pad  = { sm:"5px 14px", md:"9px 20px", lg:"11px 28px" }[size];
  const fz   = { sm:12, md:13, lg:14 }[size];
  const vars = {
    primary: { bg:C.navy,   color:"#fff", border:C.navy   },
    gold:    { bg:C.gold,   color:"#fff", border:C.gold   },
    success: { bg:C.green,  color:"#fff", border:C.green  },
    danger:  { bg:C.danger, color:"#fff", border:C.danger },
    outline: { bg:"transparent", color:C.navy, border:C.navy },
    ghost:   { bg:C.bg, color:C.sub, border:C.border },
  }[variant] || {};
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:pad, fontSize:fz, fontWeight:700, borderRadius:8,
      cursor:disabled?"not-allowed":"pointer",
      border:`1.5px solid ${disabled?C.border:vars.border}`,
      background:disabled?"#e8ecf5":vars.bg,
      color:disabled?C.muted:vars.color,
      fontFamily:"inherit", transition:"all .15s", opacity:disabled?.7:1, ...x,
    }}>{children}</button>
  );
};

const InfoBox = ({ children, type="info" }) => {
  const m = {
    info:    { bg:"#eaf3fb", border:"#bdd9f0", color:C.blue   },
    tip:     { bg:"#f3f0ff", border:"#c4b5fd", color:C.purple },
    success: { bg:"#e6f7ef", border:"#86efac", color:C.green  },
    warning: { bg:"#fff4e0", border:"#fcd34d", color:"#92400e"},
  }[type] || {};
  return (
    <div style={{ background:m.bg, border:`1px solid ${m.border}`, borderRadius:8,
      padding:"10px 14px", fontSize:13, color:m.color, marginBottom:"1rem", lineHeight:1.6 }}>
      {children}
    </div>
  );
};

const Panel = ({ children, style={} }) => (
  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
    boxShadow:"0 2px 10px rgba(0,35,102,0.07)", overflow:"hidden", ...style }}>
    {children}
  </div>
);

const PanelHead = ({ children, right }) => (
  <div style={{ background:C.navy, padding:"12px 18px", display:"flex",
    justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
    <span style={{ fontWeight:800, fontSize:14, color:"#fff" }}>{children}</span>
    {right && <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>{right}</div>}
  </div>
);

const MiniStat = ({ value, label, icon, color }) => (
  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
    padding:"16px 20px", display:"flex", alignItems:"center", gap:14,
    boxShadow:"0 2px 8px rgba(0,35,102,0.06)", borderTop:`3px solid ${color}` }}>
    <div style={{ width:44, height:44, borderRadius:10, background:`${color}18`,
      display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize:24, fontWeight:800, color:C.text }}>{value}</div>
      <div style={{ fontSize:12, color:C.sub, marginTop:1 }}>{label}</div>
    </div>
  </div>
);

const StepBar = ({ step }) => (
  <div style={{ display:"flex", alignItems:"center", marginBottom:"1.5rem", overflowX:"auto", paddingBottom:4 }}>
    {WIZARD_STEPS.map((s, i) => {
      const done   = i < step;
      const active = i === step;
      return (
        <div key={i} style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
            <div style={{
              width:34, height:34, borderRadius:"50%",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontWeight:800, fontSize:13.5,
              background: done?C.green : active?C.navy : "#e8ecf5",
              color: done||active ? "#fff" : C.muted,
              boxShadow: active ? `0 0 0 4px ${C.navy}22` : "none",
              transition:"all .3s",
            }}>
              {done ? "✓" : i+1}
            </div>
            <div style={{ fontSize:11, fontWeight:active?800:500,
              color:active?C.navy : done?C.green : C.muted, whiteSpace:"nowrap" }}>
              {s}
            </div>
          </div>
          {i < WIZARD_STEPS.length-1 && (
            <div style={{ width:50, height:2.5, background:done?C.green:C.border,
              margin:"0 4px", marginBottom:18, flexShrink:0, borderRadius:99, transition:"background .4s" }} />
          )}
        </div>
      );
    })}
  </div>
);

const DropZone = ({ label, icon, accept, file, onFile, color }) => {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  return (
    <div
      onClick={() => ref.current.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); const f=e.dataTransfer.files[0]; if(f) onFile(f); }}
      style={{
        border: file ? `2px solid ${C.green}` : drag ? `2px solid ${color}` : `2px dashed ${C.border}`,
        borderRadius:10, padding:"22px 14px", cursor:"pointer", textAlign:"center",
        background: file?"#e6f7ef" : drag?`${color}08`:"#fafbff", transition:"all .2s",
      }}>
      <input ref={ref} type="file" accept={accept} style={{ display:"none" }}
        onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
      {file ? (
        <>
          <div style={{ fontSize:28, marginBottom:5 }}>✅</div>
          <div style={{ fontWeight:700, color:C.green, fontSize:12.5 }}>{file.name}</div>
          <div style={{ fontSize:11, color:C.sub, marginTop:3 }}>Click to replace</div>
        </>
      ) : (
        <>
          <div style={{ fontSize:30, marginBottom:7 }}>{icon}</div>
          <div style={{ fontWeight:700, color:C.text, fontSize:13 }}>{label}</div>
          <div style={{ fontSize:11, color:C.sub, marginTop:4 }}>
            Drag & drop or click<br />
            <span style={{ color, fontWeight:600 }}>{accept}</span>
          </div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Upload Question Paper
// ─────────────────────────────────────────────────────────────────────────────
function Step1UploadQP({ onNext, qpFile, setQpFile }) {
  const [stage, setStage] = useState(qpFile ? "done" : "idle");
  const [progress, setProgress] = useState(0);
  const fileRef = useRef();

  const runExtraction = (file) => {
    setQpFile(file);
    setStage("uploading");
    let p = 0;
    const t1 = setInterval(() => {
      p += 10; setProgress(p);
      if (p >= 100) {
        clearInterval(t1);
        setStage("extracting"); setProgress(0);
        let p2 = 0;
        const t2 = setInterval(() => {
          p2 += 7; setProgress(p2);
          if (p2 >= 100) { clearInterval(t2); setStage("done"); }
        }, 80);
      }
    }, 70);
  };

  const useActualFiles = () =>
    runExtraction({ name:"qp_1.jpeg + qp_2.jpeg  (Modern Physics 2501PH02 · IE1 · 18-03-2026)" });

  return (
    <div>
      {/* <InfoBox type="tip">
        <strong>Step 1 — Upload Question Paper.</strong> The system scans your QP and auto-extracts question numbers, marks, CO tags and Bloom levels. You confirm everything in Step 3.
      </InfoBox> */}

      {stage === "idle" && (
        <>
          <div onClick={() => fileRef.current.click()}
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)runExtraction(f);}}
            style={{ border:`2px dashed ${C.border}`, borderRadius:12, padding:"2.5rem 1.5rem",
              textAlign:"center", background:"#fafbff", cursor:"pointer", marginBottom:"1rem" }}>
            <div style={{ fontSize:44, marginBottom:10 }}>📄</div>
            <div style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:6 }}>
              Drop your Question Paper here or click to browse
            </div>
            <div style={{ fontSize:13, color:C.sub }}>PDF, JPG, PNG, DOCX — max 50 MB</div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" style={{ display:"none" }}
              onChange={e=>e.target.files[0]&&runExtraction(e.target.files[0])} />
          </div>

          {/* <div style={{ background:"#eaf3fb", border:`1px solid #bdd9f0`, borderRadius:10,
            padding:"12px 18px", display:"flex", justifyContent:"space-between",
            alignItems:"center", flexWrap:"wrap", gap:10 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:13.5, color:C.blue }}>
                📎 Detected: qp_1.jpeg & qp_2.jpeg
              </div>
              <div style={{ fontSize:12, color:C.sub, marginTop:3 }}>
                Modern Physics (2501PH02) · IE1 · 18-03-2026 · 16 Marks
              </div>
            </div>
            <Btn onClick={useActualFiles} size="sm">Use These Files →</Btn>
          </div> */}
        </>
      )}

      {(stage==="uploading"||stage==="extracting") && (
        <Panel>
          <div style={{ padding:"2rem", textAlign:"center" }}>
            <div style={{ fontSize:36, marginBottom:10 }}>{stage==="uploading"?"📤":"🤖"}</div>
            <div style={{ fontWeight:700, fontSize:15,
              color:stage==="extracting"?C.purple:C.navy, marginBottom:6 }}>
              {stage==="uploading"?"Uploading question paper…":"AI extracting question structure…"}
            </div>
            <div style={{ fontSize:13, color:C.sub, marginBottom:14 }}>
              {stage==="uploading"
                ?"Scanning pages and resolving image quality…"
                :"Detecting question numbers, marks, CO tags & Bloom levels…"}
            </div>
            <div style={{ height:8, background:"#e8ecf5", borderRadius:99, overflow:"hidden", maxWidth:300, margin:"0 auto" }}>
              <div style={{ height:"100%", width:`${progress}%`,
                background:stage==="extracting"?C.purple:C.navy, borderRadius:99, transition:"width .1s" }} />
            </div>
            <div style={{ fontSize:12, color:C.muted, marginTop:6 }}>{progress}%</div>
          </div>
        </Panel>
      )}

      {/* {stage==="done" && (
        <>
          <div style={{ background:"#e6f7ef", border:`1px solid #86efac`, borderRadius:10,
            padding:"12px 18px", marginBottom:"1rem", display:"flex",
            justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:13.5, color:C.green }}>
                ✅ Extracted — MODERN PHYSICS (2501PH02)
              </div>
              <div style={{ fontSize:12, color:"#166534", marginTop:2 }}>
                {qpFile?.name} · 8 questions · 2 OR-groups · 16 total marks
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <Pill color={C.green}>16M Total</Pill>
              <Pill color={C.purple}>2 OR Groups</Pill>
              <Pill color={C.blue}>8 Questions</Pill>
            </div>
          </div>

          {[
            { group:"Q1 & Q2 — OR pair", qs:[
              { l:"Q1a", t:"Newton's rings — derive diameter expressions",                                    m:5, co:"CO1", bl:"L2", or:false },
              { l:"Q1b", t:"Number of orders on grating (5000Å, 1000 lines/cm)",                             m:3, co:"CO1", bl:"L3", or:false },
              { l:"Q2a (OR)", t:"Diffraction due to plane transmission grating, derive grating equation",    m:5, co:"CO1", bl:"L2", or:true  },
              { l:"Q2b (OR)", t:"Thin film glass (n=1.5, 60°) — minimum thickness for dark reflection",      m:3, co:"CO1", bl:"L3", or:true  },
            ]},
            { group:"Q3 & Q4 — OR pair", qs:[
              { l:"Q3a", t:"Ruby laser — construction, working & energy level diagram",                      m:3, co:"CO2", bl:"L2", or:false },
              { l:"Q3b", t:"Laser action without population inversion — possible?",                          m:5, co:"CO2", bl:"L3", or:false },
              { l:"Q4a (OR)", t:"Numerical aperture of fibre (n1=1.48, n2=1.46)",                            m:5, co:"CO2", bl:"L3", or:true  },
              { l:"Q4b (OR)", t:"Classify optical fibres by RI profile & mode, with diagrams",               m:3, co:"CO2", bl:"L2", or:true  },
            ]},
          ].map((grp, gi) => (
            <Panel key={gi} style={{ marginBottom:12 }}>
              <div style={{ background:"#f0f4fb", padding:"8px 16px", borderBottom:`1px solid ${C.border}`,
                display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontWeight:700, fontSize:13, color:C.text }}>{grp.group}</span>
                <Pill color={C.gold}>8M effective</Pill>
              </div>
              {grp.qs.map((q, qi) => (
                <div key={qi} style={{ display:"flex", gap:12, padding:"9px 16px",
                  borderBottom:"1px solid #f0f2f8", background:q.or?"#f5f3ff":"#fff",
                  alignItems:"flex-start" }}>
                  <span style={{ fontWeight:800, fontSize:12.5, color:q.or?C.purple:C.navy,
                    minWidth:70, paddingTop:1 }}>{q.l}</span>
                  <div style={{ flex:1, fontSize:13, color:C.text, lineHeight:1.5 }}>{q.t}</div>
                  <div style={{ display:"flex", gap:6, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
                    <Pill color={C.green}>{q.m}M</Pill>
                    <Pill color={C.blue}>{q.co}</Pill>
                    <Pill color={C.purple}>{q.bl}</Pill>
                  </div>
                </div>
              ))}
            </Panel>
          ))}
        </>
      )} */}

      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:"1rem" }}>
        <Btn onClick={onNext} disabled={stage!=="done"}>Continue to Answer Key →</Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Upload Answer Key
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_KEY_POINTS =
`Q1a: Dark ring r²n = nλR; bright ring r²n = (2n-1)λR/2; derive diameter.
Q1b: N_max = 1/(nλ) = 1/(1000 × 5000×10⁻⁸ cm) = 2000 orders.
Q2a: Grating equation (a+b)sinθ = nλ; principal maxima condition.
Q2b: 2μt cosθ = nλ → t_min = 5890/(2×1.5×cos60°) Å = 3927 Å.
Q3a: Ruby laser — 3-level; Cr³⁺; E1→E3 pump, E3→E2 non-rad, E2→E1 lasing @ 694nm.
Q3b: Population inversion essential — without it abs > emission, no amplification.
Q4a: NA = √(n1²−n2²) = √(1.48²−1.46²) = √0.0588 ≈ 0.2425.
Q4b: Step-index vs Graded-index; Single-mode vs Multi-mode; cross-section diagrams.`;

function Step2AnswerKey({ onNext, onBack, ansFile, setAnsFile }) {
  const [kp, setKp] = useState(DEFAULT_KEY_POINTS);
  return (
    <div>
      <InfoBox type="tip">
        <strong>Step 2 — Upload Model Answer Sheet.</strong> Used by the AI as a reference rubric when evaluating student booklets. Key points below are pre-filled from the extracted QP.
      </InfoBox>

      <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:14, marginBottom:"1rem" }}>
        <DropZone label="Model Answer Sheet" icon="📝" accept=".pdf,.docx,.jpg,.png"
          file={ansFile} color={C.gold} onFile={setAnsFile} />
        {/* <div style={{ background:"#fafbff", border:`1px solid ${C.border}`, borderRadius:10,
          padding:"1rem", display:"flex", flexDirection:"column", gap:8, justifyContent:"center" }}>
          <div style={{ fontWeight:700, fontSize:13, color:C.text }}>Why upload an answer key?</div>
          <div style={{ fontSize:12.5, color:C.sub, lineHeight:1.7 }}>
            The AI cross-references your model answers when marking student responses, giving it domain-specific context beyond the schema marks alone.
          </div>
          <div style={{ fontSize:12, color:C.sub }}>
            📌 Even without a file, key-points text below guides the AI effectively.
          </div>
        </div> */}
      </div>

      {/* <div style={{ marginBottom:"1rem" }}>
        <label className="field-label">Key Answer Points — one line per question (AI evaluation rubric)</label>
        <textarea value={kp} onChange={e=>setKp(e.target.value)} rows={8}
          style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:`1px solid ${C.border}`,
            fontSize:13, color:C.text, resize:"vertical", fontFamily:"'Courier New',monospace",
            lineHeight:1.8, background:"#fff", boxSizing:"border-box" }} />
        <div style={{ fontSize:11.5, color:C.muted, marginTop:4 }}>
          Pre-filled from QP extraction. Refine each guideline before publishing.
        </div>
      </div> */}

      {/* <InfoBox type="info">
        💡 These key points are stored with the schema. The AI uses them as a rubric when evaluating each student's handwritten answer.
      </InfoBox> */}

      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <Btn variant="ghost" onClick={onBack}>← Back</Btn>
        <Btn onClick={onNext}>Continue to Schema Builder →</Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Schema Builder (spreadsheet style, blank student rows)
// ─────────────────────────────────────────────────────────────────────────────
function Step3Schema({ onNext, onBack, cols, setCols, studentRows = [] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newCol, setNewCol] = useState({ label:"", maxMarks:5, co:"CO1", bloom:"L2", isOR:false, orPair:"" });

  const updateCol = (id, field, val) =>
    setCols(p => p.map(c => c.id===id ? { ...c, [field]:val } : c));
  const removeCol = (id) => setCols(p => p.filter(c => c.id!==id));

  const mainTotal = cols.filter(c=>!c.isOR).reduce((a,b)=>a+b.maxMarks,0);

  const td = (extra={}) => ({
    border:`1px solid #d0daf0`, padding:"7px 9px",
    textAlign:"center", fontSize:13, whiteSpace:"nowrap", ...extra,
  });

  return (
    <div>
      <InfoBox type="tip">
        <strong>Step 3 — Evaluation Schema.</strong> Define question columns (1a, 1b, 2a…) and max marks per column. Student mark cells are left <em>blank</em> — the AI auto-fills them after the Paper Clerk uploads scanned booklets.
      </InfoBox>

      {/* Legend */}
      <div style={{ display:"flex", gap:16, marginBottom:"1rem", flexWrap:"wrap" }}>
        {[
          { bg:"#eaf3fb", border:C.blue,   label:"Main question column"   },
          { bg:"#f5f3ff", border:C.purple, label:"OR alternative column"  },
          { bg:"#fafbff", border:C.muted,  label:"Blank — AI fills later" },
        ].map((l,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12.5, color:C.sub }}>
            <div style={{ width:14, height:14, borderRadius:3, background:l.bg, border:`2px solid ${l.border}` }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Column configurator */}
      <Panel style={{ marginBottom:"1.25rem" }}>
        <PanelHead right={<Pill color="#60a5fa">Effective max: {mainTotal} M</Pill>}>
          Column Settings (set max marks per question)
        </PanelHead>
        <div style={{ overflowX:"auto" }}>
          <table style={{ borderCollapse:"collapse", width:"100%", fontSize:13 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {["Column","Max Marks","CO","Bloom","OR Alt?","OR Pair",""].map(h=>(
                  <th key={h} style={{ ...td(), fontWeight:700, fontSize:11, color:C.sub,
                    textTransform:"uppercase", letterSpacing:"0.06em", background:C.bg }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cols.map(col=>(
                <tr key={col.id} style={{ background:col.isOR?"#f5f3ff":"#fff" }}>
                  <td style={{ ...td(), fontWeight:800, color:col.isOR?C.purple:C.navy, fontSize:15 }}>
                    {col.label}
                  </td>
                  <td style={td()}>
                    <input type="number" min={0} max={25} value={col.maxMarks}
                      onChange={e=>updateCol(col.id,"maxMarks",Math.max(0,Math.min(25,+e.target.value)))}
                      style={{ width:54, padding:"4px 6px", borderRadius:6,
                        border:`1.5px solid ${col.isOR?C.purple:C.blue}44`,
                        fontSize:15, fontWeight:800, textAlign:"center",
                        color:col.isOR?C.purple:C.navy, fontFamily:"inherit", background:"#fff" }} />
                  </td>
                  <td style={td()}>
                    <select value={col.co} onChange={e=>updateCol(col.id,"co",e.target.value)}
                      style={{ padding:"4px 6px", borderRadius:6, border:`1px solid #bdd9f0`,
                        fontSize:12, color:C.blue, fontWeight:700, fontFamily:"inherit", background:"#eaf3fb" }}>
                      {CO_OPTS.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={td()}>
                    <select value={col.bloom} onChange={e=>updateCol(col.id,"bloom",e.target.value)}
                      style={{ padding:"4px 6px", borderRadius:6, border:`1px solid #c4b5fd`,
                        fontSize:12, color:C.purple, fontWeight:700, fontFamily:"inherit", background:"#f5f3ff" }}>
                      {BL_OPTS.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={td()}>
                    <input type="checkbox" checked={col.isOR}
                      onChange={e=>updateCol(col.id,"isOR",e.target.checked)}
                      style={{ width:16, height:16, accentColor:C.purple, cursor:"pointer" }} />
                  </td>
                  <td style={td()}>
                    <input value={col.orPair} onChange={e=>updateCol(col.id,"orPair",e.target.value)}
                      placeholder="e.g. 1a/2a"
                      style={{ width:70, padding:"4px 6px", borderRadius:6,
                        border:`1px solid ${C.border}`, fontSize:12, color:C.sub, fontFamily:"inherit" }} />
                  </td>
                  <td style={td()}>
                    <button onClick={()=>removeCol(col.id)}
                      style={{ background:"none", border:"none", cursor:"pointer",
                        color:"#fca5a5", fontSize:16, lineHeight:1 }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showAdd ? (
          <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.border}`, background:"#fafbff",
            display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
            <input value={newCol.label} onChange={e=>setNewCol(p=>({...p,label:e.target.value}))}
              placeholder="Label (5a)" className="field-input" style={{ width:80 }} />
            <input type="number" min={0} max={25} value={newCol.maxMarks}
              onChange={e=>setNewCol(p=>({...p,maxMarks:+e.target.value}))}
              className="field-input" style={{ width:70 }} />
            <select value={newCol.co} onChange={e=>setNewCol(p=>({...p,co:e.target.value}))}
              className="field-input" style={{ width:80 }}>
              {CO_OPTS.map(o=><option key={o}>{o}</option>)}
            </select>
            <select value={newCol.bloom} onChange={e=>setNewCol(p=>({...p,bloom:e.target.value}))}
              className="field-input" style={{ width:70 }}>
              {BL_OPTS.map(o=><option key={o}>{o}</option>)}
            </select>
            <label style={{ fontSize:12.5, color:C.sub, display:"flex", alignItems:"center", gap:5 }}>
              <input type="checkbox" checked={newCol.isOR}
                onChange={e=>setNewCol(p=>({...p,isOR:e.target.checked}))} /> OR alt?
            </label>
            <Btn size="sm" onClick={()=>{
              if(!newCol.label) return;
              setCols(p=>[...p,{ ...newCol, id:`c${newCol.label}${Date.now()}` }]);
              setNewCol({ label:"", maxMarks:5, co:"CO1", bloom:"L2", isOR:false, orPair:"" });
              setShowAdd(false);
            }}>Add</Btn>
            <Btn size="sm" variant="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
          </div>
        ) : (
          <div style={{ padding:"10px 16px", borderTop:`1px solid ${C.border}` }}>
            <Btn size="sm" variant="outline" onClick={()=>setShowAdd(true)}>+ Add Column</Btn>
          </div>
        )}
      </Panel>

      {/* Spreadsheet preview */}
      <Panel style={{ marginBottom:"1.25rem" }}>
        <PanelHead right={<Pill color="#86efac">Student rows blank — AI fills after upload</Pill>}>
          📊 Schema Spreadsheet Preview
        </PanelHead>
        <div style={{ overflowX:"auto" }}>
          <table style={{ borderCollapse:"collapse", fontSize:13, minWidth:"100%" }}>
            <thead>
              <tr>
                {["SNo","AdmnNo","OMR Code",...cols.map(c=>c.label),"TotalMarks"].map((h,i)=>(
                  <th key={i} style={{ ...td({
                    background: cols[i-3]?.isOR ? "#4c1d95" : C.navy,
                    color:"#fff", fontWeight:800, fontSize:12.5,
                  }), minWidth:i<3?90:50 }}>
                    {h}
                    {cols[i-3]?.isOR && (
                      <div style={{ fontSize:9, color:"#c4b5fd", fontWeight:600, marginTop:1 }}>OR</div>
                    )}
                  </th>
                ))}
              </tr>
              <tr>
                <td colSpan={3} style={td({ background:"#eaf3fb", fontWeight:700, fontSize:11, color:C.blue, textAlign:"left", paddingLeft:12 })}>Course Outcome →</td>
                {cols.map(c=><td key={c.id} style={td({ background:"#eaf3fb", fontWeight:700, fontSize:11, color:C.blue })}>{c.co}</td>)}
                <td style={td({ background:"#eaf3fb" })}></td>
              </tr>
              <tr>
                <td colSpan={3} style={td({ background:"#f5f3ff", fontWeight:700, fontSize:11, color:C.purple, textAlign:"left", paddingLeft:12 })}>Bloom Level →</td>
                {cols.map(c=><td key={c.id} style={td({ background:"#f5f3ff", fontWeight:700, fontSize:11, color:C.purple })}>{c.bloom}</td>)}
                <td style={td({ background:"#f5f3ff" })}></td>
              </tr>
              <tr>
                <td colSpan={3} style={td({ background:"#fff4e0", fontWeight:800, fontSize:12, color:"#92400e", textAlign:"left", paddingLeft:12 })}>
                  Max Marks (Coordinator) ↓
                </td>
                {cols.map(c=><td key={c.id} style={td({ background:"#fff4e0", fontWeight:900, fontSize:15, color:"#92400e" })}>{c.maxMarks}</td>)}
                <td style={td({ background:"#fff4e0", fontWeight:900, fontSize:15, color:"#92400e" })}>{mainTotal}</td>
              </tr>
            </thead>
            <tbody>
              {STUDENT_ROWS.map((row,ri)=>(
                <tr key={ri} style={{ background:ri%2===0?"#fff":"#fafbff" }}>
                  <td style={td({ fontWeight:600, color:C.sub })}>{row.sno}</td>
                  <td style={td({ fontWeight:600, color:C.text, fontSize:12 })}>{row.admNo}</td>
                  <td style={td({ color:C.sub, fontSize:12 })}>{row.omr}</td>
                  {cols.map(c=><td key={c.id} style={td({ color:"#d0daf0", fontSize:11, fontStyle:"italic" })}>—</td>)}
                  <td style={td({ color:"#d0daf0", fontSize:11, fontStyle:"italic" })}>—</td>
                </tr>
              ))}
              {[...Array(3)].map((_,i)=>(
                <tr key={`g${i}`} style={{ opacity:0.28 }}>
                  <td style={td({ color:C.muted })}>{6+i}</td>
                  <td style={td({ color:C.muted })}>23P31A05XX</td>
                  <td style={td({ color:C.muted })}>XXXXXX</td>
                  {cols.map(c=><td key={c.id} style={td()}></td>)}
                  <td style={td()}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding:"10px 18px", borderTop:`1px solid ${C.border}`, background:"#fff4e0",
          display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>🤖</span>
          <div style={{ fontSize:12.5, color:"#92400e" }}>
            <strong>Blank cells are intentional.</strong> After the Paper Clerk uploads scanned booklets, the AI reads each student's answers and auto-fills every cell with the awarded marks.
          </div>
        </div>
      </Panel>

      <div style={{ display:"flex", gap:10, marginBottom:"1.25rem", flexWrap:"wrap" }}>
        <div style={{ background:"#eaf3fb", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 14px", fontSize:13 }}>
          Columns: <strong style={{ color:C.navy }}>{cols.length}</strong>
          <span style={{ color:C.muted, fontSize:11 }}> ({cols.filter(c=>!c.isOR).length} main + {cols.filter(c=>c.isOR).length} OR)</span>
        </div>
        <div style={{ background:"#e6f7ef", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 14px", fontSize:13 }}>
          Effective max marks: <strong style={{ color:C.green }}>{mainTotal} M</strong>
        </div>
      </div>

      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <Btn variant="ghost" onClick={onBack}>← Back</Btn>
        <Btn variant="success" onClick={onNext}>Save & Preview →</Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — Preview & Publish
// ─────────────────────────────────────────────────────────────────────────────
function Step4Publish({ onBack, cols, qpFile, studentRows = [] }) {
  const [published, setPublished] = useState(false);
  const [toast, setToast] = useState("");

  const mainMarks = cols.filter(c=>!c.isOR).reduce((a,b)=>a+b.maxMarks,0);

  const publish = () => {
    setPublished(true);
    setToast("🚀 Schema published! Paper Clerk can now upload booklets. AI will auto-fill marks per this schema.");
    setTimeout(()=>setToast(""), 5000);
  };

  const td = (extra={}) => ({
    border:`1px solid #d0daf0`, padding:"7px 10px",
    textAlign:"center", fontSize:13, whiteSpace:"nowrap", ...extra,
  });

  return (
    <div>
      <InfoBox type="success">
        ✅ <strong>All set!</strong> Review the final schema below. Once published, the Paper Clerk uploads student booklets → AI evaluates each question → Faculty verifies and freezes.
      </InfoBox>

      {/* Meta summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10, marginBottom:"1.25rem" }}>
        {[
          { l:"Subject",       v:"Modern Physics"  },
          { l:"Code",          v:"2501PH02"         },
          { l:"Exam",          v:"Internal Exam 1" },
          { l:"Date",          v:"18-03-2026"       },
          { l:"Max Marks",     v:`${mainMarks} M`  },
          { l:"Total Columns", v:cols.length        },
          { l:"Main / OR",     v:`${cols.filter(c=>!c.isOR).length} / ${cols.filter(c=>c.isOR).length}` },
        ].map((s,i)=>(
          <div key={i} style={{ background:C.bg, borderRadius:8, padding:"9px 12px", border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:10, color:C.sub, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:3 }}>{s.l}</div>
            <div style={{ fontSize:14, fontWeight:800, color:C.text }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Final spreadsheet */}
      <Panel style={{ marginBottom:"1.25rem" }}>
        <PanelHead right={<Pill color="#86efac">Student cells blank — AI fills after upload</Pill>}>
          📋 Final Evaluation Schema — Spreadsheet
        </PanelHead>
        <div style={{ overflowX:"auto" }}>
          <table style={{ borderCollapse:"collapse", fontSize:13, minWidth:"100%" }}>
            <thead>
              <tr>
                {["SNo","AdmnNo","OMR Code",...cols.map(c=>c.label),"TotalMarks"].map((h,i)=>(
                  <th key={i} style={{ ...td({
                    background: cols[i-3]?.isOR ? "#4c1d95" : C.navy,
                    color:"#fff", fontWeight:800, fontSize:12,
                  }), minWidth:i<3?90:48 }}>
                    {h}
                    {cols[i-3]?.isOR && <div style={{ fontSize:9, color:"#c4b5fd", fontWeight:600 }}>OR</div>}
                  </th>
                ))}
              </tr>
              <tr>
                <td colSpan={3} style={td({ background:"#eaf3fb", fontWeight:700, fontSize:11, color:C.blue, textAlign:"left", paddingLeft:12 })}>Course Outcome →</td>
                {cols.map(c=><td key={c.id} style={td({ background:"#eaf3fb", fontWeight:700, fontSize:11, color:C.blue })}>{c.co}</td>)}
                <td style={td({ background:"#eaf3fb" })}></td>
              </tr>
              <tr>
                <td colSpan={3} style={td({ background:"#f5f3ff", fontWeight:700, fontSize:11, color:C.purple, textAlign:"left", paddingLeft:12 })}>Bloom Level →</td>
                {cols.map(c=><td key={c.id} style={td({ background:"#f5f3ff", fontWeight:700, fontSize:11, color:C.purple })}>{c.bloom}</td>)}
                <td style={td({ background:"#f5f3ff" })}></td>
              </tr>
              <tr>
                <td colSpan={3} style={td({ background:"#fff4e0", fontWeight:800, fontSize:12, color:"#92400e", textAlign:"left", paddingLeft:12 })}>Max Marks (Coordinator)</td>
                {cols.map(c=><td key={c.id} style={td({ background:"#fff4e0", fontWeight:900, fontSize:15, color:"#92400e" })}>{c.maxMarks}</td>)}
                <td style={td({ background:"#fff4e0", fontWeight:900, fontSize:15, color:"#92400e" })}>{mainMarks}</td>
              </tr>
            </thead>
            <tbody>
              {STUDENT_ROWS.map((row,ri)=>(
                <tr key={ri} style={{ background:ri%2===0?"#fff":"#fafbff" }}>
                  <td style={td({ fontWeight:600, color:C.sub })}>{row.sno}</td>
                  <td style={td({ fontWeight:600, color:C.text, fontSize:12 })}>{row.admNo}</td>
                  <td style={td({ color:C.sub, fontSize:12 })}>{row.omr}</td>
                  {cols.map(c=><td key={c.id} style={td({ color:"#d0daf0", fontSize:11, fontStyle:"italic" })}>—</td>)}
                  <td style={td({ color:"#d0daf0", fontSize:11, fontStyle:"italic" })}>—</td>
                </tr>
              ))}
              {[...Array(3)].map((_,i)=>(
                <tr key={`g${i}`} style={{ opacity:0.28 }}>
                  <td style={td({ color:C.muted })}>{6+i}</td>
                  <td style={td({ color:C.muted })}>23P31A05XX</td>
                  <td style={td({ color:C.muted })}>XXXXXX</td>
                  {cols.map(c=><td key={c.id} style={td()}></td>)}
                  <td style={td()}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding:"10px 18px", borderTop:`1px solid ${C.border}`, background:"#fff4e0",
          fontSize:12.5, color:"#92400e" }}>
          🤖 <strong>Blank cells are intentional.</strong> AI fills every student cell automatically after the Paper Clerk uploads booklets. Faculty then verifies and freezes.
        </div>
      </Panel>

      {/* AI flow */}
      <Panel style={{ marginBottom:"1.25rem" }}>
        <PanelHead>🤖 How AI Uses This Schema — Auto-Fill Flow</PanelHead>
        <div style={{ padding:"1.1rem 1.25rem" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10 }}>
            {[
              { icon:"📄", step:"1", title:"Clerk uploads booklets", detail:"Scanned sheets + barcodes mapped to students" },
              { icon:"🔍", step:"2", title:"AI reads answers",       detail:"OCR + NLP on handwriting per question"       },
              { icon:"📋", step:"3", title:"AI matches schema",      detail:"1a→max 5M, 1b→max 3M, 2a→max 5M…"          },
              { icon:"✍️", step:"4", title:"AI fills each cell",     detail:"Awarded marks auto-populated in spreadsheet" },
              { icon:"👨‍🏫", step:"5", title:"Faculty reviews",       detail:"Can edit any question's awarded mark"        },
              { icon:"🔒", step:"6", title:"Faculty freezes",        detail:"Student notified — 2-day review window"      },
            ].map((s,i)=>(
              <div key={i} style={{ background:C.bg, borderRadius:10, padding:"10px 12px",
                border:`1px solid ${C.border}`, display:"flex", gap:10, alignItems:"flex-start" }}>
                <div style={{ fontSize:22, flexShrink:0 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:C.blue, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                    Step {s.step}
                  </div>
                  <div style={{ fontWeight:700, fontSize:13, color:C.text, marginTop:2 }}>{s.title}</div>
                  <div style={{ fontSize:12, color:C.sub, marginTop:3 }}>{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <Btn variant="ghost" onClick={onBack}>← Back to Schema</Btn>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {published && <Pill color={C.green}>✅ Schema is Live</Pill>}
          <Btn variant={published?"ghost":"gold"} size="lg" onClick={publish} disabled={published}>
            {published ? "✅ Schema Published!" : "🚀 Publish Schema"}
          </Btn>
        </div>
      </div>

      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, background:C.green, color:"#fff",
          padding:"13px 20px", borderRadius:10, fontSize:13.5, fontWeight:700,
          boxShadow:"0 8px 32px rgba(0,0,0,0.22)", zIndex:9999, maxWidth:420, lineHeight:1.5,
          animation:"slideIn .3s ease" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT — default export (keeps the same name the project uses)
// ─────────────────────────────────────────────────────────────────────────────
export default function CoordinatorDashboard({ user }) {
  const [step,        setStep]       = useState(0);
  const [qpFile,      setQpFile]     = useState(null);
  const [ansFile,     setAnsFile]    = useState(null);
  const [cols,        setCols]       = useState(INIT_COLS);
  const [activeTab,   setActiveTab]  = useState("wizard");
  const [subjects,    setSubjects]   = useState([]);
  const [studentRows, setStudentRows]= useState([]);

  useEffect(() => {
    const facultyId = user?.profile?._id || user?.roleRef;
    if (facultyId) {
      facultyApi.getMappings(facultyId)
        .then(data => setSubjects(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
    studentsApi.list()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setStudentRows(list.slice(0, 8).map((s, i) => ({
          sno: i + 1,
          admNo: s.rollNumber || s._id,
          omr: s._id?.toString().slice(-6).toUpperCase() || "——",
        })));
      })
      .catch(() => {});
  }, [user]);

  const schemaPublished = step >= 3;

  const TABS = [
    { id:"wizard",   label:"📋 QP & Schema Wizard" },
    { id:"subjects", label:"📚 My Subjects"         },
    { id:"history",  label:"📤 Upload History"       },
  ];

  return (
    <div className="page-anim" style={{ display:"flex", flexDirection:"column", gap:0 }}>
      <Breadcrumb items={["Subject Coordinator", "Dashboard"]} />

      {/* Stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, marginBottom:20 }}>
        <MiniStat value={subjects.length}        label="Subjects Coordinating" icon="📚" color={C.navy}  />
        <MiniStat value={qpFile?1:0}            label="QPs Uploaded"          icon="📄" color={C.blue}  />
        <MiniStat value={ansFile?1:0}           label="Answer Keys Uploaded"  icon="📋" color={C.gold}  />
        <MiniStat value={schemaPublished?1:0}   label="Schemas Published"     icon="📊" color={C.green} />
      </div>

      {/* Tab bar */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"12px 12px 0 0",
        borderBottom:"none", display:"flex", overflow:"hidden" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
            padding:"13px 22px", border:"none",
            background:activeTab===t.id?C.card:"#f5f7fc",
            cursor:"pointer", fontSize:13, fontWeight:activeTab===t.id?800:500,
            color:activeTab===t.id?C.navy:C.sub,
            borderBottom:activeTab===t.id?`3px solid ${C.navy}`:"3px solid transparent",
            transition:"all .15s", fontFamily:"inherit",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderTop:"none",
        borderRadius:"0 0 12px 12px", padding:"1.5rem",
        boxShadow:"0 2px 10px rgba(0,35,102,0.07)", marginBottom:20 }}>

        {/* WIZARD */}
        {activeTab==="wizard" && (
          <>
            <div style={{ marginBottom:"1.25rem" }}>
              <div style={{ fontWeight:800, fontSize:18, color:C.text }}>
                QP Upload & Evaluation Schema Builder
              </div>
              <div style={{ fontSize:13, color:C.sub, marginTop:4 }}>
                MODERN PHYSICS (2501PH02) · Internal Exam 1 (IE1) · Sem 1 · Regulation R24 · 18-03-2026
              </div>
            </div>
            <StepBar step={step} />
            {step===0 && <Step1UploadQP onNext={()=>setStep(1)} qpFile={qpFile} setQpFile={setQpFile} />}
            {step===1 && <Step2AnswerKey onNext={()=>setStep(2)} onBack={()=>setStep(0)} ansFile={ansFile} setAnsFile={setAnsFile} />}
            {step===2 && <Step3Schema onNext={()=>setStep(3)} onBack={()=>setStep(1)} cols={cols} setCols={setCols} studentRows={studentRows} />}
            {step===3 && <Step4Publish onBack={()=>setStep(2)} cols={cols} qpFile={qpFile} studentRows={studentRows} />}
          </>
        )}

        {/* SUBJECTS */}
        {activeTab==="subjects" && (
          <>
            <div style={{ fontWeight:800, fontSize:16, color:C.text, marginBottom:16 }}>My Assigned Subjects</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:14 }}>
              {(subjects.length > 0 ? subjects.map(m => ({
                code: m.subject?.courseCode || m.subject?.code || "—",
                name: m.subject?.title || m.subject?.name || "Subject",
                sem:  m.semester?.name  || "—",
                schemaOk: false, qpOk: false,
              })) : [{ code:"—", name:"No subjects assigned yet", sem:"—", schemaOk:false, qpOk:false }])
              .map((s,i)=>(
                <div key={i} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:12,
                  padding:"16px 18px", cursor:"pointer", transition:"box-shadow .2s",
                  borderTop:`3px solid ${s.schemaOk?C.green:s.qpOk?C.blue:C.gold}` }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,35,102,0.12)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                  <div style={{ fontWeight:800, fontSize:15, color:C.text, marginBottom:4 }}>{s.name}</div>
                  <div style={{ fontSize:12, color:C.sub, marginBottom:10 }}>{s.code} · {s.sem} · IE1 & IE2</div>
                  <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
                    <Pill color={s.qpOk?C.green:C.muted}>QP: {s.qpOk?"Uploaded":"Pending"}</Pill>
                    <Pill color={s.schemaOk?C.green:C.muted}>Schema: {s.schemaOk?"Published":"Pending"}</Pill>
                  </div>
                  <Btn size="sm" variant="outline" onClick={()=>{ setActiveTab("wizard"); setStep(0); }}>
                    Open Wizard →
                  </Btn>
                </div>
              ))}
            </div>
          </>
        )}

        {/* HISTORY */}
        {activeTab==="history" && (
          <>
            <div style={{ fontWeight:800, fontSize:16, color:C.text, marginBottom:16 }}>Upload History</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.bg }}>
                    {["File Name","Subject","Type","Date","Status"].map(h=>(
                      <th key={h} style={{ textAlign:"left", padding:"10px 14px", fontSize:11,
                        fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:"0.06em",
                        borderBottom:`1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { file:"qp_1.jpeg",            subj:"Modern Physics", type:"Question Paper", date:"18-03-2026", ok:!!qpFile        },
                    { file:"qp_2.jpeg",            subj:"Modern Physics", type:"Question Paper", date:"18-03-2026", ok:!!qpFile        },
                    { file:"schema_2501PH02.json", subj:"Modern Physics", type:"Eval. Schema",  date:"18-03-2026", ok:schemaPublished  },
                  ].map((r,i)=>(
                    <tr key={i} style={{ borderBottom:`1px solid #f0f2f8` }}>
                      <td style={{ padding:"10px 14px", fontWeight:600, color:C.blue }}>📎 {r.file}</td>
                      <td style={{ padding:"10px 14px" }}>{r.subj}</td>
                      <td style={{ padding:"10px 14px" }}><Pill color={C.purple}>{r.type}</Pill></td>
                      <td style={{ padding:"10px 14px", color:C.sub }}>{r.date}</td>
                      <td style={{ padding:"10px 14px" }}>
                        <Pill color={r.ok?C.green:C.muted}>{r.ok?"Done":"Pending"}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
