import { useState, useEffect } from "react";
import { colleges as collegesApi, auth } from "../../services/api.js";
import { Card } from "../../components/ui/Card";
import { GoldBtn, OutlineBtn } from "../../components/ui/Buttons";
import Icon from "../../components/ui/Icon";
import C from "../../constants/colors";
import { inp, Err, AssignRoleForm, lookupFacultyProfile } from "./shared.jsx";

const ROLES = [
  { key: "vc",            roleName: "vc",        label: "Vice Chancellor"     },
  { key: "chairman",      roleName: "chairman",  label: "Chairman"            },
  { key: "principal",     roleName: "principal", label: "Principal"           },
  { key: "examCellAdmin", roleName: "examcell",  label: "Exam Cell Admin"     },
  { key: "ce",            roleName: "ce",        label: "Controller of Exams" },
  { key: "clerk",         roleName: "clerk",     label: "Exam Clerk"          },
];

const CollegesTab = ({ toast, onCollegeAdded }) => {
  const [colleges, setColleges] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState({ code: "", name: "" });
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    collegesApi.list()
      .then(list => setColleges(list || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addCollege = async () => {
    if (!form.code.trim()) return setErr("College code is required (e.g. AUS).");
    if (!form.name.trim()) return setErr("College full name is required.");
    setErr(""); setSaving(true);
    try {
      const created = await collegesApi.create({ code: form.code.trim().toUpperCase(), name: form.name.trim() });
      setColleges(prev => [...prev, created]);
      onCollegeAdded?.(created);
      setForm({ code: "", name: "" });
      toast.show(`College "${created.name}" added.`);
    } catch (e) {
      setErr(e.message || "Failed to create college.");
    } finally {
      setSaving(false);
    }
  };

  const assignRole = async (college, roleKey, roleName, form) => {
    const result  = await auth.register({ ...form, role: roleName });
    const newUser = result.user || result;
    const profile = await lookupFacultyProfile(form.email);
    if (!profile) throw new Error("Faculty profile not found after registration. Try again.");
    await collegesApi.update(college._id, { [roleKey]: profile._id });
    setColleges(prev => prev.map(c =>
      c._id === college._id ? { ...c, [roleKey]: { _id: profile._id, name: newUser.name || form.name } } : c
    ));
    toast.show(`${roleKey.toUpperCase()} assigned to ${college.name}.`);
  };

  return (
    <>
      <Card title="Add College" style={{ marginBottom: 16 }}>
        <Err msg={err} />
        <div style={{ display: "grid", gridTemplateColumns: "130px 1fr auto", gap: 10, alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Code *</label>
            <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="AUS" style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Full Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Aditya University" style={inp} onKeyDown={e => e.key === "Enter" && addCollege()} />
          </div>
          <GoldBtn onClick={addCollege} disabled={saving} style={{ height: 38 }}>
            <Icon name="plus" size={14} color="#fff" /> Add
          </GoldBtn>
        </div>
      </Card>

      <Card title={`All Colleges (${colleges.length})`}>
        {loading ? (
          <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>Loading…</div>
        ) : colleges.length === 0 ? (
          <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>No colleges yet. Add one above.</div>
        ) : colleges.map(c => (
          <div key={c._id} style={{ borderBottom: `1px solid ${C.borderLight}`, paddingBottom: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "#fff", fontWeight: 900, fontSize: 14 }}>{c.code?.slice(0, 3)}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.navy }}>{c.name} <span style={{ fontSize: 11, color: C.textMuted }}>({c.code})</span></div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                  {[c.vc, c.chairman, c.principal].filter(x => x?.name).map(u => u.name).join(" · ") || "No officials assigned yet"}
                </div>
              </div>
              <OutlineBtn onClick={() => setExpanded(expanded === c._id ? null : c._id)} style={{ fontSize: 11, padding: "4px 12px" }}>
                {expanded === c._id ? "Collapse" : "Manage Officials"}
              </OutlineBtn>
            </div>
            {expanded === c._id && (
              <div style={{ marginTop: 12, paddingLeft: 56, borderTop: `1px solid ${C.borderLight}`, paddingTop: 10 }}>
                {ROLES.map(r => (
                  <AssignRoleForm
                    key={r.key}
                    roleLabel={r.label}
                    currentUser={c[r.key]}
                    onAssign={form => assignRole(c, r.key, r.roleName, form)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </Card>
    </>
  );
};

export default CollegesTab;
