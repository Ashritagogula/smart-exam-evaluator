import { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { GoldBtn } from "../components/ui/Buttons";
import Breadcrumb from "../components/layout/Breadcrumb";
import Icon from "../components/ui/Icon";
import C from "../constants/colors";
import {
  colleges,
  departments,
  faculty,
  students,
  auth,
} from "../services/api.js";

// All system roles from the SRS
const SYSTEM_ROLES = [
  { value: "admin",               label: "Admin"               },
  { value: "examcell",            label: "Exam Cell"           },
  { value: "faculty",             label: "Faculty"             },
  { value: "subject_coordinator", label: "Subject Coordinator" },
  { value: "hod",                 label: "HOD"                 },
  { value: "principal",           label: "Principal"           },
  { value: "vc",                  label: "Vice Chancellor"     },
  { value: "student",             label: "Student"             },
  { value: "dce",                 label: "DCE"                 },
  { value: "ce",                  label: "CE"                  },
  { value: "clerk",               label: "Clerk"               },
  { value: "scrutinizer",         label: "Scrutinizer"         },
  { value: "external",            label: "External Examiner"   },
];

const ManageUsersPage = () => {
  const [users,        setUsers]        = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [collegeList,  setCollegeList]  = useState([]);
  const [branchList,   setBranchList]   = useState([]);

  const [form, setForm] = useState({
    name:     "",
    email:    "",
    password: "",
    role:     "",
    college:  "",
    branch:   "",
  });

  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [saving,  setSaving]  = useState(false);

  const nameRegex = /^[A-Za-z ]{3,}$/;

  // ── Fetch colleges on mount ──────────────────────────────────────────────────
  useEffect(() => {
    colleges.list()
      .then(list => setCollegeList(Array.isArray(list) ? list : []))
      .catch(() => setCollegeList([]));
  }, []);

  // ── Fetch departments when college changes ───────────────────────────────────
  useEffect(() => {
    if (!form.college) { setBranchList([]); return; }
    departments.list({ college: form.college })
      .then(list => setBranchList(Array.isArray(list) ? list : []))
      .catch(() => setBranchList([]));
  }, [form.college]);

  // ── Load existing users (faculty + students combined) on mount ───────────────
  useEffect(() => {
    setUsersLoading(true);
    Promise.allSettled([
      faculty.list(),
      students.list(),
    ]).then(([facRes, stuRes]) => {
      const facList = facRes.status === "fulfilled" && Array.isArray(facRes.value)
        ? facRes.value.map(f => ({ ...f, _role: "Faculty" }))
        : [];
      const stuList = stuRes.status === "fulfilled" && Array.isArray(stuRes.value)
        ? stuRes.value.map(s => ({ ...s, _role: "Student" }))
        : [];
      setUsers([...facList, ...stuList]);
    }).finally(() => setUsersLoading(false));
  }, []);

  const handleAdd = async () => {
    setError(""); setSuccess("");

    if (!nameRegex.test(form.name)) {
      return setError("Name must be at least 3 letters (alphabets only).");
    }
    if (!form.email) {
      return setError("Email is required.");
    }
    if (!form.role || !form.college || !form.branch) {
      return setError("Complete all fields before creating a user.");
    }

    setSaving(true);
    try {
      // Register user via auth endpoint
      const result  = await auth.register({
        name:       form.name,
        email:      form.email,
        password:   form.password || "Welcome@123",
        role:       form.role,
        college:    form.college,
        department: form.branch,
      });
      const newUser = result.user || result;

      // Append to local list immediately
      setUsers(prev => [
        ...prev,
        {
          _id:   newUser._id || newUser.id || Date.now(),
          name:  form.name,
          email: form.email,
          _role: SYSTEM_ROLES.find(r => r.value === form.role)?.label || form.role,
          department: { name: branchList.find(b => b._id === form.branch)?.name || form.branch },
          college:    { name: collegeList.find(c => c._id === form.college)?.name || form.college },
        },
      ]);

      setSuccess(`User "${form.name}" created successfully.`);
      setForm({ name: "", email: "", password: "", role: "", college: "", branch: "" });
    } catch (err) {
      setError(err.message || "Failed to create user. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-anim" style={{ maxWidth: "780px" }}>
      <Breadcrumb items={["Exam Cell", "Manage Users"]} />

      <Card title="Create User">

        {/* ERROR */}
        {error && (
          <div style={{
            background: "#ffe6e6", color: "#b30000",
            padding: "10px", borderRadius: "6px",
            marginBottom: "14px", fontSize: "12px",
          }}>
            {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div style={{
            background: "#e6f7ef", color: "#14532d",
            padding: "10px", borderRadius: "6px",
            marginBottom: "14px", fontSize: "12px",
          }}>
            {success}
          </div>
        )}

        {/* ── STEP 1 — Basic Details ── */}
        <div style={{
          background: C.navy + "08",
          border: `1px solid ${C.border}`,
          borderRadius: "6px",
          padding: "14px",
          marginBottom: "14px",
        }}>
          <div style={{ fontSize: "10px", fontWeight: 800, color: C.navy, marginBottom: "10px" }}>
            1. Basic Details
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Full Name"
              style={{
                width: "100%", padding: "10px",
                border: `1px solid ${C.border}`, borderRadius: "5px",
                boxSizing: "border-box",
              }}
            />
            <input
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="Email Address"
              type="email"
              style={{
                width: "100%", padding: "10px",
                border: `1px solid ${C.border}`, borderRadius: "5px",
                boxSizing: "border-box",
              }}
            />
          </div>
          <input
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="Password (leave blank for default: Welcome@123)"
            type="password"
            style={{
              width: "100%", padding: "10px",
              border: `1px solid ${C.border}`, borderRadius: "5px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* ── STEP 2 — Role Selection ── */}
        <div style={{
          background: form.name ? C.blueLight : C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: "6px",
          padding: "14px",
          marginBottom: "14px",
          opacity: form.name ? 1 : 0.6,
        }}>
          <div style={{ fontSize: "10px", fontWeight: 800, color: C.navy, marginBottom: "10px" }}>
            2. Role Selection
          </div>

          <select
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}
            style={{
              width: "100%", padding: "10px",
              borderRadius: "5px", border: `1px solid ${C.border}`,
            }}
          >
            <option value="">Select Role</option>
            {SYSTEM_ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* ── STEP 3 — Select College ── */}
        <div style={{
          background: form.role ? "#f0f7ff" : C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: "6px",
          padding: "14px",
          marginBottom: "14px",
          opacity: form.role ? 1 : 0.6,
        }}>
          <div style={{ fontSize: "10px", fontWeight: 800, color: C.navy, marginBottom: "10px" }}>
            3. Select College
          </div>

          <select
            value={form.college}
            onChange={e => setForm({ ...form, college: e.target.value, branch: "" })}
            style={{
              width: "100%", padding: "10px",
              borderRadius: "5px", border: `1px solid ${C.border}`,
            }}
          >
            <option value="">Select College</option>
            {collegeList.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* ── STEP 4 — Select Branch ── */}
        <div style={{
          background: form.college ? C.goldLight : C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: "6px",
          padding: "14px",
          marginBottom: "16px",
          opacity: form.college ? 1 : 0.6,
        }}>
          <div style={{ fontSize: "10px", fontWeight: 800, color: C.goldDark, marginBottom: "10px" }}>
            4. Select Branch / Department
          </div>

          <select
            value={form.branch}
            onChange={e => setForm({ ...form, branch: e.target.value })}
            style={{
              width: "100%", padding: "10px",
              borderRadius: "5px", border: `1px solid ${C.border}`,
            }}
          >
            <option value="">Select Branch</option>
            {branchList.map(d => (
              <option key={d._id} value={d._id}>{d.name}{d.code ? ` (${d.code})` : ""}</option>
            ))}
          </select>
        </div>

        {/* BUTTON */}
        <GoldBtn onClick={handleAdd} disabled={saving}>
          <Icon name="plus" size={14} color="#fff" />
          {saving ? "Creating…" : "Create User"}
        </GoldBtn>

      </Card>

      {/* USERS LIST */}
      <Card title="Users List" style={{ marginTop: "16px" }}>
        {usersLoading ? (
          <div style={{ padding: "16px", fontSize: "13px", color: C.textMuted }}>
            Loading users…
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: "16px", fontSize: "13px", color: C.textMuted }}>
            No users found.
          </div>
        ) : (
          users.map((u, i) => (
            <div key={u._id || i} style={{
              padding: "12px 14px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
            }}>
              <div>
                <b style={{ fontSize: "14px", color: C.text }}>{u.name}</b>
                {u.email && (
                  <div style={{ fontSize: "11px", color: C.textMuted, marginTop: "2px" }}>{u.email}</div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{
                  fontSize: "11px", fontWeight: 700,
                  background: C.navy + "14", color: C.navy,
                  padding: "2px 8px", borderRadius: "4px",
                  display: "inline-block", marginBottom: "3px",
                }}>
                  {u._role || u.role}
                </span>
                <div style={{ fontSize: "11px", color: C.textMuted }}>
                  {u.department?.name || u.department || "—"}
                  {(u.college?.name || u.college) && ` · ${u.college?.name || u.college}`}
                </div>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
};

export default ManageUsersPage;
