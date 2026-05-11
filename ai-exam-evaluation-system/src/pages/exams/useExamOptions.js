import { useState, useEffect } from "react";
import {
  colleges,
  departments,
  regulations,
  semesters,
  subjects,
} from "../../services/api.js";

export const CASCADE_ORDER = ["college", "regulation", "branch", "semester", "subject"];

export const useCascade = () => {
  const blank = Object.fromEntries(CASCADE_ORDER.map(f => [f, ""]));
  const [sel, setSel] = useState(blank);

  const pick = (field, value) => {
    setSel(prev => {
      const idx    = CASCADE_ORDER.indexOf(field);
      const resets = Object.fromEntries(CASCADE_ORDER.slice(idx + 1).map(f => [f, ""]));
      return { ...prev, ...resets, [field]: value };
    });
  };

  const reset = () => setSel(blank);
  return { sel, pick, reset };
};

export const useExamOptions = (sel) => {
  const [collegeOpts,    setCollegeOpts]    = useState([]);
  const [regulationOpts, setRegulationOpts] = useState([]);
  const [branchOpts,     setBranchOpts]     = useState([]);
  const [semesterOpts,   setSemesterOpts]   = useState([]);
  const [subjectOpts,    setSubjectOpts]    = useState([]);

  useEffect(() => {
    colleges.list()
      .then(list => setCollegeOpts((list || []).map(c => ({ v: c._id, l: c.name }))))
      .catch(() => setCollegeOpts([]));
  }, []);

  useEffect(() => {
    if (!sel.college) { setBranchOpts([]); setRegulationOpts([]); return; }
    departments.list({ college: sel.college })
      .then(list => setBranchOpts((list || []).map(d => ({ v: d._id, l: `${d.code || d.name} — ${d.name}` }))))
      .catch(() => setBranchOpts([]));
    regulations.list({ college: sel.college })
      .then(list => setRegulationOpts((list || []).map(r => ({ v: r._id, l: r.name }))))
      .catch(() => setRegulationOpts([]));
  }, [sel.college]);

  useEffect(() => {
    if (!sel.regulation) { setSemesterOpts([]); return; }
    semesters.list({ regulation: sel.regulation })
      .then(list => setSemesterOpts((list || []).map(s => ({ v: s._id, l: `Semester ${s.number}` }))))
      .catch(() => setSemesterOpts([]));
  }, [sel.regulation]);

  useEffect(() => {
    if (!sel.branch || !sel.semester) { setSubjectOpts([]); return; }
    subjects.list({ department: sel.branch, semester: sel.semester })
      .then(list => setSubjectOpts((list || []).map(s => ({ v: s._id, l: `${s.title || s.name} (${s.courseCode || s.code})` }))))
      .catch(() => setSubjectOpts([]));
  }, [sel.branch, sel.semester]);

  return {
    college:    collegeOpts,
    regulation: regulationOpts,
    branch:     branchOpts,
    semester:   semesterOpts,
    subject:    subjectOpts,
  };
};
