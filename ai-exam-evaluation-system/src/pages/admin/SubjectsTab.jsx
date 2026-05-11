import { useState, useEffect } from "react";
import {
  departments as departmentsApi,
  regulations as regulationsApi,
  semesters as semestersApi,
  subjects as subjectsApi,
} from "../../services/api.js";
import { Card } from "../../components/ui/Card";
import { GoldBtn } from "../../components/ui/Buttons";
import Badge from "../../components/ui/Badge";
import Icon from "../../components/ui/Icon";
import C from "../../constants/colors";
import { inp, selStyle, Err, Sel } from "./shared.jsx";

const SUBJECT_TYPES = ["Theory", "Lab", "Minor", "Employability", "Research", "Other"];

const SubjectsTab = ({ toast, colleges }) => {
  const [collegeId,  setCollegeId]  = useState("");
  const [depts,      setDepts]      = useState([]);
  const [deptId,     setDeptId]     = useState("");
  const [regs,       setRegs]       = useState([]);
  const [regId,      setRegId]      = useState("");
  const [sems,       setSems]       = useState([]);
  const [subjects,   setSubjects]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [form,       setForm]       = useState({ courseCode: "", title: "", semesterId: "", type: "Theory" });
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState("");
  const [editId,     setEditId]     = useState(null);
  const [editForm,   setEditForm]   = useState({ courseCode: "", title: "", type: "Theory" });

  useEffect(() => {
    if (!collegeId) { setDepts([]); setRegs([]); setDeptId(""); setRegId(""); return; }
    departmentsApi.list({ college: collegeId }).then(list => setDepts(list || [])).catch(() => {});
    regulationsApi.list({ college: collegeId }).then(list => setRegs(list || [])).catch(() => {});
  }, [collegeId]);

  useEffect(() => {
    if (!regId) { setSems([]); return; }
    semestersApi.list({ regulation: regId }).then(list => setSems(list || [])).catch(() => {});
  }, [regId]);

  useEffect(() => {
    if (!deptId) { setSubjects([]); return; }
    setLoading(true);
    subjectsApi.list({ department: deptId })
      .then(list => setSubjects(list || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deptId]);

  const addSubject = async () => {
    if (!deptId)                 return setErr("Select a department.");
    if (!regId)                  return setErr("Select a regulation.");
    if (!form.semesterId)        return setErr("Select a semester.");
    if (!form.courseCode.trim()) return setErr("Course code is required.");
    if (!form.title.trim())      return setErr("Subject title is required.");
    setErr(""); setSaving(true);
    try {
      const created = await subjectsApi.create({
        courseCode: form.courseCode.trim().toUpperCase(),
        title:      form.title.trim(),
        department: deptId,
        regulation: regId,
        semester:   form.semesterId,
        type:       form.type,
      });
      setSubjects(prev => [...prev, created]);
      setForm(f => ({ ...f, courseCode: "", title: "" }));
      toast.show(`Subject "${created.title}" added.`);
    } catch (e) {
      setErr(e.message || "Failed to create subject.");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editForm.courseCode.trim() || !editForm.title.trim()) return;
    try {
      const updated = await subjectsApi.update(editId, {
        courseCode: editForm.courseCode.trim().toUpperCase(),
        title:      editForm.title.trim(),
        type:       editForm.type,
      });
      setSubjects(prev => prev.map(s => s._id === editId ? { ...s, ...updated } : s));
      toast.show(`Subject "${editForm.title}" updated.`);
      setEditId(null);
    } catch (e) {
      setErr(e.message || "Failed to update subject.");
    }
  };

  return (
    <>
      <Card title="Select College & Department" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <Sel label="College"    value={collegeId} onChange={v => { setCollegeId(v); setDeptId(""); setRegId(""); }} list={colleges} />
          <Sel label="Department" value={deptId}    onChange={setDeptId} list={depts} placeholder={collegeId ? "Select dept" : "—"} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Sel label="Regulation" value={regId} onChange={v => { setRegId(v); setForm(f => ({ ...f, semesterId: "" })); }} list={regs.map(r => ({ _id: r._id, name: r.name || r.code }))} placeholder={collegeId ? "Select regulation" : "—"} />
          <Sel label="Semester"   value={form.semesterId} onChange={v => setForm(f => ({ ...f, semesterId: v }))} list={sems.map(s => ({ _id: s._id, name: `Semester ${s.number ?? s.name}` }))} placeholder={regId ? "Select semester" : "—"} disabled={!regId} />
        </div>
      </Card>

      {deptId && regId && form.semesterId && (
        <Card title="Add Subject" style={{ marginBottom: 16 }}>
          <Err msg={err} />
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 140px auto", gap: 10, alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Course Code *</label>
              <input value={form.courseCode} onChange={e => setForm(f => ({ ...f, courseCode: e.target.value.toUpperCase() }))} placeholder="CS601" style={inp} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Data Structures & Algorithms" style={inp} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Type</label>
              <div style={{ position: "relative" }}>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={selStyle}>
                  {SUBJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: C.navy }}>▼</span>
              </div>
            </div>
            <GoldBtn onClick={addSubject} disabled={saving} style={{ height: 38 }}>
              <Icon name="plus" size={14} color="#fff" /> Add
            </GoldBtn>
          </div>
        </Card>
      )}

      {deptId && (
        <Card title={loading ? "Subjects — Loading…" : `Subjects in Department (${subjects.length})`}>
          {loading ? (
            <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>Loading…</div>
          ) : subjects.length === 0 ? (
            <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>
              No subjects yet. Select a regulation and semester above, then add subjects.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {["Course Code", "Title", "Semester", "Type", ""].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjects.map(s => (
                  <tr key={s._id} style={{ borderTop: `1px solid ${C.borderLight}`, background: editId === s._id ? "#fffbeb" : "transparent" }}>
                    {editId === s._id ? (
                      <>
                        <td style={{ padding: "7px 8px" }}>
                          <input value={editForm.courseCode} onChange={e => setEditForm(f => ({ ...f, courseCode: e.target.value.toUpperCase() }))} style={{ ...inp, width: 100, padding: "5px 8px" }} />
                        </td>
                        <td style={{ padding: "7px 8px" }}>
                          <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} style={{ ...inp, padding: "5px 8px" }} />
                        </td>
                        <td style={{ padding: "7px 8px", color: C.textMid }}>
                          {s.semester?.number ? `Sem ${s.semester.number}` : s.semester?.name || "—"}
                        </td>
                        <td style={{ padding: "7px 8px" }}>
                          <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} style={{ ...selStyle, padding: "5px 8px", width: "auto" }}>
                            {SUBJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "7px 8px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={saveEdit} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
                            <button onClick={() => setEditId(null)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textMid, borderRadius: 5, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: "9px 10px", fontFamily: "monospace", fontWeight: 700, color: C.navy }}>{s.courseCode}</td>
                        <td style={{ padding: "9px 10px", fontWeight: 600, color: C.text }}>{s.title}</td>
                        <td style={{ padding: "9px 10px", color: C.textMid }}>
                          {s.semester?.number ? `Sem ${s.semester.number}` : s.semester?.name || "—"}
                        </td>
                        <td style={{ padding: "9px 10px" }}><Badge text={s.type || "Theory"} type="info" /></td>
                        <td style={{ padding: "9px 10px" }}>
                          <button onClick={() => { setEditId(s._id); setEditForm({ courseCode: s.courseCode, title: s.title, type: s.type || "Theory" }); }} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.navy, borderRadius: 5, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
                        </td>
                      </>
                    )}
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

export default SubjectsTab;
