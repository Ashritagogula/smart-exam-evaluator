import { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { GoldBtn, OutlineBtn } from "../components/ui/Buttons";
import Breadcrumb from "../components/layout/Breadcrumb";
import Icon from "../components/ui/Icon";
import C from "../constants/colors";
import {
  colleges as collegesApi,
  departments as departmentsApi,
  regulations as regulationsApi,
} from "../services/api.js";

// regulation stored as { _id, name }

const CollegesPage = () => {
  const [colleges,         setColleges]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [selectedCollegeId, setSelectedCollegeId] = useState("");

  const [collegeCode, setCollegeCode] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [branch,      setBranch]      = useState("");
  const [regulation,  setRegulation]  = useState("");

  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  const [editRegColId, setEditRegColId] = useState(null);
  const [editRegId,    setEditRegId]    = useState(null);
  const [editRegVal,   setEditRegVal]   = useState("");

  const codeRegex    = /^[A-Z]{2,8}$/;
  const collegeRegex = /^[A-Za-z0-9 ]{2,}$/;
  const branchRegex  = /^[A-Z]{2,6}$/;
  const regRegex     = /^R\d{2}$/;

  // Load colleges with their branches and regulations on mount
  useEffect(() => {
    collegesApi.list()
      .then(async list => {
        const enriched = await Promise.all(
          (list || []).map(async c => {
            const [depts, regs] = await Promise.allSettled([
              departmentsApi.list({ college: c._id }),
              regulationsApi.list({ college: c._id }),
            ]);
            return {
              ...c,
              branches:    depts.status === "fulfilled" ? (depts.value || []).map(d => ({ _id: d._id, label: d.code || d.name })) : [],
              regulations: regs.status  === "fulfilled" ? (regs.value  || []).map(r => ({ _id: r._id, name: r.name || r.code })) : [],
            };
          })
        );
        setColleges(enriched);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addCollege = async () => {
    if (!codeRegex.test(collegeCode)) {
      return setError("College code must be 2–8 uppercase letters (e.g. AUS, ACET).");
    }
    if (!collegeRegex.test(collegeName)) {
      return setError("College name must be at least 2 characters.");
    }
    if (colleges.some(c => c.code === collegeCode)) {
      return setError("A college with that code already exists.");
    }
    setSaving(true); setError("");
    try {
      const created = await collegesApi.create({ code: collegeCode, name: collegeName.trim() });
      setColleges(prev => [...prev, { ...created, branches: [], regulations: [] }]);
      setCollegeCode("");
      setCollegeName("");
    } catch (err) {
      setError(err.message || "Failed to create college.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (college) => {
    const newState = !college.isActive;
    try {
      await collegesApi.update(college._id, { isActive: newState });
      setColleges(prev => prev.map(c => c._id === college._id ? { ...c, isActive: newState } : c));
    } catch (err) {
      setError(err.message || "Failed to update college status.");
    }
  };

  const addBranch = async () => {
    if (!selectedCollegeId) return setError("Select a college first.");
    if (!branchRegex.test(branch)) return setError("Branch code must be 2–6 uppercase letters (e.g. CSE, ECE).");
    const col = colleges.find(c => c._id === selectedCollegeId);
    if (!col) return setError("College not found.");
    if (col.branches.some(b => b.label === branch)) return setError("Branch already exists in this college.");
    setSaving(true); setError("");
    try {
      const created = await departmentsApi.create({ name: branch, code: branch, college: selectedCollegeId });
      setColleges(prev => prev.map(c =>
        c._id === selectedCollegeId
          ? { ...c, branches: [...c.branches, { _id: created._id, label: branch }] }
          : c
      ));
      setBranch("");
    } catch (err) {
      setError(err.message || "Failed to add branch.");
    } finally {
      setSaving(false);
    }
  };

  const addRegulation = async () => {
    if (!selectedCollegeId) return setError("Select a college first.");
    if (!regRegex.test(regulation)) return setError("Regulation must be in format R20, R23, etc.");
    const col = colleges.find(c => c._id === selectedCollegeId);
    if (!col) return setError("College not found.");
    if (col.regulations.some(r => r.name === regulation)) return setError("Regulation already exists in this college.");
    setSaving(true); setError("");
    try {
      const created = await regulationsApi.create({ name: regulation, code: regulation, college: selectedCollegeId });
      setColleges(prev => prev.map(c =>
        c._id === selectedCollegeId
          ? { ...c, regulations: [...c.regulations, { _id: created._id, name: regulation }] }
          : c
      ));
      setRegulation("");
    } catch (err) {
      setError(err.message || "Failed to add regulation.");
    } finally {
      setSaving(false);
    }
  };

  const saveEditRegulation = async () => {
    if (!regRegex.test(editRegVal)) { setError("Regulation must be in format R20, R23, etc."); return; }
    setSaving(true); setError("");
    try {
      await regulationsApi.update(editRegId, { name: editRegVal, code: editRegVal });
      setColleges(prev => prev.map(c =>
        c._id === editRegColId
          ? { ...c, regulations: c.regulations.map(r => r._id === editRegId ? { ...r, name: editRegVal } : r) }
          : c
      ));
      setEditRegId(null); setEditRegColId(null); setEditRegVal("");
    } catch (err) {
      setError(err.message || "Failed to update regulation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-anim" style={{ maxWidth: "780px" }}>
      <Breadcrumb items={["Exam Cell", "Colleges Setup"]} />

      <Card title="Manage Colleges">
        {error && (
          <div style={{
            background: "#ffe6e6", color: "#b30000",
            padding: "8px 12px", borderRadius: "5px",
            marginBottom: "10px", fontSize: "12px",
          }}>
            {error}
          </div>
        )}

        {/* STEP 1 — Add College */}
        <div style={{ marginBottom: "14px" }}>
          <b>1. Add College</b>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", gap: "10px", marginTop: "6px", alignItems: "center" }}>
            <input
              value={collegeCode}
              onChange={e => setCollegeCode(e.target.value.toUpperCase())}
              placeholder="Code (AUS)"
              style={{ padding: "9px", borderRadius: "5px", border: `1px solid ${C.border}`, outline: "none" }}
            />
            <input
              value={collegeName}
              onChange={e => setCollegeName(e.target.value)}
              placeholder="Full name (Aditya University)"
              style={{ padding: "9px", borderRadius: "5px", border: `1px solid ${C.border}`, outline: "none" }}
            />
            <GoldBtn onClick={addCollege} disabled={saving}>
              <Icon name="plus" size={14} color="#fff" /> Add
            </GoldBtn>
          </div>
        </div>

        {/* STEP 2 — Select College */}
        <div style={{ marginBottom: "14px" }}>
          <b>2. Select College to add Branch / Regulation</b>
          <select
            value={selectedCollegeId}
            onChange={e => setSelectedCollegeId(e.target.value)}
            style={{ width: "100%", padding: "9px", marginTop: "6px", borderRadius: "5px", border: `1px solid ${C.border}` }}
          >
            <option value="">Select College</option>
            {colleges.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>

        {/* STEP 3 — Add Branch */}
        <div style={{ marginBottom: "14px" }}>
          <b>3. Add Branch / Department</b>
          <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
            <input
              value={branch}
              onChange={e => setBranch(e.target.value.toUpperCase())}
              placeholder="e.g. CSE, ECE, MECH"
              style={{ flex: 1, padding: "9px", borderRadius: "5px", border: `1px solid ${C.border}`, outline: "none" }}
            />
            <OutlineBtn onClick={addBranch} disabled={saving || !selectedCollegeId}>Add</OutlineBtn>
          </div>
        </div>

        {/* STEP 4 — Add Regulation */}
        <div style={{ marginBottom: "20px" }}>
          <b>4. Add Regulation</b>
          <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
            <input
              value={regulation}
              onChange={e => setRegulation(e.target.value.toUpperCase())}
              placeholder="e.g. R20, R23"
              style={{ flex: 1, padding: "9px", borderRadius: "5px", border: `1px solid ${C.border}`, outline: "none" }}
            />
            <OutlineBtn onClick={addRegulation} disabled={saving || !selectedCollegeId}>Add</OutlineBtn>
          </div>
        </div>

        {/* COLLEGE SUMMARY */}
        {loading ? (
          <div style={{ padding: "12px", color: C.textMuted, fontSize: "13px" }}>Loading colleges…</div>
        ) : colleges.length === 0 ? (
          <div style={{ padding: "12px", color: C.textMuted, fontSize: "13px" }}>No colleges yet. Add one above.</div>
        ) : colleges.map(c => (
          <div key={c._id} style={{
            border: `1px solid ${c.isActive === false ? C.border : C.border}`,
            borderLeft: `3px solid ${c.isActive === false ? C.danger : C.navy}`,
            padding: "12px 14px",
            borderRadius: "6px",
            marginBottom: "10px",
            opacity: c.isActive === false ? 0.65 : 1,
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: "4px" }}>
              <div style={{ fontWeight: 800, fontSize: "14px", color: c.isActive === false ? C.textMuted : C.navy }}>
                {c.name} {c.code && <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>({c.code})</span>}
                {c.isActive === false && (
                  <span style={{ marginLeft:10, fontSize:10, background:"#fdecea", color:C.danger, padding:"2px 7px", borderRadius:4, fontWeight:700 }}>INACTIVE</span>
                )}
              </div>
              <button
                onClick={() => toggleActive(c)}
                style={{ background:"transparent", border:`1px solid ${c.isActive===false?C.success:C.danger}`, color:c.isActive===false?C.success:C.danger, borderRadius:5, padding:"4px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                {c.isActive === false ? "Activate" : "Deactivate"}
              </button>
            </div>
            <div style={{ fontSize: "12px", color: C.textMuted }}>
              <span style={{ marginRight: "16px" }}>
                <b>Branches:</b> {c.branches.map(b => b.label).join(", ") || "—"}
              </span>
              <span>
                <b>Regulations:</b>{" "}
                {c.regulations.length === 0 ? "—" : c.regulations.map(r => (
                  editRegId === r._id ? (
                    <span key={r._id} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 6 }}>
                      <input
                        value={editRegVal}
                        onChange={e => setEditRegVal(e.target.value.toUpperCase())}
                        style={{ width: 60, padding: "2px 5px", fontSize: 11, borderRadius: 4, border: `1px solid ${C.border}` }}
                      />
                      <button onClick={saveEditRegulation} disabled={saving}
                        style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, border: `1px solid ${C.success}`, color: C.success, background: "transparent", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                        Save
                      </button>
                      <button onClick={() => { setEditRegId(null); setEditRegColId(null); }}
                        style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, border: `1px solid ${C.border}`, color: C.textMuted, background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>
                        ×
                      </button>
                    </span>
                  ) : (
                    <span key={r._id} style={{ marginRight: 6 }}>
                      {r.name}
                      <button onClick={() => { setEditRegId(r._id); setEditRegColId(c._id); setEditRegVal(r.name); }}
                        style={{ marginLeft: 3, fontSize: 9, padding: "1px 5px", borderRadius: 3, border: `1px solid ${C.border}`, color: C.textMuted, background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>
                        edit
                      </button>
                    </span>
                  )
                ))}
              </span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};

export default CollegesPage;
