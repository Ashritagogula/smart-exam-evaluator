import Icon from "../ui/Icon";
import "./Sidebar.css";

const NAV_MAP = {
  admin:     [["dashboard","home","Dashboard"],["setup","dept","Institution Setup"],["users","users","User Management"],["departments","dept","Departments"],["analytics","chart","Analytics"]],

  examcell:  [
    ["dashboard","home","Dashboard"],
    ["examusers","users","Manage Users"],
    ["exams","exam","Manage Exams"],
  ],

  faculty:   [["dashboard","home","Dashboard"],["assigned","exam","Assigned Sheets"],["evaluate","edit","Evaluate"],["labs","lab","Labs"],["cie","star","CIE Marks"],["analytics","chart","Analytics"]],
  subject_coordinator: [["dashboard","home","Dashboard"],["assigned","exam","Assigned Sheets"],["evaluate","edit","Evaluate"],["labs","lab","Labs"],["cie","star","CIE Marks"],["sc_upload","upload","Upload"],["analytics","chart","Analytics"]],
  hod:       [["dashboard","home","Dashboard"],["department","dept","My Department"],["faculty","users","Faculty"],["assigned","exam","My Evaluations"],["cie","star","CIE Marks"],["analytics","chart","Analytics"]],
  principal: [["dashboard","home","Dashboard"],["departments","dept","Departments"],["analytics","chart","Performance"],["reports","file","Reports"]],
  vc:        [["dashboard","home","Dashboard"],["analytics","chart","University Analytics"],["departments","dept","Departments"]],
  student:   [["dashboard","home","Dashboard"],["results","star","My Results"],["feedback","eye","AI Feedback"],["analytics","chart","Performance"]],

  // ✅ ONLY ADDITION (no changes above)
  external: [
    ["dashboard","home","Dashboard"],
    ["evaluate","edit","Evaluate"],
    ["analytics","chart","Analytics"],
  ],
  scrutinizer: [
    ["dashboard","home","Dashboard"],
  ],
  clerk: [
    ["dashboard", "home",   "Dashboard"],
    ["upload",    "upload", "Upload Sheets"],
    ["analytics", "chart",  "Upload Statistics"],
  ],
  dce: [
    ["dashboard",       "home",   "Dashboard"],
    ["dce_random",      "eye",    "Generate Random Sheets"],
    ["dce_notif",       "bell",   "Notifications"],
  ],
  ce: [
    ["dashboard",       "home",   "Dashboard"],
    ["ce_notif",        "bell",   "Notifications"],
  ],
  chairman: [
    ["dashboard",   "home",  "Dashboard"],
    ["analytics",   "chart", "University Analytics"],
    ["departments", "dept",  "Departments"],
    ["results",     "star",  "Results Overview"],
  ],
};

const Sidebar = ({ role, active, onNav, user, onLogout }) => {
  const items = NAV_MAP[role] || NAV_MAP.faculty;

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-inner">
          <div className="sidebar-logo-crest">AU</div>
          <div className="sidebar-logo-text">
            ADITYA<br />UNIVERSITY
          </div>
        </div>
        <div className="sidebar-gold-rule" />
      </div>

      {/* Role */}
      <div className="sidebar-role-box">
        <div className="sidebar-role-inner">
          <div className="sidebar-role-label">
            {role === "subject_coordinator" ? "SUBJECT COORDINATOR" : role.replace("examcell","Exam Cell").toUpperCase()}
          </div>
          <div className="sidebar-role-name">{user.name}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-heading">Navigation</div>

        {items.map(([id, icon, label]) => (
          <button
            key={id}
            className={`sidebar-nav-btn${active === id ? " active" : ""}`}
            onClick={() => onNav(id)}
          >
            <Icon
              name={icon}
              size={15}
              color={active === id ? "#f7941d" : "rgba(255,255,255,0.45)"}
            />
            <span className="sidebar-nav-label">{label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={onLogout}>
          <Icon name="logout" size={15} color="rgba(255,100,100,0.8)" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;