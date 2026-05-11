import { useState, useEffect } from "react";
import {
  departments as departmentsApi,
  faculty as facultyApi,
  subjects as subjectsApi,
  auth,
} from "../../services/api.js";
import { Card } from "../../components/ui/Card";
import { GoldBtn, OutlineBtn } from "../../components/ui/Buttons";
import Icon from "../../components/ui/Icon";
import C from "../../constants/colors";
import { inp, selStyle, Err, Sel, lookupFacultyProfile } from "./shared.jsx";

const SubjectAssigner = ({ fac, subjects, onAssign }) => {
  const [selected,  setSelected]  = useState("");
  const [assigning, setAssigning] = useState(false);

  const assignedIds = new Set(
    (fac.subjectsTaught || []).map(s => (typeof s === "string" ? s : s._id?.toString()))
  );
  const available = subjects.filter(s => !assignedIds.has(s._id?.toString()));

  const go = async () => {
    if (!selected) return;
    setAssigning(true);
    await onAssign(selected).catch(() => {});
    setSelected("");
    setAssigning(false);
  };

  return (
    <div style={{ marginTop: 10, paddingLeft: 50, display: "flex", gap: 10, alignItems: "center" }}>
      <div style={{ position: "relative", flex: 1 }}>
        <select value={selected} onChange={e => setSelected(e.target.value)} style={selStyle}>
          <option value="">
            {available.length === 0
              ? "All subjects already assigned (or no subjects exist for this dept)"
              : "Select subject to assign…"}
          </option>
          {available.map(s => (
            <option key={s._id} value={s._id}>
              {s.courseCode ? `${s.courseCode} — ${s.title}` : s.title}
            </option>
          ))}
        </select>
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: C.navy }}>▼</span>
      </div>
      <GoldBtn onClick={go} disabled={assigning || !selected} style={{ flexShrink: 0 }}>
        {assigning ? "…" : "Assign"}
      </GoldBtn>
    </div>
  );
};

const FacultyTab = ({ toast, colleges }) => {
  const [collegeId,  setCollegeId]  = useState("");
  const [depts,      setDepts]      = useState([]);
  const [deptId,     setDeptId]     = useState("");
  const [faculties,  setFaculties]  = useState([]);
  const [subjects,   setSubjects]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [expanded,   setExpanded]   = useState(null);
  const [form,       setForm]       = useState({ name: "", email: "", password: "", employeeId: "" });
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState("");

  useEffect(() => {
    if (!collegeId) { setDepts([]); setDeptId(""); return; }
    departmentsApi.list({ college: collegeId }).then(list => setDepts(list || [])).catch(() => {});
  }, [collegeId]);

  useEffect(() => {
    if (!deptId) { setFaculties([]); setSubjects([]); return; }
    setLoading(true);
    Promise.all([
      facultyApi.list({ department: deptId }),
      subjectsApi.list({ department: deptId }),
    ])
      .then(([fac, sub]) => { setFaculties(fac || []); setSubjects(sub || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deptId]);

  const addFaculty = async () => {
    if (!form.name.trim() || !form.email.trim()) return setErr("Name and email are required.");
    if (!deptId) return setErr("Select a department first.");
    setErr(""); setSaving(true);
    try {
      await auth.register({
        name:       form.name.trim(),
        email:      form.email.trim(),
        password:   form.password || "Welcome@123",
        role:       "faculty",
        employeeId: form.employeeId,
        department: deptId,
      });
      const profile = await lookupFacultyProfile(form.email.trim());
      if (profile) setFaculties(prev => [...prev, profile]);
      setForm({ name: "", email: "", password: "", employeeId: "" });
      toast.show(`Faculty "${form.name}" added.`);
    } catch (e) {
      setErr(e.message || "Failed to add faculty.");
    } finally {
      setSaving(false);
    }
  };

  const assignSubject = async (fac, subjectId) => {
    if (!subjectId) return;
    try {
      await facultyApi.update(fac._id, { $addToSet: { subjectsTaught: subjectId } });
      const subjectObj = subjects.find(s => s._id === subjectId);
      setFaculties(prev => prev.map(f =>
        f._id === fac._id
          ? { ...f, subjectsTaught: [...(f.subjectsTaught || []), subjectObj || { _id: subjectId }] }
          : f
      ));
      toast.show("Subject assigned.");
    } catch (e) {
      toast.show(e.message || "Failed to assign subject.", "error");
    }
  };

  return (
    <>
      <Card title="Select College & Department" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Sel label="College"    value={collegeId} onChange={v => { setCollegeId(v); setDeptId(""); }} list={colleges} />
          <Sel label="Department" value={deptId}    onChange={setDeptId} list={depts} placeholder={collegeId ? "Select dept" : "—"} />
        </div>
        {subjects.length === 0 && deptId && !loading && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 6, fontSize: 12, color: "#7c5800" }}>
            ⚠ No subjects found for this department. Add subjects in the <b>Subjects</b> tab first.
          </div>
        )}
      </Card>

      {deptId && (
        <>
          <Card title="Add Faculty" style={{ marginBottom: 16 }}>
            <Err msg={err} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <input value={form.name}       onChange={e => setForm(f => ({ ...f, name: e.target.value }))}       placeholder="Full Name *"                style={inp} />
              <input value={form.email}      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}      placeholder="Email *"                     style={inp} type="email" />
              <input value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} placeholder="Employee ID (auto if blank)"  style={inp} />
              <input value={form.password}   onChange={e => setForm(f => ({ ...f, password: e.target.value }))}   placeholder="Password (default: Welcome@123)" style={inp} type="password" />
            </div>
            <GoldBtn onClick={addFaculty} disabled={saving}>
              <Icon name="plus" size={14} color="#fff" /> {saving ? "Adding…" : "Add Faculty"}
            </GoldBtn>
          </Card>

          <Card title={loading ? "Faculty — Loading…" : `Faculty (${faculties.length})`}>
            {loading ? (
              <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>Loading…</div>
            ) : faculties.length === 0 ? (
              <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>No faculty yet in this department.</div>
            ) : faculties.map(f => {
              const taught = f.subjectsTaught || [];
              const isOpen = expanded === f._id;
              return (
                <div key={f._id} style={{ borderBottom: `1px solid ${C.borderLight}`, paddingBottom: 12, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontWeight: 800, fontSize: 13 }}>
                      {f.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{f.email}{f.employeeId ? ` · ${f.employeeId}` : ""}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {taught.length === 0 ? (
                          <span style={{ fontSize: 11, color: C.textMuted, fontStyle: "italic" }}>No subjects assigned</span>
                        ) : taught.map((s, i) => (
                          <span key={i} style={{ background: C.blueLight, border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, color: C.navy }}>
                            {s.courseCode || s.title || "—"}
                          </span>
                        ))}
                      </div>
                    </div>
                    <OutlineBtn onClick={() => setExpanded(isOpen ? null : f._id)} style={{ fontSize: 11, padding: "4px 10px", flexShrink: 0 }}>
                      {isOpen ? "Done" : "Assign Subject"}
                    </OutlineBtn>
                  </div>
                  {isOpen && (
                    <SubjectAssigner fac={f} subjects={subjects} onAssign={subId => assignSubject(f, subId)} />
                  )}
                </div>
              );
            })}
          </Card>
        </>
      )}
    </>
  );
};

export default FacultyTab;
