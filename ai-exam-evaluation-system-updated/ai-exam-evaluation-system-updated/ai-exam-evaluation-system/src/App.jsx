import { useState, useEffect } from "react";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import EvalModal from "./components/modals/EvalModal";
import Icon from "./components/ui/Icon";

import LandingPage from "./pages/LandingPage";
import EvaluatePage from "./pages/EvaluatePage";
import UploadPage from "./pages/UploadPage";
import ExamsPage from "./pages/ExamsPage";
import UsersPage from "./pages/UsersPage";
import ResultsPage from "./pages/ResultsPage";
import FeedbackPage from "./pages/FeedbackPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import AnalyticsPage from "./pages/AnalyticsPage";

import AdminDashboard     from "./pages/dashboards/AdminDashboard";
import ExamCellDashboard  from "./pages/dashboards/ExamCellDashboard";
import FacultyDashboard   from "./pages/dashboards/FacultyDashboard";
import HODDashboard       from "./pages/dashboards/HODDashboard";
import PrincipalDashboard from "./pages/dashboards/PrincipalDashboard";
import VCDashboard        from "./pages/dashboards/VCDashboard";
import StudentDashboard   from "./pages/dashboards/StudentDashboard";
import CollegesPage       from "./pages/CollegesPage";
import ManageUsersPage    from "./pages/ManageUsersPage";
import AdminSetupPage     from "./pages/AdminSetupPage";
import CIEMarksPage       from "./pages/CIEMarksPage";

import DCEDashboard from "./pages/dashboards/DCEDashboard";
import CEDashboard  from "./pages/dashboards/CEDashboard";
import ClerkDashboard from "./pages/dashboards/ClerkDashboard";
import ExternalDashboard from "./pages/dashboards/ExternalDashboard";
import CoordinatorDashboard from "./pages/dashboards/CoordinatorDashboard";
import ScrutinizerDashboard from "./pages/dashboards/ScrutinizerDashboard";
import ChairmanDashboard from "./pages/dashboards/ChairmanDashboard";

import { auth } from "./services/api.js";
import "./index.css";

// ── TOAST ───────────────────────────────────────────────────
const Toast = ({ msg, type }) => (
  <div className={`notif notif-${type}`}>
    <Icon name={type === "success" ? "check" : "close"} size={16} color="#fff" />
    {msg}
  </div>
);

// ── DASHBOARD ROUTER ────────────────────────────────────────
const Dashboard = ({ role, onNav, setEvalModal, sec, user }) => {
  if (role === "admin")     return <AdminDashboard user={user} />;
  if (role === "examcell")  return <ExamCellDashboard onNav={onNav} user={user} />;
  if (role === "faculty" || role === "subject_coordinator")
                            return <FacultyDashboard setEvalModal={setEvalModal} sec={sec} user={user} />;
  if (role === "hod")       return <HODDashboard user={user} />;
  if (role === "principal") return <PrincipalDashboard user={user} />;
  if (role === "vc")        return <VCDashboard user={user} />;
  if (role === "student")   return <StudentDashboard user={user} />;
  if (role === "dce")       return <DCEDashboard sec={sec} user={user} />;
  if (role === "ce")        return <CEDashboard  sec={sec} user={user} />;
  if (role === "clerk")     return <ClerkDashboard user={user} />;
  if (role === "external")  return <ExternalDashboard sec={sec} setEvalModal={setEvalModal} user={user} />;
  if (role === "scrutinizer") return <ScrutinizerDashboard user={user} />;
  if (role === "chairman")   return <ChairmanDashboard user={user} />;
  return null;
};

// ── PAGE ROUTER ─────────────────────────────────────────────
const PageRouter = ({
  role, sec, onNav, toast,
  doUpload, uploadPct,
  setEvalModal, modMarks, setModMarks,
  user,
}) => {
  if (sec === "dce_random" && role === "dce") return <DCEDashboard sec="random" user={user} />;
  if (sec === "dce_notif"  && role === "dce") return <DCEDashboard sec="notif"  user={user} />;
  if (sec === "ce_notif"   && role === "ce")  return <CEDashboard  sec="notif"  user={user} />;
  if (sec === "dashboard") {
    return <Dashboard role={role} onNav={onNav} setEvalModal={setEvalModal} sec={sec} user={user} />;
  }
  if (sec === "labs") {
    if (role === "faculty" || role === "subject_coordinator") {
      return <FacultyDashboard setEvalModal={setEvalModal} sec="labs" user={user} />;
    }
  }
  if (sec === "evaluate") {
    if (role === "external") return <ExternalDashboard sec="evaluate" user={user} />;
    return <FacultyDashboard setEvalModal={setEvalModal} sec="evaluate" user={user} />;
  }
  if (sec === "assigned") return <EvaluatePage user={user} />;
  if (sec === "sc_upload") return <CoordinatorDashboard user={user} />;
  if (sec === "upload")    return <UploadPage doUpload={doUpload} uploadPct={uploadPct} user={user} />;
  if (sec === "exams")     return <ExamsPage toast={toast} user={user} />;
  if (sec === "users")     return <UsersPage toast={toast} user={user} onNav={onNav} />;
  if (sec === "results")   return <ResultsPage toast={toast} role={role} user={user} />;
  if (sec === "feedback")  return <FeedbackPage user={user} />;
  if (sec === "departments" || sec === "department") return <DepartmentsPage user={user} />;
  if (sec === "analytics") return <AnalyticsPage user={user} />;
  if (sec === "setup")     return <AdminSetupPage user={user} />;
  if (sec === "colleges")  return <CollegesPage user={user} />;
  if (sec === "examusers") return <ManageUsersPage user={user} />;
  if (sec === "cie")       return <CIEMarksPage user={user} />;

  return (
    <div style={{ textAlign:"center", paddingTop:"60px", color:"#6478a0" }}>
      Section coming soon.
    </div>
  );
};

// ── APP ROOT ────────────────────────────────────────────────
export default function App() {
  const [user,      setUser]      = useState(null);
  const [sec,       setSec]       = useState("dashboard");
  const [evalModal, setEvalModal] = useState(null);
  const [modMarks,  setModMarks]  = useState({});
  const [loginForm, setLoginForm] = useState({ email:"", pass:"" });
  const [notif,     setNotif]     = useState(null);
  const [uploadPct, setUploadPct] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState("");

  // Restore session on mount
  useEffect(() => {
    const token = auth.getToken();
    if (token) {
      auth.getMe()
        .then(({ user: u }) => setUser(normalizeUser(u)))
        .catch(() => auth.removeToken())
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }

    // Listen for forced logout (401)
    const handleLogout = () => { setUser(null); setSec("dashboard"); };
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  const normalizeUser = (u) => ({
    id: u.id || u._id,
    name: u.name,
    role: u.role,
    email: u.email,
    title: getRoleTitle(u.role),
    av: u.avatar || u.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
    profile: u.profile,
  });

  const getRoleTitle = (role) => ({
    admin: "System Administrator",
    examcell: "Exam Cell Officer",
    faculty: "Asst. Professor, CSE",
    subject_coordinator: "Subject Coordinator",
    hod: "Head of Department – CSE",
    principal: "Principal",
    vc: "Vice Chancellor",
    student: "B.Tech CSE Student",
    dce: "Department Chief Examiner",
    ce: "Controller of Examination",
    clerk: "Examination Clerk",
    scrutinizer: "Scrutinizer",
    external: "External Examiner",
    chairman: "Chairman",
  }[role] || role);

  const toast = (msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3200);
  };

  const doUpload = (formData, onProgress) => {
    setUploadPct(0);
    // Simulate progress while actual upload happens
    const t = setInterval(() => {
      setUploadPct((p) => {
        if (p >= 90) { clearInterval(t); return 90; }
        return Math.min(p + Math.random() * 14, 90);
      });
    }, 280);

    return new Promise((resolve) => {
      setTimeout(() => {
        clearInterval(t);
        setUploadPct(100);
        setTimeout(() => setUploadPct(null), 1800);
        toast("Answer sheets uploaded! AI evaluation initiated.");
        resolve();
      }, 2000);
    });
  };

  const login = async () => {
    setLoginError("");
    try {
      const { user: u } = await auth.login(loginForm.email, loginForm.pass);
      setUser(normalizeUser(u));
      setSec("dashboard");
    } catch (err) {
      setLoginError(err.message || "Login failed. Please check credentials.");
    }
  };

  const logout = async () => {
    await auth.logout();
    setUser(null);
    setSec("dashboard");
  };

  if (authLoading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f8faff" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:48, height:48, border:"4px solid #002366", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 16px" }} />
          <p style={{ color:"#002366", fontWeight:600 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LandingPage
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        onLogin={login}
        loginError={loginError}
      />
    );
  }

  return (
    <div className="app-shell">
      {notif && <Toast {...notif} />}

      <Sidebar
        role={user.role}
        active={sec}
        onNav={setSec}
        user={user}
        onLogout={logout}
      />

      <div className="app-main">
        <Topbar section={sec} role={user.role} user={user} />

        <div className="app-content">
          <PageRouter
            role={user.role}
            sec={sec}
            onNav={setSec}
            toast={toast}
            doUpload={doUpload}
            uploadPct={uploadPct}
            setEvalModal={setEvalModal}
            modMarks={modMarks}
            setModMarks={setModMarks}
            user={user}
          />
        </div>
      </div>

      {evalModal && (
        <EvalModal
          sheet={evalModal}
          onClose={() => setEvalModal(null)}
          modMarks={modMarks}
          setModMarks={setModMarks}
          toast={toast}
          user={user}
        />
      )}
    </div>
  );
}
