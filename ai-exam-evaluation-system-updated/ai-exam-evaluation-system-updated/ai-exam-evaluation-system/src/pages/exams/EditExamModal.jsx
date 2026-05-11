import { useState } from "react";
import { examEvents as examEventsApi } from "../../services/api.js";
import { GoldBtn, OutlineBtn } from "../../components/ui/Buttons";
import C from "../../constants/colors";

const EXAM_TYPES = ["IE1", "IE2", "SEE", "Mid-1", "Mid-2", "End-Sem", "Supplementary", "Lab Exam"];

const FieldInput = ({ label, type = "text", value, onChange, placeholder }) => (
  <div>
    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>
      {label}
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
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,50,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 10, padding: 28, width: 500, maxWidth: "92vw", boxShadow: "0 20px 60px rgba(0,0,50,0.3)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>Edit Exam Event</div>
          <OutlineBtn onClick={onClose} style={{ fontSize: "11px", padding: "4px 12px" }}>Cancel</OutlineBtn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <FieldInput label="Exam Date"      type="date"   value={examDate}  onChange={setExamDate} />
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Exam Type</label>
            <select value={examType} onChange={e => setExamType(e.target.value)}
              style={{ width: "100%", background: C.white, border: `1px solid ${C.border}`, padding: "9px 10px", borderRadius: 5, fontSize: 13, color: C.text, outline: "none" }}>
              <option value="">Select Type</option>
              {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <FieldInput label="Max Marks"       type="number" value={maxMarks}  onChange={setMaxMarks}  placeholder="e.g. 30" />
          <FieldInput label="Duration (mins)" type="number" value={duration}  onChange={setDuration}  placeholder="e.g. 90" />
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

export default EditExamModal;
