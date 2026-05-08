import { useState } from "react";
import Icon from "../components/ui/Icon";
import "./LandingPage.css";

const FEATURES = [
  { icon:"upload", col:"#002366", title:"OCR Sheet Upload",      desc:"Upload scanned handwritten answer sheets as PDF/images. Our OCR engine extracts text automatically." },
  { icon:"ai",     col:"#0077b6", title:"AI Semantic Evaluation", desc:"Deep learning models evaluate answers semantically — grammar, spelling, content quality all scored." },
  { icon:"edit",   col:"#e0820a", title:"Faculty Review & Edit",  desc:"Faculty review AI marks, modify if needed. System tracks all changes with a 'Modified by Teacher' flag." },
  { icon:"chart",  col:"#0a8a4a", title:"Multi-Level Analytics",  desc:"Dashboards for VC, Principal, HOD, Faculty and Students with drill-down performance analytics." },
  { icon:"users",  col:"#002366", title:"Role-Based Access",      desc:"Admin, Exam Cell, Faculty, HOD, Principal, VC and Student — each with tailored permissions." },
  { icon:"eye",    col:"#0077b6", title:"Transparent Feedback",   desc:"Students see detailed AI feedback — strong points, weak points, improvement suggestions." },
];

const PORTALS = [
  { role:"admin",    label:"Admin",          icon:"cog",    col:"#001a4d" },
  { role:"examcell", label:"Exam Cell",      icon:"exam",   col:"#002366" },
  { role:"faculty",  label:"Faculty",        icon:"book",   col:"#0077b6" },
  { role:"hod",      label:"HOD",            icon:"dept",   col:"#0d4a8a" },
  { role:"principal",label:"Principal",      icon:"star",   col:"#e0820a" },
  { role:"vc",       label:"Vice Chancellor",icon:"shield", col:"#001a4d" },
  { role:"student",  label:"Student",        icon:"cap",    col:"#0a8a4a" },
];

const LandingPage = ({ loginForm, setLoginForm, onLogin, loginError }) => {
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  const openLogin = (role) => {
    if (role) setLoginForm((f) => ({ ...f, role }));
    setShowLogin(true);
  };

  const handleLogin = async () => {
    setLoading(true);
    await onLogin();
    setLoading(false);
  };

  return (
    <div className="landing">
      <div className="landing-stripe" />

      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <div className="landing-nav-crest">AU</div>
          <div>
            <div className="landing-nav-uni">ADITYA UNIVERSITY</div>
            <div className="landing-nav-sub">AI Answer Sheet Evaluation System</div>
          </div>
        </div>
        <button className="landing-nav-btn" onClick={() => openLogin()}>SIGN IN →</button>
      </nav>

      {/* Hero */}
      <div className="landing-hero">
        <div className="hero-deco-1" />
        <div className="hero-deco-2" />
        <div style={{ maxWidth:"750px" }}>
          <div className="hero-badge">
            <Icon name="shield" size={13} color="#f7941d" />
            Powered by AI & OCR Technology
          </div>
          <h1 className="hero-title">
            Automated Answer Sheet<br />
            <span className="hero-gold">Evaluation Platform</span>
          </h1>
          <p className="hero-desc">
            Aditya University's intelligent platform to automate B.Tech examination evaluation using
            OCR, AI-powered semantic analysis, and structured faculty review workflows.
          </p>
          <div className="hero-btns">
            <button className="hero-btn-primary" onClick={() => openLogin()}>ACCESS PORTAL →</button>
            <button className="hero-btn-secondary">LEARN MORE</button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stats-bar-inner">
          {[["10,000+","Evaluations Processed"],["98.2%","AI Accuracy Rate"],["5 Depts","Across University"],["15 min","Average Eval Time"]].map(([v,l]) => (
            <div key={l} className="stats-bar-cell">
              <div className="stats-bar-val">{v}</div>
              <div className="stats-bar-label">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="features-section">
        <div className="features-head">
          <div className="features-tag">Platform Features</div>
          <h2 className="features-title">A Complete Academic Evaluation Ecosystem</h2>
        </div>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card" style={{ borderTopColor: f.col }}>
              <div className="feature-icon-wrap" style={{ background:`${f.col}15`, border:`1px solid ${f.col}30` }}>
                <Icon name={f.icon} size={22} color={f.col} />
              </div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow */}
      <div className="workflow-section">
        <div className="workflow-inner">
          <h2 className="workflow-title">Evaluation Workflow</h2>
          <div className="workflow-rule" />
          <div className="workflow-grid">
            {["Offline Exam","Sheets Scanned","Exam Cell Uploads","OCR Extracts","AI Evaluates","Faculty Reviews","Marks Finalised","Students View"].map((s,i) => (
              <div key={i} className="workflow-step">
                <div
                  className="workflow-num"
                  style={{ background: i%2===0 ? "linear-gradient(135deg,#f7941d,#e0820a)" : "rgba(255,255,255,0.1)", border: i%2===1 ? "1px solid rgba(247,148,29,0.4)" : "none" }}
                >{i+1}</div>
                <span className="workflow-step-label">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Portals */}
      <div className="portal-section">
        <h2 className="portal-title">Access Your Portal</h2>
        <div className="portal-rule" />
        <div className="portal-grid">
          {PORTALS.map((p) => (
            <button key={p.role} className="portal-btn" onClick={() => openLogin(p.role)}
              style={{ "--hover-col": p.col }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = p.col; e.currentTarget.style.background = `${p.col}08`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#d0daf0"; e.currentTarget.style.background = "#fff"; }}
            >
              <div className="portal-icon-wrap" style={{ background:`${p.col}15` }}>
                <Icon name={p.icon} size={20} color={p.col} />
              </div>
              <div className="portal-label">{p.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="landing-footer">
        <div>
          <div className="footer-uni-name">ADITYA UNIVERSITY</div>
          <div className="footer-sub">Surampalem, Kakinada — Andhra Pradesh</div>
        </div>
        <div className="footer-copy">© 2024 Aditya University. AI Evaluation Platform.</div>
      </div>

      {/* Login Modal */}
      {showLogin && (
        <div className="login-overlay">
          <div className="login-modal">
            <div className="login-modal-header">
              <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                <div className="login-modal-crest">AU</div>
                <div>
                  <div className="login-modal-title">Aditya University</div>
                  <div className="login-modal-sub">AI Evaluation System Login</div>
                </div>
              </div>
              <button onClick={() => setShowLogin(false)} style={{ background:"none", border:"none", cursor:"pointer" }}>
                <Icon name="close" size={18} color="rgba(255,255,255,0.6)" />
              </button>
            </div>

            <div className="login-modal-body">
              <label className="login-field-label">University Email</label>
              <input
                className="login-field-input" type="email" placeholder="username@aditya.ac.in"
                value={loginForm.email}
                onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
              />

              <label className="login-field-label">Password</label>
              <input
                className="login-field-input" type="password" placeholder="••••••••"
                value={loginForm.pass}
                onChange={(e) => setLoginForm((f) => ({ ...f, pass: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />

              {loginError && (
                <p style={{ color:"#dc3545", fontSize:"13px", margin:"4px 0 0", fontWeight:500 }}>{loginError}</p>
              )}

              <button
                className="login-submit"
                onClick={handleLogin}
                disabled={loading}
                style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              >
                {loading ? "SIGNING IN..." : "SIGN IN TO PORTAL"}
              </button>

              <p className="login-demo" style={{ fontSize:"11px", color:"#888", marginTop:8 }}>
                Demo: admin@aditya.ac.in / admin123 &nbsp;|&nbsp; lakshmi@faculty.aditya.ac.in / faculty123
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;