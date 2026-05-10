import { useState, useEffect, useCallback } from "react";
import {
  colleges as collegesApi,
  departments as departmentsApi,
  subjects as subjectsApi,
  faculty as facultyApi,
  students as studentsApi,
  sections as sectionsApi,
  regulations as regulationsApi,
  semesters as semestersApi,
  academicYears as academicYearsApi,
  questionPapers as questionPapersApi,
  auth,
} from "../services/api.js";
import { Card } from "../components/ui/Card";
import { GoldBtn, OutlineBtn, Pill } from "../components/ui/Buttons";
import Badge from "../components/ui/Badge";
import Breadcrumb from "../components/layout/Breadcrumb";
import Icon from "../components/ui/Icon";
import C from "../constants/colors";

// ── Shared style helpers ───────────────────────────────────────────────────────
const inp = {
  width: "100%", padding: "9px 11px", fontSize: 13,
  border: `1px solid ${C.border}`, borderRadius: 6, outline: "none",
  boxSizing: "border-box",
};
const selStyle = {
  ...inp, background: C.white, cursor: "pointer", appearance: "none",
};

const Err = ({ msg }) => msg ? (
  <div style={{ background: "#ffe6e6", color: "#b30000", padding: "8px 12px", borderRadius: 6, fontSize: 12, marginBottom: 10 }}>
    {msg}
  </div>
) : null;

// Dropdown with arrow
const Sel = ({ label, value, onChange, list, placeholder = "Select…", disabled = false }) => (
  <div>
    {label && (
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {label}
      </label>
    )}
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...selStyle, opacity: disabled ? 0.5 : 1 }} disabled={disabled}>
        <option value="">{placeholder}</option>
        {list.map(c => (
          <option key={c._id || c.value} value={c._id || c.value}>
            {c.label || (c.code ? `${c.code} — ${c.name}` : c.name)}
          </option>
        ))}
      </select>
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: C.navy }}>▼</span>
    </div>
  </div>
);

// ── Toast ──────────────────────────────────────────────────────────────────────
const useToast = () => {
  const [msg, setMsg] = useState(null);
  const show = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  };
  return { msg, show };
};

const ToastBanner = ({ msg }) => !msg ? null : (
  <div style={{
    position: "fixed", top: 20, right: 20, zIndex: 9999,
    background: msg.type === "error" ? "#b30000" : "#0a8a4a",
    color: "#fff", padding: "10px 18px", borderRadius: 8,
    fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
  }}>
    {msg.text}
  </div>
);

// ── After auth.register, find the created Faculty/Student profile by email ──────
const lookupFacultyProfile = async (email) => {
  try {
    const list = await facultyApi.list({ search: email });
    return list.find(f => f.email?.toLowerCase() === email.toLowerCase()) || list[0] || null;
  } catch {
    return null;
  }
};

const lookupStudentProfile = async (email) => {
  try {
    const list = await studentsApi.list({ search: email });
    return list.find(s => s.email?.toLowerCase() === email.toLowerCase()) || list[0] || null;
  } catch {
    return null;
  }
};

// ── Assign-Role mini-form ──────────────────────────────────────────────────────
const AssignRoleForm = ({ roleLabel, currentUser, onAssign }) => {
  const [open,  setOpen]  = useState(false);
  const [form,  setForm]  = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [err,   setErr]   = useState("");

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) return setErr("Name and email are required.");
    setErr(""); setSaving(true);
    try {
      await onAssign({ ...form, password: form.password || "Welcome@123" });
      setForm({ name: "", email: "", password: "" });
      setOpen(false);
    } catch (e) {
      setErr(e.message || "Failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
        <span style={{ minWidth: 110, fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {roleLabel}
        </span>
        {currentUser?.name ? (
          <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{currentUser.name}</span>
        ) : (
          <span style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic" }}>Not assigned</span>
        )}
        <OutlineBtn onClick={() => setOpen(o => !o)} style={{ fontSize: 11, padding: "3px 10px", marginLeft: "auto" }}>
          {currentUser?.name ? "Change" : "Assign"}
        </OutlineBtn>
      </div>

      {open && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.navy, marginBottom: 10, textTransform: "uppercase" }}>
            Create & Assign {roleLabel}
          </div>
          <Err msg={err} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input value={form.name}     onChange={e => setForm(f => ({ ...f, name: e.target.value }))}     placeholder="Full Name *"  style={inp} />
            <input value={form.email}    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}    placeholder="Email *"      style={inp} type="email" />
          </div>
          <input value={form.password}   onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Password (default: Welcome@123)" style={{ ...inp, marginBottom: 10 }} type="password" />
          <div style={{ display: "flex", gap: 8 }}>
            <GoldBtn onClick={submit} disabled={saving}>{saving ? "Saving…" : `Create & Assign ${roleLabel}`}</GoldBtn>
            <OutlineBtn onClick={() => setOpen(false)}>Cancel</OutlineBtn>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — COLLEGES
// ══════════════════════════════════════════════════════════════════════════════
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

  // Register the official user, look up the Faculty profile, then update the college
  const assignRole = async (college, roleKey, roleName, form) => {
    const result  = await auth.register({ ...form, role: roleName });
    const newUser = result.user || result;
    // The register endpoint creates a Faculty profile — find it by email
    const profile = await lookupFacultyProfile(form.email);
    if (!profile) throw new Error("Faculty profile not found after registration. Try again.");
    await collegesApi.update(college._id, { [roleKey]: profile._id });
    setColleges(prev => prev.map(c =>
      c._id === college._id ? { ...c, [roleKey]: { _id: profile._id, name: newUser.name || form.name } } : c
    ));
    toast.show(`${roleKey.toUpperCase()} assigned to ${college.name}.`);
  };

  const ROLES = [
    { key: "vc",            roleName: "vc",        label: "Vice Chancellor"    },
    { key: "chairman",      roleName: "chairman",  label: "Chairman"           },
    { key: "principal",     roleName: "principal", label: "Principal"          },
    { key: "examCellAdmin", roleName: "examcell",  label: "Exam Cell Admin"    },
    { key: "ce",            roleName: "ce",        label: "Controller of Exams"},
    { key: "clerk",         roleName: "clerk",     label: "Exam Clerk"         },
  ];

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

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — DEPARTMENTS
// ══════════════════════════════════════════════════════════════════════════════
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

  // Register HOD → look up Faculty profile → update department
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
                    <AssignRoleForm
                      roleLabel="HOD"
                      currentUser={d.hod}
                      onAssign={form => assignHOD(d, form)}
                    />
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

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — ACADEMIC YEARS
// ══════════════════════════════════════════════════════════════════════════════
const AcademicYearsTab = ({ toast, colleges }) => {
  const [collegeId, setCollegeId] = useState("");
  const [years,     setYears]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [form,      setForm]      = useState({ year: "", startDate: "", endDate: "" });
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState("");

  useEffect(() => {
    if (!collegeId) { setYears([]); return; }
    setLoading(true);
    academicYearsApi.list({ college: collegeId })
      .then(list => setYears(list || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [collegeId]);

  const addYear = async () => {
    if (!collegeId)          return setErr("Select a college first.");
    if (!form.year.trim())   return setErr("Academic year is required (e.g. 2024-25).");
    if (!/^\d{4}-\d{2,4}$/.test(form.year.trim())) return setErr("Format must be YYYY-YY or YYYY-YYYY (e.g. 2024-25).");
    setErr(""); setSaving(true);
    try {
      const body = { year: form.year.trim(), college: collegeId };
      if (form.startDate) body.startDate = form.startDate;
      if (form.endDate)   body.endDate   = form.endDate;
      const created = await academicYearsApi.create(body);
      setYears(prev => [...prev, created]);
      setForm({ year: "", startDate: "", endDate: "" });
      toast.show(`Academic year "${created.year}" added.`);
    } catch (e) {
      setErr(e.message || "Failed to create academic year.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card title="Select College" style={{ marginBottom: 16 }}>
        <Sel label="College" value={collegeId} onChange={setCollegeId} list={colleges} placeholder="Select college" />
      </Card>

      {collegeId && (
        <>
          <Card title="Add Academic Year" style={{ marginBottom: 16 }}>
            <Err msg={err} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Year * (e.g. 2024-25)</label>
                <input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2024-25" style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Start Date</label>
                <input value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} type="date" style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>End Date</label>
                <input value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} type="date" style={inp} />
              </div>
              <GoldBtn onClick={addYear} disabled={saving} style={{ height: 38 }}>
                <Icon name="plus" size={14} color="#fff" /> Add
              </GoldBtn>
            </div>
          </Card>

          <Card title={loading ? "Academic Years — Loading…" : `Academic Years (${years.length})`}>
            {loading ? (
              <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>Loading…</div>
            ) : years.length === 0 ? (
              <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>No academic years yet for this college.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {["Year", "Start Date", "End Date", "Status"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {years.map(y => (
                    <tr key={y._id} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                      <td style={{ padding: "9px 10px", fontWeight: 700, color: C.navy }}>{y.year}</td>
                      <td style={{ padding: "9px 10px", color: C.textMid }}>{y.startDate ? new Date(y.startDate).toLocaleDateString() : "—"}</td>
                      <td style={{ padding: "9px 10px", color: C.textMid }}>{y.endDate ? new Date(y.endDate).toLocaleDateString() : "—"}</td>
                      <td style={{ padding: "9px 10px" }}><Badge text={y.isActive ? "Active" : "Inactive"} type={y.isActive ? "success" : "warning"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB — REGULATIONS
// ══════════════════════════════════════════════════════════════════════════════
const RegulationsTab = ({ toast, colleges }) => {
  const [collegeId, setCollegeId] = useState("");
  const [regs,      setRegs]      = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState("");
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState({ code: "", name: "", year: "", description: "" });
  const [editForm,  setEditForm]  = useState({ name: "", description: "" });

  useEffect(() => {
    if (!collegeId) { setRegs([]); return; }
    setLoading(true);
    regulationsApi.list({ college: collegeId })
      .then(list => setRegs(list || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [collegeId]);

  const addReg = async () => {
    if (!collegeId)          return setErr("Select a college first.");
    if (!form.code.trim())   return setErr("Regulation code is required (e.g. R24).");
    if (!form.name.trim())   return setErr("Regulation name is required.");
    if (!form.year)          return setErr("Year is required.");
    setErr(""); setSaving(true);
    try {
      const created = await regulationsApi.create({
        code:        form.code.trim().toUpperCase(),
        name:        form.name.trim(),
        year:        parseInt(form.year),
        college:     collegeId,
        description: form.description.trim(),
      });
      setRegs(prev => [created, ...prev]);
      setForm({ code: "", name: "", year: "", description: "" });
      toast.show(`Regulation "${created.code}" added.`);
    } catch (e) {
      setErr(e.message || "Failed to create regulation.");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (id) => {
    try {
      const updated = await regulationsApi.update(id, {
        name:        editForm.name.trim(),
        description: editForm.description.trim(),
      });
      setRegs(prev => prev.map(r => r._id === id ? { ...r, ...updated } : r));
      toast.show("Regulation updated.");
      setEditId(null);
    } catch (e) {
      toast.show(e.message || "Failed to update.", "error");
    }
  };

  return (
    <>
      <Card title="Select College" style={{ marginBottom: 16 }}>
        <Sel label="College" value={collegeId} onChange={setCollegeId} list={colleges} placeholder="Select college to manage regulations" />
      </Card>

      {collegeId && (
        <>
          <Card title="Add Regulation" style={{ marginBottom: 16 }}>
            <Err msg={err} />
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px auto", gap: 10, alignItems: "flex-end", marginBottom: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Code *</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="R24" style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Regulation 2024" style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Year *</label>
                <input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2024" type="number" style={inp} />
              </div>
              <GoldBtn onClick={addReg} disabled={saving} style={{ height: 38 }}>
                <Icon name="plus" size={14} color="#fff" /> Add
              </GoldBtn>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" style={inp} />
            </div>
          </Card>

          <Card title={loading ? "Regulations — Loading…" : `Regulations (${regs.length})`}>
            {loading ? (
              <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>Loading…</div>
            ) : regs.length === 0 ? (
              <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>No regulations yet. Add one above.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {["Code", "Name", "Year", "Description", ""].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {regs.map(r => (
                    <tr key={r._id} style={{ borderTop: `1px solid ${C.borderLight}`, background: editId === r._id ? "#fffbeb" : "transparent" }}>
                      <td style={{ padding: "9px 10px", fontFamily: "monospace", fontWeight: 900, color: C.navy, fontSize: 14 }}>{r.code}</td>
                      {editId === r._id ? (
                        <>
                          <td style={{ padding: "7px 8px" }}>
                            <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={{ ...inp, padding: "5px 8px" }} />
                          </td>
                          <td style={{ padding: "9px 10px", color: C.textMid }}>{r.year}</td>
                          <td style={{ padding: "7px 8px" }}>
                            <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} style={{ ...inp, padding: "5px 8px" }} />
                          </td>
                          <td style={{ padding: "7px 8px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => saveEdit(r._id)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
                              <button onClick={() => setEditId(null)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textMid, borderRadius: 5, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: "9px 10px", fontWeight: 600, color: C.text }}>{r.name}</td>
                          <td style={{ padding: "9px 10px", color: C.textMid }}>{r.year}</td>
                          <td style={{ padding: "9px 10px", color: C.textMuted, fontSize: 12 }}>{r.description || "—"}</td>
                          <td style={{ padding: "9px 10px" }}>
                            <button onClick={() => { setEditId(r._id); setEditForm({ name: r.name, description: r.description || "" }); }} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.navy, borderRadius: 5, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — SEMESTERS
// ══════════════════════════════════════════════════════════════════════════════
const SemestersTab = ({ toast, colleges }) => {
  const [collegeId, setCollegeId] = useState("");
  const [regs,      setRegs]      = useState([]);
  const [regId,     setRegId]     = useState("");
  const [semesters, setSemesters] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState("");
  const [semNum,    setSemNum]    = useState("");

  useEffect(() => {
    if (!collegeId) { setRegs([]); setRegId(""); return; }
    regulationsApi.list({ college: collegeId }).then(list => setRegs(list || [])).catch(() => {});
  }, [collegeId]);

  useEffect(() => {
    if (!regId) { setSemesters([]); return; }
    setLoading(true);
    semestersApi.list({ regulation: regId })
      .then(list => setSemesters(list || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [regId]);

  const addSemester = async () => {
    if (!regId)    return setErr("Select a regulation first.");
    const n = parseInt(semNum);
    if (!n || n < 1 || n > 8) return setErr("Semester number must be between 1 and 8.");
    if (semesters.some(s => s.number === n)) return setErr(`Semester ${n} already exists for this regulation.`);
    setErr(""); setSaving(true);
    try {
      const created = await semestersApi.create({
        number: n,
        name: `Semester ${n}`,
        regulation: regId,
      });
      setSemesters(prev => [...prev, created].sort((a, b) => a.number - b.number));
      setSemNum("");
      toast.show(`Semester ${n} added.`);
    } catch (e) {
      setErr(e.message || "Failed to create semester.");
    } finally {
      setSaving(false);
    }
  };

  const addAll = async () => {
    if (!regId) return setErr("Select a regulation first.");
    setErr(""); setSaving(true);
    const existing = new Set(semesters.map(s => s.number));
    const toCreate = [1,2,3,4,5,6,7,8].filter(n => !existing.has(n));
    if (toCreate.length === 0) { setSaving(false); return toast.show("All 8 semesters already exist."); }
    try {
      const created = [];
      for (const n of toCreate) {
        const s = await semestersApi.create({ number: n, name: `Semester ${n}`, regulation: regId });
        created.push(s);
      }
      setSemesters(prev => [...prev, ...created].sort((a, b) => a.number - b.number));
      toast.show(`Added ${created.length} semesters.`);
    } catch (e) {
      setErr(e.message || "Failed to create semesters.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card title="Select College & Regulation" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Sel label="College"    value={collegeId} onChange={v => { setCollegeId(v); setRegId(""); }} list={colleges} />
          <Sel label="Regulation" value={regId}     onChange={setRegId} list={regs.map(r => ({ _id: r._id, name: `${r.code} — ${r.name}` }))} placeholder={collegeId ? "Select regulation" : "—"} />
        </div>
        {collegeId && regs.length === 0 && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 6, fontSize: 12, color: "#7c5800" }}>
            ⚠ No regulations found for this college. Add regulations first in the <b>Regulations</b> tab.
          </div>
        )}
      </Card>

      {regId && (
        <>
          <Card title="Add Semesters" style={{ marginBottom: 16 }}>
            <Err msg={err} />
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Semester Number (1–8)</label>
                <input
                  value={semNum} onChange={e => setSemNum(e.target.value)} type="number" min={1} max={8}
                  placeholder="e.g. 1" style={{ ...inp, width: 120 }}
                  onKeyDown={e => e.key === "Enter" && addSemester()}
                />
              </div>
              <GoldBtn onClick={addSemester} disabled={saving || !semNum} style={{ height: 38 }}>
                <Icon name="plus" size={14} color="#fff" /> Add
              </GoldBtn>
              <OutlineBtn onClick={addAll} disabled={saving} style={{ height: 38 }}>
                Add All (1–8)
              </OutlineBtn>
            </div>
          </Card>

          <Card title={loading ? "Semesters — Loading…" : `Semesters (${semesters.length}/8)`}>
            {loading ? (
              <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>Loading…</div>
            ) : semesters.length === 0 ? (
              <div style={{ padding: 16, color: C.textMuted, fontSize: 13 }}>No semesters yet. Use "Add All (1–8)" to create all at once.</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "8px 4px" }}>
                {semesters.map(s => (
                  <div key={s._id} style={{
                    background: C.blueLight, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: "12px 20px", textAlign: "center", minWidth: 90,
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: C.navy }}>{s.number}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Semester {s.number}</div>
                    <Badge text="Active" type="success" style={{ marginTop: 6 }} />
                  </div>
                ))}
                {[1,2,3,4,5,6,7,8].filter(n => !semesters.some(s => s.number === n)).map(n => (
                  <div key={n} style={{
                    background: C.bg, border: `1px dashed ${C.border}`,
                    borderRadius: 8, padding: "12px 20px", textAlign: "center", minWidth: 90, opacity: 0.4,
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: C.textMuted }}>{n}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Not created</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB 5 — SUBJECTS
// ══════════════════════════════════════════════════════════════════════════════
const SubjectsTab = ({ toast, colleges }) => {
  const [collegeId,    setCollegeId]    = useState("");
  const [depts,        setDepts]        = useState([]);
  const [deptId,       setDeptId]       = useState("");
  const [regs,         setRegs]         = useState([]);
  const [regId,        setRegId]        = useState("");
  const [sems,         setSems]         = useState([]);
  const [subjects,     setSubjects]     = useState([]);
  const [loading,      setLoading]      = useState(false);

  const SUBJECT_TYPES = ["Theory", "Lab", "Minor", "Employability", "Research", "Other"];
  const [form, setForm] = useState({ courseCode: "", title: "", semesterId: "", type: "Theory" });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");
  const [editId,   setEditId]   = useState(null);
  const [editForm, setEditForm] = useState({ courseCode: "", title: "", type: "Theory" });

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

  const startEdit = (s) => {
    setEditId(s._id);
    setEditForm({ courseCode: s.courseCode, title: s.title, type: s.type || "Theory" });
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
                  <tr key={s._id} style={{ borderTop: `1px solid ${C.borderLight}`, background: editId===s._id ? "#fffbeb" : "transparent" }}>
                    {editId === s._id ? (
                      <>
                        <td style={{ padding: "7px 8px" }}>
                          <input value={editForm.courseCode} onChange={e => setEditForm(f=>({...f,courseCode:e.target.value.toUpperCase()}))} style={{ ...inp, width:100, padding:"5px 8px" }} />
                        </td>
                        <td style={{ padding: "7px 8px" }}>
                          <input value={editForm.title} onChange={e => setEditForm(f=>({...f,title:e.target.value}))} style={{ ...inp, padding:"5px 8px" }} />
                        </td>
                        <td style={{ padding: "7px 8px", color: C.textMid }}>
                          {s.semester?.number ? `Sem ${s.semester.number}` : s.semester?.name || "—"}
                        </td>
                        <td style={{ padding: "7px 8px" }}>
                          <select value={editForm.type} onChange={e => setEditForm(f=>({...f,type:e.target.value}))} style={{ ...selStyle, padding:"5px 8px", width:"auto" }}>
                            {["Theory","Lab","Minor","Employability","Research","Other"].map(t=><option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "7px 8px" }}>
                          <div style={{ display:"flex", gap:6 }}>
                            <button onClick={saveEdit} style={{ background:C.green, color:"#fff", border:"none", borderRadius:5, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Save</button>
                            <button onClick={()=>setEditId(null)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMid, borderRadius:5, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
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
                          <button onClick={()=>startEdit(s)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.navy, borderRadius:5, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Edit</button>
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

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — FACULTY
// ══════════════════════════════════════════════════════════════════════════════
const FacultyTab = ({ toast, colleges }) => {
  const [collegeId,  setCollegeId]  = useState("");
  const [depts,      setDepts]      = useState([]);
  const [deptId,     setDeptId]     = useState("");
  const [faculties,  setFaculties]  = useState([]);
  const [subjects,   setSubjects]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [expanded,   setExpanded]   = useState(null);

  const [form, setForm] = useState({ name: "", email: "", password: "", employeeId: "" });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

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
      // Fetch the created Faculty profile (register sets department via backend fix)
      const profile = await lookupFacultyProfile(form.email.trim());
      if (profile) {
        setFaculties(prev => [...prev, profile]);
      }
      setForm({ name: "", email: "", password: "", employeeId: "" });
      toast.show(`Faculty "${form.name}" added.`);
    } catch (e) {
      setErr(e.message || "Failed to add faculty.");
    } finally {
      setSaving(false);
    }
  };

  // Use faculty.update with $addToSet instead of createMapping (which needs many required fields)
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
            ⚠ No subjects found for this department. Add subjects in the <b>Subjects</b> tab first before assigning to faculty.
          </div>
        )}
      </Card>

      {deptId && (
        <>
          <Card title="Add Faculty" style={{ marginBottom: 16 }}>
            <Err msg={err} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <input value={form.name}       onChange={e => setForm(f => ({ ...f, name: e.target.value }))}       placeholder="Full Name *"               style={inp} />
              <input value={form.email}      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}      placeholder="Email *"                    style={inp} type="email" />
              <input value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} placeholder="Employee ID (auto if blank)" style={inp} />
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
                    <SubjectAssigner
                      fac={f}
                      subjects={subjects}
                      onAssign={subId => assignSubject(f, subId)}
                    />
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

// ══════════════════════════════════════════════════════════════════════════════
// TAB 5 — STUDENTS
// ══════════════════════════════════════════════════════════════════════════════
const StudentsTab = ({ toast, colleges }) => {
  const [collegeId,   setCollegeId]   = useState("");
  const [depts,       setDepts]       = useState([]);
  const [deptId,      setDeptId]      = useState("");
  const [sections,    setSections]    = useState([]);
  const [sectionId,   setSectionId]   = useState("");
  const [newSection,  setNewSection]  = useState("");
  const [students,    setStudents]    = useState([]);
  const [loading,     setLoading]     = useState(false);

  const [form, setForm]   = useState({ name: "", email: "", rollNumber: "", semester: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

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
      // Infer semester from the selected section if not explicitly entered
      const selectedSection = sections.find(s => s._id === sectionId);
      const semesterNum = parseInt(form.semester) || selectedSection?.semester?.number || 1;

      await auth.register({
        name:            form.name.trim(),
        email:           form.email.trim(),
        password:        form.password || "Welcome@123",
        role:            "student",
        department:      deptId,
        rollNumber:      form.rollNumber.trim(),
        currentSemester: semesterNum,
      });
      // Fetch the Student profile — register returns User._id, but Section stores Student._id
      const profile = await lookupStudentProfile(form.email.trim());
      if (profile) {
        // Add student to section's students array AND set student's section field
        await Promise.all([
          sectionsApi.addStudent(sectionId, profile._id).catch(() => {}),
          studentsApi.update(profile._id, { section: sectionId }).catch(() => {}),
        ]);
        setStudents(prev => [...prev, { ...profile, section: sectionId, currentSemester: semesterNum }]);
      } else {
        setStudents(prev => [...prev, {
          name: form.name, email: form.email,
          rollNumber: form.rollNumber, currentSemester: semesterNum,
        }]);
      }
      setForm({ name: "", email: "", rollNumber: "", semester: "", password: "" });
      toast.show(`Student "${form.name}" added to Section ${selectedSection?.name || ""}.`);
    } catch (e) {
      setErr(e.message || "Failed to add student.");
    } finally {
      setSaving(false);
    }
  };

  const selectedSection = sections.find(s => s._id === sectionId);
  const selectedSectionName = selectedSection?.name || "";
  const sectionSemester = selectedSection?.semester?.number || null;

  // Auto-fill semester from section when section is first selected
  useEffect(() => {
    if (sectionSemester && !form.semester) {
      setForm(f => ({ ...f, semester: String(sectionSemester) }));
    }
  }, [sectionId, sectionSemester]);

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
            list={sections.map(s => ({
              _id: s._id,
              name: `Section ${s.name}${s.semester?.number ? ` — Sem ${s.semester.number}` : ""}`,
            }))}
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
          {/* Section + Semester info banner */}
          <div style={{
            background: C.blueLight, border: `1px solid ${C.border}`,
            borderRadius: 6, padding: "10px 14px", marginBottom: 14,
            display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
          }}>
            <div style={{ fontSize: 12, color: C.navy }}>
              <span style={{ fontWeight: 700 }}>Section:</span>{" "}
              <span style={{ fontFamily: "monospace", fontWeight: 800 }}>{selectedSectionName}</span>
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
            <input value={form.name}       onChange={e => setForm(f => ({ ...f, name: e.target.value }))}       placeholder="Full Name *"             style={inp} />
            <input value={form.email}      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}      placeholder="Email *"                  style={inp} type="email" />
            <input value={form.rollNumber} onChange={e => setForm(f => ({ ...f, rollNumber: e.target.value }))} placeholder="Roll Number *"            style={inp} />
            <div>
              <input
                value={form.semester}
                onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                placeholder={sectionSemester ? `Semester (auto: ${sectionSemester})` : "Semester (1–8) *"}
                style={{ ...inp, borderColor: form.semester ? C.border : sectionSemester ? C.border : "#e0820a" }}
                type="number" min={1} max={8}
              />
              {!form.semester && !sectionSemester && (
                <div style={{ fontSize: 10, color: "#e0820a", marginTop: 3 }}>
                  Section has no semester — enter manually
                </div>
              )}
            </div>
            <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Password (default: Welcome@123)" style={inp} type="password" />
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
                  <tr key={s._id} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                    <td style={{ padding: "9px 10px", color: C.textMuted, fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: "9px 10px", fontWeight: 700, color: C.navy }}>{s.name}</td>
                    <td style={{ padding: "9px 10px", fontFamily: "monospace", fontSize: 12 }}>{s.rollNumber || "—"}</td>
                    <td style={{ padding: "9px 10px", color: C.textMid, fontSize: 12 }}>{s.email || "—"}</td>
                    <td style={{ padding: "9px 10px" }}>
                      <Badge text={`Sec ${selectedSectionName}`} type="navy" />
                    </td>
                    <td style={{ padding: "9px 10px" }}>
                      <Badge text={s.currentSemester ? `Sem ${s.currentSemester}` : sectionSemester ? `Sem ${sectionSemester}` : "—"} type="info" />
                    </td>
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

// ══════════════════════════════════════════════════════════════════════════════
// TAB — QUESTION PAPERS
// ══════════════════════════════════════════════════════════════════════════════
const QuestionPapersTab = ({ toast }) => {
  const [papers,  setPapers]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    questionPapersApi.list()
      .then(data => setPapers(Array.isArray(data) ? data : data.questionPapers || data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete question paper "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await questionPapersApi.delete(id);
      setPapers(prev => prev.filter(p => p._id !== id));
      toast.show(`Question paper deleted.`);
    } catch (e) {
      toast.show(e.message || "Failed to delete.", "error");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card title="Question Papers">
      {loading ? (
        <div style={{ padding: "16px", color: C.textMuted, fontSize: 13 }}>Loading…</div>
      ) : papers.length === 0 ? (
        <div style={{ padding: "16px", color: C.textMuted, fontSize: 13 }}>
          No question papers uploaded yet. Upload them via the Exams page.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.bg }}>
              {["Subject", "Exam Event", "Uploaded By", "Date", "Action"].map(h => (
                <th key={h} style={{ padding: "9px 10px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {papers.map((p, i) => (
              <tr key={p._id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbff", borderBottom: `1px solid ${C.borderLight}` }}>
                <td style={{ padding: "9px 10px", fontWeight: 600 }}>
                  {p.subject?.title || p.subject?.courseCode || p.subject || "—"}
                </td>
                <td style={{ padding: "9px 10px", color: C.textMid }}>
                  {p.examEvent?.name || p.examEvent?.examType || p.examEvent || "—"}
                </td>
                <td style={{ padding: "9px 10px", color: C.textMid }}>
                  {p.uploadedBy?.name || p.uploadedBy || "—"}
                </td>
                <td style={{ padding: "9px 10px", color: C.textMuted, fontSize: 11 }}>
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                </td>
                <td style={{ padding: "9px 10px" }}>
                  <button
                    onClick={() => handleDelete(p._id, p.subject?.title || p._id)}
                    disabled={deleting === p._id}
                    style={{ background: "transparent", border: `1px solid ${C.danger}`, color: C.danger, borderRadius: 5, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: deleting === p._id ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: deleting === p._id ? 0.5 : 1 }}>
                    {deleting === p._id ? "Deleting…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ROOT PAGE
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: "colleges",       label: "Colleges"        },
  { id: "departments",    label: "Departments"     },
  { id: "academicyears",  label: "Academic Years"  },
  { id: "regulations",    label: "Regulations"     },
  { id: "semesters",      label: "Semesters"       },
  { id: "subjects",       label: "Subjects"        },
  { id: "faculty",        label: "Faculty"         },
  { id: "students",       label: "Students"        },
  { id: "questionpapers", label: "Question Papers" },
];

const AdminSetupPage = () => {
  const [tab,      setTab]     = useState("colleges");
  const [colleges, setColleges] = useState([]);
  const toast = useToast();

  useEffect(() => {
    collegesApi.list().then(list => setColleges(list || [])).catch(() => {});
  }, []);

  const handleCollegeAdded = useCallback((c) => {
    setColleges(prev => prev.some(x => x._id === c._id) ? prev : [...prev, c]);
  }, []);

  return (
    <div className="page-anim">
      <ToastBanner msg={toast.msg} />
      <Breadcrumb items={["Admin", "Institution Setup"]} />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <Pill key={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />
        ))}
      </div>

      {tab === "colleges"      && <CollegesTab      toast={toast} onCollegeAdded={handleCollegeAdded} />}
      {tab === "departments"   && <DepartmentsTab   toast={toast} colleges={colleges} />}
      {tab === "academicyears" && <AcademicYearsTab toast={toast} colleges={colleges} />}
      {tab === "regulations"   && <RegulationsTab   toast={toast} colleges={colleges} />}
      {tab === "semesters"     && <SemestersTab     toast={toast} colleges={colleges} />}
      {tab === "subjects"       && <SubjectsTab       toast={toast} colleges={colleges} />}
      {tab === "faculty"        && <FacultyTab        toast={toast} colleges={colleges} />}
      {tab === "students"       && <StudentsTab       toast={toast} colleges={colleges} />}
      {tab === "questionpapers" && <QuestionPapersTab toast={toast} />}
    </div>
  );
};

export default AdminSetupPage;
