import Icon from "../ui/Icon";
import "./Topbar.css";

const TITLES = {
  dashboard:   { admin:"Admin Dashboard", examcell:"Exam Cell Dashboard", faculty:"Faculty Dashboard", subject_coordinator:"Subject Coordinator Dashboard", hod:"HOD Dashboard", principal:"Principal's Office", vc:"University Overview", student:"Student Dashboard", dce:"DCE Dashboard", ce:"CE Dashboard" },
  users:       "User Management", departments:"Department Management",
  analytics:   "Analytics & Reports", settings:"AI Configuration",
  exams:       "Examination Management", upload:"Upload Answer Sheets",
  labs:        "Lab Marks Entry",
  assignments: "Faculty Assignments", results:"Results Management",
  assigned:    "Assigned Bundles", evaluate:"Evaluate Booklets",
  department:  "My Department", faculty:"Faculty Overview",
  reports:     "Reports", feedback:"AI Feedback",
  dce_random:  "Generate Random Sheets",
  dce_notif:   "Notifications — DCE",
  ce_notif:    "Notifications — CE",
  sc_upload:   "Upload — QP, Answer Key & Schema",
};

const Topbar = ({ section, role, user }) => {
  const titleEntry = TITLES[section];
  const title = typeof titleEntry === "object" ? (titleEntry[role] || "Dashboard") : (titleEntry || "Dashboard");
  return (
    <>
      <div className="topbar">
        <div>
          <p className="topbar-title">{title}</p>
          <p className="topbar-sub">Aditya University — AI Evaluation System</p>
        </div>
        <div className="topbar-right">
          <div className="topbar-bell">
            <Icon name="bell" size={20} color="rgba(255,255,255,0.7)" />
            <span className="topbar-bell-dot" />
          </div>
          <div className="topbar-user">
            <div className="topbar-avatar">{user.av}</div>
            <div>
              <div className="topbar-user-name">{user.name.split(" ").slice(0, 2).join(" ")}</div>
              <div className="topbar-user-role">{user.role === "subject_coordinator" ? "SUBJECT COORDINATOR" : user.role.toUpperCase()}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="topbar-gold-rule" />
    </>
  );
};

export default Topbar;
