import { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { GoldBtn, OutlineBtn } from "../components/ui/Buttons";
import Breadcrumb from "../components/layout/Breadcrumb";
import Icon from "../components/ui/Icon";
import C from "../constants/colors";
import {
  colleges,
  regulations,
  departments,
  semesters,
  subjects as subjectsApi,
  faculty,
} from "../services/api.js";

// ── Shared style helpers ──────────────────────────────────────────────────────
const selStyle = {
  width: "100%", padding: "9px 10px", fontSize: 13,
  border: `1px solid ${C.border}`, borderRadius: 6,
  outline: "none", boxSizing: "border-box", background: "#fff",
};
const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 700,
  color: C.textMuted, textTransform: "uppercase", marginBottom: 4,
};
const chip = (label, value, color = C.navy) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const ManageUsersPage = () => {
  // ── Cascade ──
  const [collegeList,    setCollegeList]    = useState([]);
  const [regulationList, setRegulationList] = useState([]);
  const [deptList,       setDeptList]       = useState([]);
  const [semesterList,   setSemesterList]   = useState([]);
  const [selCollege,    setSelCollege]    = useState("");
  const [selRegulation, setSelRegulation] = useState("");
  const [selDept,       setSelDept]       = useState("");
  const [selSemester,   setSelSemester]   = useState("");

  // ── Data ──
  const [subjectList, setSubjectList] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [assignments, setAssignments] = useState({}); // subjectId → facultyId
  const [savedMap,    setSavedMap]    = useState({});  // last-saved snapshot

  // ── UI state ──
  const [dataLoading, setDataLoading] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [msg,         setMsg]         = useState(null);
  const [mode,        setMode]        = useState("form"); // "form" | "list"
  const [editSubId,   setEditSubId]   = useState(null);   // subject being inline-edited
  const [editVal,     setEditVal]     = useState("");
  const [editSaving,  setEditSaving]  = useState(false);

  // ── Effects ──
  useEffect(() => {
    colleges.list().then(list => setCollegeList(list || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setRegulationList([]); setDeptList([]);
    setSelRegulation(""); setSelDept(""); setSelSemester("");
    setSubjectList([]); setFacultyList([]); setAssignments({}); setSavedMap({});
    setMode("form"); setMsg(null);
    if (!selCollege) return;
    regulations.list({ college: selCollege }).then(list => setRegulationList(list || [])).catch(() => {});
    departments.list({ college: selCollege }).then(list => setDeptList(list || [])).catch(() => {});
  }, [selCollege]);

  useEffect(() => {
    setSemesterList([]); setSelSemester("");
    setSubjectList([]); setAssignments({}); setSavedMap({});
    setMode("form"); setMsg(null);
    if (!selRegulation) return;
    semesters.list({ regulation: selRegulation }).then(list => setSemesterList(list || [])).catch(() => {});
  }, [selRegulation]);

  useEffect(() => {
    setFacultyList([]); setSubjectList([]); setAssignments({}); setSavedMap({});
    setMode("form"); setMsg(null);
    if (!selDept) return;
    faculty.list({ department: selDept }).then(list => setFacultyList(list || [])).catch(() => {});
  }, [selDept]);

  useEffect(() => {
    setSubjectList([]); setAssignments({}); setSavedMap({});
    setMode("form"); setMsg(null);
    if (!selDept || !selSemester) return;
    setDataLoading(true);
    Promise.allSettled([
      subjectsApi.list({ department: selDept, semester: selSemester }),
      faculty.list({ department: selDept, hasRole: "subject_coordinator" }),
    ]).then(([subRes, coordRes]) => {
      const subs   = subRes.status   === "fulfilled" ? (subRes.value   || []) : [];
      const coords = coordRes.status === "fulfilled" ? (coordRes.value || []) : [];
      setSubjectList(subs);
      const initMap = {};
      subs.forEach(sub => {
        const coord = coords.find(f =>
          (f.subjectsTaught || []).some(s => s.toString() === sub._id.toString())
        );
        if (coord) initMap[sub._id] = coord._id;
      });
      setAssignments(initMap);
      setSavedMap(initMap);
    }).finally(() => setDataLoading(false));
  }, [selDept, selSemester]);

  // ── Handlers ──
  const handleSaveAll = async () => {
    const toSave = Object.entries(assignments).filter(([, fId]) => !!fId);
    if (!toSave.length) return setMsg({ type: "error", text: "No coordinators selected." });
    setSaving(true); setMsg(null);
    let saved = 0, failed = 0;
    for (const [subjectId, facultyId] of toSave) {
      try {
        const fac = facultyList.find(f => f._id === facultyId);
        const newRoles = Array.from(new Set([...(fac?.roles || []), "subject_coordinator"]));
        await faculty.update(facultyId, { $set: { roles: newRoles } });
        await faculty.update(facultyId, { $addToSet: { subjectsTaught: subjectId } });
        saved++;
      } catch { failed++; }
    }
    setSaving(false);
    setSavedMap({ ...assignments });
    if (failed === 0) {
      setMode("list");
      setMsg({ type: "success", text: `${saved} coordinator(s) saved successfully.` });
    } else {
      setMsg({ type: "error", text: `${saved} saved, ${failed} failed. Please retry.` });
    }
  };

  const handleInlineSave = async () => {
    if (!editSubId) return;
    setEditSaving(true);
    try {
      if (editVal) {
        const fac = facultyList.find(f => f._id === editVal);
        const newRoles = Array.from(new Set([...(fac?.roles || []), "subject_coordinator"]));
        await faculty.update(editVal, { $set: { roles: newRoles } });
        await faculty.update(editVal, { $addToSet: { subjectsTaught: editSubId } });
        setAssignments(prev => ({ ...prev, [editSubId]: editVal }));
        setSavedMap(prev => ({ ...prev, [editSubId]: editVal }));
      }
      setEditSubId(null);
      setMsg({ type: "success", text: "Coordinator updated successfully." });
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Update failed." });
    } finally {
      setEditSaving(false);
    }
  };

  const startNewAssignment = () => {
    setSelCollege(""); setSelRegulation(""); setSelDept(""); setSelSemester("");
    setSubjectList([]); setFacultyList([]); setAssignments({}); setSavedMap({});
    setMode("form"); setMsg(null); setEditSubId(null);
  };

  // ── Derived ──
  const assignedCount = Object.values(assignments).filter(Boolean).length;
  const hasChanges = Object.keys({ ...assignments, ...savedMap })
    .some(k => (assignments[k] || "") !== (savedMap[k] || ""));

  const collegeName    = collegeList.find(c => c._id === selCollege)?.name    || "";
  const regulationName = regulationList.find(r => r._id === selRegulation)?.name || "";
  const deptObj        = deptList.find(d => d._id === selDept);
  const deptName       = deptObj ? `${deptObj.name}` : "";
  const deptCode       = deptObj?.code || "";
  const semObj         = semesterList.find(s => s._id === selSemester);
  const semName        = semObj ? `Semester ${semObj.number}` : "";

  // ── Render ──
  return (
    <div className="page-anim" style={{ maxWidth: "960px" }}>
      <Breadcrumb items={["Exam Cell", "Manage Users"]} />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* FORM MODE                                                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {mode === "form" && (
        <Card title="Assign Subject Coordinators">
          <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 20 }}>
            Select the college, regulation, department and semester. All subjects for that semester
            will appear — choose a coordinator for each and save all at once.
          </p>

          {msg && (
            <div style={{
              background: msg.type === "error" ? "#ffe6e6" : "#e6f7ef",
              color: msg.type === "error" ? "#b30000" : "#14532d",
              padding: "8px 14px", borderRadius: 6, fontSize: 12, marginBottom: 14,
            }}>
              {msg.type === "success" ? "✓ " : "✕ "}{msg.text}
            </div>
          )}

          {/* 2×2 cascade grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>College</label>
              <select value={selCollege} onChange={e => setSelCollege(e.target.value)} style={selStyle}>
                <option value="">Select college</option>
                {collegeList.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Regulation</label>
              <select value={selRegulation} onChange={e => setSelRegulation(e.target.value)} style={selStyle} disabled={!selCollege}>
                <option value="">Select regulation</option>
                {regulationList.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <select value={selDept} onChange={e => setSelDept(e.target.value)} style={selStyle} disabled={!selCollege}>
                <option value="">Select department</option>
                {deptList.map(d => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Semester</label>
              <select value={selSemester} onChange={e => setSelSemester(e.target.value)} style={selStyle} disabled={!selRegulation}>
                <option value="">Select semester</option>
                {semesterList.map(s => <option key={s._id} value={s._id}>Semester {s.number}</option>)}
              </select>
            </div>
          </div>

          {/* Subject table — shown only when dept + semester selected */}
          {selDept && selSemester && (
            dataLoading ? (
              <div style={{ padding: 28, textAlign: "center", fontSize: 13, color: C.textMuted }}>
                Loading subjects…
              </div>
            ) : subjectList.length === 0 ? (
              <div style={{ padding: 14, fontSize: 12, color: C.textMuted, background: C.bg, borderRadius: 6 }}>
                No subjects found for this department and semester. Add subjects in Admin Setup first.
              </div>
            ) : (
              <>
                {/* Counter bar */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 14px",
                  background: C.blueLight, border: `1px solid ${C.border}`,
                  borderRadius: "6px 6px 0 0",
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>
                    {subjectList.length} subject{subjectList.length !== 1 ? "s" : ""} — {semName}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: assignedCount === subjectList.length ? "#14532d" : C.textMuted }}>
                    {assignedCount}/{subjectList.length} assigned
                    {hasChanges && <span style={{ marginLeft: 8, color: "#b36a00", fontSize: 11 }}>• unsaved changes</span>}
                  </span>
                </div>

                {/* Column headers */}
                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 110px 2.5fr",
                  gap: 12, padding: "8px 14px",
                  background: "#f0f4f9",
                  border: `1px solid ${C.border}`, borderTop: "none", borderBottom: "none",
                }}>
                  {["Subject", "Code", "Subject Coordinator"].map(h => (
                    <span key={h} style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
                  ))}
                </div>

                {/* Rows */}
                <div style={{ border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 6px 6px", marginBottom: 18 }}>
                  {subjectList.map((sub, i) => {
                    const facId = assignments[sub._id] || "";
                    const assigned = !!facId;
                    const changed  = (assignments[sub._id] || "") !== (savedMap[sub._id] || "");
                    return (
                      <div key={sub._id} style={{
                        display: "grid", gridTemplateColumns: "2fr 110px 2.5fr",
                        gap: 12, padding: "11px 14px", alignItems: "center",
                        background: i % 2 === 0 ? "#fafafa" : "#fff",
                        borderBottom: i < subjectList.length - 1 ? `1px solid ${C.border}` : "none",
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                            {sub.title}
                            {changed && <span style={{ marginLeft: 6, fontSize: 10, color: "#b36a00", fontWeight: 600 }}>● changed</span>}
                          </div>
                          {sub.type && (
                            <span style={{ fontSize: 10, fontWeight: 600, background: C.navy + "14", color: C.navy, padding: "1px 6px", borderRadius: 3 }}>{sub.type}</span>
                          )}
                        </div>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, background: C.navy + "14", color: C.navy, padding: "2px 8px", borderRadius: 4 }}>{sub.courseCode}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <select
                            value={facId}
                            onChange={e => { setAssignments(p => ({ ...p, [sub._id]: e.target.value })); setMsg(null); }}
                            style={{
                              flex: 1, padding: "7px 10px", fontSize: 12, outline: "none",
                              border: `1px solid ${assigned ? C.navy : C.border}`,
                              borderLeft: assigned ? `3px solid ${C.gold}` : `1px solid ${C.border}`,
                              borderRadius: 5, background: "#fff",
                              color: assigned ? C.text : C.textMuted, boxSizing: "border-box",
                            }}
                          >
                            <option value="">— Not Assigned —</option>
                            {facultyList.map(f => (
                              <option key={f._id} value={f._id}>{f.name} ({f.primaryRole})</option>
                            ))}
                          </select>
                          {assigned
                            ? <span style={{ fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", background: "#e6f7ef", color: "#14532d", border: "1px solid #b7e4c9", padding: "3px 8px", borderRadius: 10 }}>✓ Assigned</span>
                            : <span style={{ fontSize: 10, fontWeight: 600, whiteSpace: "nowrap", background: "#fff8e6", color: "#b36a00", border: "1px solid #f0d080", padding: "3px 8px", borderRadius: 10 }}>Pending</span>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <GoldBtn onClick={handleSaveAll} disabled={saving || assignedCount === 0}>
                    <Icon name="users" size={14} color="#fff" />
                    {saving ? "Saving…" : `Save All Assignments (${assignedCount})`}
                  </GoldBtn>
                  {hasChanges && !saving && (
                    <OutlineBtn onClick={() => { setAssignments({ ...savedMap }); setMsg(null); }}>
                      Reset Changes
                    </OutlineBtn>
                  )}
                </div>
              </>
            )
          )}

          {/* Empty state */}
          {(!selDept || !selSemester) && (
            <div style={{ marginTop: 4, padding: "28px 16px", textAlign: "center", background: C.bg, borderRadius: 6, border: `1px dashed ${C.border}` }}>
              <div style={{ fontSize: 13, color: C.textMuted }}>
                Select a department and semester to view and assign subject coordinators.
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* LIST MODE                                                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {mode === "list" && (
        <>
          {/* Context card */}
          <div style={{
            background: "#fff",
            border: `1px solid ${C.border}`,
            borderTop: `4px solid ${C.gold}`,
            borderRadius: 10,
            padding: "18px 22px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 0,
            flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", gap: 32, flex: 1, flexWrap: "wrap" }}>
              {chip("College",    collegeName)}
              <div style={{ width: 1, background: C.border, alignSelf: "stretch", margin: "0 4px" }} />
              {chip("Regulation", regulationName, "#7b3f00")}
              <div style={{ width: 1, background: C.border, alignSelf: "stretch", margin: "0 4px" }} />
              {chip("Department", deptName)}
              {deptCode && (
                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: C.navy + "14", color: C.navy, padding: "2px 7px", borderRadius: 4 }}>{deptCode}</span>
                </div>
              )}
              <div style={{ width: 1, background: C.border, alignSelf: "stretch", margin: "0 4px" }} />
              {chip("Semester", semName, "#14532d")}
            </div>
            <OutlineBtn
              onClick={startNewAssignment}
              style={{ fontSize: 12, padding: "7px 16px", marginLeft: 16, whiteSpace: "nowrap" }}
            >
              + Assign Another
            </OutlineBtn>
          </div>

          {/* Success message */}
          {msg && (
            <div style={{
              background: msg.type === "error" ? "#ffe6e6" : "#e6f7ef",
              color: msg.type === "error" ? "#b30000" : "#14532d",
              padding: "8px 14px", borderRadius: 6, fontSize: 12, marginBottom: 14,
              border: `1px solid ${msg.type === "error" ? "#fbb" : "#b7e4c9"}`,
            }}>
              {msg.type === "success" ? "✓ " : "✕ "}{msg.text}
            </div>
          )}

          {/* Coordinator listing card */}
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 110px 2.2fr 110px",
              gap: 12, padding: "10px 18px",
              background: "#f0f4f9",
              borderBottom: `1px solid ${C.border}`,
            }}>
              {["Subject", "Code", "Subject Coordinator", "Action"].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {subjectList.map((sub, i) => {
              const assignedFacId = savedMap[sub._id];
              const assignedFac   = facultyList.find(f => f._id === assignedFacId);
              const isEditing     = editSubId === sub._id;

              return (
                <div key={sub._id} style={{
                  borderBottom: i < subjectList.length - 1 ? `1px solid ${C.border}` : "none",
                  background: isEditing ? "#fffdf0" : i % 2 === 0 ? "#fafafa" : "#fff",
                  transition: "background 0.15s",
                }}>
                  {isEditing ? (
                    /* ── Inline edit row ── */
                    <div style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{sub.title}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, background: C.navy + "14", color: C.navy, padding: "2px 8px", borderRadius: 4 }}>{sub.courseCode}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <select
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          style={{
                            flex: 1, maxWidth: 340, padding: "8px 10px", fontSize: 13,
                            border: `1.5px solid ${C.gold}`, borderRadius: 6,
                            outline: "none", background: "#fff", color: C.text,
                          }}
                        >
                          <option value="">— Not Assigned —</option>
                          {facultyList.map(f => (
                            <option key={f._id} value={f._id}>{f.name} ({f.primaryRole})</option>
                          ))}
                        </select>
                        <GoldBtn
                          onClick={handleInlineSave}
                          disabled={editSaving}
                          style={{ padding: "8px 18px", fontSize: 12 }}
                        >
                          {editSaving ? "Saving…" : "Save"}
                        </GoldBtn>
                        <OutlineBtn
                          onClick={() => { setEditSubId(null); setMsg(null); }}
                          style={{ fontSize: 12, padding: "8px 14px" }}
                        >
                          Cancel
                        </OutlineBtn>
                      </div>
                    </div>
                  ) : (
                    /* ── View row ── */
                    <div style={{
                      display: "grid", gridTemplateColumns: "2fr 110px 2.2fr 110px",
                      gap: 12, padding: "14px 18px", alignItems: "center",
                    }}>
                      {/* Subject */}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{sub.title}</div>
                        {sub.type && (
                          <span style={{ fontSize: 10, fontWeight: 600, background: C.navy + "14", color: C.navy, padding: "1px 6px", borderRadius: 3, marginTop: 3, display: "inline-block" }}>{sub.type}</span>
                        )}
                      </div>

                      {/* Code */}
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, background: C.navy + "14", color: C.navy, padding: "3px 10px", borderRadius: 4 }}>{sub.courseCode}</span>
                      </div>

                      {/* Coordinator */}
                      <div>
                        {assignedFac ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: "50%",
                              background: C.navy, display: "flex", alignItems: "center",
                              justifyContent: "center", fontSize: 13, fontWeight: 800,
                              color: "#fff", flexShrink: 0,
                            }}>
                              {assignedFac.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{assignedFac.name}</div>
                              <div style={{ fontSize: 11, color: C.textMuted }}>{assignedFac.primaryRole}</div>
                            </div>
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              background: "#e6f7ef", color: "#14532d",
                              border: "1px solid #b7e4c9",
                              padding: "2px 8px", borderRadius: 10, marginLeft: 2,
                            }}>✓ Assigned</span>
                          </div>
                        ) : (
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            background: "#fff8e6", color: "#b36a00",
                            border: "1px solid #f0d080",
                            padding: "4px 12px", borderRadius: 10, display: "inline-block",
                          }}>
                            Not Assigned
                          </span>
                        )}
                      </div>

                      {/* Action */}
                      <div>
                        <button
                          onClick={() => {
                            setEditSubId(sub._id);
                            setEditVal(assignedFacId || "");
                            setMsg(null);
                          }}
                          style={{
                            padding: "6px 16px", fontSize: 12, fontWeight: 700,
                            background: C.blueLight, border: `1px solid ${C.border}`,
                            color: C.navy, borderRadius: 6, cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {assignedFac ? "Change" : "Assign"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, padding: "10px 4px" }}>
            <span style={{ fontSize: 12, color: C.textMuted }}>
              {Object.values(savedMap).filter(Boolean).length} of {subjectList.length} subjects have coordinators assigned
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default ManageUsersPage;
