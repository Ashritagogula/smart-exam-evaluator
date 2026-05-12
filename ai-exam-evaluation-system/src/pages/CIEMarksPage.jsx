import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Breadcrumb from "../components/layout/Breadcrumb";
import {
  cieMarks as cieMarksApi,
  subjects as subjectsApi,
  students as studentsApi,
  academicYears as academicYearsApi,
  semesters as semestersApi,
} from "../services/api.js";

const C = {
  navy:"#002366", blue:"#0077b6", gold:"#f7941d",
  green:"#0a8a4a", danger:"#dc2626", purple:"#6d28d9",
  border:"#d0daf0", bg:"#f0f4fb", text:"#1a2744", sub:"#6478a0", muted:"#94a3b8",
};

const th = (x = {}) => ({ padding:"10px 12px", fontWeight:700, fontSize:11, color:"#fff", textTransform:"uppercase", letterSpacing:"0.06em", textAlign:"center", background:C.navy, border:"1px solid rgba(255,255,255,0.1)", whiteSpace:"nowrap", ...x });
const td = (x = {}) => ({ padding:"9px 10px", border:`1px solid ${C.border}`, textAlign:"center", fontSize:13, ...x });

const COLS = [
  { key:"ie1", label:"IE-1", max:50, bg:"#f0f8ff", bc:"#0d4a8a" },
  { key:"ie2", label:"IE-2", max:50, bg:"#f0f8ff", bc:"#0d4a8a" },
  { key:"la",  label:"LA",   max:10, bg:"#f5fbff", bc:"#145a8a" },
  { key:"dda", label:"DDA",  max:10, bg:"#f5fbff", bc:"#145a8a" },
  { key:"lt",  label:"LT",   max:10, bg:"#f5fbff", bc:"#145a8a" },
];

function clamp(val, max) {
  const n = parseFloat(val);
  if (isNaN(n)) return "";
  return Math.max(0, Math.min(max, n));
}

const CIEMarksPage = ({ user }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const deptId    = user?.profile?.department?._id || user?.profile?.department;

  const [subjects,      setSubjects]      = useState([]);
  const [students,      setStudents]      = useState([]);
  const [academicYears, setAcYears]       = useState([]);
  const [semesters,     setSemesters]     = useState([]);

  const [selSubject, setSelSubject] = useState(searchParams.get("subject") || "");

  const handleSubjectChange = (id) => {
    setSelSubject(id);
    if (id) setSearchParams({ subject: id }, { replace: true });
    else setSearchParams({}, { replace: true });
  };
  const [selAcYear,  setSelAcYear]  = useState("");
  const [selSem,     setSelSem]     = useState("");

  const [marks,   setMarks]   = useState({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [computing, setComputing] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [toast,   setToast]   = useState("");

  const showToast = (m, err) => {
    setToast({ msg: m, err: !!err });
    setTimeout(() => setToast(""), 3500);
  };

  // Load dropdowns + students on mount
  useEffect(() => {
    const params = deptId ? { department: deptId } : {};
    Promise.all([
      subjectsApi.list({ ...params, type: "theory" }),
      studentsApi.list(params),
      academicYearsApi.list(),
      semestersApi.list(),
    ])
      .then(([subs, studs, ayears, sems]) => {
        setSubjects(subs);
        setStudents(studs);
        setAcYears(ayears);
        setSemesters(sems);
        const init = {};
        studs.forEach(s => { init[s._id] = { ie1:"", ie2:"", la:"", dda:"", lt:"", cieTheory:"", totalCIE:"", isFinal:false }; });
        setMarks(init);
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
        cieMarksApi.getForStudent(s._id, selSubject)
          .then(cm => ({ id: s._id, cm }))
          .catch(() => ({ id: s._id, cm: null }))
      )
    ).then(results => {
      const m = {};
      results.forEach(({ id, cm }) => {
        m[id] = {
          ie1:      cm?.IE1?.marks  ?? "",
          ie2:      cm?.IE2?.marks  ?? "",
          la:       cm?.LA?.marks   ?? "",
          dda:      cm?.DDA?.marks  ?? "",
          lt:       cm?.LT?.marks   ?? "",
          cieTheory:cm?.cieTheory   ?? "",
          totalCIE: cm?.totalCIE    ?? "",
          isFinal:  cm?.isFinal     || false,
        };
      });
      setMarks(m);
      setSaved(false);
    });
  }, [selSubject, students]);

  const updateMark = (sid, key, val) => {
    setSaved(false);
    const col = COLS.find(c => c.key === key);
    const clamped = val === "" ? "" : clamp(val, col?.max ?? 100);
    setMarks(p => ({ ...p, [sid]: { ...p[sid], [key]: clamped } }));
  };

  const handleSave = async () => {
    if (!selSubject) { showToast("Select a subject first.", true); return; }
    if (!selAcYear)  { showToast("Select an academic year.", true); return; }
    setSaving(true);
    const failures = [];
    await Promise.all(
      students.map(async s => {
        const m = marks[s._id];
        if (!m) return;
        const hasAny = COLS.some(c => m[c.key] !== "");
        if (!hasAny) return;
        try {
          await cieMarksApi.update(s._id, selSubject, {
            IE1: { marks: +m.ie1 || 0 },
            IE2: { marks: +m.ie2 || 0 },
            LA:  { marks: +m.la  || 0 },
            DDA: { marks: +m.dda || 0 },
            LT:  { marks: +m.lt  || 0 },
            academicYear: selAcYear,
            semester: selSem || undefined,
          });
        } catch {
          failures.push(s.rollNumber || s.name);
        }
      })
    );
    setSaving(false);
    if (failures.length) {
      showToast(`Failed for: ${failures.slice(0,3).join(", ")}${failures.length > 3 ? "…" : ""}`, true);
    } else {
      setSaved(true);
      showToast("CIE marks saved successfully!");
    }
  };

  const handleCompute = async () => {
    if (!selSubject) { showToast("Select a subject first.", true); return; }
    setComputing(true);
    try {
      await cieMarksApi.compute({
        subjectId:    selSubject,
        academicYear: selAcYear || undefined,
        semester:     selSem    || undefined,
      });
      // Reload computed values
      const results = await Promise.all(
        students.map(s =>
          cieMarksApi.getForStudent(s._id, selSubject)
            .then(cm => ({ id: s._id, cm }))
            .catch(() => ({ id: s._id, cm: null }))
        )
      );
      setMarks(prev => {
        const next = { ...prev };
        results.forEach(({ id, cm }) => {
          if (cm) next[id] = { ...next[id], cieTheory: cm.cieTheory ?? "", totalCIE: cm.totalCIE ?? "", isFinal: cm.isFinal || false };
        });
        return next;
      });
      showToast("CIE totals computed successfully!");
    } catch {
      showToast("Compute failed. Ensure marks are saved first.", true);
    } finally {
      setComputing(false);
    }
  };

  const anyWithMarks = students.filter(s => COLS.some(c => marks[s._id]?.[c.key] !== "")).length;

  return (
    <div className="page-anim">
      <Breadcrumb items={["Faculty", "CIE Marks"]} />

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:18, color:C.text, marginBottom:4 }}>CIE Marks Entry</div>
          <div style={{ fontSize:13, color:C.sub }}>Enter IE-1, IE-2 (max 50 each) and LA, DDA, LT (max 10 each) per student. Click Compute to calculate totals.</div>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          <select value={selSubject} onChange={e => handleSubjectChange(e.target.value)}
            style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, color:C.text, fontFamily:"inherit", background:"#fff", cursor:"pointer", minWidth:200 }}>
            <option value="">Select Subject</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.title} ({s.courseCode})</option>)}
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
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:18 }}>
        {[
          ["Total Students", students.length,  C.navy],
          ["Marks Entered",  anyWithMarks,      C.green],
          ["Pending",        students.length - anyWithMarks, C.gold],
          ["Finalised",      students.filter(s => marks[s._id]?.isFinal).length, C.blue],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px", borderTop:`3px solid ${c}`, boxShadow:"0 2px 6px rgba(0,35,102,0.05)" }}>
            <div style={{ fontSize:10, color:C.sub, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:22, fontWeight:800, color:c }}>{loading ? "…" : v}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,35,102,0.06)" }}>
        <div style={{ background:C.navy, padding:"11px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <span style={{ fontWeight:800, fontSize:14, color:"#fff" }}>
            {selSubject ? (subjects.find(s => s._id === selSubject)?.title || "CIE Marks") : "Select a subject above"}
          </span>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {saved && <span style={{ background:"#e6f7ef", color:C.green, padding:"3px 12px", borderRadius:99, fontSize:11, fontWeight:700 }}>✓ Saved</span>}
            <button onClick={handleCompute} disabled={computing || !selSubject}
              style={{ background:`linear-gradient(135deg,${C.purple},#5b21b6)`, color:"#fff", border:"none", borderRadius:7, padding:"7px 16px", fontSize:12, fontWeight:700, cursor:computing||!selSubject?"not-allowed":"pointer", fontFamily:"inherit", opacity:computing||!selSubject?0.7:1 }}>
              {computing ? "Computing…" : "⚡ Compute Totals"}
            </button>
            <button onClick={handleSave} disabled={saving || !selSubject}
              style={{ background:`linear-gradient(135deg,${C.navy},${C.blue})`, color:"#fff", border:"none", borderRadius:7, padding:"7px 16px", fontSize:12, fontWeight:700, cursor:saving||!selSubject?"not-allowed":"pointer", fontFamily:"inherit", opacity:saving||!selSubject?0.7:1 }}>
              {saving ? "Saving…" : "💾 Save Marks"}
            </button>
          </div>
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
                  <th style={th({ textAlign:"left", paddingLeft:16, minWidth:100, background:"#1e3a5f" })}>Roll No.</th>
                  <th style={th({ textAlign:"left", minWidth:140, background:"#1e3a5f" })}>Student Name</th>
                  {COLS.map(col => (
                    <th key={col.key} style={th({ background:col.key.startsWith("ie") ? "#0d4a8a" : "#145a8a" })}>
                      <div>{col.label}</div>
                      <div style={{ fontSize:9, color:"rgba(255,255,255,0.6)", fontWeight:400 }}>Max {col.max}</div>
                    </th>
                  ))}
                  <th style={th({ background:"#0a3d6b", minWidth:80 })}>
                    <div>CIE Theory</div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.6)", fontWeight:400 }}>Max 30</div>
                  </th>
                  <th style={th({ background:"#0a3d6b", minWidth:80 })}>
                    <div>Total CIE</div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.6)", fontWeight:400 }}>Max 60</div>
                  </th>
                  <th style={th({ background:"#062a50", minWidth:80 })}>Status</th>
                </tr>
                <tr>
                  <td colSpan={2} style={td({ background:"#fff4e0", fontWeight:800, fontSize:11, color:"#92400e", textAlign:"left", paddingLeft:16 })}>Max Marks →</td>
                  {COLS.map(col => (
                    <td key={col.key} style={td({ background:"#fff4e0", fontWeight:900, fontSize:14, color:"#92400e" })}>{col.max}</td>
                  ))}
                  <td style={td({ background:"#fff4e0", fontWeight:900, fontSize:14, color:"#92400e" })}>30</td>
                  <td style={td({ background:"#fff4e0", fontWeight:900, fontSize:14, color:"#92400e" })}>60</td>
                  <td style={td({ background:"#fff4e0" })}></td>
                </tr>
              </thead>
              <tbody>
                {students.map((stu, ri) => {
                  const m      = marks[stu._id] || {};
                  const anyEntered = COLS.some(c => m[c.key] !== "");
                  const theory = m.cieTheory !== "" ? m.cieTheory : null;
                  const total  = m.totalCIE  !== "" ? m.totalCIE  : null;
                  return (
                    <tr key={stu._id} style={{ background:ri%2===0?"#fff":"#fafbff", borderBottom:`1px solid ${C.border}` }}>
                      <td style={td({ textAlign:"left", paddingLeft:16, fontWeight:700, color:C.navy })}>{stu.rollNumber}</td>
                      <td style={td({ textAlign:"left", color:C.text })}>{stu.name}</td>
                      {COLS.map(col => (
                        <td key={col.key} style={td({ background:col.bg })}>
                          <input
                            type="number" min={0} max={col.max}
                            value={m[col.key] ?? ""}
                            placeholder="—"
                            disabled={m.isFinal}
                            onChange={e => updateMark(stu._id, col.key, e.target.value)}
                            style={{ width:54, padding:"5px 6px", borderRadius:7, textAlign:"center", border:`1.5px solid ${m[col.key]!==""?col.bc:C.border}`, fontSize:14, fontWeight:700, color:C.navy, fontFamily:"inherit", background:"transparent", cursor:m.isFinal?"not-allowed":"text" }}
                          />
                        </td>
                      ))}
                      <td style={td({ fontWeight:700, color:theory!==null?C.purple:C.muted, background:"#f5f3ff" })}>
                        {theory !== null ? theory : "—"}
                      </td>
                      <td style={td({ fontWeight:800, fontSize:15, background:total!==null?(total>=36?"#f0fdf4":total>=24?"#fffbeb":"#fef2f2"):"#f9f9f9", color:total!==null?(total>=36?C.green:total>=24?C.gold:C.danger):C.muted })}>
                        {total !== null ? `${total}/60` : "—"}
                      </td>
                      <td style={td()}>
                        {m.isFinal ? (
                          <span style={{ background:"#e6f7ef", color:C.green, padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700 }}>Final</span>
                        ) : anyEntered ? (
                          <span style={{ background:"#fffbeb", color:C.gold, padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700 }}>Draft</span>
                        ) : (
                          <span style={{ background:"#f0f4fb", color:C.muted, padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700 }}>Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:"#f0f4fb" }}>
                  <td colSpan={2} style={td({ textAlign:"left", paddingLeft:16, fontWeight:800, color:C.navy })}>Class Average</td>
                  {COLS.map(col => {
                    const vals = students.map(s => marks[s._id]?.[col.key]).filter(v => v !== "" && v != null);
                    return <td key={col.key} style={td({ fontWeight:700, color:C.blue })}>{vals.length ? (vals.reduce((a,b)=>a+(+b),0)/vals.length).toFixed(1) : "—"}</td>;
                  })}
                  <td style={td({ fontWeight:700, color:C.purple })}>
                    {(() => { const vals = students.map(s=>marks[s._id]?.cieTheory).filter(v=>v!==""&&v!=null); return vals.length?(vals.reduce((a,b)=>a+(+b),0)/vals.length).toFixed(1):"—"; })()}
                  </td>
                  <td style={td({ fontWeight:700, color:C.green })}>
                    {(() => { const vals = students.map(s=>marks[s._id]?.totalCIE).filter(v=>v!==""&&v!=null); return vals.length?(vals.reduce((a,b)=>a+(+b),0)/vals.length).toFixed(1):"—"; })()}
                  </td>
                  <td style={td()}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div style={{ padding:"10px 18px", background:"#eaf3fb", borderTop:`1px solid ${C.border}`, fontSize:12.5, color:C.blue, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:16 }}>📝</span>
          <span>IE-1 &amp; IE-2 max 50 each. LA, DDA, LT max 10 each. <strong>Save</strong> marks, then <strong>Compute Totals</strong> to calculate CIE Theory (80% higher + 20% lower, scaled to 30) and Total CIE.</span>
        </div>
      </div>

      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, background:toast.err?C.danger:C.green, color:"#fff", padding:"12px 20px", borderRadius:10, fontSize:13.5, fontWeight:700, boxShadow:"0 8px 32px rgba(0,0,0,0.22)", zIndex:1100, maxWidth:400, lineHeight:1.5 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default CIEMarksPage;
