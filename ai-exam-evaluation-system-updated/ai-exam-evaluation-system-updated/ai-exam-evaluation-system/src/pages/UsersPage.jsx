import { useState, useEffect } from "react";
import { Card, AUTable } from "../components/ui/Card";
import { GoldBtn, OutlineBtn, Pill } from "../components/ui/Buttons";
import Badge from "../components/ui/Badge";
import Breadcrumb from "../components/layout/Breadcrumb";
import { students as studentsApi, faculty as facultyApi } from "../services/api.js";
import C from "../constants/colors";

// ── Edit Modal ─────────────────────────────────────────────────────────────────
const EditModal = ({ record, type, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name:  record.name  || "",
    email: record.email || "",
    ...(type === "students"
      ? { rollNumber: record.rollNumber || "", currentSemester: record.currentSemester || "" }
      : { employeeId: record.employeeId || "", isActive: record.isActive ?? true }
    ),
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const handleSave = async () => {
    setError(""); setSaving(true);
    try {
      const updated = type === "students"
        ? await studentsApi.update(record._id, form)
        : await facultyApi.update(record._id, form);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,50,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
    }}>
      <div style={{
        background: "#fff", borderRadius: 10, padding: 28, width: 420, maxWidth: "90vw",
        boxShadow: "0 20px 60px rgba(0,0,50,0.3)",
      }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: C.navy, marginBottom: 18 }}>
          Edit {type === "students" ? "Student" : "Faculty"}
        </div>

        {error && (
          <div style={{
            background: "#ffe6e6", color: "#b30000",
            padding: "8px 12px", borderRadius: 6,
            marginBottom: 12, fontSize: 12,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Full Name"
            style={{ padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: "none" }}
          />
          <input
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="Email"
            type="email"
            style={{ padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: "none" }}
          />
          {type === "students" ? (
            <>
              <input
                value={form.rollNumber}
                onChange={e => setForm(f => ({ ...f, rollNumber: e.target.value }))}
                placeholder="Roll Number"
                style={{ padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: "none" }}
              />
              <input
                type="number"
                value={form.currentSemester}
                onChange={e => setForm(f => ({ ...f, currentSemester: e.target.value }))}
                placeholder="Current Semester (1–8)"
                style={{ padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: "none" }}
              />
            </>
          ) : (
            <>
              <input
                value={form.employeeId}
                onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                placeholder="Employee ID"
                style={{ padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: "none" }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                />
                Active
              </label>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <GoldBtn onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
            {saving ? "Saving…" : "Save Changes"}
          </GoldBtn>
          <OutlineBtn onClick={onClose} style={{ flex: 1 }}>Cancel</OutlineBtn>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const UsersPage = ({ toast, onNav }) => {
  const [tab,      setTab]     = useState("students");
  const [students, setStudents] = useState([]);
  const [faculties, setFacs]   = useState([]);
  const [loading,  setLoading] = useState(false);
  const [search,   setSearch]  = useState("");
  const [editRec,  setEditRec] = useState(null);

  useEffect(() => {
    setLoading(true);
    if (tab === "students") {
      studentsApi.list(search ? { search } : {})
        .then(d => setStudents(d))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      facultyApi.list(search ? { search } : {})
        .then(d => setFacs(d))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [tab, search]);

  const handleSaved = (updated) => {
    if (tab === "students") {
      setStudents(prev => prev.map(s => s._id === updated._id ? { ...s, ...updated } : s));
    } else {
      setFacs(prev => prev.map(f => f._id === updated._id ? { ...f, ...updated } : f));
    }
    toast("User updated successfully.");
  };

  return (
    <div className="page-anim">
      <Breadcrumb items={["Admin", "User Management"]} />

      {editRec && (
        <EditModal
          record={editRec}
          type={tab}
          onClose={() => setEditRec(null)}
          onSaved={handleSaved}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <Pill label="Students" active={tab === "students"} onClick={() => setTab("students")} />
          <Pill label="Faculty"  active={tab === "faculty"}  onClick={() => setTab("faculty")} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name / ID…"
            style={{ padding: "7px 12px", border: "1px solid #d0daf0", borderRadius: 7, fontSize: 13, outline: "none", width: 200 }}
          />
          <GoldBtn onClick={() => onNav && onNav("examusers")}>+ Add User</GoldBtn>
        </div>
      </div>

      <Card title={tab === "students" ? "Student Records" : "Faculty Records"}>
        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#6478a0" }}>Loading...</div>
        ) : tab === "students" ? (
          <AUTable cols={["Name", "Roll No", "Department", "Section", "Semester", "Action"]}>
            {students.map((s) => (
              <tr key={s._id}>
                <td style={{ fontWeight: 700, color: "#1a2744" }}>{s.name}</td>
                <td style={{ fontFamily: "monospace", fontSize: "12px" }}>{s.rollNumber}</td>
                <td><Badge text={s.department?.code || "—"} type="navy" /></td>
                <td>{s.section?.name || "—"}</td>
                <td>{s.currentSemester || "—"}</td>
                <td>
                  <OutlineBtn
                    style={{ fontSize: "11px", padding: "4px 12px" }}
                    onClick={() => setEditRec(s)}
                  >
                    Edit
                  </OutlineBtn>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "16px", color: "#94a3b8" }}>No students found</td></tr>
            )}
          </AUTable>
        ) : (
          <AUTable cols={["Name", "Employee ID", "Department", "Role", "Status", "Action"]}>
            {faculties.map((f) => (
              <tr key={f._id}>
                <td style={{ fontWeight: 700, color: "#1a2744" }}>{f.name}</td>
                <td style={{ fontFamily: "monospace", fontSize: "12px" }}>{f.employeeId}</td>
                <td>{f.department?.name || f.department?.code || "—"}</td>
                <td><Badge text={f.primaryRole} type="navy" /></td>
                <td><Badge text={f.isActive ? "Active" : "Inactive"} type={f.isActive ? "success" : "danger"} /></td>
                <td>
                  <OutlineBtn
                    style={{ fontSize: "11px", padding: "4px 12px" }}
                    onClick={() => setEditRec(f)}
                  >
                    Edit
                  </OutlineBtn>
                </td>
              </tr>
            ))}
            {faculties.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "16px", color: "#94a3b8" }}>No faculty found</td></tr>
            )}
          </AUTable>
        )}
      </Card>
    </div>
  );
};

export default UsersPage;
