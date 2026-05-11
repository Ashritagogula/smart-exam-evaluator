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
│   └── icons.js           # SVG path strings
│
├── services/
│   └── api.js             # Centralized API client (all backend calls)
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
# 1. Copy the environment template and set your backend URL
cp .env.example .env
# Edit .env → set VITE_API_URL to your backend host

# 2. Install and run
npm install
npm run dev
```

Open http://localhost:5173 and log in with a seeded account.

## Environment Configuration

| Variable       | Description                              | Default                    |
|----------------|------------------------------------------|----------------------------|
| `VITE_API_URL` | Backend base URL for the dev-server proxy | `http://localhost:5001`   |

The proxy is configured in `vite.config.js`. All `/api/*` and `/uploads/*` requests are forwarded to `VITE_API_URL` at dev time — no CORS issues needed.

## User Roles
| Role | Description |
|------|-------------|
| Admin | Full system control, user management, analytics |
| Exam Cell | Create exams, upload sheets, assign faculty, publish results |
| Faculty | Review AI evaluations, modify marks |
| HOD | Department analytics + faculty oversight |
| Principal | Cross-department performance |
| Vice Chancellor | University-wide overview |
| Student | Results, AI feedback, performance charts |

## API Integration

All pages consume `src/services/api.js` — a centralized fetch client that:
- Attaches the JWT from `localStorage` to every request
- Proxies through Vite's dev server (no CORS configuration required)
- Dispatches an `auth:logout` event on 401 responses

Key endpoints used by each page:
- `EvaluatePage` → `internalEval.triggerAI`, `internalEval.updateMarks`, `internalEval.freeze`
- `UploadPage` → `answerBooklets.uploadBulk`, `questionPapers.upload`
- `ExamsPage` → `examEvents.list`, `examEvents.create`, `examEvents.updateStatus`
- `CIEMarksPage` → `cieMarks.list`, `cieMarks.compute`
- `ResultsPage` → `results.getForStudent`, `results.declare`
