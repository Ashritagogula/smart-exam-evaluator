import { useState, useEffect, useCallback } from "react";
import { Card } from "../components/ui/Card";
import { GoldBtn, OutlineBtn } from "../components/ui/Buttons";
import Badge from "../components/ui/Badge";
import Breadcrumb from "../components/layout/Breadcrumb";
import Icon from "../components/ui/Icon";
import C from "../constants/colors";
import {
  faculty as facultyApi,
  subjects as subjectsApi,
  sections as sectionsApi,
  academicYears as academicYearsApi,
} from "../services/api.js";

const inp = {
  width: "100%", padding: "9px 11px", fontSize: 13,
  border: `1px solid ${C.border}`, borderRadius: 6,
  outline: "none", boxSizing: "border-box",
};
const selStyle = { ...inp, background: C.white, cursor: "pointer", appearance: "none" };

const Sel = ({ label, value, onChange, list, placeholder = "Select…", disabled = false }) => (
  <div>
    {label && (
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted,
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {label}
      </label>
    )}
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...selStyle, opacity: disabled ? 0.5 : 1 }} disabled={disabled}>
        <option value="">{placeholder}</option>
        {list.map(c => (
          <option key={c._id || c.value} value={c._id || c.value}>
            {c.label || (c.code ? `${c.code} — ${c.name}` : c.name)}
          </option>
        ))}
      </select>
      <span style={{ position: "absolute", right: 10, top: "50%",
        transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: C.navy }}>▼</span>
    </div>
  </div>
);

const HODFacultyPage = ({ user }) => {
  const deptId = user?.profile?.department?._id || user?.profile?.department;
  const deptName = user?.profile?.department?.name || "Department";

  const [facultyList,   setFacultyList]   = useState([]);
  const [subjects,      setSubjects]      = useState([]);
  const [sectionsList,  setSectionsList]  = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [mappings,      setMappings]      = useState([]);
  const [loading,       setLoading]       = useState(true);

  const [form, setForm] = useState({
    facultyId: "", subjectId: "", sectionId: "", academicYearId: "",
  });
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");
  const [success, setSuccess] = useState("");

  // Derived: semester from selected subject
  const selectedSubject = subjects.find(s => s._id === form.subjectId);
  const semesterId = selectedSubject?.semester?._id || selectedSubject?.semester;

  const reload = useCallback(async () => {
    if (!deptId) return;
    setLoading(true);
    try {
      const [fac, sub, sec, yrs, maps] = await Promise.all([
        facultyApi.list({ department: deptId }),
        subjectsApi.list({ department: deptId }),
        sectionsApi.list({ department: deptId }),
        academicYearsApi.list(),
        facultyApi.getAllMappings({ department: deptId }),
      ]);
      setFacultyList(Array.isArray(fac) ? fac : []);
      setSubjects(Array.isArray(sub) ? sub : []);
      setSectionsList(Array.isArray(sec) ? sec : []);
      setAcademicYears(Array.isArray(yrs) ? yrs : []);
      setMappings(Array.isArray(maps) ? maps : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [deptId]);

  useEffect(() => { reload(); }, [reload]);

  const handleAssign = async () => {
    setErr(""); setSuccess("");
    const { facultyId, subjectId, sectionId, academicYearId } = form;
    if (!facultyId || !subjectId || !sectionId || !academicYearId) {
      return setErr("All fields are required.");
    }
    if (!semesterId) {
      return setErr("Selected subject has no semester linked. Please update the subject.");
    }
    setSaving(true);
    try {
      await facultyApi.createMapping({
        faculty:      facultyId,
        subject:      subjectId,
        section:      sectionId,
        semester:     semesterId,
        academicYear: academicYearId,
      });
      setSuccess("Faculty assigned to subject & section successfully.");
      setForm({ facultyId: "", subjectId: "", sectionId: "", academicYearId: "" });
      await reload();
    } catch (e) {
      setErr(e.message || "Failed to create assignment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-anim">
      <Breadcrumb items={["HOD", deptName, "Faculty Assignments"]} />

      {/* ── Assign Form ── */}
      <Card title="Assign Faculty to Subject & Section" style={{ marginBottom: 16 }}>
        {err && (
          <div style={{ background: "#ffe6e6", color: "#b30000", padding: "8px 12px",
            borderRadius: 6, fontSize: 12, marginBottom: 12 }}>{err}</div>
        )}
        {success && (
          <div style={{ background: "#e6f7ef", color: "#14532d", padding: "8px 12px",
            borderRadius: 6, fontSize: 12, marginBottom: 12 }}>{success}</div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <Sel
            label="Faculty *"
            value={form.facultyId}
            onChange={v => setForm(f => ({ ...f, facultyId: v }))}
            list={facultyList.map(f => ({ _id: f._id, name: `${f.name} (${f.employeeId || f.primaryRole})` }))}
            placeholder={loading ? "Loading…" : "Select faculty"}
          />
          <Sel
            label="Subject *"
            value={form.subjectId}
            onChange={v => setForm(f => ({ ...f, subjectId: v }))}
            list={subjects.map(s => ({
              _id: s._id,
              name: s.courseCode ? `${s.courseCode} — ${s.title}` : s.title,
            }))}
            placeholder={loading ? "Loading…" : "Select subject"}
          />
          <Sel
            label="Section *"
            value={form.sectionId}
            onChange={v => setForm(f => ({ ...f, sectionId: v }))}
            list={sectionsList.map(s => ({
              _id: s._id,
              name: `Section ${s.name}${s.semester?.number ? ` (Sem ${s.semester.number})` : ""}`,
            }))}
            placeholder={loading ? "Loading…" : "Select section"}
          />
          <Sel
            label="Academic Year *"
            value={form.academicYearId}
            onChange={v => setForm(f => ({ ...f, academicYearId: v }))}
            list={academicYears.map(y => ({ _id: y._id, name: y.year }))}
            placeholder={loading ? "Loading…" : "Select academic year"}
          />
        </div>

        {selectedSubject && (
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
            Semester: <strong style={{ color: C.navy }}>
              {selectedSubject.semester?.number
                ? `Semester ${selectedSubject.semester.number}`
                : "Not linked — update subject"}
            </strong>
          </div>
        )}

        <GoldBtn onClick={handleAssign} disabled={saving || loading}>
          <Icon name="plus" size={14} color="#fff" />
          {saving ? "Assigning…" : "Assign Faculty"}
        </GoldBtn>
      </Card>

      {/* ── Current Assignments ── */}
      <Card title={`Current Assignments — ${deptName}`}>
        {loading ? (
          <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>Loading assignments…</div>
        ) : mappings.length === 0 ? (
          <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>
            No assignments yet. Use the form above to assign faculty to subjects and sections.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {["Faculty", "Role", "Subject", "Section", "Semester", "Academic Year"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11,
                    fontWeight: 800, color: C.textMuted, textTransform: "uppercase",
                    letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mappings.map(m => (
                <tr key={m._id} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                  <td style={{ padding: "9px 10px", fontWeight: 700, color: C.navy }}>
                    {m.faculty?.name || "—"}
                  </td>
                  <td style={{ padding: "9px 10px" }}>
                    <Badge text={m.faculty?.primaryRole || "faculty"} type="navy" />
                  </td>
                  <td style={{ padding: "9px 10px", color: C.text }}>
                    {m.subject?.courseCode
                      ? `${m.subject.courseCode} — ${m.subject.title}`
                      : m.subject?.title || "—"}
                  </td>
                  <td style={{ padding: "9px 10px", color: C.textMid }}>
                    Section {m.section?.name || "—"}
                  </td>
                  <td style={{ padding: "9px 10px", color: C.textMid }}>
                    {m.semester?.number ? `Sem ${m.semester.number}` : "—"}
                  </td>
                  <td style={{ padding: "9px 10px", color: C.textMuted, fontSize: 12 }}>
                    {m.academicYear?.year || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Faculty List ── */}
      <Card title={`Faculty in ${deptName}`} style={{ marginTop: 16 }}>
        {loading ? (
          <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>Loading…</div>
        ) : facultyList.length === 0 ? (
          <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>No faculty found in this department.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {["Name", "Employee ID", "Role", "Subjects Taught", "Sections"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11,
                    fontWeight: 800, color: C.textMuted, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facultyList.map(f => (
                <tr key={f._id} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                  <td style={{ padding: "9px 10px", fontWeight: 700, color: C.navy }}>{f.name}</td>
                  <td style={{ padding: "9px 10px", fontFamily: "monospace", fontSize: 12, color: C.textMid }}>
                    {f.employeeId || "—"}
                  </td>
                  <td style={{ padding: "9px 10px" }}>
                    <Badge text={f.primaryRole} type="navy" />
                  </td>
                  <td style={{ padding: "9px 10px", color: C.textMid, fontSize: 12 }}>
                    {(f.subjectsTaught || []).length > 0
                      ? `${f.subjectsTaught.length} subject(s)`
                      : <span style={{ color: C.danger }}>None assigned</span>}
                  </td>
                  <td style={{ padding: "9px 10px", color: C.textMid, fontSize: 12 }}>
                    {(f.sectionsMapped || []).length > 0
                      ? `${f.sectionsMapped.length} section(s)`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};

export default HODFacultyPage;
