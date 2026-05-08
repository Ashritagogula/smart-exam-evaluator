# University Examination Management System — Backend

## Quick Start

### 1. Fix MongoDB Atlas Network Access (REQUIRED)
1. Go to https://cloud.mongodb.com
2. Select your cluster → **Network Access** (left sidebar)
3. Click **Add IP Address** → **Allow Access from Anywhere** → Confirm
4. Wait 1-2 minutes for changes to propagate

### 2. Set Gemini API Key
Edit `.env` and replace `GEMINI_API_KEY` with your real key from https://aistudio.google.com

### 3. Install & Start
```bash
cd backend
npm install
npm run dev      # Development (auto-restart)
# or
npm start        # Production
```

### 4. Seed Demo Data
```bash
npm run seed
```

### 5. Login Credentials (after seeding)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@aditya.ac.in | admin123 |
| Exam Cell | devi@examcell.aditya.ac.in | examcell123 |
| Faculty | lakshmi@faculty.aditya.ac.in | faculty123 |
| HOD | krishna@faculty.aditya.ac.in | hod123 |
| Student | arjun@student.aditya.ac.in | student123 |
| DCE | subramanyam@dce.aditya.ac.in | dce123 |
| CE | venkat@ce.aditya.ac.in | ce123 |
| Clerk | clerk@aditya.ac.in | clerk123 |
| External | external@aditya.ac.in | external123 |
| Scrutinizer | scrutinizer@aditya.ac.in | scrutinizer123 |
| Coordinator | coordinator@aditya.ac.in | coordinator123 |

## API Reference

### Auth
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Current user
- `POST /api/auth/register` — Register

### Core Resources
- `GET/POST /api/colleges`
- `GET/POST /api/departments`
- `GET/POST /api/subjects`
- `GET/POST /api/students`
- `GET/POST /api/faculty`
- `GET/POST /api/exam-events`

### Internal Evaluation Workflow
- `POST /api/answer-booklets/upload-bulk` — Clerk uploads booklets
- `POST /api/answer-booklets/bulk-assign` — Assign to faculty
- `POST /api/internal-eval/booklet/:id/ai-evaluate` — Trigger AI
- `PUT /api/internal-eval/booklet/:id/marks` — Faculty modifies
- `POST /api/internal-eval/booklet/:id/freeze` — Freeze (starts 2-day window)

### External Examination Workflow
- `POST /api/external-exam/booklets/upload` — Upload external booklets
- `POST /api/external-exam/bundles/create` — Divide into bundles
- `POST /api/external-exam/bundles/:id/ai-evaluate` — Batch AI evaluation
- `POST /api/external-exam/scrutinizer/review/:id` — Scrutinizer check
- `POST /api/external-exam/dce/review` — DCE approval
- `POST /api/external-exam/central/submit` — Submit stats to CE
- `POST /api/external-exam/central/declare` — Declare results

### OCR
- `POST /api/ocr/evaluate` — Direct OCR evaluation (multipart form)

## Architecture

```
server.js → src/app.js → Routes → Controllers → Services → MongoDB
                                ↓
                         src/services/
                           ocr.service.js (Gemini AI + PDF processing)
                           marks.service.js (CIE formula, SEE scaling)
                           notification.service.js (student notifications)
                         
                         src/utils/
                           cronJobs.js (permanent freeze after 48h)
                           seedData.js (demo data)
```

## ACID Compliance

- **Freeze operation**: Uses `mongoose.startSession()` + transaction across FacultyEvaluation, AnswerBooklet, FreezeEvent, InternalExam
- **Scrutinizer review**: Transactional unfreeze + bundle status update
- **Write concern**: `{ w: "majority", j: true }` on all connections
- **Optimistic locking**: `version` field on FacultyEvaluation and booklet models
- **2-day window enforcement**: `node-cron` runs every 30 min to permanently freeze expired evaluations
