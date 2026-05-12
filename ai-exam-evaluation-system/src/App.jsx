import { useState, useEffect } from "react";
import { useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
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

import AdminDashboard      from "./pages/dashboards/AdminDashboard";
import ExamCellDashboard   from "./pages/dashboards/ExamCellDashboard";
import FacultyDashboard    from "./pages/dashboards/FacultyDashboard";
import HODDashboard        from "./pages/dashboards/HODDashboard";
import PrincipalDashboard  from "./pages/dashboards/PrincipalDashboard";
import VCDashboard         from "./pages/dashboards/VCDashboard";
import StudentDashboard    from "./pages/dashboards/StudentDashboard";
import CollegesPage        from "./pages/CollegesPage";
import ManageUsersPage     from "./pages/ManageUsersPage";
import AdminSetupPage      from "./pages/AdminSetupPage";
import CIEMarksPage        from "./pages/CIEMarksPage";

import DCEDashboard         from "./pages/dashboards/DCEDashboard";
import CEDashboard          from "./pages/dashboards/CEDashboard";
import ClerkDashboard       from "./pages/dashboards/ClerkDashboard";
import ExternalDashboard    from "./pages/dashboards/ExternalDashboard";
import CoordinatorDashboard from "./pages/dashboards/CoordinatorDashboard";
import ScrutinizerDashboard from "./pages/dashboards/ScrutinizerDashboard";
import ChairmanDashboard    from "./pages/dashboards/ChairmanDashboard";
import HODFacultyPage       from "./pages/HODFacultyPage";
import ScriptViewPage       from "./pages/ScriptViewPage";

import { auth } from "./services/api.js";
import "./index.css";

// ── TOAST ────────────────────────────────────────────────────────────────────
const Toast = ({ msg, type }) => (
  <div className={`notif notif-${type}`}>
    <Icon name={type === "success" ? "check" : "close"} size={16} color="#fff" />
    {msg}
  </div>
);

// ── ROLE DASHBOARD ───────────────────────────────────────────────────────────
const RoleDashboard = ({ role, onNav, setEvalModal, user }) => {
  if (role === "admin")     return <AdminDashboard user={user} />;
  if (role === "examcell")  return <ExamCellDashboard onNav={onNav} user={user} />;
  if (role === "faculty" || role === "subject_coordinator")
                            return <FacultyDashboard setEvalModal={setEvalModal} user={user} />;
  if (role === "hod")       return <HODDashboard user={user} />;
  if (role === "principal") return <PrincipalDashboard user={user} />;
  if (role === "vc")        return <VCDashboard user={user} />;
  if (role === "student")   return <StudentDashboard user={user} onNav={onNav} />;
  if (role === "dce")       return <DCEDashboard user={user} />;
  if (role === "ce")        return <CEDashboard user={user} />;
  if (role === "clerk")     return <ClerkDashboard user={user} />;
  if (role === "external")  return <ExternalDashboard setEvalModal={setEvalModal} user={user} />;
  if (role === "scrutinizer") return <ScrutinizerDashboard user={user} />;
  if (role === "chairman")    return <ChairmanDashboard user={user} />;
  return null;
};

const ComingSoon = () => (
  <div style={{ textAlign: "center", paddingTop: "60px", color: "#6478a0" }}>
    Section coming soon.
  </div>
);

// Client-side route guard — redirects unauthorised roles to their dashboard
const Guard = ({ allowed, role, children }) =>
  allowed.includes(role) ? children : <Navigate to="/dashboard" replace />;

// ── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const sec = location.pathname === "/" ? "dashboard" : location.pathname.slice(1).split("/")[0];
  const onNav = (section) => navigate("/" + section);

  const [user,        setUser]      = useState(null);
  const [evalModal,   setEvalModal] = useState(null);
  const [modMarks,    setModMarks]  = useState({});
  const [loginForm,   setLoginForm] = useState({ email: "", pass: "" });
  const [notif,       setNotif]     = useState(null);
  const [uploadPct,   setUploadPct] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError,  setLoginError]  = useState("");

  useEffect(() => {
    // Cookie is sent automatically; just probe /me to restore session
    auth.getMe()
      .then(({ user: u }) => setUser(normalizeUser(u)))
      .catch(() => {})
      .finally(() => setAuthLoading(false));

    const handleLogout = () => { setUser(null); navigate("/"); };
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  const normalizeUser = (u) => ({
    id:      u.id || u._id,
    name:    u.name,
    role:    u.role,
    email:   u.email,
    title:   getRoleTitle(u.role),
    av:      u.avatar || u.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
    profile: u.profile,
  });

  const getRoleTitle = (role) => ({
    admin:               "System Administrator",
    examcell:            "Exam Cell Officer",
    faculty:             "Asst. Professor, CSE",
    subject_coordinator: "Subject Coordinator",
    hod:                 "Head of Department – CSE",
    principal:           "Principal",
    vc:                  "Vice Chancellor",
    student:             "B.Tech CSE Student",
    dce:                 "Department Chief Examiner",
    ce:                  "Controller of Examination",
    clerk:               "Examination Clerk",
    scrutinizer:         "Scrutinizer",
    external:            "External Examiner",
    chairman:            "Chairman",
  }[role] || role);

  const toast = (msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3200);
  };

  const doUpload = (formData) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.withCredentials = true; // sends the httpOnly au_token cookie

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 95));
      };

      xhr.onload = () => {
        let data = {};
        try { data = JSON.parse(xhr.responseText); } catch {}
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadPct(100);
          setTimeout(() => setUploadPct(null), 1800);
          toast("Answer sheets uploaded! AI evaluation initiated.");
          resolve(data);
        } else {
          setUploadPct(null);
          reject(new Error(data.message || `Upload failed (${xhr.status})`));
        }
      };

      xhr.onerror = () => {
        setUploadPct(null);
        reject(new Error("Network error during upload"));
      };

      setUploadPct(0);
      xhr.open("POST", "/api/answer-booklets/upload-bulk");
      xhr.send(formData);
    });

  const login = async () => {
    setLoginError("");
    try {
      const { user: u } = await auth.login(loginForm.email, loginForm.pass);
      setUser(normalizeUser(u));
      navigate("/dashboard");
    } catch (err) {
      setLoginError(err.message || "Login failed. Please check credentials.");
    }
  };

  const logout = async () => {
    await auth.logout();
    setUser(null);
    navigate("/");
  };

  if (authLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8faff" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "4px solid #002366", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#002366", fontWeight: 600 }}>Loading...</p>
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

  const { role } = user;

  return (
    <div className="app-shell">
      {notif && <Toast {...notif} />}

      <Sidebar role={role} active={sec} onNav={onNav} user={user} onLogout={logout} />

      <div className="app-main">
        <Topbar section={sec} role={role} user={user} />

        <div className="app-content">
          <Routes>
            <Route path="/"            element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"   element={<RoleDashboard role={role} onNav={onNav} setEvalModal={setEvalModal} user={user} />} />
            <Route path="/evaluate"    element={
              role === "external"
                ? <ExternalDashboard sec="evaluate" user={user} />
                : <FacultyDashboard setEvalModal={setEvalModal} sec="evaluate" user={user} />
            } />
            <Route path="/labs"        element={<FacultyDashboard setEvalModal={setEvalModal} sec="labs" user={user} />} />
            <Route path="/assigned"    element={<EvaluatePage user={user} />} />
            <Route path="/sc_upload"   element={
              <Guard allowed={["subject_coordinator","admin"]} role={role}>
                <CoordinatorDashboard user={user} />
              </Guard>
            } />
            <Route path="/upload"      element={
              <Guard allowed={["clerk","examcell","admin"]} role={role}>
                <UploadPage doUpload={doUpload} uploadPct={uploadPct} user={user} />
              </Guard>
            } />
            <Route path="/exams"       element={<ExamsPage toast={toast} user={user} />} />
            <Route path="/users"       element={<UsersPage toast={toast} user={user} onNav={onNav} />} />
            <Route path="/results"     element={<ResultsPage toast={toast} role={role} user={user} />} />
            <Route path="/feedback"    element={<FeedbackPage user={user} />} />
            <Route path="/departments" element={<DepartmentsPage user={user} />} />
            <Route path="/department"  element={<DepartmentsPage user={user} />} />
            <Route path="/faculty"     element={
              <Guard allowed={["hod","admin","examcell"]} role={role}>
                <HODFacultyPage user={user} />
              </Guard>
            } />
            <Route path="/analytics"   element={<AnalyticsPage user={user} />} />
            <Route path="/setup"       element={
              <Guard allowed={["admin"]} role={role}>
                <AdminSetupPage user={user} />
              </Guard>
            } />
            <Route path="/colleges"    element={
              <Guard allowed={["admin"]} role={role}>
                <CollegesPage user={user} />
              </Guard>
            } />
            <Route path="/examusers"   element={
              <Guard allowed={["examcell","admin"]} role={role}>
                <ManageUsersPage user={user} />
              </Guard>
            } />
            <Route path="/cie"         element={
              <Guard allowed={["faculty","subject_coordinator","hod","examcell","admin"]} role={role}>
                <CIEMarksPage user={user} />
              </Guard>
            } />
            <Route path="/my_scripts"  element={
              <Guard allowed={["student"]} role={role}>
                <ScriptViewPage user={user} />
              </Guard>
            } />
            <Route path="/dce_random"  element={
              <Guard allowed={["dce","admin"]} role={role}>
                <DCEDashboard sec="random" user={user} />
              </Guard>
            } />
            <Route path="/dce_notif"   element={
              <Guard allowed={["dce","admin"]} role={role}>
                <DCEDashboard sec="notif" user={user} />
              </Guard>
            } />
            <Route path="/ce_notif"    element={
              <Guard allowed={["ce","admin"]} role={role}>
                <CEDashboard sec="notif" user={user} />
              </Guard>
            } />
            <Route path="*"            element={<ComingSoon />} />
          </Routes>
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
