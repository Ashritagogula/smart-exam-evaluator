import { useState, useEffect, useCallback } from "react";
import { colleges as collegesApi } from "../services/api.js";
import { Pill } from "../components/ui/Buttons";
import Breadcrumb from "../components/layout/Breadcrumb";
import { useToast, ToastBanner } from "./admin/shared.jsx";
import CollegesTab       from "./admin/CollegesTab.jsx";
import DepartmentsTab    from "./admin/DepartmentsTab.jsx";
import AcademicYearsTab  from "./admin/AcademicYearsTab.jsx";
import RegulationsTab    from "./admin/RegulationsTab.jsx";
import SemestersTab      from "./admin/SemestersTab.jsx";
import SubjectsTab       from "./admin/SubjectsTab.jsx";
import FacultyTab        from "./admin/FacultyTab.jsx";
import StudentsTab       from "./admin/StudentsTab.jsx";
import QuestionPapersTab from "./admin/QuestionPapersTab.jsx";

const TABS = [
  { id: "colleges",       label: "Colleges"        },
  { id: "departments",    label: "Departments"     },
  { id: "academicyears",  label: "Academic Years"  },
  { id: "regulations",    label: "Regulations"     },
  { id: "semesters",      label: "Semesters"       },
  { id: "subjects",       label: "Subjects"        },
  { id: "faculty",        label: "Faculty"         },
  { id: "students",       label: "Students"        },
  { id: "questionpapers", label: "Question Papers" },
];

const AdminSetupPage = () => {
  const [tab,      setTab]      = useState("colleges");
  const [colleges, setColleges] = useState([]);
  const toast = useToast();

  useEffect(() => {
    collegesApi.list().then(list => setColleges(list || [])).catch(() => {});
  }, []);

  const handleCollegeAdded = useCallback((c) => {
    setColleges(prev => prev.some(x => x._id === c._id) ? prev : [...prev, c]);
  }, []);

  return (
    <div className="page-anim">
      <ToastBanner msg={toast.msg} />
      <Breadcrumb items={["Admin", "Institution Setup"]} />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <Pill key={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />
        ))}
      </div>

      {tab === "colleges"       && <CollegesTab       toast={toast} onCollegeAdded={handleCollegeAdded} />}
      {tab === "departments"    && <DepartmentsTab    toast={toast} colleges={colleges} />}
      {tab === "academicyears"  && <AcademicYearsTab  toast={toast} colleges={colleges} />}
      {tab === "regulations"    && <RegulationsTab    toast={toast} colleges={colleges} />}
      {tab === "semesters"      && <SemestersTab      toast={toast} colleges={colleges} />}
      {tab === "subjects"       && <SubjectsTab       toast={toast} colleges={colleges} />}
      {tab === "faculty"        && <FacultyTab        toast={toast} colleges={colleges} />}
      {tab === "students"       && <StudentsTab       toast={toast} colleges={colleges} />}
      {tab === "questionpapers" && <QuestionPapersTab toast={toast} />}
    </div>
  );
};

export default AdminSetupPage;
