import { useState, useEffect } from "react";
import {
  examEvents as examEventsApi,
  colleges,
  departments,
  regulations,
  semesters,
  subjects,
  faculty,
  academicYears as academicYearsApi,
} from "../services/api.js";
import { Card, AUTable } from "../components/ui/Card";
import { GoldBtn, OutlineBtn } from "../components/ui/Buttons";
import Badge from "../components/ui/Badge";
import Breadcrumb from "../components/layout/Breadcrumb";
import Icon from "../components/ui/Icon";
import C from "../constants/colors";

// Cascade: college → regulation → branch → semester → subject
const CASCADE_ORDER = ["college", "regulation", "branch", "semester", "subject"];

const EXAM_TYPES = ["IE1", "IE2", "SEE", "Mid-1", "Mid-2", "End-Sem", "Supplementary", "Lab Exam"];
const EXAM_STATUSES = ["upcoming", "active", "completed", "cancelled"];

// Reset downstream when a parent changes
const useCascade = () => {
  const blank = Object.fromEntries(CASCADE_ORDER.map(f => [f, ""]));
  const [sel, setSel] = useState(blank);

  const pick = (field, value) => {
    setSel(prev => {
      const idx = CASCADE_ORDER.indexOf(field);
      const resets = Object.fromEntries(CASCADE_ORDER.slice(idx + 1).map(f => [f, ""]));
      return { ...prev, ...resets, [field]: value };
    });
  };

  const reset = () => setSel(blank);
  return { sel, pick, reset };
};

// Dynamic options via API
const useOptions = (sel) => {
  const [collegeOpts,    setCollegeOpts]    = useState([]);
  const [regulationOpts, setRegulationOpts] = useState([]);
  const [branchOpts,     setBranchOpts]     = useState([]);
  const [semesterOpts,   setSemesterOpts]   = useState([]);
  const [subjectOpts,    setSubjectOpts]    = useState([]);

  useEffect(() => {
    colleges.list()
      .then(list => setCollegeOpts((list || []).map(c => ({ v: c._id, l: c.name }))))
      .catch(() => setCollegeOpts([]));
  }, []);

  useEffect(() => {
    if (!sel.college) { setBranchOpts([]); setRegulationOpts([]); return; }
    departments.list({ college: sel.college })
      .then(list => setBranchOpts((list || []).map(d => ({ v: d._id, l: `${d.code || d.name} — ${d.name}` }))))
      .catch(() => setBranchOpts([]));
    regulations.list({ college: sel.college })
      .then(list => setRegulationOpts((list || []).map(r => ({ v: r._id, l: r.name }))))
      .catch(() => setRegulationOpts([]));
  }, [sel.college]);

  useEffect(() => {
    if (!sel.regulation) { setSemesterOpts([]); return; }
    semesters.list({ regulation: sel.regulation })
      .then(list => setSemesterOpts((list || []).map(s => ({ v: s._id, l: `Semester ${s.number}` }))))
      .catch(() => setSemesterOpts([]));
  }, [sel.regulation]);

  useEffect(() => {
    if (!sel.branch || !sel.semester) { setSubjectOpts([]); return; }
    subjects.list({ department: sel.branch, semester: sel.semester })
      .then(list => setSubjectOpts((list || []).map(s => ({ v: s._id, l: `${s.title || s.name} (${s.courseCode || s.code})` }))))
      .catch(() => setSubjectOpts([]));
  }, [sel.branch, sel.semester]);

  return { college: collegeOpts, regulation: regulationOpts, branch: branchOpts, semester: semesterOpts, subject: subjectOpts };
};

// Reusable themed select
const CascadeSelect = ({ label, value, onChange, options, disabled, required }) => {
  const isReady = !disabled;
  return (
    <div>
      <label style={{
        display: "block", fontSize: "11px", fontWeight: 700, color: C.textMuted,
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px",
      }}>
        {label}{required && <span style={{ color: C.gold, marginLeft: "3px" }}>*</span>}
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
            borderRadius: "5px", fontSize: "13px",
            color: value ? C.text : C.textMuted,
            cursor: isReady ? "pointer" : "not-allowed",
            opacity: isReady ? 1 : 0.55,
            appearance: "none", WebkitAppearance: "none",
            transition: "border-color 0.15s", outline: "none",
          }}
          onFocus={e => (e.target.style.borderColor = C.gold)}
          onBlur={e => (e.target.style.borderColor = value ? C.navy : C.border)}
        >
          <option value="">{isReady ? `Select ${label}` : "— select parent first —"}</option>
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <span style={{
          position: "absolute", right: "10px", top: "50%",
          transform: "translateY(-50%)", pointerEvents: "none",
          color: isReady ? C.navy : C.textMuted, fontSize: "10px",
        }}>▼</span>
      </div>
    </div>
  );
};

// Step indicator (5 steps: college → regulation → branch → semester → subject)
const StepStrip = ({ sel }) => {
  const steps = [
    { key: "college",    label: "College"    },
    { key: "regulation", label: "Regulation" },
    { key: "branch",     label: "Branch"     },
    { key: "semester",   label: "Semester"   },
    { key: "subject",    label: "Subject"    },
  ];
  const doneCount = steps.filter(s => sel[s.key]).length;
  return (
    <div style={{
      display: "flex", alignItems: "center", marginBottom: "20px",
      padding: "10px 14px", background: C.bg,
      border: `1px solid ${C.border}`, borderRadius: "6px", overflowX: "auto",
    }}>
      {steps.map((s, i) => {
        const done = !!sel[s.key];
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{
                width: "22px", height: "22px", borderRadius: "50%",
                background: done ? C.navy : C.borderLight,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "10px", fontWeight: 800,
                color: done ? C.white : C.textMuted, flexShrink: 0,
              }}>
                {done ? "✓" : i + 1}
              </div>
              <div style={{ fontSize: "9px", color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {s.label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: "24px", height: "2px", background: done ? C.gold : C.borderLight, margin: "0 6px", flexShrink: 0 }} />
            )}
          </div>
        );
      })}
      <div style={{ marginLeft: "auto", paddingLeft: "16px", flexShrink: 0 }}>
        <span style={{ fontSize: "11px", color: C.textMuted }}>{doneCount}/5 fields</span>
        {doneCount === 5 && (
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

// Text / Date / Number input
const FieldInput = ({ label, type = "text", value, onChange, placeholder, required }) => (
  <div>
    <label style={{
      display: "block", fontSize: "11px", fontWeight: 700, color: C.textMuted,
      textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px",
    }}>
      {label}{required && <span style={{ color: C.gold, marginLeft: "3px" }}>*</span>}
    </label>
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder || label}
      style={{
        width: "100%", background: C.white, border: `1px solid ${C.border}`,
        padding: "9px 10px", borderRadius: "5px", fontSize: "13px",
        color: C.text, outline: "none", boxSizing: "border-box",
      }}
      onFocus={e => (e.target.style.borderColor = C.gold)}
      onBlur={e => (e.target.style.borderColor = C.border)}
    />
  </div>
);

// CREATE EXAM FORM
const CreateExamForm = ({ onClose, toast }) => {
  const { sel, pick, reset } = useCascade();
  const opts = useOptions(sel);

  const [coordinator,      setCoordinator]      = useState(null);
  const [coordLoading,     setCoordLoading]     = useState(false);
  const [examType,         setExamType]         = useState("");
  const [examDate,         setExamDate]         = useState("");
  const [maxMarks,         setMaxMarks]         = useState("");
  const [duration,         setDuration]         = useState("");
  const [academicYear,     setAcademicYear]     = useState("");
  const [academicYearOpts, setAcademicYearOpts] = useState([]);
  const [submitting,       setSubmitting]       = useState(false);

  useEffect(() => {
    academicYearsApi.list()
      .then(list => {
        const arr = Array.isArray(list) ? list : list.data || [];
        setAcademicYearOpts(arr);
        if (arr.length === 1) setAcademicYear(arr[0]._id);
      })
      .catch(() => {});
  }, []);

  // Auto-fetch coordinator when subject + branch are selected
  useEffect(() => {
    if (!sel.subject || !sel.branch) { setCoordinator(null); return; }
    setCoordLoading(true);
    faculty.list({ subject: sel.subject, hasRole: "subject_coordinator", department: sel.branch })
      .then(list => setCoordinator(list && list.length > 0 ? list[0] : null))
      .catch(() => setCoordinator(null))
      .finally(() => setCoordLoading(false));
  }, [sel.subject, sel.branch]);

  const cascadeReady = CASCADE_ORDER.every(f => sel[f]);
  const formReady = cascadeReady && examType && examDate && maxMarks && duration && academicYear;

  const handleSubmit = async () => {
    if (!formReady || submitting) return;
    setSubmitting(true);
    try {
      const subjectLabel = opts.subject.find(o => o.v === sel.subject)?.l || "";
      await examEventsApi.create({
        type:       ["End-Sem", "SEE", "Supplementary"].includes(examType) ? "external" : "internal",
        examType,
        title:      `${subjectLabel} — ${examType}`,
        examDate,
        college:    sel.college,
        department: sel.branch,
        regulation: sel.regulation,
        semester:   sel.semester,
        academicYear,
        subjects:   [sel.subject],
        assignedTo: coordinator?._id,
        maxMarks:   maxMarks ? Number(maxMarks) : undefined,
        duration:   duration ? Number(duration) : undefined,
      });
      toast(`Examination created — ${examType}`);
      reset();
      setExamType(""); setExamDate(""); setMaxMarks(""); setDuration(""); setCoordinator(null);
      if (academicYearOpts.length !== 1) setAcademicYear("");
      onClose();
    } catch (err) {
      toast(err.message || "Failed to create examination. Please check all fields.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const dropStyle = {
    width: "100%", background: C.white, border: `1px solid ${C.border}`,
    padding: "9px 32px 9px 10px", borderRadius: "5px", fontSize: "13px",
    color: C.text, appearance: "none", outline: "none",
  };

  return (
    <Card title="Create New Examination" style={{ marginBottom: "16px", borderTop: `3px solid ${C.gold}` }}>
      <StepStrip sel={sel} />

      {/* Row 1: College + Regulation */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
        <CascadeSelect label="College"    value={sel.college}    onChange={v => pick("college", v)}    options={opts.college}    disabled={false} required />
        <CascadeSelect label="Regulation" value={sel.regulation} onChange={v => pick("regulation", v)} options={opts.regulation} disabled={!sel.college} required />
      </div>

      {/* Row 2: Branch + Semester */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
        <CascadeSelect label="Branch"   value={sel.branch}   onChange={v => pick("branch", v)}   options={opts.branch}   disabled={!sel.regulation} required />
        <CascadeSelect label="Semester" value={sel.semester} onChange={v => pick("semester", v)} options={opts.semester} disabled={!sel.branch} required />
      </div>

      {/* Row 3: Subject (full width) */}
      <div style={{ marginBottom: "14px" }}>
        <CascadeSelect label="Subject" value={sel.subject} onChange={v => pick("subject", v)} options={opts.subject} disabled={!sel.semester} required />
        {sel.branch && sel.semester && opts.subject.length === 0 && (
          <p style={{ fontSize: "11px", color: C.warning, marginTop: "4px" }}>
            No subjects found for this branch/semester. Add subjects in Admin Setup first.
          </p>
        )}
      </div>

      {/* Coordinator display — auto-populated, read-only */}
      {sel.subject && (
        <div style={{
          background: coordinator ? "#f0f7ff" : "#fff8e6",
          border: `1px solid ${coordinator ? "#c0d8f0" : "#f0d080"}`,
          borderRadius: "6px", padding: "12px 14px", marginBottom: "14px",
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
            Subject Coordinator
          </div>
          {coordLoading ? (
            <div style={{ fontSize: "12px", color: C.textMuted }}>Looking up coordinator…</div>
          ) : coordinator ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: C.navy, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "15px", fontWeight: 800, color: "#fff", flexShrink: 0,
              }}>
                {coordinator.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: C.navy }}>{coordinator.name}</div>
                {coordinator.employeeId && (
                  <div style={{ fontSize: "11px", color: C.textMuted }}>ID: {coordinator.employeeId}</div>
                )}
                <div style={{ fontSize: "11px", color: "#2a7a4a", fontWeight: 600, marginTop: "2px" }}>
                  ✓ Assigned Subject Coordinator
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "#b36a00" }}>
              No subject coordinator assigned for this subject.
              Go to <strong>Manage Users → Assign Subject Coordinator</strong> to assign one before creating the exam.
            </div>
          )}
        </div>
      )}

      {/* Exam Details — shown after all 5 cascade fields filled */}
      {cascadeReady && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "16px 0", color: C.textMuted }}>
            <div style={{ flex: 1, height: "1px", background: C.borderLight }} />
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Exam Details
            </span>
            <div style={{ flex: 1, height: "1px", background: C.borderLight }} />
          </div>

          {/* Row 4: Exam Type + Date + Max Marks + Duration */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>
                Exam Type <span style={{ color: C.gold }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <select value={examType} onChange={e => setExamType(e.target.value)}
                  style={{ ...dropStyle, color: examType ? C.text : C.textMuted }}>
                  <option value="">Select Type</option>
                  {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.navy, fontSize: "10px" }}>▼</span>
              </div>
            </div>
            <FieldInput label="Exam Date"      type="date"   value={examDate}  onChange={setExamDate}  required />
            <FieldInput label="Max Marks"       type="number" value={maxMarks}  onChange={setMaxMarks}  placeholder="e.g. 30" required />
            <FieldInput label="Duration (mins)" type="number" value={duration}  onChange={setDuration}  placeholder="e.g. 90" required />
          </div>

          {/* Row 5: Academic Year */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>
              Academic Year <span style={{ color: C.gold }}>*</span>
            </label>
            <div style={{ position: "relative", maxWidth: "260px" }}>
              <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
                style={{
                  width: "100%", background: C.white,
                  border: `1px solid ${academicYear ? C.navy : C.border}`,
                  borderLeft: academicYear ? `3px solid ${C.gold}` : `1px solid ${C.border}`,
                  padding: "9px 32px 9px 10px", borderRadius: "5px", fontSize: "13px",
                  color: academicYear ? C.text : C.textMuted, appearance: "none", outline: "none",
                }}>
                <option value="">Select Academic Year</option>
                {academicYearOpts.map(y => <option key={y._id} value={y._id}>{y.year || y.name}</option>)}
              </select>
              <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.navy, fontSize: "10px" }}>▼</span>
            </div>
          </div>

          {/* Summary chips */}
          <div style={{
            background: C.blueLight, border: `1px solid ${C.border}`,
            borderRadius: "6px", padding: "12px 14px", marginBottom: "16px",
            display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center",
          }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: C.navy, marginRight: "4px" }}>SUMMARY:</span>
            {[
              opts.college.find(o => o.v === sel.college)?.l,
              opts.regulation.find(o => o.v === sel.regulation)?.l,
              opts.branch.find(o => o.v === sel.branch)?.l,
              opts.semester.find(o => o.v === sel.semester)?.l,
              opts.subject.find(o => o.v === sel.subject)?.l,
              examType || "—",
              coordinator ? `Coordinator: ${coordinator.name}` : "No Coordinator",
            ].filter(Boolean).map((v, i) => (
              <span key={i} style={{
                background: C.white, border: `1px solid ${C.border}`,
                borderRadius: "4px", padding: "2px 8px",
                fontSize: "11px", color: C.textMid, fontWeight: 600,
              }}>{v}</span>
            ))}
          </div>
        </>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <GoldBtn
          onClick={handleSubmit}
          style={{ opacity: (formReady && !submitting) ? 1 : 0.5, cursor: (formReady && !submitting) ? "pointer" : "not-allowed" }}
        >
          <Icon name="plus" size={14} color="#fff" />
          {submitting ? "Creating…" : "Create Examination"}
        </GoldBtn>
        <OutlineBtn onClick={() => { reset(); onClose(); }}>Cancel</OutlineBtn>
        {!formReady && (
          <span style={{ fontSize: "11px", color: C.textMuted, marginLeft: "4px" }}>
            {!cascadeReady
              ? `Complete ${5 - CASCADE_ORDER.filter(f => sel[f]).length} more field(s)`
              : !academicYear ? "Select an academic year"
              : "Fill in exam details to continue"}
          </span>
        )}
      </div>
    </Card>
  );
};

// Exam Detail Modal
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,50,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 28, width: 540, maxWidth: "92vw", boxShadow: "0 20px 60px rgba(0,0,50,0.3)", maxHeight: "80vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>Exam Details</div>
          <OutlineBtn onClick={onClose} style={{ fontSize: "11px", padding: "4px 12px" }}>Close</OutlineBtn>
        </div>
        {row("Title",         exam.title || exam.subjects?.[0]?.title)}
        {row("Exam Type",     exam.examType || exam.type)}
        {row("Status",        exam.status)}
        {row("College",       exam.college?.name)}
        {row("Department",    exam.department?.name || exam.department?.code)}
        {row("Semester",      exam.semester?.number ? `Semester ${exam.semester.number}` : exam.semester?.name)}
        {row("Subject",       exam.subjects?.[0]?.title || exam.subjects?.[0]?.name)}
        {row("Course Code",   exam.subjects?.[0]?.courseCode)}
        {row("Regulation",    exam.regulation?.name || exam.regulation?.code)}
        {row("Coordinator",   exam.assignedTo?.name)}
        {row("Exam Date",     exam.examDate ? new Date(exam.examDate).toLocaleDateString() : null)}
        {row("Max Marks",     exam.maxMarks)}
        {row("Duration",      exam.duration ? `${exam.duration} mins` : null)}
        {row("Total Sheets",  exam.totalBooklets)}
        {row("Evaluated",     exam.evaluatedBooklets)}
        {row("Academic Year", exam.academicYear?.name || exam.academicYear?.year)}
      </div>
    </div>
  );
};

// Edit Exam Modal
const EditExamModal = ({ exam, onClose, onSaved, toast }) => {
  const [examType, setExamType] = useState(exam.examType || exam.type || "");
  const [examDate, setExamDate] = useState(exam.examDate ? String(exam.examDate).slice(0, 10) : "");
  const [maxMarks, setMaxMarks] = useState(exam.maxMarks || "");
  const [duration, setDuration] = useState(exam.duration || "");
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await examEventsApi.update(exam._id, {
        examType,
        examDate: examDate || undefined,
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,50,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 28, width: 500, maxWidth: "92vw", boxShadow: "0 20px 60px rgba(0,0,50,0.3)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>Edit Exam Event</div>
          <OutlineBtn onClick={onClose} style={{ fontSize: "11px", padding: "4px 12px" }}>Cancel</OutlineBtn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <FieldInput label="Exam Date"       type="date"   value={examDate}  onChange={setExamDate} />
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
              Exam Type
            </label>
            <select value={examType} onChange={e => setExamType(e.target.value)}
              style={{ width: "100%", background: C.white, border: `1px solid ${C.border}`, padding: "9px 10px", borderRadius: 5, fontSize: 13, color: C.text, outline: "none" }}>
              <option value="">Select Type</option>
              {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <FieldInput label="Max Marks"        type="number" value={maxMarks}  onChange={setMaxMarks}  placeholder="e.g. 30" />
          <FieldInput label="Duration (mins)"  type="number" value={duration}  onChange={setDuration}  placeholder="e.g. 90" />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <GoldBtn onClick={handleSave} style={{ opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : "Save Changes"}
          </GoldBtn>
          <OutlineBtn onClick={onClose}>Cancel</OutlineBtn>
        </div>
      </div>
    </div>
  );
};

// MAIN PAGE
const ExamsPage = ({ toast }) => {
  const [show,      setShow]     = useState(false);
  const [exams,     setExams]    = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [viewExam,  setViewExam] = useState(null);
  const [editExam,  setEditExam] = useState(null);
  const [statusMap, setStatusMap] = useState({});

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
      setStatusMap(p => { const n = { ...p }; delete n[id]; return n; });
    }
  };

  const handleSaved = (updated) => {
    setExams(prev => prev.map(e => e._id === updated._id ? { ...e, ...updated } : e));
  };

  return (
    <div className="page-anim">
      <Breadcrumb items={["Exam Cell", "Examinations"]} />

      {viewExam && <ExamDetailModal exam={viewExam} onClose={() => setViewExam(null)} />}
      {editExam  && <EditExamModal  exam={editExam}  onClose={() => setEditExam(null)} onSaved={handleSaved} toast={toast} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <p style={{ fontSize: "13px", color: C.textMuted }}>
          Manage examinations. Subject coordinators are auto-populated from Manage Users assignments.
        </p>
        <GoldBtn onClick={() => setShow(s => !s)}>
          <Icon name="plus" size={14} color="#fff" />
          {show ? "Close Form" : "Create Exam"}
        </GoldBtn>
      </div>

      {show && <CreateExamForm onClose={() => setShow(false)} toast={toast} />}

      <Card title="All Examinations">
        <AUTable cols={["Dept", "Subject", "Sem", "Type", "Date", "Coordinator", "Sheets", "Evaluated", "Status", "Actions"]}>
          {loading ? (
            <tr><td colSpan={10} style={{ textAlign: "center", color: C.textMuted, padding: "20px", fontSize: "13px" }}>Loading examinations…</td></tr>
          ) : exams.length === 0 ? (
            <tr><td colSpan={10} style={{ textAlign: "center", color: C.textMuted, padding: "20px", fontSize: "13px" }}>No examinations found. Create one above.</td></tr>
          ) : exams.map(e => {
            const curStatus = statusMap[e._id] || e.status || "upcoming";
            return (
              <tr key={e._id}>
                <td><Badge text={e.department?.code || e.department?.name || "—"} type="navy" /></td>
                <td style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>
                  {e.title || e.subjects?.[0]?.title || "—"}
                  <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 400 }}>{e.subjects?.[0]?.courseCode || ""}</div>
                </td>
                <td>{e.semester?.number || e.semester?.name || "—"}</td>
                <td><Badge text={e.examType || e.type || "—"} type="gold" /></td>
                <td style={{ fontSize: 12, color: C.textMid }}>
                  {e.examDate ? new Date(e.examDate).toLocaleDateString() : "—"}
                </td>
                <td style={{ fontSize: 12 }}>
                  {e.assignedTo?.name
                    ? <span style={{ fontWeight: 600, color: C.navy }}>{e.assignedTo.name}</span>
                    : <span style={{ color: C.textMuted }}>—</span>}
                </td>
                <td style={{ fontWeight: 600 }}>{e.totalBooklets ?? "—"}</td>
                <td style={{ fontWeight: 700, color: C.warning }}>{e.evaluatedBooklets ?? "—"}</td>
                <td>
                  <select
                    value={curStatus}
                    onChange={ev => handleStatusChange(e._id, ev.target.value)}
                    style={{
                      padding: "3px 7px", borderRadius: 5,
                      border: `1.5px solid ${curStatus === "completed" ? C.success : curStatus === "active" ? C.warning : curStatus === "cancelled" ? C.danger : C.border}`,
                      fontSize: 11, fontWeight: 700,
                      color: curStatus === "completed" ? C.success : curStatus === "active" ? C.warning : curStatus === "cancelled" ? C.danger : C.textMid,
                      background: "#fff", cursor: "pointer", fontFamily: "inherit", outline: "none",
                    }}>
                    {EXAM_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 5 }}>
                    <OutlineBtn style={{ fontSize: "11px", padding: "4px 10px" }} onClick={() => setViewExam(e)}>View</OutlineBtn>
                    <button onClick={() => setEditExam(e)}
                      style={{ background: C.blueLight, border: `1px solid ${C.border}`, color: C.navy, borderRadius: 5, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
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
