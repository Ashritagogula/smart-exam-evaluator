import { useState, useEffect } from "react";
import {
  examEvents as examEventsApi,
  faculty,
  academicYears as academicYearsApi,
} from "../../services/api.js";
import { Card } from "../../components/ui/Card";
import { GoldBtn, OutlineBtn } from "../../components/ui/Buttons";
import Icon from "../../components/ui/Icon";
import C from "../../constants/colors";
import { useCascade, useExamOptions, CASCADE_ORDER } from "./useExamOptions.js";

const EXAM_TYPES = ["IE1", "IE2", "SEE", "Mid-1", "Mid-2", "End-Sem", "Supplementary", "Lab Exam"];

const CascadeSelect = ({ label, value, onChange, options, disabled, required }) => {
  const isReady = !disabled;
  return (
    <div>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>
        {label}{required && <span style={{ color: C.gold, marginLeft: "3px" }}>*</span>}
      </label>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={!isReady}
          style={{
            width: "100%", background: isReady ? C.white : C.bg,
            border: `1px solid ${value ? C.navy : C.border}`,
            borderLeft: value ? `3px solid ${C.gold}` : `1px solid ${C.border}`,
            padding: "9px 32px 9px 10px", borderRadius: "5px", fontSize: "13px",
            color: value ? C.text : C.textMuted,
            cursor: isReady ? "pointer" : "not-allowed",
            opacity: isReady ? 1 : 0.55,
            appearance: "none", WebkitAppearance: "none",
            transition: "border-color 0.15s", outline: "none",
          }}
          onFocus={e  => (e.target.style.borderColor = C.gold)}
          onBlur={e   => (e.target.style.borderColor = value ? C.navy : C.border)}
        >
          <option value="">{isReady ? `Select ${label}` : "— select parent first —"}</option>
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: isReady ? C.navy : C.textMuted, fontSize: "10px" }}>▼</span>
      </div>
    </div>
  );
};

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
    <div style={{ display: "flex", alignItems: "center", marginBottom: "20px", padding: "10px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: "6px", overflowX: "auto" }}>
      {steps.map((s, i) => {
        const done = !!sel[s.key];
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: done ? C.navy : C.borderLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800, color: done ? C.white : C.textMuted, flexShrink: 0 }}>
                {done ? "✓" : i + 1}
              </div>
              <div style={{ fontSize: "9px", color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
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
          <span style={{ marginLeft: "8px", background: C.successBg, color: C.success, border: "1px solid #b7e4c9", padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>READY</span>
        )}
      </div>
    </div>
  );
};

const FieldInput = ({ label, type = "text", value, onChange, placeholder, required }) => (
  <div>
    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>
      {label}{required && <span style={{ color: C.gold, marginLeft: "3px" }}>*</span>}
    </label>
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder || label}
      style={{ width: "100%", background: C.white, border: `1px solid ${C.border}`, padding: "9px 10px", borderRadius: "5px", fontSize: "13px", color: C.text, outline: "none", boxSizing: "border-box" }}
      onFocus={e => (e.target.style.borderColor = C.gold)}
      onBlur={e  => (e.target.style.borderColor = C.border)}
    />
  </div>
);

const CreateExamForm = ({ onClose, toast }) => {
  const { sel, pick, reset } = useCascade();
  const opts = useExamOptions(sel);

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

  useEffect(() => {
    if (!sel.subject || !sel.branch) { setCoordinator(null); return; }
    setCoordLoading(true);
    faculty.list({ subject: sel.subject, hasRole: "subject_coordinator", department: sel.branch })
      .then(list => setCoordinator(list && list.length > 0 ? list[0] : null))
      .catch(() => setCoordinator(null))
      .finally(() => setCoordLoading(false));
  }, [sel.subject, sel.branch]);

  const cascadeReady = CASCADE_ORDER.every(f => sel[f]);
  const formReady    = cascadeReady && examType && examDate && maxMarks && duration && academicYear;

  const handleSubmit = async () => {
    if (!formReady || submitting) return;
    setSubmitting(true);
    try {
      const subjectLabel = opts.subject.find(o => o.v === sel.subject)?.l || "";
      await examEventsApi.create({
        type:        ["End-Sem", "SEE", "Supplementary"].includes(examType) ? "external" : "internal",
        examType,
        title:       `${subjectLabel} — ${examType}`,
        examDate,
        college:     sel.college,
        department:  sel.branch,
        regulation:  sel.regulation,
        semester:    sel.semester,
        academicYear,
        subjects:    [sel.subject],
        assignedTo:  coordinator?._id,
        maxMarks:    maxMarks ? Number(maxMarks) : undefined,
        duration:    duration ? Number(duration) : undefined,
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

  const dropStyle = { width: "100%", background: C.white, border: `1px solid ${C.border}`, padding: "9px 32px 9px 10px", borderRadius: "5px", fontSize: "13px", color: C.text, appearance: "none", outline: "none" };

  return (
    <Card title="Create New Examination" style={{ marginBottom: "16px", borderTop: `3px solid ${C.gold}` }}>
      <StepStrip sel={sel} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
        <CascadeSelect label="College"    value={sel.college}    onChange={v => pick("college", v)}    options={opts.college}    disabled={false} required />
        <CascadeSelect label="Regulation" value={sel.regulation} onChange={v => pick("regulation", v)} options={opts.regulation} disabled={!sel.college} required />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
        <CascadeSelect label="Branch"   value={sel.branch}   onChange={v => pick("branch", v)}   options={opts.branch}   disabled={!sel.regulation} required />
        <CascadeSelect label="Semester" value={sel.semester} onChange={v => pick("semester", v)} options={opts.semester} disabled={!sel.branch} required />
      </div>
      <div style={{ marginBottom: "14px" }}>
        <CascadeSelect label="Subject" value={sel.subject} onChange={v => pick("subject", v)} options={opts.subject} disabled={!sel.semester} required />
        {sel.branch && sel.semester && opts.subject.length === 0 && (
          <p style={{ fontSize: "11px", color: C.warning, marginTop: "4px" }}>No subjects found for this branch/semester. Add subjects in Admin Setup first.</p>
        )}
      </div>

      {sel.subject && (
        <div style={{ background: coordinator ? "#f0f7ff" : "#fff8e6", border: `1px solid ${coordinator ? "#c0d8f0" : "#f0d080"}`, borderRadius: "6px", padding: "12px 14px", marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Subject Coordinator</div>
          {coordLoading ? (
            <div style={{ fontSize: "12px", color: C.textMuted }}>Looking up coordinator…</div>
          ) : coordinator ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                {coordinator.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: C.navy }}>{coordinator.name}</div>
                {coordinator.employeeId && <div style={{ fontSize: "11px", color: C.textMuted }}>ID: {coordinator.employeeId}</div>}
                <div style={{ fontSize: "11px", color: "#2a7a4a", fontWeight: 600, marginTop: "2px" }}>✓ Assigned Subject Coordinator</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "#b36a00" }}>
              No subject coordinator assigned. Go to <strong>Manage Users → Assign Subject Coordinator</strong> to assign one before creating the exam.
            </div>
          )}
        </div>
      )}

      {cascadeReady && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "16px 0", color: C.textMuted }}>
            <div style={{ flex: 1, height: "1px", background: C.borderLight }} />
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Exam Details</span>
            <div style={{ flex: 1, height: "1px", background: C.borderLight }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>Exam Type <span style={{ color: C.gold }}>*</span></label>
              <div style={{ position: "relative" }}>
                <select value={examType} onChange={e => setExamType(e.target.value)} style={{ ...dropStyle, color: examType ? C.text : C.textMuted }}>
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
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>Academic Year <span style={{ color: C.gold }}>*</span></label>
            <div style={{ position: "relative", maxWidth: "260px" }}>
              <select value={academicYear} onChange={e => setAcademicYear(e.target.value)} style={{ width: "100%", background: C.white, border: `1px solid ${academicYear ? C.navy : C.border}`, borderLeft: academicYear ? `3px solid ${C.gold}` : `1px solid ${C.border}`, padding: "9px 32px 9px 10px", borderRadius: "5px", fontSize: "13px", color: academicYear ? C.text : C.textMuted, appearance: "none", outline: "none" }}>
                <option value="">Select Academic Year</option>
                {academicYearOpts.map(y => <option key={y._id} value={y._id}>{y.year || y.name}</option>)}
              </select>
              <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.navy, fontSize: "10px" }}>▼</span>
            </div>
          </div>
          <div style={{ background: C.blueLight, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "12px 14px", marginBottom: "16px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
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
              <span key={i} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "2px 8px", fontSize: "11px", color: C.textMid, fontWeight: 600 }}>{v}</span>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <GoldBtn onClick={handleSubmit} style={{ opacity: (formReady && !submitting) ? 1 : 0.5, cursor: (formReady && !submitting) ? "pointer" : "not-allowed" }}>
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

export default CreateExamForm;
