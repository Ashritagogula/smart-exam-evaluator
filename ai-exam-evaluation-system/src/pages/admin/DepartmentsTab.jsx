import { useState, useEffect } from "react";
import { departments as departmentsApi, auth } from "../../services/api.js";
import { Card } from "../../components/ui/Card";
import { GoldBtn, OutlineBtn } from "../../components/ui/Buttons";
import Icon from "../../components/ui/Icon";
import C from "../../constants/colors";
import { inp, Err, Sel, AssignRoleForm, lookupFacultyProfile } from "./shared.jsx";

const DepartmentsTab = ({ toast, colleges }) => {
  const [collegeId, setCollegeId] = useState("");
  const [depts,     setDepts]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [expanded,  setExpanded]  = useState(null);
  const [form,      setForm]      = useState({ name: "", code: "" });
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState("");

  useEffect(() => {
    if (!collegeId) { setDepts([]); return; }
    setLoading(true);
    departmentsApi.list({ college: collegeId })
      .then(list => setDepts(list || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [collegeId]);

  const addDept = async () => {
    if (!collegeId) return setErr("Select a college first.");
    if (!form.code.trim() || !form.name.trim()) return setErr("Code and name are required.");
    setErr(""); setSaving(true);
    try {
      const created = await departmentsApi.create({ name: form.name.trim(), code: form.code.trim().toUpperCase(), college: collegeId });
      setDepts(prev => [...prev, created]);
      setForm({ name: "", code: "" });
      toast.show(`Department "${created.name}" added.`);
    } catch (e) {
      setErr(e.message || "Failed to create department.");
    } finally {
      setSaving(false);
    }
  };

  const assignHOD = async (dept, form) => {
    const result  = await auth.register({ ...form, role: "hod", department: dept._id });
    const newUser = result.user || result;
    const profile = await lookupFacultyProfile(form.email);
    if (!profile) throw new Error("Faculty profile not found after registration.");
    await departmentsApi.update(dept._id, { hod: profile._id });
    setDepts(prev => prev.map(d =>
      d._id === dept._id ? { ...d, hod: { _id: profile._id, name: newUser.name || form.name } } : d
    ));
    toast.show(`HOD assigned to ${dept.name}.`);
  };

  return (
    <>
      <Card title="Select College" style={{ marginBottom: 16 }}>
        <Sel label="College" value={collegeId} onChange={setCollegeId} list={colleges} placeholder="Select college to manage departments" />
      </Card>

      {collegeId && (
        <>
          <Card title="Add Department" style={{ marginBottom: 16 }}>
            <Err msg={err} />
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr auto", gap: 10, alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Code *</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="CSE" style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Full Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Computer Science & Engineering" style={inp} />
              </div>
              <GoldBtn onClick={addDept} disabled={saving} style={{ height: 38 }}>
                <Icon name="plus" size={14} color="#fff" /> Add
              </GoldBtn>
            </div>
          </Card>

          <Card title={loading ? "Departments — Loading…" : `Departments (${depts.length})`}>
            {loading ? (
              <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>Loading…</div>
            ) : depts.length === 0 ? (
              <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>No departments yet for this college.</div>
            ) : depts.map(d => (
              <div key={d._id} style={{ borderBottom: `1px solid ${C.borderLight}`, paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ background: C.blueLight, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", fontWeight: 900, fontSize: 13, color: C.navy, flexShrink: 0 }}>
                    {d.code}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                      HOD: <b>{d.hod?.name || "Not assigned"}</b>
                    </div>
                  </div>
                  <OutlineBtn onClick={() => setExpanded(expanded === d._id ? null : d._id)} style={{ fontSize: 11, padding: "4px 12px" }}>
                    {expanded === d._id ? "Collapse" : "Assign HOD"}
                  </OutlineBtn>
                </div>
                {expanded === d._id && (
                  <div style={{ marginTop: 12 }}>
                    <AssignRoleForm roleLabel="HOD" currentUser={d.hod} onAssign={form => assignHOD(d, form)} />
                  </div>
                )}
              </div>
            ))}
          </Card>
        </>
      )}
    </>
  );
};

export default DepartmentsTab;
