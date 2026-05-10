import { useState, useEffect } from "react";
import { Card, AUTable } from "../components/ui/Card";
import { GoldBtn, OutlineBtn, Pill } from "../components/ui/Buttons";
import Badge from "../components/ui/Badge";
import Breadcrumb from "../components/layout/Breadcrumb";
import {
  students as studentsApi,
  faculty as facultyApi,
  colleges as collegesApi,
  departments as departmentsApi,
  sections as sectionsApi,
  semesters as semestersApi,
  regulations as regulationsApi,
} from "../services/api.js";
import C from "../constants/colors";

// ── Shared select style ────────────────────────────────────────────────────────
const selStyle = {
  padding: "7px 10px", fontSize: 13, border: `1px solid ${C.border}`,
  borderRadius: 6, outline: "none", background: "#fff",
  appearance: "none", cursor: "pointer",
};

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
          <div style={{ background: "#ffe6e6", color: "#b30000", padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
          <input value={form.name}  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}  placeholder="Full Name" style={{ padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: "none" }} />
          <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" type="email" style={{ padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: "none" }} />
          {type === "students" ? (
            <>
              <input value={form.rollNumber} onChange={e => setForm(f => ({ ...f, rollNumber: e.target.value }))} placeholder="Roll Number" style={{ padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: "none" }} />
              <input type="number" value={form.currentSemester} onChange={e => setForm(f => ({ ...f, currentSemester: e.target.value }))} placeholder="Current Semester (1–8)" style={{ padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: "none" }} />
            </>
          ) : (
            <>
              <input value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} placeholder="Employee ID" style={{ padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: "none" }} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                Active
              </label>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <GoldBtn onClick={handleSave} disabled={saving} style={{ flex: 1 }}>{saving ? "Saving…" : "Save Changes"}</GoldBtn>
          <OutlineBtn onClick={onClose} style={{ flex: 1 }}>Cancel</OutlineBtn>
        </div>
      </div>
    </div>
  );
};

// ── Filter bar ─────────────────────────────────────────────────────────────────
const FilterBar = ({ tab, filters, setFilters }) => {
  const [collegeList, setCollegeList] = useState([]);
  const [deptList,    setDeptList]    = useState([]);
  const [sectionList, setSectionList] = useState([]);
  const [semList,     setSemList]     = useState([]);
  const [regList,     setRegList]     = useState([]);

  useEffect(() => {
    collegesApi.list().then(list => setCollegeList(list || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!filters.college) { setDeptList([]); return; }
    departmentsApi.list({ college: filters.college }).then(list => setDeptList(list || [])).catch(() => {});
    regulationsApi.list({ college: filters.college }).then(list => setRegList(list || [])).catch(() => {});
  }, [filters.college]);

  useEffect(() => {
    if (!filters.department) { setSectionList([]); setSemList([]); return; }
    sectionsApi.list({ department: filters.department }).then(list => setSectionList(list || [])).catch(() => {});
  }, [filters.department]);

  const pick = (field, value) => {
    // Reset downstream filters
    const downstream = {
      college: ["department", "section", "semester", "regulation"],
      department: ["section", "semester"],
      section: [],
      semester: [],
      regulation: [],
    };
    const resets = Object.fromEntries((downstream[field] || []).map(k => [k, ""]));
    setFilters(f => ({ ...f, ...resets, [field]: value }));
  };

  const selectProps = (field, list, placeholder, disabled = false) => ({
    value: filters[field] || "",
    onChange: e => pick(field, e.target.value),
    disabled: disabled || list.length === 0,
    style: { ...selStyle, opacity: disabled || list.length === 0 ? 0.5 : 1, minWidth: 130 },
    children: [
      <option key="" value="">{list.length === 0 && !disabled ? "—" : placeholder}</option>,
      ...list.map(item => (
        <option key={item._id} value={item._id}>
          {item.name || item.code || item.year}
          {item.code && item.name && item.name !== item.code ? ` (${item.code})` : ""}
        </option>
      )),
    ],
  });

  return (
    <div style={{
      background: C.blueLight, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: "12px 16px", marginBottom: 14,
      display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end",
    }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>College</div>
        <div style={{ position: "relative" }}>
          <select {...selectProps("college", collegeList, "All Colleges")} />
          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: C.navy }}>▼</span>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Department</div>
        <div style={{ position: "relative" }}>
          <select {...selectProps("department", deptList, "All Depts", !filters.college)} />
          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: C.navy }}>▼</span>
        </div>
      </div>

      {tab === "students" && (
        <>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Section</div>
            <div style={{ position: "relative" }}>
              <select {...selectProps("section", sectionList.map(s => ({
                _id: s._id,
                name: `Section ${s.name}${s.semester?.number ? ` · Sem ${s.semester.number}` : ""}`,
              })), "All Sections", !filters.department)} />
              <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: C.navy }}>▼</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Regulation</div>
            <div style={{ position: "relative" }}>
              <select {...selectProps("regulation", regList.map(r => ({ _id: r._id, name: `${r.code} — ${r.name}` })), "All Regs", !filters.college)} />
              <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: C.navy }}>▼</span>
            </div>
          </div>
        </>
      )}

      {(filters.college || filters.department || filters.section || filters.regulation) && (
        <OutlineBtn
          onClick={() => setFilters({ college: "", department: "", section: "", semester: "", regulation: "" })}
          style={{ fontSize: 11, padding: "6px 12px", height: 34 }}
        >
          Clear Filters
        </OutlineBtn>
      )}
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
  const [filters,  setFilters] = useState({
    college: "", department: "", section: "", semester: "", regulation: "",
  });

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (filters.department) params.department = filters.department;
    if (tab === "students") {
      if (filters.section)    params.section    = filters.section;
      if (filters.regulation) params.regulation = filters.regulation;
      studentsApi.list(params)
        .then(d => setStudents(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      facultyApi.list(params)
        .then(d => setFacs(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [tab, search, filters]);

  const handleSaved = (updated) => {
    if (tab === "students") {
      setStudents(prev => prev.map(s => s._id === updated._id ? { ...s, ...updated } : s));
    } else {
      setFacs(prev => prev.map(f => f._id === updated._id ? { ...f, ...updated } : f));
    }
    toast("User updated successfully.");
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="page-anim">
      <Breadcrumb items={["Admin", "User Management"]} />

      {editRec && (
        <EditModal record={editRec} type={tab} onClose={() => setEditRec(null)} onSaved={handleSaved} />
      )}

      {/* Tab + Search bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <Pill label="Students" active={tab === "students"} onClick={() => { setTab("students"); setSearch(""); }} />
          <Pill label="Faculty"  active={tab === "faculty"}  onClick={() => { setTab("faculty");  setSearch(""); }} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name / ID / email…"
            style={{ padding: "7px 12px", border: "1px solid #d0daf0", borderRadius: 7, fontSize: 13, outline: "none", width: 220 }}
          />
          {/* <GoldBtn onClick={() => onNav && onNav("setup")}>+ Add User</GoldBtn>*/}
        </div>
      </div>

      {/* Cascading filters */}
      <FilterBar tab={tab} filters={filters} setFilters={setFilters} />

      {/* Active filter summary */}
      {activeFilterCount > 0 && (
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
          Showing filtered results ({activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active)
        </div>
      )}

      <Card title={tab === "students" ? `Student Records (${students.length})` : `Faculty Records (${faculties.length})`}>
        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#6478a0" }}>Loading...</div>
        ) : tab === "students" ? (
          <AUTable cols={["Name", "Roll No", "Department", "Section", "Semester", "Regulation", "Action"]}>
            {students.map((s) => (
              <tr key={s._id}>
                <td style={{ fontWeight: 700, color: "#1a2744" }}>{s.name}</td>
                <td style={{ fontFamily: "monospace", fontSize: "12px" }}>{s.rollNumber || "—"}</td>
                <td><Badge text={s.department?.code || s.department?.name || "—"} type="navy" /></td>
                <td>
                  {s.section?.name
                    ? <Badge text={`Sec ${s.section.name}`} type="info" />
                    : <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>}
                </td>
                <td>
                  {s.currentSemester
                    ? <Badge text={`Sem ${s.currentSemester}`} type="info" />
                    : <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>}
                </td>
                <td style={{ fontSize: 12, color: C.textMid }}>{s.regulation?.code || "—"}</td>
                <td>
                  <OutlineBtn style={{ fontSize: "11px", padding: "4px 12px" }} onClick={() => setEditRec(s)}>
                    Edit
                  </OutlineBtn>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: "16px", color: "#94a3b8" }}>
                {activeFilterCount > 0 ? "No students match the selected filters." : "No students found."}
              </td></tr>
            )}
          </AUTable>
        ) : (
          <AUTable cols={["Name", "Employee ID", "Department", "Role", "Sections Mapped", "Status", "Action"]}>
            {faculties.map((f) => (
              <tr key={f._id}>
                <td style={{ fontWeight: 700, color: "#1a2744" }}>{f.name}</td>
                <td style={{ fontFamily: "monospace", fontSize: "12px" }}>{f.employeeId || "—"}</td>
                <td>{f.department?.name || f.department?.code || "—"}</td>
                <td><Badge text={f.primaryRole} type="navy" /></td>
                <td style={{ fontSize: 12, color: C.textMid }}>
                  {(f.sectionsMapped || []).length > 0
                    ? `${f.sectionsMapped.length} section(s)`
                    : <span style={{ color: "#94a3b8" }}>None</span>}
                </td>
                <td><Badge text={f.isActive ? "Active" : "Inactive"} type={f.isActive ? "success" : "danger"} /></td>
                <td>
                  <OutlineBtn style={{ fontSize: "11px", padding: "4px 12px" }} onClick={() => setEditRec(f)}>
                    Edit
                  </OutlineBtn>
                </td>
              </tr>
            ))}
            {faculties.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: "16px", color: "#94a3b8" }}>
                {activeFilterCount > 0 ? "No faculty match the selected filters." : "No faculty found."}
              </td></tr>
            )}
          </AUTable>
        )}
      </Card>
    </div>
  );
};

export default UsersPage;
