import { useState, useEffect } from "react";
import {
  departments as departmentsApi,
  students as studentsApi,
  sections as sectionsApi,
  auth,
} from "../../services/api.js";
import { Card } from "../../components/ui/Card";
import { GoldBtn, OutlineBtn } from "../../components/ui/Buttons";
import Badge from "../../components/ui/Badge";
import Icon from "../../components/ui/Icon";
import C from "../../constants/colors";
import { inp, Err, Sel, lookupStudentProfile } from "./shared.jsx";

const StudentsTab = ({ toast, colleges }) => {
  const [collegeId,   setCollegeId]   = useState("");
  const [depts,       setDepts]       = useState([]);
  const [deptId,      setDeptId]      = useState("");
  const [sections,    setSections]    = useState([]);
  const [sectionId,   setSectionId]   = useState("");
  const [newSection,  setNewSection]  = useState("");
  const [students,    setStudents]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [form,        setForm]        = useState({ name: "", email: "", rollNumber: "", semester: "", password: "" });
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState("");

  useEffect(() => {
    if (!collegeId) { setDepts([]); setDeptId(""); return; }
    departmentsApi.list({ college: collegeId }).then(list => setDepts(list || [])).catch(() => {});
  }, [collegeId]);

  useEffect(() => {
    if (!deptId) { setSections([]); setSectionId(""); return; }
    sectionsApi.list({ department: deptId }).then(list => setSections(list || [])).catch(() => {});
  }, [deptId]);

  useEffect(() => {
    if (!sectionId) { setStudents([]); return; }
    setLoading(true);
    sectionsApi.getStudents(sectionId)
      .then(list => setStudents(list || []))
      .catch(() => studentsApi.list({ department: deptId }).then(list => setStudents(list || [])).catch(() => {}))
      .finally(() => setLoading(false));
  }, [sectionId, deptId]);

  const selectedSection    = sections.find(s => s._id === sectionId);
  const selectedSectionName = selectedSection?.name || "";
  const sectionSemester    = selectedSection?.semester?.number || null;

  useEffect(() => {
    if (sectionSemester && !form.semester) {
      setForm(f => ({ ...f, semester: String(sectionSemester) }));
    }
  }, [sectionId, sectionSemester]);

  const addSection = async () => {
    if (!newSection.trim() || !deptId) return;
    try {
      const created = await sectionsApi.create({ name: newSection.trim().toUpperCase(), department: deptId, college: collegeId });
      setSections(prev => [...prev, created]);
      setNewSection("");
      toast.show(`Section ${created.name} created.`);
    } catch (e) {
      toast.show(e.message || "Failed to create section.", "error");
    }
  };

  const addStudent = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.rollNumber.trim()) return setErr("Name, email and roll number are required.");
    if (!sectionId) return setErr("Select a section first.");
    setErr(""); setSaving(true);
    try {
      const semesterNum = parseInt(form.semester) || sectionSemester || 1;
      await auth.register({
        name:            form.name.trim(),
        email:           form.email.trim(),
        password:        form.password || "Welcome@123",
        role:            "student",
        department:      deptId,
        rollNumber:      form.rollNumber.trim(),
        currentSemester: semesterNum,
      });
      const profile = await lookupStudentProfile(form.email.trim());
      if (profile) {
        await Promise.all([
          sectionsApi.addStudent(sectionId, profile._id).catch(() => {}),
          studentsApi.update(profile._id, { section: sectionId }).catch(() => {}),
        ]);
        setStudents(prev => [...prev, { ...profile, section: sectionId, currentSemester: semesterNum }]);
      } else {
        setStudents(prev => [...prev, { name: form.name, email: form.email, rollNumber: form.rollNumber, currentSemester: semesterNum }]);
      }
      setForm({ name: "", email: "", rollNumber: "", semester: "", password: "" });
      toast.show(`Student "${form.name}" added to Section ${selectedSectionName}.`);
    } catch (e) {
      setErr(e.message || "Failed to add student.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card title="Select College → Department → Section" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: deptId ? 14 : 0 }}>
          <Sel label="College"    value={collegeId} onChange={v => { setCollegeId(v); setDeptId(""); setSectionId(""); }} list={colleges} />
          <Sel label="Department" value={deptId}    onChange={v => { setDeptId(v); setSectionId(""); }} list={depts} placeholder={collegeId ? "Select dept" : "—"} />
          <Sel
            label="Section"
            value={sectionId}
            onChange={v => { setSectionId(v); setForm(f => ({ ...f, semester: "" })); }}
            list={sections.map(s => ({ _id: s._id, name: `Section ${s.name}${s.semester?.number ? ` — Sem ${s.semester.number}` : ""}` }))}
            placeholder={deptId ? "Select section" : "—"}
          />
        </div>
        {deptId && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", borderTop: `1px solid ${C.borderLight}`, paddingTop: 12 }}>
            <input value={newSection} onChange={e => setNewSection(e.target.value.toUpperCase())} placeholder="New section name (e.g. A, B, C)" style={{ ...inp, flex: 1 }} onKeyDown={e => e.key === "Enter" && addSection()} />
            <OutlineBtn onClick={addSection} disabled={!newSection.trim()}>
              <Icon name="plus" size={13} color={C.navy} /> Add Section
            </OutlineBtn>
          </div>
        )}
      </Card>

      {sectionId && (
        <Card title="Add Student" style={{ marginBottom: 16 }}>
          <div style={{ background: C.blueLight, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: C.navy }}>
              <span style={{ fontWeight: 700 }}>Section:</span> <span style={{ fontFamily: "monospace", fontWeight: 800 }}>{selectedSectionName}</span>
            </div>
            <div style={{ fontSize: 12, color: C.navy }}>
              <span style={{ fontWeight: 700 }}>Semester:</span>{" "}
              {sectionSemester
                ? <span style={{ fontWeight: 800, color: C.green }}>Semester {sectionSemester} (auto-filled)</span>
                : <span style={{ color: C.warning }}>Not linked to section — enter manually below</span>}
            </div>
          </div>
          <Err msg={err} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input value={form.name}       onChange={e => setForm(f => ({ ...f, name: e.target.value }))}       placeholder="Full Name *"  style={inp} />
            <input value={form.email}      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}      placeholder="Email *"       style={inp} type="email" />
            <input value={form.rollNumber} onChange={e => setForm(f => ({ ...f, rollNumber: e.target.value }))} placeholder="Roll Number *" style={inp} />
            <input value={form.semester}   onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}   placeholder={sectionSemester ? `Semester (auto: ${sectionSemester})` : "Semester (1–8) *"} style={inp} type="number" min={1} max={8} />
            <input value={form.password}   onChange={e => setForm(f => ({ ...f, password: e.target.value }))}   placeholder="Password (default: Welcome@123)" style={inp} type="password" />
          </div>
          <GoldBtn onClick={addStudent} disabled={saving}>
            <Icon name="plus" size={14} color="#fff" /> {saving ? "Adding…" : "Add Student"}
          </GoldBtn>
        </Card>
      )}

      {sectionId && (
        <Card title={loading ? "Students — Loading…" : `Students — Section ${selectedSectionName}${sectionSemester ? ` · Semester ${sectionSemester}` : ""} (${students.length})`}>
          {loading ? (
            <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>Loading…</div>
          ) : students.length === 0 ? (
            <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>No students yet in this section.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {["#", "Name", "Roll No", "Email", "Section", "Semester"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s._id || i} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                    <td style={{ padding: "9px 10px", color: C.textMuted, fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: "9px 10px", fontWeight: 700, color: C.navy }}>{s.name}</td>
                    <td style={{ padding: "9px 10px", fontFamily: "monospace", fontSize: 12 }}>{s.rollNumber || "—"}</td>
                    <td style={{ padding: "9px 10px", color: C.textMid, fontSize: 12 }}>{s.email || "—"}</td>
                    <td style={{ padding: "9px 10px" }}><Badge text={`Sec ${selectedSectionName}`} type="navy" /></td>
                    <td style={{ padding: "9px 10px" }}><Badge text={s.currentSemester ? `Sem ${s.currentSemester}` : sectionSemester ? `Sem ${sectionSemester}` : "—"} type="info" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </>
  );
};

export default StudentsTab;
