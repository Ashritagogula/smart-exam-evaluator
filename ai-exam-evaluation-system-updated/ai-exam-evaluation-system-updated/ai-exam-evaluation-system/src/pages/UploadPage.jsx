import { useState, useRef, useEffect } from "react";
import {
  answerBooklets as bookletsApi,  // used for list() in recentUploads
  colleges as collegesApi,
  regulations as regulationsApi,
  departments as departmentsApi,
  semesters as semestersApi,
  subjects as subjectsApi,
  sections as sectionsApi,
  faculty as facultyApi,
} from "../services/api.js";
import { Card } from "../components/ui/Card";
import { GoldBtn, OutlineBtn } from "../components/ui/Buttons";
import Badge from "../components/ui/Badge";
import Breadcrumb from "../components/layout/Breadcrumb";
import Icon from "../components/ui/Icon";
import C from "../constants/colors";

// ── Exam types ────────────────────────────────────────────────────────────────
const EXAM_TYPES = [
  "Mid-1",
  "Mid-2",
  "End-Sem",
  "Supplementary",
  "Lab Exam",
  "Internal",
];

// ── Cascade order ─────────────────────────────────────────────────────────────
const CASCADE_ORDER = [
  "college",
  "regulation",
  "branch",
  "semester",
  "subject",
  "section",
  "faculty",
];

// ── Cascade state hook ────────────────────────────────────────────────────────
const useCascade = () => {
  const blank = Object.fromEntries(CASCADE_ORDER.map((f) => [f, ""]));
  const [sel, setSel] = useState(blank);

  const pick = (field, value) => {
    setSel((prev) => {
      const idx = CASCADE_ORDER.indexOf(field);
      const resets = Object.fromEntries(
        CASCADE_ORDER.slice(idx + 1).map((f) => [f, ""]),
      );
      return { ...prev, ...resets, [field]: value };
    });
  };

  const reset = () => setSel(blank);
  return { sel, pick, reset };
};

// ── Dynamic options via API ───────────────────────────────────────────────────
const useApiOptions = (sel) => {
  const [collegeOpts, setCollegeOpts] = useState([]);
  const [regulationOpts, setRegulationOpts] = useState([]);
  const [branchOpts, setBranchOpts] = useState([]);
  const [semesterOpts, setSemesterOpts] = useState([]);
  const [subjectOpts, setSubjectOpts] = useState([]);
  const [sectionOpts, setSectionOpts] = useState([]);
  const [facultyOpts, setFacultyOpts] = useState([]);

  useEffect(() => {
    collegesApi
      .list()
      .then((list) =>
        setCollegeOpts((list || []).map((c) => ({ v: c._id, l: c.name }))),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sel.college) {
      setRegulationOpts([]);
      setBranchOpts([]);
      return;
    }
    regulationsApi
      .list({ college: sel.college })
      .then((list) =>
        setRegulationOpts(
          (list || []).map((r) => ({ v: r._id, l: r.name || r.code })),
        ),
      )
      .catch(() => {});
    departmentsApi
      .list({ college: sel.college })
      .then((list) =>
        setBranchOpts(
          (list || []).map((d) => ({
            v: d._id,
            l: d.code ? `${d.code} — ${d.name}` : d.name,
          })),
        ),
      )
      .catch(() => {});
  }, [sel.college]);

  useEffect(() => {
    if (!sel.regulation) {
      setSemesterOpts([]);
      return;
    }
    semestersApi
      .list({ regulation: sel.regulation })
      .then((list) =>
        setSemesterOpts(
          (list || []).map((s) => ({
            v: s._id,
            l: `Semester ${s.number ?? s.name}`,
          })),
        ),
      )
      .catch(() => {});
  }, [sel.regulation]);

  useEffect(() => {
    if (!sel.branch || !sel.semester) {
      setSubjectOpts([]);
      return;
    }
    subjectsApi
      .list({ department: sel.branch, semester: sel.semester })
      .then((list) =>
        setSubjectOpts(
          (list || []).map((s) => ({
            v: s._id,
            l: s.courseCode ? `${s.courseCode} — ${s.name}` : s.name,
          })),
        ),
      )
      .catch(() => {});
  }, [sel.branch, sel.semester]);

  useEffect(() => {
    if (!sel.branch) {
      setSectionOpts([]);
      return;
    }
    sectionsApi
      .list({ department: sel.branch })
      .then((list) => {
        const mapped = (list || []).map((s) => ({
          v: s._id,
          l: `Section ${s.name}`,
        }));
        setSectionOpts(
          mapped.length > 0
            ? mapped
            : ["A", "B", "C", "D"].map((s) => ({ v: s, l: `Section ${s}` })),
        );
      })
      .catch(() =>
        setSectionOpts(
          ["A", "B", "C", "D"].map((s) => ({ v: s, l: `Section ${s}` })),
        ),
      );
  }, [sel.branch]);

  useEffect(() => {
    if (!sel.subject) {
      setFacultyOpts([]);
      return;
    }
    facultyApi
      .list({ subject: sel.subject, department: sel.branch })
      .then((list) =>
        setFacultyOpts((list || []).map((f) => ({ v: f._id, l: f.name }))),
      )
      .catch(() => {});
  }, [sel.subject, sel.branch]);

  return {
    college: collegeOpts,
    regulation: regulationOpts,
    branch: branchOpts,
    semester: semesterOpts,
    subject: subjectOpts,
    section: sectionOpts,
    faculty: facultyOpts,
  };
};

// ── Themed cascading select ────────────────────────────────────────────────────
const CascadeSelect = ({ label, value, onChange, options, disabled, hint }) => {
  const ready = !disabled;
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "11px",
          fontWeight: 700,
          color: C.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "5px",
        }}
      >
        {label} <span style={{ color: C.gold }}>*</span>
      </label>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={!ready}
          style={{
            width: "100%",
            background: ready ? C.white : C.bg,
            border: `1px solid ${value ? C.navy : C.border}`,
            borderLeft: value ? `3px solid ${C.gold}` : `1px solid ${C.border}`,
            padding: "9px 30px 9px 10px",
            borderRadius: "5px",
            fontSize: "13px",
            color: value ? C.text : C.textMuted,
            cursor: ready ? "pointer" : "not-allowed",
            opacity: ready ? 1 : 0.5,
            appearance: "none",
            WebkitAppearance: "none",
            outline: "none",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => (e.target.style.borderColor = C.gold)}
          onBlur={(e) =>
            (e.target.style.borderColor = value ? C.navy : C.border)
          }
        >
          <option value="">
            {ready
              ? `Select ${label}`
              : `← select ${label.split(" ")[0].toLowerCase()} above`}
          </option>
          {options.map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
        <span
          style={{
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: ready ? C.navy : C.textMuted,
            fontSize: "10px",
          }}
        >
          ▼
        </span>
      </div>
      {hint && (
        <p style={{ fontSize: "10px", color: C.warning, marginTop: "3px" }}>
          {hint}
        </p>
      )}
    </div>
  );
};

// ── Exam type select ──────────────────────────────────────────────────────────
const ExamTypeSelect = ({ value, onChange, disabled }) => (
  <div>
    <label
      style={{
        display: "block",
        fontSize: "11px",
        fontWeight: 700,
        color: C.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: "5px",
      }}
    >
      Exam Type <span style={{ color: C.gold }}>*</span>
    </label>
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: "100%",
          background: disabled ? C.bg : C.white,
          border: `1px solid ${value ? C.navy : C.border}`,
          borderLeft: value ? `3px solid ${C.gold}` : `1px solid ${C.border}`,
          padding: "9px 30px 9px 10px",
          borderRadius: "5px",
          fontSize: "13px",
          color: value ? C.text : C.textMuted,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          appearance: "none",
          outline: "none",
        }}
      >
        <option value="">Select Exam Type</option>
        {EXAM_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: C.navy,
          fontSize: "10px",
        }}
      >
        ▼
      </span>
    </div>
  </div>
);

// ── Upload context summary chips ──────────────────────────────────────────────
const ContextSummary = ({ sel, examType }) => {
  const chips = [
    { label: "College", value: sel.college },
    { label: "Regulation", value: sel.regulation },
    { label: "Branch", value: sel.branch },
    { label: "Semester", value: sel.semester ? `Sem-${sel.semester}` : "" },
    { label: "Subject", value: sel.subject },
    { label: "Section", value: sel.section ? `Sec-${sel.section}` : "" },
    { label: "Faculty", value: sel.faculty },
    { label: "Exam Type", value: examType },
  ];

  return (
    <div
      style={{
        background: C.blueLight,
        border: `1px solid ${C.border}`,
        borderRadius: "6px",
        padding: "12px 14px",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 800,
          color: C.navy,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: "8px",
        }}
      >
        Upload Context
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {chips.map((ch) =>
          ch.value ? (
            <div
              key={ch.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: "4px",
                padding: "4px 8px",
              }}
            >
              <span
                style={{
                  fontSize: "9px",
                  color: C.textMuted,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {ch.label}:
              </span>
              <span
                style={{ fontSize: "11px", fontWeight: 700, color: C.navy }}
              >
                {ch.value}
              </span>
            </div>
          ) : (
            <div
              key={ch.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: C.bg,
                border: `1px dashed ${C.border}`,
                borderRadius: "4px",
                padding: "4px 8px",
                opacity: 0.6,
              }}
            >
              <span
                style={{
                  fontSize: "9px",
                  color: C.textMuted,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {ch.label}:
              </span>
              <span style={{ fontSize: "11px", color: C.textMuted }}>—</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
};

// ── Progress bar for upload ───────────────────────────────────────────────────
const UploadProgress = ({ pct }) => (
  <div
    style={{
      marginTop: "16px",
      background: C.bg,
      borderRadius: "6px",
      padding: "14px 16px",
      border: `1px solid ${C.border}`,
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "8px",
      }}
    >
      <span style={{ fontSize: "12px", fontWeight: 600, color: C.text }}>
        {pct >= 100
          ? "✓  Upload complete — AI evaluation started"
          : "Uploading and processing..."}
      </span>
      <span style={{ fontSize: "12px", fontWeight: 800, color: C.navy }}>
        {Math.round(pct)}%
      </span>
    </div>
    <div
      style={{
        height: "6px",
        background: C.borderLight,
        borderRadius: "100px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${C.navy}, ${C.blue})`,
          borderRadius: "100px",
          transition: "width 0.3s ease",
        }}
      />
    </div>
    {pct >= 100 && (
      <p
        style={{
          fontSize: "11px",
          color: C.success,
          marginTop: "8px",
          fontWeight: 600,
        }}
      >
        🤖 AI OCR extraction running... Results appear in 5–10 minutes.
      </p>
    )}
  </div>
);

// ── Drop Zone ──────────────────────────────────────────────────────────────────
// const DropZone = ({ onUpload, disabled }) => {
//   const [drag, setDrag] = useState(false);

//   return (
//     <div
//       onDragOver={e => { e.preventDefault(); if (!disabled) setDrag(true); }}
//       onDragLeave={() => setDrag(false)}
//       onDrop={e => { e.preventDefault(); setDrag(false); if (!disabled) onUpload(); }}
//       onClick={() => { if (!disabled) onUpload(); }}
//       style={{
//         border: `2px dashed ${drag ? C.gold : disabled ? C.borderLight : C.border}`,
//         borderRadius: "8px",
//         padding: "40px 20px",
//         textAlign: "center",
//         cursor: disabled ? "not-allowed" : "pointer",
//         background: drag ? C.goldLight : disabled ? C.bg : C.white,
//         transition: "all 0.2s",
//         opacity: disabled ? 0.55 : 1,
//       }}
//     >
//       <div style={{
//         width: "52px", height: "52px",
//         background: drag ? `rgba(247,148,29,0.15)` : C.blueLight,
//         border: `1px solid ${drag ? C.gold : C.border}`,
//         borderRadius: "8px",
//         display: "flex", alignItems: "center", justifyContent: "center",
//         margin: "0 auto 14px",
//       }}>
//         <Icon name="upload" size={26} color={drag ? C.goldDark : C.navy} />
//       </div>
//       <p style={{ fontSize: "14px", fontWeight: 700, color: C.text, marginBottom: "4px" }}>
//         {disabled
//           ? "Complete the fields above to enable upload"
//           : "Drop PDF / Image files here"}
//       </p>
//       <p style={{ fontSize: "12px", color: C.textMuted, marginBottom: "16px" }}>
//         Supports PDF, JPG, PNG &nbsp;•&nbsp; Max 50 MB per file
//       </p>
//       <GoldBtn
//         onClick={e => { e.stopPropagation(); if (!disabled) onUpload(); }}
//         style={{
//           display: "inline-flex",
//           opacity: disabled ? 0.4 : 1,
//           cursor: disabled ? "not-allowed" : "pointer",
//         }}
//       >
//         <Icon name="upload" size={15} color="#fff" /> Browse & Upload
//       </GoldBtn>
//       {disabled && (
//         <p style={{ marginTop: "10px", fontSize: "11px", color: C.warning, fontWeight: 600 }}>
//           ⚠ Select College → Regulation → Branch → Semester → Subject → Section → Faculty → Exam Type
//         </p>
//       )}
//     </div>
//   );
// };

// ── Drop Zone ──────────────────────────────────────────────────────────────────
const DropZone = ({ onUpload, disabled }) => {
  const [drag, setDrag] = useState(false);
  const fileInputRef = useRef(null);

  // Open file explorer
  const openFilePicker = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle selected files
  const handleFiles = (files) => {
    if (!disabled && files && files.length > 0) {
      onUpload(Array.from(files));
    }
  };

  // File input selection
  const handleInputChange = (e) => {
    handleFiles(e.target.files);

    // Reset input so same file can be selected again
    e.target.value = "";
  };

  // Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);

    if (disabled) return;

    const files = e.dataTransfer.files;

    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  return (
    <>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: "none" }}
        onChange={handleInputChange}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={openFilePicker}
        style={{
          border: `2px dashed ${
            drag ? C.gold : disabled ? C.borderLight : C.border
          }`,
          borderRadius: "8px",
          padding: "40px 20px",
          textAlign: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          background: drag ? C.goldLight : disabled ? C.bg : C.white,
          transition: "all 0.2s",
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            background: drag ? `rgba(247,148,29,0.15)` : C.blueLight,
            border: `1px solid ${drag ? C.gold : C.border}`,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
          }}
        >
          <Icon name="upload" size={26} color={drag ? C.goldDark : C.navy} />
        </div>

        <p
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: C.text,
            marginBottom: "4px",
          }}
        >
          {disabled
            ? "Complete the fields above to enable upload"
            : "Drop PDF / Image files here"}
        </p>

        <p
          style={{
            fontSize: "12px",
            color: C.textMuted,
            marginBottom: "16px",
          }}
        >
          Supports PDF, JPG, PNG • Max 50 MB per file
        </p>

        <GoldBtn
          onClick={(e) => {
            e.stopPropagation();
            openFilePicker();
          }}
          style={{
            display: "inline-flex",
            opacity: disabled ? 0.4 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          <Icon name="upload" size={15} color="#fff" />
          Browse & Upload
        </GoldBtn>

        {disabled && (
          <p
            style={{
              marginTop: "10px",
              fontSize: "11px",
              color: C.warning,
              fontWeight: 600,
            }}
          >
            ⚠ Select College → Regulation → Branch → Semester → Subject →
            Section → Faculty → Exam Type
          </p>
        )}
      </div>
    </>
  );
};

// ── Booklet Detail Modal ───────────────────────────────────────────────────────
const BookletDetailModal = ({ booklet: u, onClose }) => {
  const row = (label, value) => (
    <div
      style={{
        display: "flex",
        gap: "12px",
        padding: "7px 0",
        borderBottom: `1px solid ${C.borderLight}`,
      }}
    >
      <span
        style={{
          minWidth: "130px",
          fontSize: "11px",
          fontWeight: 700,
          color: C.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "13px", color: C.text }}>{value || "—"}</span>
    </div>
  );
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,50,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          padding: 28,
          width: 480,
          maxWidth: "92vw",
          boxShadow: "0 20px 60px rgba(0,0,50,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>
            Booklet Details
          </div>
          <OutlineBtn
            onClick={onClose}
            style={{ fontSize: "11px", padding: "4px 12px" }}
          >
            Close
          </OutlineBtn>
        </div>
        {row("Barcode / File", u.barcode || u.fileName)}
        {row("Student", u.student?.name)}
        {row("Roll Number", u.student?.rollNumber)}
        {row("Subject", u.subject?.title || u.subject?.name)}
        {row("Course Code", u.subject?.courseCode)}
        {row("Section", u.section?.name || u.section)}
        {row("Exam Type", u.examType)}
        {row("Status", u.status)}
        {row(
          "Uploaded",
          u.uploadDate ? new Date(u.uploadDate).toLocaleString() : null,
        )}
        {row("Evaluated By", u.evaluatedBy?.name)}
        {row(
          "AI Score",
          u.aiResult?.totalMarks != null
            ? `${u.aiResult.totalMarks} / ${u.aiResult.maxMarks}`
            : null,
        )}
        {row(
          "Faculty Score",
          u.facultyMarks != null ? String(u.facultyMarks) : null,
        )}
      </div>
    </div>
  );
};

// ── MAIN PAGE ──────────────────────────────────────────────────────────────────
const UploadPage = ({ doUpload, uploadPct }) => {
  const { sel, pick, reset } = useCascade();
  const opts = useApiOptions(sel);

  const [examType, setExamType] = useState("");
  const [recentUploads, setRecentUploads] = useState([]);
  const [viewBooklet, setViewBooklet] = useState(null);

  // NEW
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    bookletsApi
      .list()
      .then((list) => {
        setRecentUploads(list.slice(0, 10));
      })
      .catch(() => {});
  }, []);

  const cascadeReady = CASCADE_ORDER.every((f) => sel[f]);
  const uploadReady = cascadeReady && !!examType;

  // const handleUpload = async (files) => {
  //   if (!uploadReady) return;
  //   if (files && files.length > 0) {
  //     // Real API upload
  //     const formData = new FormData();
  //     for (const file of files) formData.append("booklets", file);
  //     formData.append("examType", examType === "Mid-1" ? "IE1" : examType === "Mid-2" ? "IE2" : "IE1");
  //     try {
  //       await bookletsApi.uploadBulk(formData);
  //     } catch {}
  //   }
  //   doUpload();
  // };

  const handleUpload = (files) => {
    if (!uploadReady) return;

    if (files && files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const submitUpload = async () => {
    if (!selectedFiles.length) return;
    setUploading(true);

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("booklets", file));
    formData.append(
      "examType",
      examType === "Mid-1" ? "IE1" : examType === "Mid-2" ? "IE2" : "IE1",
    );

    try {
      await doUpload(formData);
      setSelectedFiles([]);
    } catch (err) {
      console.error(err);
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-anim" style={{ maxWidth: "780px" }}>
      {viewBooklet && (
        <BookletDetailModal
          booklet={viewBooklet}
          onClose={() => setViewBooklet(null)}
        />
      )}
      <Breadcrumb items={["Exam Cell", "Upload Answer Sheets"]} />

      <Card
        title="Upload Scanned Answer Sheets"
        style={{ marginBottom: "16px" }}
      >
        {/* ── Step 1 & 2: College + Regulation ── */}
        <div
          style={{
            background: C.navy + "08",
            border: `1px solid ${C.border}`,
            borderRadius: "6px",
            padding: "14px",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 800,
              color: C.navy,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: C.navy,
                color: C.white,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: 800,
              }}
            >
              1
            </div>
            Institution
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
            }}
          >
            <CascadeSelect
              label="College"
              value={sel.college}
              onChange={(v) => pick("college", v)}
              options={opts.college}
              disabled={false}
            />
            <CascadeSelect
              label="Regulation"
              value={sel.regulation}
              onChange={(v) => pick("regulation", v)}
              options={opts.regulation}
              disabled={!sel.college}
            />
          </div>
        </div>

        {/* ── Step 3 & 4: Branch + Semester ── */}
        <div
          style={{
            background: sel.regulation ? C.blueLight : C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: "6px",
            padding: "14px",
            marginBottom: "14px",
            transition: "background 0.2s",
            opacity: sel.regulation ? 1 : 0.6,
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 800,
              color: C.navy,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: sel.regulation ? C.navy : C.border,
                color: C.white,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: 800,
              }}
            >
              2
            </div>
            Programme
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
            }}
          >
            <CascadeSelect
              label="Branch"
              value={sel.branch}
              onChange={(v) => pick("branch", v)}
              options={opts.branch}
              disabled={!sel.regulation}
            />
            <CascadeSelect
              label="Semester"
              value={sel.semester}
              onChange={(v) => pick("semester", v)}
              options={opts.semester}
              disabled={!sel.branch}
            />
          </div>
        </div>

        {/* ── Step 5, 6, 7: Subject + Section + Faculty ── */}
        <div
          style={{
            background: sel.semester ? "#f0f7ff" : C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: "6px",
            padding: "14px",
            marginBottom: "14px",
            transition: "background 0.2s",
            opacity: sel.semester ? 1 : 0.6,
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 800,
              color: C.navy,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: sel.semester ? C.navy : C.border,
                color: C.white,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: 800,
              }}
            >
              3
            </div>
            Subject & Evaluator
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "14px",
            }}
          >
            <CascadeSelect
              label="Subject"
              value={sel.subject}
              onChange={(v) => pick("subject", v)}
              options={opts.subject}
              disabled={!sel.semester}
            />
            <CascadeSelect
              label="Section"
              value={sel.section}
              onChange={(v) => pick("section", v)}
              options={opts.section}
              disabled={!sel.subject}
            />
            <CascadeSelect
              label="Faculty (Evaluator)"
              value={sel.faculty}
              onChange={(v) => pick("faculty", v)}
              options={opts.faculty}
              disabled={!sel.section}
              hint={
                sel.subject && opts.faculty.length === 0
                  ? "⚠ No faculty mapped — assign from User Management"
                  : undefined
              }
            />
          </div>
        </div>

        {/* ── Step 8: Exam Type ── */}
        <div
          style={{
            background: cascadeReady ? C.goldLight : C.bg,
            border: `1px solid ${cascadeReady ? C.gold + "60" : C.border}`,
            borderRadius: "6px",
            padding: "14px",
            marginBottom: "16px",
            transition: "all 0.2s",
            opacity: cascadeReady ? 1 : 0.6,
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 800,
              color: C.goldDark,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: cascadeReady ? C.gold : C.border,
                color: C.white,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: 800,
              }}
            >
              4
            </div>
            Exam Type
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: "14px",
            }}
          >
            <ExamTypeSelect
              value={examType}
              onChange={setExamType}
              disabled={!cascadeReady}
            />
            {/* Reset button */}
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              {(cascadeReady || examType) && (
                <OutlineBtn
                  onClick={() => {
                    reset();
                    setExamType("");
                  }}
                  style={{ fontSize: "11px", padding: "8px 14px" }}
                >
                  <Icon name="close" size={12} color={C.navy} /> Clear All
                </OutlineBtn>
              )}
            </div>
          </div>
        </div>

        {/* ── Context summary ── */}
        {sel.college && <ContextSummary sel={sel} examType={examType} />}

        {/* ── Drop Zone ── */}
        {/* <DropZone onUpload={handleUpload} disabled={!uploadReady} /> */}

        {/* ── Drop Zone ── */}
<DropZone onUpload={handleUpload} disabled={!uploadReady} />

{/* ── Selected Files ── */}
{selectedFiles.length > 0 && (
  <div
    style={{
      marginTop: "16px",
      border: `1px solid ${C.border}`,
      borderRadius: "8px",
      padding: "14px",
      background: C.white,
    }}
  >
    <div
      style={{
        fontSize: "13px",
        fontWeight: 700,
        color: C.navy,
        marginBottom: "12px",
      }}
    >
      Selected Files ({selectedFiles.length})
    </div>

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {selectedFiles.map((file, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px",
            border: `1px solid ${C.borderLight}`,
            borderRadius: "6px",
            background: C.bg,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Icon name="file" size={18} color={C.navy} />

            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: C.text,
                }}
              >
                {file.name}
              </div>

              <div
                style={{
                  fontSize: "11px",
                  color: C.textMuted,
                }}
              >
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          </div>

          <OutlineBtn
            onClick={() => {
              setSelectedFiles(prev =>
                prev.filter((_, i) => i !== index)
              );
            }}
            style={{
              fontSize: "11px",
              padding: "5px 10px",
            }}
          >
            Remove
          </OutlineBtn>
        </div>
      ))}
    </div>

    {/* Submit Button */}
    <div
      style={{
        marginTop: "16px",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <GoldBtn
        onClick={submitUpload}
        disabled={uploading}
        style={{
          opacity: uploading ? 0.7 : 1,
          cursor: uploading ? "not-allowed" : "pointer",
        }}
      >
        <Icon name="upload" size={15} color="#fff" />

        {uploading
          ? "Uploading..."
          : `Submit Upload (${selectedFiles.length})`}
      </GoldBtn>
    </div>
  </div>
)}

        {/* ── Progress ── */}
        {uploadPct !== null && <UploadProgress pct={uploadPct} />}
      </Card>

      {/* ── Recent Uploads ── */}
      <Card title="Recent Uploads">
        {recentUploads.length === 0 ? (
          <div
            style={{ fontSize: "13px", color: C.textMuted, padding: "12px 0" }}
          >
            No booklets uploaded yet.
          </div>
        ) : (
          recentUploads.map((u, i) => (
            <div
              key={u._id || i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 0",
                borderBottom:
                  i < recentUploads.length - 1
                    ? `1px solid ${C.borderLight}`
                    : "none",
              }}
            >
              <div
                style={{
                  background: C.blueLight,
                  padding: "8px",
                  borderRadius: "6px",
                  border: `1px solid ${C.border}`,
                  flexShrink: 0,
                }}
              >
                <Icon name="file" size={18} color={C.navy} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: "13px", fontWeight: 600, color: C.text }}
                >
                  {u.fileName || u.barcode || "Booklet"}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: C.textMuted,
                    marginTop: "2px",
                  }}
                >
                  {u.subject?.courseCode && (
                    <Badge text={u.subject.courseCode} type="navy" />
                  )}
                  &nbsp;
                  {u.student?.rollNumber && (
                    <Badge text={u.student.rollNumber} type="info" />
                  )}
                  &nbsp;•&nbsp;
                  {u.uploadDate
                    ? new Date(u.uploadDate).toLocaleDateString()
                    : "—"}
                </div>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Badge
                  text={u.status || "pending"}
                  type={
                    u.status === "permanently_frozen"
                      ? "success"
                      : u.status === "frozen"
                        ? "success"
                        : u.status === "ai_evaluated"
                          ? "warning"
                          : "info"
                  }
                />
                <OutlineBtn
                  style={{ fontSize: "11px", padding: "4px 10px" }}
                  onClick={() => setViewBooklet(u)}
                >
                  View
                </OutlineBtn>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
};

export default UploadPage;
