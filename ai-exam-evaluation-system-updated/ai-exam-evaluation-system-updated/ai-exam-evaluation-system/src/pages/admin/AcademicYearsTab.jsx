import { useState, useEffect } from "react";
import { academicYears as academicYearsApi } from "../../services/api.js";
import { Card } from "../../components/ui/Card";
import { GoldBtn } from "../../components/ui/Buttons";
import Badge from "../../components/ui/Badge";
import Icon from "../../components/ui/Icon";
import C from "../../constants/colors";
import { inp, Err, Sel } from "./shared.jsx";

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
    if (!collegeId)        return setErr("Select a college first.");
    if (!form.year.trim()) return setErr("Academic year is required (e.g. 2024-25).");
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

export default AcademicYearsTab;
