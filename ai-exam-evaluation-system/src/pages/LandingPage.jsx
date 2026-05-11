import { useState } from "react";
import Icon from "../components/ui/Icon";
import "./LandingPage.css";

const FEATURES = [
  {
    icon: "upload",
    col: "#002366",
    title: "AI Bundle Evaluation",
    desc:
      "Evaluate complete bundles of handwritten answer sheets in one click using OCR + NLP powered AI processing.",
  },

  {
    icon: "edit",
    col: "#0077b6",
    title: "Faculty Review & Script View",
    desc:
      "Faculty can verify AI-assigned marks, edit answers, and inspect original handwritten scripts using Script View.",
  },

  {
    icon: "shield",
    col: "#e0820a",
    title: "Freeze / Unfreeze Workflow",
    desc:
      "Secure verification workflow with Scrutinizer, DCE, and CE approval stages to prevent unauthorized mark changes.",
  },

  {
    icon: "chart",
    col: "#0a8a4a",
    title: "Relative Grading & Analytics",
    desc:
      "Advanced dashboards showing pass percentages, grade distributions, subject analytics, and institutional performance.",
  },

  {
    icon: "users",
    col: "#002366",
    title: "Multi-Role Examination System",
    desc:
      "Dedicated portals for Exam Cell, Clerk, Faculty, Scrutinizer, DCE, CE, Principal, VC, Chairman, and Students.",
  },

  {
    icon: "eye",
    col: "#0077b6",
    title: "Transparent Student Feedback",
    desc:
      "Students can view AI feedback, strengths, weaknesses, revision requests, and evaluation tracking in real time.",
  },
];

const PORTALS = [
  { role:"admin",         label:"Admin",              icon:"cog",      col:"#001a4d" },
  { role:"examcell",      label:"Exam Cell",          icon:"exam",     col:"#002366" },
  { role:"clerk",         label:"Clerk",              icon:"upload",   col:"#0d4a8a" },
  { role:"faculty",       label:"Faculty",            icon:"book",     col:"#0077b6" },
  { role:"scrutinizer",   label:"Scrutinizer",        icon:"shield",   col:"#e0820a" },
  { role:"dce",           label:"DCE",                icon:"chart",    col:"#0a8a4a" },
  { role:"ce",            label:"Chief Examiner",     icon:"star",     col:"#001a4d" },
  { role:"principal",     label:"Principal",          icon:"dept",     col:"#0d4a8a" },
  { role:"vc",            label:"Vice Chancellor",    icon:"shield",   col:"#002366" },
  { role:"chairman",      label:"Chairman",           icon:"star",     col:"#e0820a" },
  { role:"student",       label:"Student",            icon:"cap",      col:"#0a8a4a" },
];

const LandingPage = ({
  loginForm,
  setLoginForm,
  onLogin,
  loginError,
}) => {
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

      {/* NAVBAR */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <div className="landing-nav-crest">AU</div>

          <div>
            <div className="landing-nav-uni">
              ADITYA UNIVERSITY
            </div>

            <div className="landing-nav-sub">
              AI Exam Evaluation System
            </div>
          </div>
        </div>

        <button
          className="landing-nav-btn"
          onClick={() => openLogin()}
        >
          SIGN IN →
        </button>
      </nav>

      {/* HERO */}
      <div className="landing-hero">
        <div className="hero-deco-1" />
        <div className="hero-deco-2" />

        <div style={{ maxWidth: "760px" }}>
          <div className="hero-badge">
            <Icon
              name="shield"
              size={13}
              color="#f7941d"
            />

            AI Powered University Examination Platform
          </div>

          <h1 className="hero-title">
            AI Exam Evaluation
            <br />

            <span className="hero-gold">
              & Verification System
            </span>
          </h1>

          <p className="hero-desc">
            Aditya University's AI-powered examination
            ecosystem for automated handwritten answer
            evaluation, multi-level verification workflows,
            relative grading, analytics dashboards, and
            transparent student feedback management.
          </p>

          <div className="hero-btns">
            <button
              className="hero-btn-primary"
              onClick={() => openLogin()}
            >
              ACCESS PORTAL →
            </button>

            <button className="hero-btn-secondary">
              LEARN MORE
            </button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-bar">
        <div className="stats-bar-inner">
          {[
            ["25,000+", "Answer Scripts Processed"],
            ["98.5%", "AI Evaluation Accuracy"],
            ["11 Roles", "Workflow Management"],
            ["5 min", "Bundle Evaluation Time"],
          ].map(([v, l]) => (
            <div key={l} className="stats-bar-cell">
              <div className="stats-bar-val">{v}</div>

              <div className="stats-bar-label">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div className="features-section">
        <div className="features-head">
          <div className="features-tag">
            Platform Features
          </div>

          <h2 className="features-title">
            Complete University Examination
            Management Ecosystem
          </h2>
        </div>

        <div className="features-grid">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="feature-card"
              style={{
                borderTopColor: f.col,
              }}
            >
              <div
                className="feature-icon-wrap"
                style={{
                  background: `${f.col}15`,
                  border: `1px solid ${f.col}30`,
                }}
              >
                <Icon
                  name={f.icon}
                  size={22}
                  color={f.col}
                />
              </div>

              <h3 className="feature-title">
                {f.title}
              </h3>

              <p className="feature-desc">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* WORKFLOW */}
      {/* <div className="workflow-section">
        <div className="workflow-inner">
          <h2 className="workflow-title">
            Examination Workflow
          </h2>

          <div className="workflow-rule" />

          <div className="workflow-grid">
            {[
              "Exam Cell",
              "Subject Coordinator",
              "Clerk Upload",
              "AI Evaluation",
              "Faculty Review",
              "Scrutinizer",
              "DCE Audit",
              "CE Finalization",
              "Results Published",
            ].map((s, i) => (
              <div key={i} className="workflow-step">
                <div
                  className="workflow-num"
                  style={{
                    background:
                      i % 2 === 0
                        ? "linear-gradient(135deg,#f7941d,#e0820a)"
                        : "rgba(255,255,255,0.1)",

                    border:
                      i % 2 === 1
                        ? "1px solid rgba(247,148,29,0.4)"
                        : "none",
                  }}
                >
                  {i + 1}
                </div>

                <span className="workflow-step-label">
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div> */}

      {/* WORKFLOW */}
<div className="workflow-section">
  <div className="workflow-inner">

    <div className="workflow-header">
      <div className="workflow-badge">
        Examination Lifecycle
      </div>

      <h2 className="workflow-title">
        AI Evaluation Workflow
      </h2>

      <p className="workflow-subtitle">
        Complete automated university examination
        verification pipeline powered by AI,
        faculty review, scrutiny validation,
        and result finalization.
      </p>
    </div>

    <div className="workflow-timeline">

      {/* Animated Line */}
      <div className="workflow-line">
        <div className="workflow-line-progress"></div>
      </div>

      {[
        {
          title: "Exam Cell",
          desc: "Creates examination workflow and assigns coordinators.",
          icon: "exam",
        },

        {
          title: "Subject Coordinator",
          desc: "Uploads question paper, schema, and answer key.",
          icon: "book",
        },

        {
          title: "Clerk Upload",
          desc: "Scans and uploads booklet bundles for evaluation.",
          icon: "upload",
        },

        {
          title: "AI Evaluation",
          desc: "OCR + NLP engine evaluates all answer scripts.",
          icon: "ai",
        },

        {
          title: "Faculty Review",
          desc: "Faculty verifies AI marks and edits if required.",
          icon: "edit",
        },

        {
          title: "Scrutinizer",
          desc: "Checks missed questions and freezes bundles.",
          icon: "shield",
        },

        {
          title: "DCE Audit",
          desc: "Random booklet verification and quality checks.",
          icon: "chart",
        },

        {
          title: "CE Finalization",
          desc: "Chief Examiner approves grading and analytics.",
          icon: "star",
        },

        {
          title: "Results Published",
          desc: "Students receive grades and evaluation feedback.",
          icon: "cap",
        },
      ].map((step, i) => (
        <div
          key={i}
          className="workflow-item"
        >

          {/* Circle */}
          <div className="workflow-circle">
            <Icon
              name={step.icon}
              size={18}
              color="#fff"
            />
          </div>

          {/* Card */}
          <div className="workflow-card">
            <div className="workflow-step-no">
              STEP {i + 1}
            </div>

            <h3 className="workflow-card-title">
              {step.title}
            </h3>

            <p className="workflow-card-desc">
              {step.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
</div>

      {/* PORTALS */}
      <div className="portal-section">
        <h2 className="portal-title">
          Access Your Portal
        </h2>

        <div className="portal-rule" />

        <div className="portal-grid">
          {PORTALS.map((p) => (
            <button
              key={p.role}
              className="portal-btn"
              onClick={() => openLogin(p.role)}
              style={{
                "--hover-col": p.col,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = p.col;
                e.currentTarget.style.background = `${p.col}08`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor =
                  "#d0daf0";

                e.currentTarget.style.background =
                  "#fff";
              }}
            >
              <div
                className="portal-icon-wrap"
                style={{
                  background: `${p.col}15`,
                }}
              >
                <Icon
                  name={p.icon}
                  size={20}
                  color={p.col}
                />
              </div>

              <div className="portal-label">
                {p.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div className="landing-footer">
        <div>
          <div className="footer-uni-name">
            ADITYA UNIVERSITY
          </div>

          <div className="footer-sub">
            Surampalem, Kakinada — Andhra Pradesh
          </div>
        </div>

        <div className="footer-copy">
          © 2025 Aditya University. AI Exam
          Evaluation System.
        </div>
      </div>

      {/* LOGIN MODAL */}
      {showLogin && (
        <div className="login-overlay">
          <div className="login-modal">
            <div className="login-modal-header">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div className="login-modal-crest">
                  AU
                </div>

                <div>
                  <div className="login-modal-title">
                    Aditya University
                  </div>

                  <div className="login-modal-sub">
                    AI Exam Evaluation System Login
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowLogin(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Icon
                  name="close"
                  size={18}
                  color="rgba(255,255,255,0.6)"
                />
              </button>
            </div>

            <div className="login-modal-body">
              <label className="login-field-label">
                University Email
              </label>

              <input
                className="login-field-input"
                type="email"
                placeholder="username@aditya.ac.in"
                value={loginForm.email}
                onChange={(e) =>
                  setLoginForm((f) => ({
                    ...f,
                    email: e.target.value,
                  }))
                }
              />

              <label className="login-field-label">
                Password
              </label>

              <input
                className="login-field-input"
                type="password"
                placeholder="••••••••"
                value={loginForm.pass}
                onChange={(e) =>
                  setLoginForm((f) => ({
                    ...f,
                    pass: e.target.value,
                  }))
                }
                onKeyDown={(e) =>
                  e.key === "Enter" && handleLogin()
                }
              />

              {loginError && (
                <p
                  style={{
                    color: "#dc3545",
                    fontSize: "13px",
                    margin: "4px 0 0",
                    fontWeight: 500,
                  }}
                >
                  {loginError}
                </p>
              )}

              <button
                className="login-submit"
                onClick={handleLogin}
                disabled={loading}
                style={{
                  opacity: loading ? 0.7 : 1,
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {loading
                  ? "SIGNING IN..."
                  : "SIGN IN TO PORTAL"}
              </button>

              <p
                className="login-demo"
                style={{
                  fontSize: "11px",
                  color: "#888",
                  marginTop: 8,
                }}
              >
                Demo:
                admin@aditya.ac.in / admin123
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;