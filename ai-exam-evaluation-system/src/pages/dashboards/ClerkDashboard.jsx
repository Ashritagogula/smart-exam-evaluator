// src/pages/dashboards/ClerkDashboard.jsx

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, AUTable } from "../../components/ui/Card";
import { GoldBtn, OutlineBtn } from "../../components/ui/Buttons";
import Badge from "../../components/ui/Badge";
import Breadcrumb from "../../components/layout/Breadcrumb";
import Icon from "../../components/ui/Icon";
import C from "../../constants/colors";
import { faculty as facultyApi, students, answerBooklets, internalEval, externalExam as extApi, examEvents as examEventsApi, departments as departmentsApi, sections as sectionsApi } from "../../services/api";

// ── Helper: map raw API booklet → UI sheet shape ──────────────────────────────
const mapBooklet = (b) => ({
  id:         b._id,
  barcode:    b.barcode,
  roll:       b.student?.rollNumber  || null,
  studentName:b.student?.name        || "",
  subject:    b.subject?.name        || null,
  exam:       b.examEvent?.type      || null,
  status:     b.status === "pending" ? "unmapped" : b.status,
  assignedTo: b.faculty?._id         || null,
  assignedName: b.faculty?.name      || "",
  uploadedAt: b.createdAt ? new Date(b.createdAt).toLocaleTimeString() : "",
});

// ── Helper: map raw API faculty → UI faculty shape ────────────────────────────
const mapFaculty = (f) => ({
  id:       f._id,
  name:     f.name,
  dept:     f.department?.code || f.department?.name || "",
  subjects: f.subjects?.map((s) => s.name) || [],
});

const STATUS_CONFIG = {
  unmapped:  { label: "Unmapped",      type: "danger"  },
  mapped:    { label: "Mapped",        type: "warning" },
  assigned:  { label: "Assigned",      type: "info"    },
  ai_sent:   { label: "AI Triggered",  type: "success" },
  evaluated: { label: "Evaluated",     type: "gold"    },
};

// ── Small stat card ───────────────────────────────────────────────────────────
const MiniStat = ({ label, value, color, icon, sub }) => (
  <div style={{
    background: C.white, border: `1px solid ${C.border}`,
    borderTop: `3px solid ${color}`, borderRadius: "8px",
    padding: "16px 18px", display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", boxShadow: "0 2px 8px rgba(0,35,102,0.05)",
  }}>
    <div>
      <p style={{ fontSize: "11px", color: C.textMuted, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>{label}</p>
      <p style={{ fontSize: "26px", fontWeight: 800, color: C.text,
        fontFamily: "'Merriweather',serif", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: "10px", color: C.textMuted, marginTop: "4px" }}>{sub}</p>}
    </div>
    <div style={{ background: `${color}15`, padding: "9px", borderRadius: "6px",
      border: `1px solid ${color}30` }}>
      <Icon name={icon} size={19} color={color} />
    </div>
  </div>
);

// ── Progress bar ──────────────────────────────────────────────────────────────
const ProgBar = ({ val, max, color = C.navy, label }) => (
  <div style={{ marginBottom: "10px" }}>
    {label && (
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", color: C.textMid }}>{label}</span>
        <span style={{ fontSize: "12px", color: C.text, fontWeight: 700 }}>
          {val}/{max}
        </span>
      </div>
    )}
    <div style={{ background: C.borderLight, borderRadius: "100px", height: "6px", overflow: "hidden" }}>
      <div style={{
        width: `${max > 0 ? (val / max) * 100 : 0}%`, height: "100%", background: color,
        borderRadius: "100px", transition: "width 0.8s ease",
      }} />
    </div>
  </div>
);

// ── Toast notification ────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = type === "error" ? C.danger : C.success;
  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px", zIndex: 9999,
      background: bg, color: "#fff", padding: "12px 20px", borderRadius: "8px",
      fontSize: "13px", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      display: "flex", alignItems: "center", gap: "10px", maxWidth: "380px",
    }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{
        background: "rgba(255,255,255,0.2)", border: "none", color: "#fff",
        borderRadius: "4px", padding: "2px 8px", cursor: "pointer", fontSize: "12px",
      }}>x</button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 1 — UPLOAD (UI-only; structure kept from original)
// ─────────────────────────────────────────────────────────────────────────────
const UploadSection = ({ onUploadDone, uploadPct, setUploadPct }) => {
  // Upload section intentionally left as UI stub — same as original.
  // Full upload wiring can be added when backend endpoint is confirmed.
};

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 2 — BARCODE MAPPING
// ─────────────────────────────────────────────────────────────────────────────
const BarcodeSection = ({ sheets, onMap, studentsList }) => {
  const [search,    setSearch]  = useState("");
  const [scanInput, setScan]    = useState("");
  const [selected,  setSelected]= useState(null);
  const [rollMap,   setRoll]    = useState("");
  const [subjMap,   setSubj]    = useState("");
  const [examMap,   setExam]    = useState("");

  const unmapped = sheets.filter((s) => s.status === "unmapped");
  const filtered = unmapped.filter((s) =>
    s.barcode.toLowerCase().includes(search.toLowerCase())
  );

  const handleScan = () => {
    const found = sheets.find((s) => s.barcode === scanInput.trim());
    if (found && found.status === "unmapped") {
      setSelected(found.id);
      setScan("");
    }
  };

  const handleMap = () => {
    if (!selected || !rollMap || !subjMap || !examMap) return;
    // Look up student name from the API-loaded students list
    const student = studentsList.find((s) => s.rollNumber === rollMap);
    onMap(selected, {
      roll:        rollMap,
      subject:     subjMap,
      exam:        examMap,
      status:      "mapped",
      studentName: student?.name || "",
    });
    setSelected(null); setRoll(""); setSubj(""); setExam("");
  };

  return (
    <Card title="Step 1 — Barcode → Student Mapping"
      style={{ marginBottom: "16px", borderTop: `3px solid ${C.blue}` }}>

      {/* Summary strip */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        {[
          ["Total Uploaded", sheets.length,                                C.navy   ],
          ["Unmapped",       sheets.filter((s) => s.status === "unmapped").length, C.danger ],
          ["Mapped",         sheets.filter((s) => s.status !== "unmapped").length, C.success],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: C.bg, border: `1px solid ${c}30`,
            borderRadius: "6px", padding: "10px 18px", flex: 1, minWidth: "100px",
            textAlign: "center", borderTop: `2px solid ${c}` }}>
            <div style={{ fontSize: "20px", fontWeight: 800,
              fontFamily: "'Merriweather',serif", color: c }}>{v}</div>
            <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "2px",
              textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>{l}</div>
          </div>
        ))}
      </div>

      {unmapped.length === 0 ? (
        <div style={{ background: C.successBg, border: `1px solid ${C.success}50`,
          borderRadius: "6px", padding: "16px", textAlign: "center" }}>
          <Icon name="check" size={24} color={C.success} />
          <p style={{ fontSize: "13px", fontWeight: 700, color: C.success, marginTop: "8px" }}>
            All uploaded sheets are mapped. Proceed to assignment.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {/* Left: list of unmapped barcodes */}
          <div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search barcode..."
                  style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`,
                    padding: "8px 10px", borderRadius: "5px", fontSize: "12px", outline: "none" }} />
              </div>
            </div>

            {/* Scan input */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input value={scanInput} onChange={(e) => setScan(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                placeholder="Scan barcode or type & press Enter"
                style={{ flex: 1, background: C.goldLight,
                  border: `1px solid ${C.gold}60`, padding: "8px 10px",
                  borderRadius: "5px", fontSize: "12px", fontFamily: "monospace",
                  color: C.text, outline: "none" }} />
              <OutlineBtn onClick={handleScan} style={{ fontSize: "11px", padding: "7px 12px" }}>
                <Icon name="eye" size={13} color={C.navy} /> Scan
              </OutlineBtn>
            </div>

            <div style={{ maxHeight: "200px", overflowY: "auto",
              border: `1px solid ${C.border}`, borderRadius: "6px" }}>
              {filtered.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center",
                  fontSize: "12px", color: C.textMuted }}>No unmapped barcodes found</div>
              ) : filtered.map((sh) => (
                <div key={sh.id}
                  onClick={() => setSelected(sh.id)}
                  style={{
                    padding: "10px 14px", cursor: "pointer",
                    background: selected === sh.id ? C.blueLight : C.white,
                    borderBottom: `1px solid ${C.borderLight}`,
                    borderLeft: `3px solid ${selected === sh.id ? C.navy : "transparent"}`,
                    display: "flex", alignItems: "center", gap: "10px",
                  }}>
                  <div style={{ background: `${C.danger}15`, padding: "5px",
                    borderRadius: "5px", border: `1px solid ${C.danger}30` }}>
                    <Icon name="file" size={14} color={C.danger} />
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: C.text,
                      fontFamily: "monospace" }}>{sh.barcode}</div>
                    <div style={{ fontSize: "10px", color: C.textMuted }}>
                      Uploaded at {sh.uploadedAt}
                    </div>
                  </div>
                  <Badge text="Unmapped" type="danger" />
                </div>
              ))}
            </div>
          </div>

          {/* Right: mapping form */}
          <div style={{ background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: "6px", padding: "16px" }}>
            {!selected ? (
              <div style={{ textAlign: "center", paddingTop: "40px" }}>
                <Icon name="edit" size={32} color={C.border} />
                <p style={{ fontSize: "12px", color: C.textMuted, marginTop: "12px" }}>
                  Select a barcode from the list or scan to begin mapping
                </p>
              </div>
            ) : (
              <>
                <div style={{ background: C.white, border: `1px solid ${C.navy}30`,
                  borderRadius: "6px", padding: "10px 12px", marginBottom: "14px" }}>
                  <div style={{ fontSize: "10px", color: C.textMuted,
                    fontWeight: 700, textTransform: "uppercase", marginBottom: "3px" }}>
                    Mapping Barcode
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 800,
                    fontFamily: "monospace", color: C.navy }}>
                    {sheets.find((s) => s.id === selected)?.barcode}
                  </div>
                </div>

                {/* Roll Number — populated from API students list */}
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700,
                    color: C.textMuted, textTransform: "uppercase",
                    letterSpacing: "0.06em", marginBottom: "5px" }}>
                    Roll Number <span style={{ color: C.gold }}>*</span>
                  </label>
                  <select value={rollMap} onChange={(e) => setRoll(e.target.value)}
                    style={{ width: "100%", background: C.white,
                      border: `1px solid ${C.border}`, padding: "9px 10px",
                      borderRadius: "5px", fontSize: "13px", color: C.text, outline: "none" }}>
                    <option value="">Select Student</option>
                    {studentsList.map((s) => (
                      <option key={s._id || s.rollNumber} value={s.rollNumber}>
                        {s.rollNumber} — {s.name} ({s.department?.code || s.department?.name || ""})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700,
                    color: C.textMuted, textTransform: "uppercase",
                    letterSpacing: "0.06em", marginBottom: "5px" }}>
                    Subject <span style={{ color: C.gold }}>*</span>
                  </label>
                  <input value={subjMap} onChange={(e) => setSubj(e.target.value)}
                    placeholder="Subject"
                    style={{ width: "100%", background: C.white,
                      border: `1px solid ${C.border}`, padding: "9px 10px",
                      borderRadius: "5px", fontSize: "13px", color: C.text, outline: "none" }} />
                </div>

                {/* Exam */}
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700,
                    color: C.textMuted, textTransform: "uppercase",
                    letterSpacing: "0.06em", marginBottom: "5px" }}>
                    Exam <span style={{ color: C.gold }}>*</span>
                  </label>
                  <input value={examMap} onChange={(e) => setExam(e.target.value)}
                    placeholder="Exam"
                    style={{ width: "100%", background: C.white,
                      border: `1px solid ${C.border}`, padding: "9px 10px",
                      borderRadius: "5px", fontSize: "13px", color: C.text, outline: "none" }} />
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <GoldBtn
                    onClick={handleMap}
                    style={{ opacity: (rollMap && subjMap && examMap) ? 1 : 0.4,
                      cursor: (rollMap && subjMap && examMap) ? "pointer" : "not-allowed" }}>
                    <Icon name="check" size={13} color="#fff" /> Map Sheet
                  </GoldBtn>
                  <OutlineBtn onClick={() => setSelected(null)}>Cancel</OutlineBtn>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 3 — ASSIGNMENT
// ─────────────────────────────────────────────────────────────────────────────
const AssignSection = ({ sheets, onAssign, onBulkAssigned, facultyPool, assignLoading, showToast }) => {
  const [examType, setExamType] = useState("internal");
  const [subject,  setSubject]  = useState("");
  const [autoMode, setAutoMode] = useState(true);
  const [preview,  setPreview]  = useState(null);
  const [confirming, setConfirming] = useState(false);

  const mappedSheets = sheets.filter((s) =>
    s.status === "mapped" && (!subject || s.subject === subject)
  );

  const currentFaculty = facultyPool[examType] || [];

  const uniqueSubjects = [...new Set(
    sheets.filter((s) => s.status === "mapped").map((s) => s.subject).filter(Boolean)
  )];

  const generatePreview = () => {
    if (mappedSheets.length === 0 || currentFaculty.length === 0) return;
    const perFaculty = Math.floor(mappedSheets.length / currentFaculty.length);
    const remainder  = mappedSheets.length % currentFaculty.length;
    const dist = currentFaculty.map((f, i) => ({
      faculty: f,
      count:   perFaculty + (i < remainder ? 1 : 0),
      sheets:  mappedSheets.slice(
        i * perFaculty + Math.min(i, remainder),
        i * perFaculty + Math.min(i, remainder) + perFaculty + (i < remainder ? 1 : 0)
      ),
    }));
    setPreview(dist);
  };

  const confirmAssign = async () => {
    if (!preview) return;
    setConfirming(true);
    let anyError = false;

    try {
      // Call bulkAssign for each faculty row that has sheets
      for (const row of preview) {
        if (row.sheets.length === 0) continue;
        const bookletIds = row.sheets.map((sh) => sh.id);
        try {
          await answerBooklets.bulkAssign(bookletIds, row.faculty.id);
          // Update local state for each assigned sheet
          bookletIds.forEach((shId) => onAssign(shId, row.faculty.id, row.faculty.name));
        } catch (err) {
          anyError = true;
          console.error(`bulkAssign failed for faculty ${row.faculty.id}:`, err);
          showToast(`Failed to assign sheets to ${row.faculty.name}: ${err.message}`, "error");
        }
      }

      if (!anyError) {
        showToast("Sheets successfully assigned to faculty.", "success");
        onBulkAssigned();
      }
    } finally {
      setConfirming(false);
      setPreview(null);
    }
  };

  return (
    <Card title="Step 2 — Assign Sheets to Faculty"
      style={{ marginBottom: "16px", borderTop: `3px solid ${C.goldDark}` }}>

      {/* Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: "14px", marginBottom: "16px" }}>

        {/* Exam type */}
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700,
            color: C.textMuted, textTransform: "uppercase",
            letterSpacing: "0.06em", marginBottom: "5px" }}>
            Examiner Type
          </label>
          <div style={{ display: "flex", gap: "6px" }}>
            {["internal", "external"].map((t) => (
              <button key={t}
                onClick={() => { setExamType(t); setPreview(null); }}
                style={{
                  flex: 1, padding: "8px", borderRadius: "5px",
                  background: examType === t ? C.navy : C.bg,
                  color: examType === t ? C.white : C.textMid,
                  fontSize: "12px", fontWeight: 700, cursor: "pointer",
                  border: examType !== t ? `1px solid ${C.border}` : "none",
                }}>
                {t === "internal" ? "Internal" : "External"}
              </button>
            ))}
          </div>
        </div>

        {/* Subject filter */}
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700,
            color: C.textMuted, textTransform: "uppercase",
            letterSpacing: "0.06em", marginBottom: "5px" }}>
            Filter by Subject
          </label>
          <div style={{ position: "relative" }}>
            <select value={subject} onChange={(e) => { setSubject(e.target.value); setPreview(null); }}
              style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`,
                padding: "9px 30px 9px 10px", borderRadius: "5px", fontSize: "13px",
                color: C.text, appearance: "none", outline: "none" }}>
              <option value="">All Subjects</option>
              {uniqueSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span style={{ position: "absolute", right: "10px", top: "50%",
              transform: "translateY(-50%)", pointerEvents: "none",
              color: C.navy, fontSize: "10px" }}>▼</span>
          </div>
        </div>

        {/* Mode */}
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700,
            color: C.textMuted, textTransform: "uppercase",
            letterSpacing: "0.06em", marginBottom: "5px" }}>
            Distribution Mode
          </label>
          <div style={{ display: "flex", gap: "6px" }}>
            {[["auto", "Auto Equal"], ["manual", "Manual"]].map(([k, lbl]) => (
              <button key={k}
                onClick={() => { setAutoMode(k === "auto"); setPreview(null); }}
                style={{
                  flex: 1, padding: "8px", borderRadius: "5px",
                  background: (autoMode && k === "auto") || (!autoMode && k === "manual") ? C.gold : C.bg,
                  color:      (autoMode && k === "auto") || (!autoMode && k === "manual") ? C.white : C.textMid,
                  border: `1px solid ${(autoMode && k === "auto") || (!autoMode && k === "manual") ? C.gold : C.border}`,
                  fontSize: "11px", fontWeight: 700, cursor: "pointer",
                }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Info strip */}
      <div style={{ background: C.blueLight, border: `1px solid ${C.border}`,
        borderRadius: "6px", padding: "10px 14px", marginBottom: "14px",
        display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: C.navy }}>
          Mapped Sheets: <span style={{ color: C.text }}>{mappedSheets.length}</span>
        </span>
        <span style={{ fontSize: "12px", color: C.textMuted }}>
          Faculty Available: <b style={{ color: C.text }}>{currentFaculty.length}</b> ({examType})
        </span>
        {assignLoading && (
          <span style={{ fontSize: "12px", color: C.textMuted, fontStyle: "italic" }}>
            Loading faculty...
          </span>
        )}
        {mappedSheets.length > 0 && currentFaculty.length > 0 && (
          <span style={{ fontSize: "12px", color: C.textMuted }}>
            Distribution: approx. <b style={{ color: C.text }}>
              {Math.ceil(mappedSheets.length / currentFaculty.length)}
            </b> sheets per faculty
          </span>
        )}
      </div>

      {/* Faculty list */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.textMuted,
          textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
          {examType === "internal" ? "Internal" : "External"} Faculty Pool
          {assignLoading && <span style={{ fontWeight: 400, fontStyle: "italic", marginLeft: "8px" }}>Fetching...</span>}
        </div>
        {currentFaculty.length === 0 && !assignLoading ? (
          <div style={{ background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: "6px", padding: "14px", textAlign: "center", fontSize: "12px", color: C.textMuted }}>
            No {examType} faculty found.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "8px" }}>
            {currentFaculty.map((f) => (
              <div key={f.id} style={{
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: "6px", padding: "10px 12px",
                borderLeft: `3px solid ${C.navy}`,
              }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: C.text }}>{f.name}</div>
                <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "2px" }}>
                  {f.dept} {f.subjects.length > 0 ? `| ${f.subjects.join(", ")}` : ""}
                </div>
                <div style={{ fontSize: "10px", color: C.navy, fontWeight: 700,
                  marginTop: "4px", fontFamily: "monospace" }}>{f.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate preview */}
      {mappedSheets.length > 0 ? (
        <>
          <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
            <GoldBtn onClick={generatePreview} style={{ opacity: currentFaculty.length === 0 ? 0.4 : 1,
              cursor: currentFaculty.length === 0 ? "not-allowed" : "pointer" }}>
              <Icon name="users" size={14} color="#fff" /> Preview Distribution
            </GoldBtn>
            {preview && (
              <button onClick={confirmAssign} disabled={confirming} style={{
                background: `linear-gradient(135deg,${C.success},#077a41)`,
                color: "#fff", border: "none", padding: "8px 20px", borderRadius: "5px",
                fontSize: "13px", fontWeight: 700, cursor: confirming ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: "6px", opacity: confirming ? 0.7 : 1,
              }}>
                <Icon name="check" size={14} color="#fff" />
                {confirming ? "Assigning..." : "Confirm & Assign"}
              </button>
            )}
          </div>

          {/* Distribution preview table */}
          {preview && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: "6px", overflow: "hidden" }}>
              <div style={{ background: C.navy, padding: "10px 14px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700,
                  color: C.white, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Distribution Preview — {mappedSheets.length} sheets across {currentFaculty.length} faculty
                </span>
              </div>
              <div style={{ padding: "14px" }}>
                {preview.map((row, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "10px 0", borderBottom: `1px solid ${C.borderLight}`,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: C.text }}>
                        {row.faculty.name}
                      </div>
                      <div style={{ fontSize: "10px", color: C.textMuted }}>
                        {row.faculty.dept} &nbsp;•&nbsp; {row.faculty.id}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'Merriweather',serif",
                        fontSize: "22px", fontWeight: 900, color: C.navy }}>
                        {row.count}
                      </div>
                      <div style={{ fontSize: "10px", color: C.textMuted }}>sheets</div>
                    </div>
                    <div style={{ width: "120px" }}>
                      <ProgBar val={row.count} max={mappedSheets.length} color={C.navy} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ background: C.warningBg, border: `1px solid ${C.warning}50`,
          borderRadius: "6px", padding: "14px", textAlign: "center" }}>
          <p style={{ fontSize: "12px", color: C.warning, fontWeight: 700 }}>
            No mapped sheets available for assignment. Complete barcode mapping first.
          </p>
        </div>
      )}
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 4 — STATUS TRACKING
// ─────────────────────────────────────────────────────────────────────────────
const StatusSection = ({ sheets, allFacultyMap, onTriggerAI, aiTriggerLoading }) => {
  const [filter, setFilter] = useState("all");

  const counts = useMemo(() => ({
    total:    sheets.length,
    unmapped: sheets.filter((s) => s.status === "unmapped").length,
    mapped:   sheets.filter((s) => s.status === "mapped").length,
    assigned: sheets.filter((s) => s.status === "assigned").length,
    ai_sent:  sheets.filter((s) => s.status === "ai_sent").length,
  }), [sheets]);

  const visible = filter === "all" ? sheets : sheets.filter((s) => s.status === filter);

  const getFacultyName = (sheet) => {
    if (sheet.assignedName) return sheet.assignedName;
    if (sheet.assignedTo && allFacultyMap[sheet.assignedTo]) return allFacultyMap[sheet.assignedTo];
    return sheet.assignedTo || null;
  };

  const assignedSheets = sheets.filter((s) => s.status === "assigned");
  const canTriggerAI   = assignedSheets.length > 0 && !aiTriggerLoading;

  return (
    <Card title="Step 3 — Status Tracking & AI Trigger"
      style={{ borderTop: `3px solid ${C.success}` }}>

      {/* Stat pills */}
      <div style={{ display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
        gap: "10px", marginBottom: "16px" }}>
        {[
          ["Total",    counts.total,    C.navy,    "all"     ],
          ["Unmapped", counts.unmapped, C.danger,  "unmapped"],
          ["Mapped",   counts.mapped,   C.warning, "mapped"  ],
          ["Assigned", counts.assigned, C.blue,    "assigned"],
          ["AI Sent",  counts.ai_sent,  C.success, "ai_sent" ],
        ].map(([lbl, val, col, fkey]) => (
          <button key={lbl}
            onClick={() => setFilter(fkey)}
            style={{
              background: filter === fkey ? `${col}15` : C.bg,
              border: `1px solid ${filter === fkey ? col : C.border}`,
              borderTop: `3px solid ${col}`,
              borderRadius: "6px", padding: "10px 12px",
              cursor: "pointer", textAlign: "center",
            }}>
            <div style={{ fontFamily: "'Merriweather',serif",
              fontSize: "22px", fontWeight: 900, color: col }}>{val}</div>
            <div style={{ fontSize: "10px", color: C.textMuted,
              textTransform: "uppercase", fontWeight: 700,
              letterSpacing: "0.04em", marginTop: "2px" }}>{lbl}</div>
          </button>
        ))}
      </div>

      {/* Progress bars overview */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: "6px", padding: "14px", marginBottom: "16px" }}>
        <ProgBar val={counts.total - counts.unmapped} max={counts.total}
          color={C.navy} label="Mapped" />
        <ProgBar val={counts.assigned + counts.ai_sent} max={counts.total}
          color={C.blue} label="Assigned to Faculty" />
        <ProgBar val={counts.ai_sent} max={counts.total}
          color={C.success} label="AI Evaluation Triggered" />
      </div>

      {/* AI Trigger button */}
      <div style={{
        background: canTriggerAI ? C.goldLight : C.bg,
        border: `1px solid ${canTriggerAI ? C.gold + "60" : C.border}`,
        borderRadius: "6px", padding: "14px 16px", marginBottom: "16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "12px",
      }}>
        <div>
          <p style={{ fontSize: "13px", fontWeight: 700, color: C.text, marginBottom: "2px" }}>
            Trigger AI Evaluation
          </p>
          <p style={{ fontSize: "11px", color: C.textMuted }}>
            {canTriggerAI
              ? `${assignedSheets.length} assigned sheet(s) ready for OCR + AI evaluation`
              : aiTriggerLoading
                ? "Triggering AI evaluation..."
                : "Assign sheets to faculty first before triggering AI"}
          </p>
        </div>
        <button
          onClick={() => canTriggerAI && onTriggerAI()}
          disabled={!canTriggerAI}
          style={{
            background: canTriggerAI
              ? `linear-gradient(135deg,${C.navy},#003087)`
              : C.borderLight,
            color: "#fff", border: "none", padding: "10px 22px",
            borderRadius: "5px", fontSize: "13px", fontWeight: 800,
            cursor: canTriggerAI ? "pointer" : "not-allowed",
            borderBottom: canTriggerAI ? `3px solid ${C.gold}` : "none",
            display: "flex", alignItems: "center", gap: "8px",
            letterSpacing: "0.03em",
          }}>
          <Icon name="ai" size={15} color="#fff" />
          {aiTriggerLoading ? "Triggering..." : "Trigger AI Evaluation"}
        </button>
      </div>

      {/* Sheet table */}
      <AUTable cols={[
        "Barcode", "Roll No", "Student", "Subject", "Exam",
        "Assigned To", "Uploaded", "Status",
      ]}>
        {visible.map((sh) => (
          <tr key={sh.id}>
            <td style={{ fontFamily: "monospace", fontSize: "11px",
              color: C.textMid }}>{sh.barcode}</td>
            <td style={{ fontSize: "12px", fontWeight: 600,
              color: sh.roll ? C.text : C.danger }}>
              {sh.roll || "—"}
            </td>
            <td style={{ fontSize: "12px" }}>
              {sh.studentName
                ? sh.studentName
                : sh.roll
                  ? sh.roll
                  : <span style={{ color: C.danger, fontSize: "11px" }}>Not mapped</span>}
            </td>
            <td style={{ fontSize: "12px" }}>{sh.subject || "—"}</td>
            <td style={{ fontSize: "12px" }}>{sh.exam    || "—"}</td>
            <td style={{ fontSize: "12px" }}>
              {getFacultyName(sh)
                ? <span style={{ color: C.navy, fontWeight: 600 }}>
                    {getFacultyName(sh)}
                  </span>
                : <span style={{ color: C.textMuted }}>Not assigned</span>}
            </td>
            <td style={{ fontSize: "11px", color: C.textMuted }}>{sh.uploadedAt}</td>
            <td>
              <Badge
                text={STATUS_CONFIG[sh.status]?.label || sh.status}
                type={STATUS_CONFIG[sh.status]?.type  || "info"}
              />
            </td>
          </tr>
        ))}
      </AUTable>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION — EXTERNAL EXAM BOOKLETS
// ─────────────────────────────────────────────────────────────────────────────
const ExternalExamSection = ({ showToast, log }) => {
  const [examEvents,    setExamEvents]    = useState([]);
  const [extBooklets,   setExtBooklets]   = useState([]);
  const [bundles,       setBundles]       = useState([]);
  const [externalFaculty, setExtFaculty] = useState([]);
  const [loading,       setLoading]       = useState(true);

  const [selEvent,    setSelEvent]    = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [fileInput,   setFileInput]   = useState(null);

  const [selBooklets,  setSelBooklets]  = useState([]);
  const [selExaminer,  setSelExaminer]  = useState("");
  const [creating,     setCreating]     = useState(false);
  const [aiEvalBundle, setAiEvalBundle] = useState(null);

  const reload = async () => {
    try {
      const [evts, bkls, bnds, fac] = await Promise.all([
        examEventsApi.list(),
        extApi.booklets.list(),
        extApi.bundles.list(),
        facultyApi.list({ role: "external" }),
      ]);
      setExamEvents(Array.isArray(evts) ? evts : evts.examEvents || evts.data || []);
      setExtBooklets(Array.isArray(bkls) ? bkls : bkls.booklets || bkls.data || []);
      setBundles(Array.isArray(bnds) ? bnds : bnds.bundles || bnds.data || []);
      const facList = Array.isArray(fac) ? fac : fac.faculty || fac.data || [];
      setExtFaculty(facList);
    } catch (err) {
      showToast(`Failed to load data: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    const files = e.target.elements.bookletFiles?.files;
    if (!files || files.length === 0) { showToast("Select at least one PDF/image file.", "error"); return; }
    if (!selEvent) { showToast("Select an exam event first.", "error"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append("booklets", f));
      fd.append("examEventId", selEvent);
      const res = await extApi.booklets.upload(fd);
      const count = res.booklets?.length || res.uploaded || 1;
      showToast(`${count} external booklet(s) uploaded successfully.`);
      log(`Uploaded ${count} external booklet(s) for event ${examEvents.find(e=>e._id===selEvent)?.name || selEvent}`);
      e.target.reset();
      await reload();
    } catch (err) {
      showToast(`Upload failed: ${err.message}`, "error");
    } finally {
      setUploading(false);
    }
  };

  const toggleBooklet = (id) =>
    setSelBooklets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleCreateBundle = async () => {
    if (selBooklets.length === 0) { showToast("Select at least one booklet.", "error"); return; }
    if (!selExaminer)             { showToast("Select an examiner.", "error"); return; }
    setCreating(true);
    try {
      await extApi.bundles.create({ bookletIds: selBooklets, examinerId: selExaminer });
      showToast("Bundle created and assigned to examiner.");
      log(`Bundle created: ${selBooklets.length} booklets → examiner ${externalFaculty.find(f=>f._id===selExaminer)?.name || selExaminer}`);
      setSelBooklets([]);
      setSelExaminer("");
      await reload();
    } catch (err) {
      showToast(`Bundle creation failed: ${err.message}`, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleAiEvaluate = async (bundleId) => {
    setAiEvalBundle(bundleId);
    try {
      await extApi.bundles.aiEvaluate(bundleId);
      showToast("AI evaluation triggered for bundle.");
      log(`AI evaluation triggered for bundle ${bundleId.slice(-8)}`);
      await reload();
    } catch (err) {
      showToast(`AI evaluate failed: ${err.message}`, "error");
    } finally {
      setAiEvalBundle(null);
    }
  };

  const unassigned = extBooklets.filter(b => !b.bundle && !b.examiner);

  if (loading) return <div style={{ padding:"28px", textAlign:"center", color:C.textMuted }}>Loading external exam data…</div>;

  return (
    <div>
      {/* Upload Card */}
      <Card title="Upload External Exam Booklets" style={{ marginBottom:16, borderTop:`3px solid ${C.blue}` }}>
        <form onSubmit={handleUpload}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>
                Exam Event <span style={{ color:C.gold }}>*</span>
              </label>
              <select name="examEvent" value={selEvent} onChange={e => setSelEvent(e.target.value)} required
                style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, padding:"9px 10px", borderRadius:5, fontSize:13, color:C.text, outline:"none" }}>
                <option value="">Select Exam Event</option>
                {examEvents.map(ev => <option key={ev._id} value={ev._id}>{ev.name || ev.examType} — {ev.subject?.title || ev.subject?.courseCode || ""}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>
                Booklet Files (PDF/Image) <span style={{ color:C.gold }}>*</span>
              </label>
              <input name="bookletFiles" type="file" accept=".pdf,image/*" multiple required
                style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, padding:"8px 10px", borderRadius:5, fontSize:12, color:C.text }} />
            </div>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <button type="submit" disabled={uploading}
              style={{ background:`linear-gradient(135deg,${C.navy},${C.navyMid})`, color:"#fff", border:"none", borderRadius:6, padding:"9px 22px", fontWeight:700, fontSize:13, cursor:uploading?"not-allowed":"pointer", fontFamily:"inherit", opacity:uploading?0.7:1, display:"flex", alignItems:"center", gap:8 }}>
              <Icon name="upload" size={14} color="#fff" />
              {uploading ? "Uploading…" : "Upload Booklets"}
            </button>
            <span style={{ fontSize:12, color:C.textMuted }}>{extBooklets.length} booklet(s) uploaded total</span>
          </div>
        </form>
      </Card>

      {/* Bundle Creation Card */}
      <Card title="Create Bundle & Assign to Examiner" style={{ marginBottom:16, borderTop:`3px solid ${C.goldDark}` }}>
        {unassigned.length === 0 ? (
          <div style={{ background:C.blueLight, border:`1px solid ${C.border}`, borderRadius:6, padding:"16px", textAlign:"center", fontSize:13, color:C.textMuted }}>
            No unassigned booklets available. Upload booklets above first.
          </div>
        ) : (
          <>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>
                Select Booklets ({selBooklets.length} selected)
              </div>
              <div style={{ maxHeight:220, overflowY:"auto", border:`1px solid ${C.border}`, borderRadius:6 }}>
                {unassigned.map((bk, i) => (
                  <div key={bk._id} onClick={() => toggleBooklet(bk._id)}
                    style={{ padding:"9px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${C.borderLight}`, background:selBooklets.includes(bk._id)?C.blueLight:i%2===0?"#fff":"#fafbff" }}>
                    <input type="checkbox" readOnly checked={selBooklets.includes(bk._id)} style={{ cursor:"pointer" }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:C.text, fontFamily:"monospace" }}>{bk.barcode || bk._id?.slice(-8)}</div>
                      <div style={{ fontSize:10, color:C.textMuted }}>{bk.examEvent?.name || bk.examEvent?.examType || "—"} • {bk.subject?.title || bk.subject?.courseCode || "—"}</div>
                    </div>
                    <Badge text="Unassigned" type="warning" />
                  </div>
                ))}
              </div>
              {unassigned.length > 0 && (
                <button onClick={() => setSelBooklets(selBooklets.length === unassigned.length ? [] : unassigned.map(b=>b._id))}
                  style={{ marginTop:6, background:"transparent", border:`1px solid ${C.border}`, color:C.textMid, borderRadius:5, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  {selBooklets.length === unassigned.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>
                Assign to External Examiner <span style={{ color:C.gold }}>*</span>
              </label>
              <select value={selExaminer} onChange={e => setSelExaminer(e.target.value)}
                style={{ width:"100%", maxWidth:420, background:C.bg, border:`1px solid ${C.border}`, padding:"9px 10px", borderRadius:5, fontSize:13, color:C.text, outline:"none" }}>
                <option value="">Select Examiner</option>
                {externalFaculty.map(f => <option key={f._id} value={f._id}>{f.name} — {f.department?.code || f.department?.name || "External"}</option>)}
              </select>
            </div>
            <button onClick={handleCreateBundle} disabled={creating || selBooklets.length===0 || !selExaminer}
              style={{ background:`linear-gradient(135deg,${C.success},#077a41)`, color:"#fff", border:"none", borderRadius:6, padding:"9px 22px", fontWeight:700, fontSize:13, cursor:creating||selBooklets.length===0||!selExaminer?"not-allowed":"pointer", fontFamily:"inherit", opacity:creating||selBooklets.length===0||!selExaminer?0.6:1, display:"flex", alignItems:"center", gap:8 }}>
              <Icon name="check" size={14} color="#fff" />
              {creating ? "Creating…" : `Create Bundle (${selBooklets.length} booklets)`}
            </button>
          </>
        )}
      </Card>

      {/* Bundles Table */}
      <Card title="All External Exam Bundles">
        {bundles.length === 0 ? (
          <div style={{ padding:"16px", textAlign:"center", fontSize:13, color:C.textMuted }}>No bundles created yet.</div>
        ) : (
          <AUTable cols={["Bundle ID","Booklets","Examiner","Exam Event","AI Status","Created","Action"]}>
            {bundles.map(b => {
              const canEval = b.aiStatus !== "completed" && b.aiStatus !== "in_progress";
              const isEvaluating = aiEvalBundle === b._id;
              return (
                <tr key={b._id}>
                  <td style={{ fontFamily:"monospace", fontSize:11, color:C.textMid }}>{b._id?.slice(-8)}</td>
                  <td style={{ fontSize:13, fontWeight:700, color:C.navy, textAlign:"center" }}>{b.booklets?.length ?? b.bookletCount ?? "—"}</td>
                  <td style={{ fontSize:12 }}>{b.examiner?.name || b.examiner || "—"}</td>
                  <td style={{ fontSize:12 }}>{b.examEvent?.name || b.examEvent?.examType || "—"}</td>
                  <td><Badge text={b.aiStatus || b.status || "Pending"} type={b.aiStatus==="completed"?"success":b.aiStatus==="in_progress"?"warning":"info"} /></td>
                  <td style={{ fontSize:11, color:C.textMuted }}>{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "—"}</td>
                  <td>
                    <button
                      onClick={() => canEval && !isEvaluating && handleAiEvaluate(b._id)}
                      disabled={!canEval || isEvaluating}
                      style={{ background: canEval ? `linear-gradient(135deg,${C.navy},#003087)` : C.borderLight, color: "#fff", border: "none", borderRadius: 5, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: canEval && !isEvaluating ? "pointer" : "not-allowed", fontFamily: "inherit", opacity: !canEval || isEvaluating ? 0.5 : 1, display:"flex", alignItems:"center", gap:5 }}>
                      <Icon name="ai" size={12} color="#fff" />
                      {isEvaluating ? "Triggering…" : b.aiStatus === "completed" ? "Done" : "AI Evaluate"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </AUTable>
        )}
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  CLERK DASHBOARD — MAIN
// ─────────────────────────────────────────────────────────────────────────────
const ClerkDashboard = () => {
  const [mode,            setMode]           = useState("internal");
  const [sheets,          setSheets]         = useState([]);
  const [studentsList,    setStudentsList]    = useState([]);
  const [facultyPool,     setFacultyPool]     = useState({ internal: [], external: [] });
  const [loadingSheets,   setLoadingSheets]   = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingFaculty,  setLoadingFaculty]  = useState(true);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [aiTriggerLoading,setAiTriggerLoading]= useState(false);
  const [actLog,          setActLog]          = useState([]);
  const [toast,           setToast]           = useState(null);
  const [deptList,        setDeptList]        = useState([]);
  const [sectionList,     setSectionList]     = useState([]);
  const [selDept,         setSelDept]         = useState("");
  const [selSection,      setSelSection]      = useState("");
  const [selSectionName,  setSelSectionName]  = useState("");

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  const log = useCallback((msg, type = "success") =>
    setActLog((prev) => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev]),
  []);

  // ── Fetch answer booklets from API ────────────────────────────────────────
  const fetchSheets = useCallback(async () => {
    setLoadingSheets(true);
    try {
      const data = await answerBooklets.list();
      const list = Array.isArray(data) ? data : data.booklets || data.data || [];
      setSheets(list.map(mapBooklet));
    } catch (err) {
      console.error("Failed to load answer booklets:", err);
      showToast(`Failed to load answer booklets: ${err.message}`, "error");
    } finally {
      setLoadingSheets(false);
    }
  }, [showToast]);

  // ── Fetch students for barcode mapping dropdown ───────────────────────────
  const fetchStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const data = await students.list({ limit: 500 });
      const list = Array.isArray(data) ? data : data.students || data.data || [];
      setStudentsList(list);
    } catch (err) {
      console.error("Failed to load students:", err);
      showToast(`Failed to load students: ${err.message}`, "error");
    } finally {
      setLoadingStudents(false);
    }
  }, [showToast]);

  // ── Fetch external faculty only (internal comes from section mappings) ────
  const fetchFaculty = useCallback(async () => {
    setLoadingFaculty(true);
    try {
      const externalRaw = await facultyApi.list({ role: "external" });
      const externalList = Array.isArray(externalRaw) ? externalRaw : externalRaw.faculty || externalRaw.data || [];
      setFacultyPool((prev) => ({ ...prev, external: externalList.map(mapFaculty) }));
    } catch (err) {
      console.error("Failed to load external faculty:", err);
      showToast(`Failed to load faculty: ${err.message}`, "error");
    } finally {
      setLoadingFaculty(false);
    }
  }, [showToast]);

  // ── Fetch internal faculty from FacultySubjectMapping for selected section ─
  const fetchMappingFaculty = useCallback(async (sectionId) => {
    if (!sectionId) {
      setFacultyPool((prev) => ({ ...prev, internal: [] }));
      return;
    }
    setLoadingMappings(true);
    try {
      const mappings = await facultyApi.getAllMappings({ section: sectionId });
      const list = Array.isArray(mappings) ? mappings : mappings.data || [];
      const seen = new Set();
      const unique = [];
      list.forEach((m) => {
        if (!m.faculty || seen.has(m.faculty._id)) return;
        seen.add(m.faculty._id);
        const subjectsTaught = list
          .filter((x) => x.faculty?._id === m.faculty._id && x.subject)
          .map((x) => x.subject.title || x.subject.courseCode || "")
          .filter(Boolean);
        unique.push({
          id:       m.faculty._id,
          name:     m.faculty.name,
          dept:     m.faculty.department?.code || m.faculty.department?.name || "",
          subjects: subjectsTaught,
        });
      });
      setFacultyPool((prev) => ({ ...prev, internal: unique }));
    } catch (err) {
      console.error("Failed to load section faculty mappings:", err);
      showToast(`Failed to load section faculty: ${err.message}`, "error");
    } finally {
      setLoadingMappings(false);
    }
  }, [showToast]);

  // ── On mount: load booklets, students, external faculty, departments ──────
  useEffect(() => {
    fetchSheets();
    fetchStudents();
    fetchFaculty();
    departmentsApi.list()
      .then((d) => setDeptList(Array.isArray(d) ? d : d.data || []))
      .catch(() => {});
  }, [fetchSheets, fetchStudents, fetchFaculty]);

  // ── When dept changes → reload sections, reset section ───────────────────
  useEffect(() => {
    if (!selDept) { setSectionList([]); setSelSection(""); setSelSectionName(""); return; }
    sectionsApi.list({ department: selDept })
      .then((d) => setSectionList(Array.isArray(d) ? d : d.data || []))
      .catch(() => setSectionList([]));
    setSelSection("");
    setSelSectionName("");
  }, [selDept]);

  // ── When section changes → load mapped faculty for that section ───────────
  useEffect(() => {
    fetchMappingFaculty(selSection);
  }, [selSection, fetchMappingFaculty]);

  // ── Flat faculty name lookup map (id → name) ──────────────────────────────
  const allFacultyMap = useMemo(() => {
    const map = {};
    [...(facultyPool.internal || []), ...(facultyPool.external || [])].forEach((f) => {
      map[f.id] = f.name;
    });
    return map;
  }, [facultyPool]);

  // ── Upload done: refetch booklets from API ────────────────────────────────
  const handleUploadDone = () => {
    fetchSheets();
    log("Sheets uploaded — refreshing booklet list from server");
  };

  // ── Barcode mapped (local optimistic update) ──────────────────────────────
  const handleMap = (sheetId, data) => {
    setSheets((prev) => prev.map((s) =>
      s.id === sheetId ? { ...s, ...data } : s
    ));
    log(`Mapped ${data.roll} (${data.studentName}) to ${data.subject} ${data.exam}`);
  };

  // ── Single sheet assigned (called per-sheet from AssignSection) ───────────
  const handleAssign = (sheetId, facultyId, facultyName = "") => {
    setSheets((prev) => prev.map((s) =>
      s.id === sheetId
        ? { ...s, status: "assigned", assignedTo: facultyId, assignedName: facultyName }
        : s
    ));
  };

  // ── Batch assign completed ────────────────────────────────────────────────
  const handleBulkAssigned = () => {
    log("Sheets distributed and assigned to faculty");
  };

  // ── Trigger AI evaluation for all assigned sheets ─────────────────────────
  const handleTriggerAI = async () => {
    const assignedSheets = sheets.filter((s) => s.status === "assigned");
    if (assignedSheets.length === 0) return;

    setAiTriggerLoading(true);
    let successCount = 0;
    let errorCount   = 0;

    try {
      // Fire triggerAI for each assigned booklet (settle individually so one failure
      // doesn't block the rest)
      const results = await Promise.allSettled(
        assignedSheets.map((sh) => internalEval.triggerAI(sh.id))
      );

      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          successCount++;
          setSheets((prev) => prev.map((s) =>
            s.id === assignedSheets[i].id ? { ...s, status: "ai_sent" } : s
          ));
        } else {
          errorCount++;
          console.error(`AI trigger failed for booklet ${assignedSheets[i].id}:`, result.reason);
        }
      });

      if (errorCount === 0) {
        showToast(`AI evaluation triggered for ${successCount} booklet(s).`, "success");
        log(`AI OCR + Evaluation triggered for ${successCount} assigned sheet(s)`);
      } else {
        showToast(
          `AI triggered for ${successCount} booklet(s); ${errorCount} failed.`,
          errorCount === results.length ? "error" : "success"
        );
        log(`AI triggered: ${successCount} ok, ${errorCount} failed`, "warning");
      }
    } catch (err) {
      showToast(`AI evaluation trigger failed: ${err.message}`, "error");
      log(`AI trigger error: ${err.message}`, "error");
    } finally {
      setAiTriggerLoading(false);
    }
  };

  const counts = useMemo(() => ({
    total:    sheets.length,
    unmapped: sheets.filter((s) => s.status === "unmapped").length,
    assigned: sheets.filter((s) => ["assigned", "ai_sent"].includes(s.status)).length,
    pending:  sheets.filter((s) => ["unmapped", "mapped"].includes(s.status)).length,
    ai_sent:  sheets.filter((s) => s.status === "ai_sent").length,
  }), [sheets]);

  const isInitialLoading = loadingSheets && sheets.length === 0;

  return (
    <div className="page-anim">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      <Breadcrumb items={["Clerk", "Examination Clerk", "Dashboard"]} />

      {/* ── Workflow strip ── */}
      <div style={{
        background: C.navy, borderRadius: "8px", padding: "14px 22px",
        marginBottom: "20px", borderBottom: `3px solid ${C.gold}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "12px",
      }}>
        <div>
          <p style={{ fontSize: "10px", color: C.gold, fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "3px" }}>
            Clerk Workflow — Answer Sheet Management
          </p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)" }}>
            Upload → Map Barcodes → Assign to Faculty → Trigger AI Evaluation
          </p>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            ["1. Upload",  counts.total > 0 || counts.ai_sent > 0],
            ["2. Map",     counts.unmapped === 0 && counts.total > 0],
            ["3. Assign",  counts.assigned > 0],
            ["4. AI Sent", counts.ai_sent  > 0],
          ].map(([lbl, done]) => (
            <div key={lbl} style={{
              background: done ? `${C.success}30` : "rgba(255,255,255,0.06)",
              border: `1px solid ${done ? `${C.success}60` : "rgba(255,255,255,0.12)"}`,
              borderRadius: "4px", padding: "4px 10px", fontSize: "10px",
              fontWeight: 700, color: done ? C.success : "rgba(255,255,255,0.4)",
            }}>{lbl} {done ? "✓" : ""}</div>
          ))}
        </div>
      </div>

      {/* ── Mode tabs ── */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[["internal","Internal Exam Booklets"],["external","External Exam Booklets"]].map(([key,lbl]) => (
          <button key={key} onClick={() => setMode(key)}
            style={{ padding:"9px 22px", borderRadius:6, border:`1.5px solid ${mode===key?C.navy:C.border}`, background:mode===key?C.navy:"#fff", color:mode===key?"#fff":C.textMid, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ── External Exam Panel ── */}
      {mode === "external" && (
        <ExternalExamSection showToast={showToast} log={log} />
      )}

      {mode === "internal" && (
        <>
          {/* ── Section Picker ── */}
          <Card title="Select Section for Internal Evaluation"
            style={{ marginBottom: "16px", borderTop: `3px solid ${C.navy}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "14px", alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700,
                  color: C.textMuted, textTransform: "uppercase",
                  letterSpacing: "0.06em", marginBottom: "5px" }}>
                  Department
                </label>
                <select value={selDept} onChange={(e) => setSelDept(e.target.value)}
                  style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`,
                    padding: "9px 10px", borderRadius: "5px", fontSize: "13px",
                    color: C.text, outline: "none" }}>
                  <option value="">All Departments</option>
                  {deptList.map((d) => (
                    <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700,
                  color: C.textMuted, textTransform: "uppercase",
                  letterSpacing: "0.06em", marginBottom: "5px" }}>
                  Section <span style={{ color: C.gold }}>*</span>
                </label>
                <select value={selSection}
                  onChange={(e) => {
                    const opt = sectionList.find((s) => s._id === e.target.value);
                    setSelSection(e.target.value);
                    setSelSectionName(opt ? `${opt.name}${opt.semester ? ` — Sem ${opt.semester.number}` : ""}` : "");
                  }}
                  disabled={!selDept}
                  style={{ width: "100%", background: selDept ? C.bg : C.borderLight,
                    border: `1px solid ${C.border}`, padding: "9px 10px",
                    borderRadius: "5px", fontSize: "13px", color: C.text,
                    outline: "none", cursor: selDept ? "pointer" : "not-allowed" }}>
                  <option value="">{selDept ? "Select Section" : "Select department first"}</option>
                  {sectionList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}{s.semester ? ` — Sem ${s.semester.number}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {selSection && (
                <button onClick={() => { setSelDept(""); setSelSection(""); setSelSectionName(""); }}
                  style={{ background: "transparent", border: `1px solid ${C.border}`,
                    color: C.textMid, borderRadius: "5px", padding: "9px 14px",
                    fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    whiteSpace: "nowrap" }}>
                  Clear
                </button>
              )}
            </div>
            {selSection && (
              <div style={{ marginTop: "12px", background: loadingMappings ? C.bg : C.blueLight,
                border: `1px solid ${C.border}`, borderRadius: "6px",
                padding: "10px 14px", display: "flex", alignItems: "center",
                gap: "12px", flexWrap: "wrap" }}>
                {loadingMappings ? (
                  <span style={{ fontSize: "12px", color: C.textMuted, fontStyle: "italic" }}>
                    Loading mapped faculty for section…
                  </span>
                ) : (
                  <>
                    <Icon name="users" size={14} color={C.navy} />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: C.navy }}>
                      {selSectionName}
                    </span>
                    <span style={{ fontSize: "12px", color: C.textMuted }}>
                      {facultyPool.internal.length === 0
                        ? "No faculty mapped to this section. Assign faculty via HOD portal first."
                        : `${facultyPool.internal.length} faculty mapped to this section`}
                    </span>
                    {facultyPool.internal.length > 0 && (
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {facultyPool.internal.map((f) => (
                          <Badge key={f.id} text={f.name} type="info" />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>

          {!selSection ? (
            <div style={{ background: C.blueLight, border: `1px solid ${C.border}`,
              borderRadius: "8px", padding: "32px", textAlign: "center", marginBottom: "16px" }}>
              <Icon name="users" size={32} color={C.border} />
              <p style={{ fontSize: "14px", color: C.navy, fontWeight: 600, marginTop: "12px" }}>
                Select a Section to Begin
              </p>
              <p style={{ fontSize: "12px", color: C.textMuted, marginTop: "6px", maxWidth: "380px", margin: "8px auto 0" }}>
                Choose a department and section above. The faculty pool for internal evaluation
                will automatically load from the HOD's faculty-subject mappings for that section.
              </p>
            </div>
          ) : (
            <>
              {/* ── Loading banner ── */}
              {isInitialLoading && (
                <div style={{
                  background: C.blueLight, border: `1px solid ${C.border}`,
                  borderRadius: "8px", padding: "20px", textAlign: "center",
                  marginBottom: "20px",
                }}>
                  <p style={{ fontSize: "14px", color: C.navy, fontWeight: 600 }}>
                    Fetching data...
                  </p>
                  <p style={{ fontSize: "12px", color: C.textMuted, marginTop: "4px" }}>
                    Loading answer booklets, students, and faculty from the server.
                  </p>
                </div>
              )}

              {/* ── Stats ── */}
              <div style={{ display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                gap: "16px", marginBottom: "20px" }}>
                <MiniStat label="Total Sheets"  value={counts.total}    color={C.navy}    icon="file"  />
                <MiniStat label="Unmapped"      value={counts.unmapped} color={C.danger}  icon="edit"  sub="Need barcode mapping" />
                <MiniStat label="Assigned"      value={counts.assigned} color={C.blue}    icon="users" sub="With faculty" />
                <MiniStat label="AI Triggered"  value={counts.ai_sent}  color={C.success} icon="ai"    sub="In evaluation" />
              </div>

              {/* ── Four workflow sections ── */}
              <UploadSection onUploadDone={handleUploadDone} />
              <BarcodeSection sheets={sheets} onMap={handleMap} studentsList={studentsList} />
              <AssignSection
                sheets={sheets}
                onAssign={handleAssign}
                onBulkAssigned={handleBulkAssigned}
                facultyPool={facultyPool}
                assignLoading={loadingFaculty || loadingMappings}
                showToast={showToast}
              />
              <StatusSection
                sheets={sheets}
                allFacultyMap={allFacultyMap}
                onTriggerAI={handleTriggerAI}
                aiTriggerLoading={aiTriggerLoading}
              />
            </>
          )}
        </>
      )}

      {/* ── Activity log ── */}
      {actLog.length > 0 && (
        <Card title="Activity Log" style={{ marginTop: "16px" }}>
          {actLog.slice(0, 10).map((l, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              padding: "7px 0", borderBottom: `1px solid ${C.borderLight}`,
            }}>
              <div style={{
                width: "7px", height: "7px", borderRadius: "50%",
                marginTop: "5px", flexShrink: 0,
                background: l.type === "success" ? C.success : C.warning,
              }} />
              <div style={{ flex: 1, fontSize: "12px", color: C.textMid }}>{l.msg}</div>
              <div style={{ fontSize: "10px", color: C.textMuted, flexShrink: 0 }}>{l.time}</div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

export default ClerkDashboard;
