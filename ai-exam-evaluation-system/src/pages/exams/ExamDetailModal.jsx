import { OutlineBtn } from "../../components/ui/Buttons";
import C from "../../constants/colors";

const Row = ({ label, value }) => (
  <div style={{ display: "flex", gap: "12px", padding: "8px 0", borderBottom: `1px solid ${C.borderLight}` }}>
    <span style={{ minWidth: "140px", fontSize: "11px", fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </span>
    <span style={{ fontSize: "13px", color: C.text, fontWeight: 600 }}>{value || "—"}</span>
  </div>
);

const ExamDetailModal = ({ exam, onClose }) => (
  <div
    style={{ position: "fixed", inset: 0, background: "rgba(0,0,50,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}
    onClick={onClose}
  >
    <div
      style={{ background: "#fff", borderRadius: 10, padding: 28, width: 540, maxWidth: "92vw", boxShadow: "0 20px 60px rgba(0,0,50,0.3)", maxHeight: "80vh", overflowY: "auto" }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>Exam Details</div>
        <OutlineBtn onClick={onClose} style={{ fontSize: "11px", padding: "4px 12px" }}>Close</OutlineBtn>
      </div>
      <Row label="Title"        value={exam.title || exam.subjects?.[0]?.title} />
      <Row label="Exam Type"    value={exam.examType || exam.type} />
      <Row label="Status"       value={exam.status} />
      <Row label="College"      value={exam.college?.name} />
      <Row label="Department"   value={exam.department?.name || exam.department?.code} />
      <Row label="Semester"     value={exam.semester?.number ? `Semester ${exam.semester.number}` : exam.semester?.name} />
      <Row label="Subject"      value={exam.subjects?.[0]?.title || exam.subjects?.[0]?.name} />
      <Row label="Course Code"  value={exam.subjects?.[0]?.courseCode} />
      <Row label="Regulation"   value={exam.regulation?.name || exam.regulation?.code} />
      <Row label="Coordinator"  value={exam.assignedTo?.name} />
      <Row label="Exam Date"    value={exam.examDate ? new Date(exam.examDate).toLocaleDateString() : null} />
      <Row label="Max Marks"    value={exam.maxMarks} />
      <Row label="Duration"     value={exam.duration ? `${exam.duration} mins` : null} />
      <Row label="Total Sheets" value={exam.totalBooklets} />
      <Row label="Evaluated"    value={exam.evaluatedBooklets} />
      <Row label="Academic Year" value={exam.academicYear?.name || exam.academicYear?.year} />
    </div>
  </div>
);

export default ExamDetailModal;
