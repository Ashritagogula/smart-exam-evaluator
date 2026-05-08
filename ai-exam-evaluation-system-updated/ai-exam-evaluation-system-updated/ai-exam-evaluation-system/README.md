# Aditya University — AI Answer Sheet Evaluation System

A full React.js frontend for the AI-powered answer sheet evaluation platform, themed after Aditya University (adityauniversity.in).

## Tech Stack
- **Frontend:** React 18 + Vite
- **Styling:** Modular CSS (one `.css` per component)
- **Fonts:** Merriweather (headings) + Source Sans 3 (body)
- **Theme:** Aditya University — Navy Blue (#002366) + Gold (#f7941d)

## Project Structure

```
src/
├── constants/
│   ├── colors.js          # AU color palette
│   ├── icons.js           # SVG path strings
│   └── mockData.js        # Demo data (students, faculty, exams, sheets)
│
├── components/
│   ├── ui/
│   │   ├── Icon.jsx / (no css)     # SVG icon renderer
│   │   ├── Badge.jsx / Badge.css   # Status badges
│   │   ├── Buttons.jsx / Buttons.css
│   │   ├── StatCard.jsx / StatCard.css
│   │   ├── Charts.jsx / Charts.css  # BarChart, DonutChart, LineSparkline, ProgressBar
│   │   └── Card.jsx / Card.css      # Card, AUTable, Divider
│   │
│   ├── layout/
│   │   ├── Sidebar.jsx / Sidebar.css
│   │   ├── Topbar.jsx / Topbar.css
│   │   └── Breadcrumb.jsx / Breadcrumb.css
│   │
│   └── modals/
│       └── EvalModal.jsx / EvalModal.css
│
├── pages/
│   ├── LandingPage.jsx / LandingPage.css
│   ├── EvaluatePage.jsx
│   ├── UploadPage.jsx
│   ├── ExamsPage.jsx
│   ├── UsersPage.jsx
│   ├── ResultsPage.jsx
│   ├── FeedbackPage.jsx
│   ├── DepartmentsPage.jsx
│   └── AnalyticsPage.jsx
│   └── dashboards/
│       ├── AdminDashboard.jsx
│       ├── ExamCellDashboard.jsx
│       ├── FacultyDashboard.jsx
│       ├── HODDashboard.jsx
│       ├── PrincipalDashboard.jsx
│       ├── VCDashboard.jsx
│       └── StudentDashboard.jsx
│
├── App.jsx       # Root — auth state, routing, modal state
├── main.jsx      # React entry point
└── index.css     # Global styles + layout utilities

```

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 — select any role on the login screen to demo.

## User Roles (Demo)
| Role | Description |
|------|-------------|
| Admin | Full system control, user management, analytics |
| Exam Cell | Create exams, upload sheets, assign faculty, publish results |
| Faculty | Review AI evaluations, modify marks |
| HOD | Department analytics + faculty oversight |
| Principal | Cross-department performance |
| Vice Chancellor | University-wide overview |
| Student | Results, AI feedback, performance charts |

## Backend Integration Points
- Replace `src/constants/mockData.js` with API calls
- `EvalModal.jsx` → POST `/api/evaluations/:id/approve`
- `UploadPage.jsx` → POST `/api/answer-sheets/upload`
- `ExamsPage.jsx` → POST/GET `/api/exams`
