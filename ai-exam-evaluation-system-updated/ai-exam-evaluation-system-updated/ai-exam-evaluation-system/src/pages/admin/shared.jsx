import { useState } from "react";
import { faculty as facultyApi, students as studentsApi } from "../../services/api.js";
import { GoldBtn, OutlineBtn } from "../../components/ui/Buttons";
import C from "../../constants/colors";

export const inp = {
  width: "100%", padding: "9px 11px", fontSize: 13,
  border: `1px solid ${C.border}`, borderRadius: 6, outline: "none",
  boxSizing: "border-box",
};

export const selStyle = {
  ...inp, background: C.white, cursor: "pointer", appearance: "none",
};

export const Err = ({ msg }) => msg ? (
  <div style={{ background: "#ffe6e6", color: "#b30000", padding: "8px 12px", borderRadius: 6, fontSize: 12, marginBottom: 10 }}>
    {msg}
  </div>
) : null;

export const Sel = ({ label, value, onChange, list, placeholder = "Select…", disabled = false }) => (
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

export const useToast = () => {
  const [msg, setMsg] = useState(null);
  const show = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  };
  return { msg, show };
};

export const ToastBanner = ({ msg }) => !msg ? null : (
  <div style={{
    position: "fixed", top: 20, right: 20, zIndex: 9999,
    background: msg.type === "error" ? "#b30000" : "#0a8a4a",
    color: "#fff", padding: "10px 18px", borderRadius: 8,
    fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
  }}>
    {msg.text}
  </div>
);

export const lookupFacultyProfile = async (email) => {
  try {
    const list = await facultyApi.list({ search: email });
    return list.find(f => f.email?.toLowerCase() === email.toLowerCase()) || list[0] || null;
  } catch {
    return null;
  }
};

export const lookupStudentProfile = async (email) => {
  try {
    const list = await studentsApi.list({ search: email });
    return list.find(s => s.email?.toLowerCase() === email.toLowerCase()) || list[0] || null;
  } catch {
    return null;
  }
};

export const AssignRoleForm = ({ roleLabel, currentUser, onAssign }) => {
  const [open,   setOpen]   = useState(false);
  const [form,   setForm]   = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

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
            <input value={form.name}  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}  placeholder="Full Name *" style={inp} />
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email *"     style={inp} type="email" />
          </div>
          <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Password (default: Welcome@123)" style={{ ...inp, marginBottom: 10 }} type="password" />
          <div style={{ display: "flex", gap: 8 }}>
            <GoldBtn onClick={submit} disabled={saving}>{saving ? "Saving…" : `Create & Assign ${roleLabel}`}</GoldBtn>
            <OutlineBtn onClick={() => setOpen(false)}>Cancel</OutlineBtn>
          </div>
        </div>
      )}
    </div>
  );
};
