import { useState, useEffect } from "react";
import { regulations as regulationsApi } from "../../services/api.js";
import { Card } from "../../components/ui/Card";
import { GoldBtn } from "../../components/ui/Buttons";
import Icon from "../../components/ui/Icon";
import C from "../../constants/colors";
import { inp, Err, Sel } from "./shared.jsx";

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
    if (!collegeId)        return setErr("Select a college first.");
    if (!form.code.trim()) return setErr("Regulation code is required (e.g. R24).");
    if (!form.name.trim()) return setErr("Regulation name is required.");
    if (!form.year)        return setErr("Year is required.");
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

export default RegulationsTab;
