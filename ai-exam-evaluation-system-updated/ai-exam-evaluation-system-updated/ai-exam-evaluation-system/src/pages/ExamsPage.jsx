import { useState, useEffect } from "react";
import {
  examEvents as examEventsApi,
  colleges,
  departments,
  regulations,
  semesters,
  subjects,
  faculty,
  sections,
} from "../services/api.js";
import { Card, AUTable } from "../components/ui/Card";
import { GoldBtn, OutlineBtn } from "../components/ui/Buttons";
import Badge from "../components/ui/Badge";
import Breadcrumb from "../components/layout/Breadcrumb";
import Icon from "../components/ui/Icon";
import C from "../constants/colors";

// ── Cascade field order ────────────────────────────────────────────────────────
const CASCADE_ORDER = [
  "college", "regulation", "branch", "semester",
  "subject", "section", "faculty",
];

const EXAM_TYPES = ["IE1", "IE2", "SEE", "Mid-1", "Mid-2", "End-Sem", "Supplementary", "Lab Exam"];

// Static section fallback (sections are not filterable by subject in the API)
const STATIC_SECTIONS = ["A", "B", "C", "D"];

// ── Reset everything downstream when a parent changes ─────────────────────────
const useCascade = () => {
  const blank = Object.fromEntries(CASCADE_ORDER.map(f => [f, ""]));
  const [sel, setSel] = useState(blank);

  const pick = (field, value) => {
    setSel(prev => {
      const idx = CASCADE_ORDER.indexOf(field);
      const resets = Object.fromEntries(
        CASCADE_ORDER.slice(idx + 1).map(f => [f, ""])
      );
      return { ...prev, ...resets, [field]: value };
    });
  };

  const reset = () => setSel(blank);
  return { sel, pick, reset };
};

// ── Dynamic options via API calls ─────────────────────────────────────────────
const useOptions = (sel) => {
  const [collegeOpts,    setCollegeOpts]    = useState([]);
  const [regulationOpts, setRegulationOpts] = useState([]);
  const [branchOpts,     setBranchOpts]     = useState([]);
  const [semesterOpts,   setSemesterOpts]   = useState([]);
  const [subjectOpts,    setSubjectOpts]    = useState([]);
  const [sectionOpts,    setSectionOpts]    = useState([]);
  const [facultyOpts,    setFacultyOpts]    = useState([]);

  // Colleges — fetch once on mount
  useEffect(() => {
    colleges.list()
      .then(list => setCollegeOpts((list || []).map(c => ({ v: c._id, l: c.name }))))
      .catch(() => setCollegeOpts([]));
  }, []);

  // Departments + Regulations — fetch when college changes
  useEffect(() => {
    if (!sel.college) { setBranchOpts([]); setRegulationOpts([]); return; }
    departments.list({ college: sel.college })
      .then(list => setBranchOpts((list || []).map(d => ({ v: d._id, l: `${d.code || d.name} — ${d.name}` }))))
      .catch(() => setBranchOpts([]));
    regulations.list({ college: sel.college })
      .then(list => setRegulationOpts((list || []).map(r => ({ v: r._id, l: r.name }))))
      .catch(() => setRegulationOpts([]));
  }, [sel.college]);

  // Semesters — fetch when regulation changes
  useEffect(() => {
    if (!sel.regulation) { setSemesterOpts([]); return; }
    semesters.list({ regulation: sel.regulation })
      .then(list => setSemesterOpts((list || []).map(s => ({ v: s._id, l: `Semester ${s.number}` }))))
      .catch(() => setSemesterOpts([]));
  }, [sel.regulation]);

  // Subjects — fetch when branch + semester both selected
  useEffect(() => {
    if (!sel.branch || !sel.semester) { setSubjectOpts([]); return; }
    subjects.list({ department: sel.branch, semester: sel.semester })
      .then(list => setSubjectOpts((list || []).map(s => ({ v: s._id, l: `${s.name} (${s.code})` }))))
      .catch(() => setSubjectOpts([]));
  }, [sel.branch, sel.semester]);

  // Sections — use API if available, fall back to static list
  useEffect(() => {
    if (!sel.branch) { setSectionOpts([]); return; }
    sections.list({ department: sel.branch })
      .then(list => {
        if (list && list.length > 0) {
          setSectionOpts((list).map(s => ({ v: s._id, l: `Section ${s.name || s._id}` })));
        } else {
          setSectionOpts(STATIC_SECTIONS.map(s => ({ v: s, l: `Section ${s}` })));
        }
      })
      .catch(() => setSectionOpts(STATIC_SECTIONS.map(s => ({ v: s, l: `Section ${s}` }))));
  }, [sel.branch]);

  // Faculty — fetch when subject + branch both selected
  useEffect(() => {
    if (!sel.subject || !sel.branch) { setFacultyOpts([]); return; }
    faculty.list({ subject: sel.subject, department: sel.branch })
      .then(list => setFacultyOpts((list || []).map(f => ({ v: f._id, l: f.name }))))
      .catch(() => setFacultyOpts([]));
  }, [sel.subject, sel.branch]);

  return {
    college:    collegeOpts,
    regulation: regulationOpts,
    branch:     branchOpts,
    semester:   semesterOpts,
    subject:    subjectOpts,
    section:    sectionOpts,
    faculty:    facultyOpts,
  };
};

// ── Reusable themed select ────────────────────────────────────────────────────
const CascadeSelect = ({ label, value, onChange, options, disabled, required }) => {
  const isReady = !disabled;
  return (
    <div>
      <label style={{
        display: "block",
        fontSize: "11px",
        fontWeight: 700,
        color: C.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: "5px",
      }}>
        {label}
        {required && <span style={{ color: C.gold, marginLeft: "3px" }}>*</span>}
      </label>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={!isReady}
          style={{
            width: "100%",
            background: isReady ? C.white : C.bg,
            border: `1px solid ${value ? C.navy : C.border}`,
            borderLeft: value ? `3px solid ${C.gold}` : `1px solid ${C.border}`,
            padding: "9px 32px 9px 10px",
            borderRadius: "5px",
            fontSize: "13px",
            color: value ? C.text : C.textMuted,
            cursor: isReady ? "pointer" : "not-allowed",
            opacity: isReady ? 1 : 0.55,
            appearance: "none",
            WebkitAppearance: "none",
            transition: "border-color 0.15s",
            outline: "none",
          }}
          onFocus={e => (e.target.style.borderColor = C.gold)}
          onBlur={e => (e.target.style.borderColor = value ? C.navy : C.border)}
        >
          <option value="">
            {isReady ? `Select ${label}` : `— select ${CASCADE_ORDER[Math.max(0, CASCADE_ORDER.indexOf(label.toLowerCase().replace(/ /g,"")))-1]} first —`}
          </option>
          {options.map(o => (
            <option key={o.v} value={o.v}>{o.l}</option>
          ))}
        </select>
        {/* dropdown arrow */}
        <span style={{
          position: "absolute", right: "10px", top: "50%",
          transform: "translateY(-50%)", pointerEvents: "none",
          color: isReady ? C.navy : C.textMuted, fontSize: "10px",
        }}>▼</span>
      </div>
    </div>
  );
};

// ── Step indicator strip ──────────────────────────────────────────────────────
const StepStrip = ({ sel }) => {
  const steps = [
    { key: "college",    label: "College"    },
    { key: "regulation", label: "Regulation" },
    { key: "branch",     label: "Branch"     },
    { key: "semester",   label: "Semester"   },
    { key: "subject",    label: "Subject"    },
    { key: "section",    label: "Section"    },
    { key: "faculty",    label: "Faculty"    },
  ];

  const doneCount = steps.filter(s => sel[s.key]).length;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0",
      marginBottom: "20px",
      padding: "10px 14px",
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: "6px",
      overflowX: "auto",
    }}>
      {steps.map((s, i) => {
        const done = !!sel[s.key];
        const active = done && (i === steps.length - 1 || !sel[steps[i + 1]?.key]);
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{
                width: "22px", height: "22px", borderRadius: "50%",
                background: done ? C.navy : C.borderLight,
                border : active ? C.gold : done ? C.navy : C.borderLight,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "10px", fontWeight: 800,
                color: done ? C.white : C.textMuted,
                flexShrink: 0,
              }}>
                {done ? "✓" : i + 1}
              </div>
              <div>
                <div style={{ fontSize: "9px", color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                {sel[s.key] && (
                  <div style={{ fontSize: "11px", fontWeight: 700, color: C.navy, maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {sel[s.key]}
                  </div>
                )}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: "24px", height: "2px",
                background: done ? C.gold : C.borderLight,
                margin: "0 4px", flexShrink: 0,
              }} />
            )}
          </div>
        );
      })}

      <div style={{ marginLeft: "auto", paddingLeft: "16px", flexShrink: 0 }}>
        <span style={{ fontSize: "11px", color: C.textMuted }}>{doneCount}/7 fields</span>
        {doneCount === 7 && (
          <span style={{
            marginLeft: "8px", background: C.successBg, color: C.success,
            border: "1px solid #b7e4c9", padding: "2px 8px", borderRadius: "4px",
            fontSize: "10px", fontWeight: 700,
          }}>READY</span>
        )}
      </div>
    </div>
  );
};

// ── Text / Date / Number input ────────────────────────────────────────────────
const FieldInput = ({ label, type = "text", value, onChange, placeholder, required }) => (
  <div>
    <label style={{
      display: "block", fontSize: "11px", fontWeight: 700, color: C.textMuted,
      textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px",
    }}>
      {label}
      {required && <span style={{ color: C.gold, marginLeft: "3px" }}>*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || label}
      style={{
        width: "100%", background: C.white, border: `1px solid ${C.border}`,
        padding: "9px 10px", borderRadius: "5px", fontSize: "13px", color: C.text,
        outline: "none",
      }}
      onFocus={e => (e.target.style.borderColor = C.gold)}
      onBlur={e => (e.target.style.borderColor = C.border)}
    />
  </div>
);

// ── CREATE EXAM FORM ──────────────────────────────────────────────────────────
const CreateExamForm = ({ onClose, toast }) => {
  const { sel, pick, reset } = useCascade();
  const opts = useOptions(sel);
  const [examType, setExamType] = useState("");
  const [examDate, setExamDate] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [duration, setDuration] = useState("");

  const cascadeReady = CASCADE_ORDER.every(f => sel[f]);
  const formReady = cascadeReady && examType && examDate && maxMarks && duration;

  const handleSubmit = async () => {
    if (!formReady) return;
    try {
      await examEventsApi.create({
        type: ["End-Sem", "SEE", "Supplementary"].includes(examType) ? "external" : "internal",
        examType: examType,
        title: `${sel.subject} - ${examType}`,
        examDate,
        department: sel.branch,
        regulation: sel.regulation,
        semester: sel.semester,
        subject: sel.subject,
        section: sel.section,
        assignedTo: sel.faculty,
      }).catch(() => {}); // proceed even if API fails (offline mode)
      toast(`Examination created — ${examType}`);
    } catch {}
    reset();
    setExamType(""); setExamDate(""); setMaxMarks(""); setDuration("");
    onClose();
  };

  return (
    <Card
      title="Create New Examination"
      style={{ marginBottom: "16px", borderTop: `3px solid ${C.gold}` }}
    >
      {/* Step tracker */}
      <StepStrip sel={sel} />

      {/* ── Row 1: College + Regulation ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "14px", marginBottom: "14px",
      }}>
        <CascadeSelect
          label="College"
          value={sel.college}
          onChange={v => pick("college", v)}
          options={opts.college}
          disabled={false}
          required
        />
        <CascadeSelect
          label="Regulation"
          value={sel.regulation}
          onChange={v => pick("regulation", v)}
          options={opts.regulation}
          disabled={!sel.college}
          required
        />
      </div>

      {/* ── Row 2: Branch + Semester ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "14px", marginBottom: "14px",
      }}>
        <CascadeSelect
          label="Branch"
          value={sel.branch}
          onChange={v => pick("branch", v)}
          options={opts.branch}
          disabled={!sel.regulation}
          required
        />
        <CascadeSelect
          label="Semester"
          value={sel.semester}
          onChange={v => pick("semester", v)}
          options={opts.semester}
          disabled={!sel.branch}
          required
        />
      </div>

      {/* ── Row 3: Subject + Section ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "14px", marginBottom: "14px",
      }}>
        <CascadeSelect
          label="Subject"
          value={sel.subject}
          onChange={v => pick("subject", v)}
          options={opts.subject}
          disabled={!sel.semester}
          required
        />
        <CascadeSelect
          label="Section"
          value={sel.section}
          onChange={v => pick("section", v)}
          options={opts.section}
          disabled={!sel.subject}
          required
        />
      </div>

      {/* ── Row 4: Faculty (full width) ── */}
      <div style={{ marginBottom: "14px" }}>
        <CascadeSelect
          label="Assigned Faculty (Evaluator)"
          value={sel.faculty}
          onChange={v => pick("faculty", v)}
          options={opts.faculty}
          disabled={!sel.section}
          required
        />
        {sel.subject && opts.faculty.length === 0 && (
          <p style={{ fontSize: "11px", color: C.warning, marginTop: "4px" }}>
            ⚠ No faculty mapped to this subject. Please assign from User Management first.
          </p>
        )}
      </div>

      {/* ── Divider with label ── */}
      {cascadeReady && (
        <>
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            margin: "16px 0", color: C.textMuted,
          }}>
            <div style={{ flex: 1, height: "1px", background: C.borderLight }} />
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Exam Details
            </span>
            <div style={{ flex: 1, height: "1px", background: C.borderLight }} />
          </div>

          {/* ── Row 5: Exam Type + Date + MaxMarks + Duration ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: "14px", marginBottom: "16px",
          }}>
            {/* Exam Type select */}
            <div>
              <label style={{
                display: "block", fontSize: "11px", fontWeight: 700, color: C.textMuted,
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px",
              }}>
                Exam Type <span style={{ color: C.gold }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <select
                  value={examType}
                  onChange={e => setExamType(e.target.value)}
                  style={{
                    width: "100%", background: C.white, border: `1px solid ${C.border}`,
                    padding: "9px 32px 9px 10px", borderRadius: "5px", fontSize: "13px",
                    color: examType ? C.text : C.textMuted, appearance: "none", outline: "none",
                  }}
                >
                  <option value="">Select Type</option>
                  {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.navy, fontSize: "10px" }}>▼</span>
              </div>
            </div>

            <FieldInput label="Exam Date"   type="date"   value={examDate}  onChange={setExamDate}  required />
            <FieldInput label="Max Marks"   type="number" value={maxMarks}  onChange={setMaxMarks}  placeholder="e.g. 30" required />
            <FieldInput label="Duration (mins)" type="number" value={duration} onChange={setDuration} placeholder="e.g. 90" required />
          </div>

          {/* ── Summary chip row ── */}
          <div style={{
            background: C.blueLight, border: `1px solid ${C.border}`,
            borderRadius: "6px", padding: "12px 14px", marginBottom: "16px",
            display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center",
          }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: C.navy, marginRight: "4px" }}>SUMMARY:</span>
            {[
              opts.college.find(o => o.v === sel.college)?.l || sel.college,
              opts.regulation.find(o => o.v === sel.regulation)?.l || sel.regulation,
              opts.branch.find(o => o.v === sel.branch)?.l || sel.branch,
              `Sem-${opts.semester.find(o => o.v === sel.semester)?.l || sel.semester}`,
              opts.subject.find(o => o.v === sel.subject)?.l || sel.subject,
              `Sec-${sel.section}`,
              examType || "—",
              opts.faculty.find(o => o.v === sel.faculty)?.l || sel.faculty || "—",
            ].map((v, i) => (
              <span key={i} style={{
                background: C.white, border: `1px solid ${C.border}`,
                borderRadius: "4px", padding: "2px 8px", fontSize: "11px",
                color: C.textMid, fontWeight: 600,
              }}>{v}</span>
            ))}
          </div>
        </>
      )}

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <GoldBtn
          onClick={handleSubmit}
          style={{ opacity: formReady ? 1 : 0.5, cursor: formReady ? "pointer" : "not-allowed" }}
        >
          <Icon name="plus" size={14} color="#fff" /> Create Examination
        </GoldBtn>
        <OutlineBtn onClick={() => { reset(); onClose(); }}>Cancel</OutlineBtn>
        {!formReady && (
          <span style={{ fontSize: "11px", color: C.textMuted, marginLeft: "4px" }}>
            {!cascadeReady
              ? `Complete ${7 - CASCADE_ORDER.filter(f => sel[f]).length} more cascade field(s)`
              : "Fill in exam details to continue"}
          </span>
        )}
      </div>
    </Card>
  );
};

// ── Exam Detail Modal ─────────────────────────────────────────────────────────
const ExamDetailModal = ({ exam, onClose }) => {
  const row = (label, value) => (
    <div style={{ display: "flex", gap: "12px", padding: "8px 0", borderBottom: `1px solid ${C.borderLight}` }}>
      <span style={{ minWidth: "140px", fontSize: "11px", fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      <span style={{ fontSize: "13px", color: C.text, fontWeight: 600 }}>{value || "—"}</span>
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,50,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
    }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 10, padding: 28, width: 540, maxWidth: "92vw",
          boxShadow: "0 20px 60px rgba(0,0,50,0.3)", maxHeight: "80vh", overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>
            Exam Details
          </div>
          <OutlineBtn onClick={onClose} style={{ fontSize: "11px", padding: "4px 12px" }}>Close</OutlineBtn>
        </div>

        {row("Title",        exam.title || exam.subjects?.[0]?.title)}
        {row("Exam Type",    exam.examType || exam.type)}
        {row("Status",       exam.status)}
        {row("College",      exam.college?.name)}
        {row("Department",   exam.department?.name || exam.department?.code)}
        {row("Semester",     exam.semester?.number ? `Semester ${exam.semester.number}` : exam.semester?.name)}
        {row("Section",      exam.section)}
        {row("Subject",      exam.subjects?.[0]?.title || exam.subjects?.[0]?.name)}
        {row("Course Code",  exam.subjects?.[0]?.courseCode)}
        {row("Regulation",   exam.regulation?.name || exam.regulation?.code)}
        {row("Assigned To",  exam.assignedTo?.name)}
        {row("Exam Date",    exam.startDate ? new Date(exam.startDate).toLocaleDateString() : null)}
        {row("Max Marks",    exam.maxMarks)}
        {row("Duration",     exam.duration ? `${exam.duration} mins` : null)}
        {row("Total Sheets", exam.totalBooklets)}
        {row("Evaluated",    exam.evaluatedBooklets)}
        {row("Academic Year",exam.academicYear?.name || exam.academicYear?.year)}
      </div>
    </div>
  );
};

// ── EDIT EXAM MODAL ───────────────────────────────────────────────────────────
const EXAM_STATUSES = ["upcoming","active","completed","cancelled"];

const EditExamModal = ({ exam, onClose, onSaved, toast }) => {
  const [examType, setExamType] = useState(exam.examType || exam.type || "");
  const [examDate, setExamDate] = useState(exam.startDate ? exam.startDate.slice(0,10) : "");
  const [maxMarks, setMaxMarks] = useState(exam.maxMarks || "");
  const [duration, setDuration] = useState(exam.duration || "");
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await examEventsApi.update(exam._id, {
        examType, startDate: examDate || undefined,
        maxMarks: maxMarks ? +maxMarks : undefined,
        duration: duration ? +duration : undefined,
      });
      toast && toast("Exam event updated.");
      onSaved(updated || { ...exam, examType, maxMarks: +maxMarks, duration: +duration });
      onClose();
    } catch (err) {
      toast && toast(err.message || "Update failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,50,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999 }}
      onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:10, padding:28, width:500, maxWidth:"92vw", boxShadow:"0 20px 60px rgba(0,0,50,0.3)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:16, color:C.navy }}>Edit Exam Event</div>
          <OutlineBtn onClick={onClose} style={{ fontSize:"11px", padding:"4px 12px" }}>Cancel</OutlineBtn>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
          <FieldInput label="Exam Date" type="date" value={examDate} onChange={setExamDate} />
          <div>
            <label style={{ display:"block", fontSize:"11px", fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>
              Exam Type
            </label>
            <select value={examType} onChange={e=>setExamType(e.target.value)}
              style={{ width:"100%", background:C.white, border:`1px solid ${C.border}`, padding:"9px 10px", borderRadius:5, fontSize:13, color:C.text, outline:"none" }}>
              <option value="">Select Type</option>
              {EXAM_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <FieldInput label="Max Marks" type="number" value={maxMarks} onChange={setMaxMarks} placeholder="e.g. 30" />
          <FieldInput label="Duration (mins)" type="number" value={duration} onChange={setDuration} placeholder="e.g. 90" />
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <GoldBtn onClick={handleSave} style={{ opacity:saving?0.7:1, cursor:saving?"not-allowed":"pointer" }}>
            {saving ? "Saving…" : "Save Changes"}
          </GoldBtn>
          <OutlineBtn onClick={onClose}>Cancel</OutlineBtn>
        </div>
      </div>
    </div>
  );
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
const ExamsPage = ({ toast }) => {
  const [show,       setShow]      = useState(false);
  const [exams,      setExams]     = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [viewExam,   setViewExam]  = useState(null);
  const [editExam,   setEditExam]  = useState(null);
  const [statusMap,  setStatusMap] = useState({});

  useEffect(() => {
    examEventsApi.list()
      .then(list => setExams(Array.isArray(list) ? list : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id, status) => {
    setStatusMap(p => ({ ...p, [id]: status }));
    try {
      await examEventsApi.updateStatus(id, status);
      setExams(prev => prev.map(e => e._id === id ? { ...e, status } : e));
      toast && toast(`Status updated to "${status}".`);
    } catch (err) {
      toast && toast(err.message || "Status update failed.", "error");
      setStatusMap(p => { const n={...p}; delete n[id]; return n; });
    }
  };

  const handleSaved = (updated) => {
    setExams(prev => prev.map(e => e._id === updated._id ? { ...e, ...updated } : e));
  };

  return (
    <div className="page-anim">
      <Breadcrumb items={["Exam Cell", "Examinations"]} />

      {viewExam && <ExamDetailModal exam={viewExam} onClose={() => setViewExam(null)} />}
      {editExam  && <EditExamModal exam={editExam} onClose={() => setEditExam(null)} onSaved={handleSaved} toast={toast} />}

      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: "16px",
      }}>
        <p style={{ fontSize: "13px", color: C.textMuted }}>
          Manage all examinations and assign faculty evaluators.
        </p>
        <GoldBtn onClick={() => setShow(s => !s)}>
          <Icon name="plus" size={14} color="#fff" />
          {show ? "Close Form" : "Create Exam"}
        </GoldBtn>
      </div>

      {show && <CreateExamForm onClose={() => setShow(false)} toast={toast} />}

      {/* ── Exams table ── */}
      <Card title="All Examinations">
        <AUTable
          cols={[
            "Dept", "Subject", "Sec", "Sem",
            "Type", "Date", "Sheets", "Evaluated", "Status", "Actions",
          ]}
        >
          {loading ? (
            <tr><td colSpan={10} style={{ textAlign:"center", color:C.textMuted, padding:"20px", fontSize:"13px" }}>Loading examinations…</td></tr>
          ) : exams.length === 0 ? (
            <tr><td colSpan={10} style={{ textAlign:"center", color:C.textMuted, padding:"20px", fontSize:"13px" }}>No examinations found. Create one above.</td></tr>
          ) : exams.map((e) => {
            const curStatus = statusMap[e._id] || e.status || "upcoming";
            return (
              <tr key={e._id}>
                <td><Badge text={e.department?.code || e.department?.name || "—"} type="navy" /></td>
                <td style={{ fontWeight:700, color:C.text, fontSize:13 }}>
                  {e.title || e.subjects?.[0]?.title || e.subject?.title || "—"}
                  <div style={{ fontSize:10, color:C.textMuted, fontWeight:400 }}>{e.subjects?.[0]?.courseCode || e.subject?.courseCode || ""}</div>
                </td>
                <td>{e.section || "—"}</td>
                <td>{e.semester?.number || e.semester?.name || "—"}</td>
                <td><Badge text={e.examType || e.type || "—"} type="gold" /></td>
                <td style={{ fontSize:12, color:C.textMid }}>
                  {e.startDate ? new Date(e.startDate).toLocaleDateString() : "—"}
                </td>
                <td style={{ fontWeight:600 }}>{e.totalBooklets ?? "—"}</td>
                <td style={{ fontWeight:700, color:C.warning }}>{e.evaluatedBooklets ?? "—"}</td>
                <td>
                  <select value={curStatus} onChange={ev => handleStatusChange(e._id, ev.target.value)}
                    style={{ padding:"3px 7px", borderRadius:5, border:`1.5px solid ${curStatus==="completed"?C.success:curStatus==="active"?C.warning:curStatus==="cancelled"?C.danger:C.border}`, fontSize:11, fontWeight:700, color:curStatus==="completed"?C.success:curStatus==="active"?C.warning:curStatus==="cancelled"?C.danger:C.textMid, background:"#fff", cursor:"pointer", fontFamily:"inherit", outline:"none" }}>
                    {EXAM_STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </td>
                <td>
                  <div style={{ display:"flex", gap:5 }}>
                    <OutlineBtn style={{ fontSize:"11px", padding:"4px 10px" }} onClick={() => setViewExam(e)}>View</OutlineBtn>
                    <button onClick={() => setEditExam(e)}
                      style={{ background:C.blueLight, border:`1px solid ${C.border}`, color:C.navy, borderRadius:5, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </AUTable>
      </Card>
    </div>
  );
};

export default ExamsPage;
