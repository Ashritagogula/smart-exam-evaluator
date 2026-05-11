import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";

// ── Minimal page stubs ────────────────────────────────────────────────────────
vi.mock("../pages/LandingPage",   () => ({ default: () => <div>LandingPage</div> }));
vi.mock("../pages/ExamsPage",     () => ({ default: () => <div>ExamsPage</div> }));
vi.mock("../pages/ResultsPage",   () => ({ default: () => <div>ResultsPage</div> }));
vi.mock("../pages/FeedbackPage",  () => ({ default: () => <div>FeedbackPage</div> }));
vi.mock("../pages/AnalyticsPage", () => ({ default: () => <div>AnalyticsPage</div> }));
vi.mock("../pages/UploadPage",    () => ({ default: () => <div>UploadPage</div> }));
vi.mock("../pages/CIEMarksPage",  () => ({ default: () => <div>CIEMarksPage</div> }));
vi.mock("../pages/ScriptViewPage",() => ({ default: () => <div>ScriptViewPage</div> }));
vi.mock("../pages/dashboards/AdminDashboard",  () => ({ default: () => <div>AdminDashboard</div> }));
vi.mock("../pages/dashboards/StudentDashboard",() => ({ default: () => <div>StudentDashboard</div> }));

import ExamsPage     from "../pages/ExamsPage";
import ResultsPage   from "../pages/ResultsPage";
import FeedbackPage  from "../pages/FeedbackPage";
import AnalyticsPage from "../pages/AnalyticsPage";
import UploadPage    from "../pages/UploadPage";
import CIEMarksPage  from "../pages/CIEMarksPage";
import ScriptViewPage from "../pages/ScriptViewPage";

// ── Minimal router under test (mirrors App.jsx <Routes>) ─────────────────────
const AppRoutes = () => (
  <Routes>
    <Route path="/"            element={<Navigate to="/dashboard" replace />} />
    <Route path="/dashboard"   element={<div>Dashboard</div>} />
    <Route path="/exams"       element={<ExamsPage />} />
    <Route path="/results"     element={<ResultsPage />} />
    <Route path="/feedback"    element={<FeedbackPage />} />
    <Route path="/analytics"   element={<AnalyticsPage />} />
    <Route path="/upload"      element={<UploadPage />} />
    <Route path="/cie"         element={<CIEMarksPage />} />
    <Route path="/my_scripts"  element={<ScriptViewPage />} />
    <Route path="*"            element={<div>Not Found</div>} />
  </Routes>
);

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("React Router declarative routing", () => {
  it("redirects / to /dashboard", () => {
    renderAt("/");
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders /dashboard", () => {
    renderAt("/dashboard");
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders ExamsPage at /exams", () => {
    renderAt("/exams");
    expect(screen.getByText("ExamsPage")).toBeInTheDocument();
  });

  it("renders ResultsPage at /results", () => {
    renderAt("/results");
    expect(screen.getByText("ResultsPage")).toBeInTheDocument();
  });

  it("renders FeedbackPage at /feedback", () => {
    renderAt("/feedback");
    expect(screen.getByText("FeedbackPage")).toBeInTheDocument();
  });

  it("renders AnalyticsPage at /analytics", () => {
    renderAt("/analytics");
    expect(screen.getByText("AnalyticsPage")).toBeInTheDocument();
  });

  it("renders UploadPage at /upload", () => {
    renderAt("/upload");
    expect(screen.getByText("UploadPage")).toBeInTheDocument();
  });

  it("renders CIEMarksPage at /cie", () => {
    renderAt("/cie");
    expect(screen.getByText("CIEMarksPage")).toBeInTheDocument();
  });

  it("renders ScriptViewPage at /my_scripts", () => {
    renderAt("/my_scripts");
    expect(screen.getByText("ScriptViewPage")).toBeInTheDocument();
  });

  it("renders fallback for unknown route", () => {
    renderAt("/nonexistent-path");
    expect(screen.getByText("Not Found")).toBeInTheDocument();
  });
});
