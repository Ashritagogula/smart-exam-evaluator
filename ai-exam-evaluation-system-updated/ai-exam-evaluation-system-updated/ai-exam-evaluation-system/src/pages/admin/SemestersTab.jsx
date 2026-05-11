import { useState, useEffect } from "react";
import { regulations as regulationsApi, semesters as semestersApi } from "../../services/api.js";
import { Card } from "../../components/ui/Card";
import { GoldBtn, OutlineBtn } from "../../components/ui/Buttons";
import Badge from "../../components/ui/Badge";
import Icon from "../../components/ui/Icon";
import C from "../../constants/colors";
import { inp, Err, Sel } from "./shared.jsx";

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
    if (!regId) return setErr("Select a regulation first.");
    const n = parseInt(semNum);
    if (!n || n < 1 || n > 8) return setErr("Semester number must be between 1 and 8.");
    if (semesters.some(s => s.number === n)) return setErr(`Semester ${n} already exists for this regulation.`);
    setErr(""); setSaving(true);
    try {
      const created = await semestersApi.create({ number: n, name: `Semester ${n}`, regulation: regId });
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
                  <div key={s._id} style={{ background: C.blueLight, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 20px", textAlign: "center", minWidth: 90 }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: C.navy }}>{s.number}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Semester {s.number}</div>
                    <Badge text="Active" type="success" style={{ marginTop: 6 }} />
                  </div>
                ))}
                {[1,2,3,4,5,6,7,8].filter(n => !semesters.some(s => s.number === n)).map(n => (
                  <div key={n} style={{ background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 8, padding: "12px 20px", textAlign: "center", minWidth: 90, opacity: 0.4 }}>
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

export default SemestersTab;
