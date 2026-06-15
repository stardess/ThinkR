# ThinkR

**Academic Research Matchmaking Platform**

ThinkR connects motivated students with professors who need skilled collaborators — using AI-powered profile ingestion and a Tinder-style swipe interface designed for academia. Think of it as the matchmaker between student talent and faculty research needs.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
  - [1 — Clone the repo](#1--clone-the-repo)
  - [2 — Database](#2--database)
  - [3 — Backend](#3--backend)
  - [4 — Frontend](#4--frontend)
  - [5 — Run with Docker (alternative)](#5--run-with-docker-alternative)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [User Flows](#user-flows)
- [Milestones](#milestones)

---

## Overview

| | |
|---|---|
| **Frontend** | Next.js 14 (App Router) + Tailwind CSS |
| **Backend** | Python 3.11 + FastAPI (async) |
| **Database** | PostgreSQL 16 via SQLAlchemy (asyncpg) |
| **AI Ingestion** | OpenAI GPT-4o-mini — parses resumes into structured profiles |
| **Auth** | JWT (python-jose + bcrypt) |
| **File Storage** | AWS S3 / Cloudflare R2 (configurable) |
| **Containerization** | Docker + docker-compose |

---

## Key Features

### F1 — Matchmaking Engine
Compatibility scores are computed between student profiles and research projects using Jaccard similarity across skills, interests, research domains, and availability. Students browse a ranked card feed and swipe right (interested) or left (pass). Professors review their interested-student queue and swipe back. A **mutual match** unlocks in-app chat.

### F2 — AI-Powered Student Onboarding
Students paste free text or upload a resume/transcript (PDF, DOCX, TXT). The AI ingestion service (GPT-4o-mini) extracts skills, interests, GPA range, academic year, major, and a plain-language summary. All fields are editable before saving.

### F3 — User-Defined Preferences
- **Students**: preferred research domains, hours/week, start date, remote/in-person
- **Professors**: required skills, minimum academic year, project duration, hours expected
- Hard filters exclude non-matches; soft preferences deprioritize but still surface them.

### F4 — Visual Dashboard
Role-aware dashboards show profile completeness (students), active project listings (researchers), the interested-student queue, mutual matches, and match status (`Pending → Matched → Contacted`).

### F5 — In-App Chat
Once a mutual match is created, both parties can message each other directly inside ThinkR. Chat is locked until both sides have swiped right, preserving privacy.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser                                │
│                                                                 │
│   Next.js 14 (App Router)          Tailwind CSS                 │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│   │ Landing  │  │ Onboard  │  │ Discover │  │Dashboard │       │
│   │  /signup │  │ /student │  │ /swipe   │  │  /chat   │       │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└────────┼─────────────┼─────────────┼──────────────┼────────────┘
         │             │  Axios + JWT│              │
         ▼             ▼             ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend (Python)                    │
│                                                                 │
│  /auth  /students  /researchers  /discover  /matches  /messages │
│                                                                 │
│  ┌────────────────┐   ┌──────────────────┐                      │
│  │ AI Ingestion   │   │ Matching Engine  │                      │
│  │ (GPT-4o-mini)  │   │ (Jaccard scorer) │                      │
│  └────────────────┘   └──────────────────┘                      │
└──────────────────────────────┬──────────────────────────────────┘
                               │ asyncpg
                               ▼
                  ┌────────────────────────┐
                  │   PostgreSQL 16        │
                  │                        │
                  │  users                 │
                  │  student_profiles      │
                  │  researcher_profiles   │
                  │  research_projects     │
                  │  matches               │
                  │  messages              │
                  └────────────────────────┘
```

### Compatibility Scoring

The matching engine scores each student–project pair on a **0–100 scale**:

| Signal | Weight |
|---|---|
| Required skill overlap (Jaccard) | 40% |
| Preferred skill overlap (Jaccard) | 15% |
| Research domain / interest alignment | 30% |
| Availability (hours/week delta) | 15% |

---

## Project Structure

```
ThinkR/
├── docker-compose.yml          # Full local stack (db + backend + frontend)
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example            # Copy to .env and fill in secrets
│   └── app/
│       ├── main.py             # FastAPI app entry point + CORS
│       ├── config.py           # Pydantic settings (reads .env)
│       ├── database.py         # Async SQLAlchemy engine + session
│       ├── models.py           # ORM models: User, Student, Researcher,
│       │                       #   Project, Match, Message
│       ├── schemas.py          # Pydantic request/response models
│       ├── dependencies.py     # JWT auth guards
│       ├── routers/
│       │   ├── auth.py         # POST /auth/signup|login
│       │   ├── students.py     # GET|PUT /students/me, POST /students/ingest
│       │   ├── researchers.py  # Profile + project CRUD
│       │   ├── discover.py     # GET /discover (ranked, filtered feed)
│       │   ├── matches.py      # POST /matches/swipe + researcher-swipe
│       │   └── messages.py     # GET|POST /messages/:match_id
│       └── services/
│           ├── ai_ingestion.py # GPT-4o-mini resume parser
│           └── matching.py     # Jaccard compatibility scorer + ranker
│
└── frontend/
    ├── Dockerfile
    ├── package.json            # Next.js 14, Tailwind, Axios
    ├── tailwind.config.js      # Brand colors, card shadows, tag utilities
    ├── app/
    │   ├── page.tsx                        # Landing page
    │   ├── (auth)/login/page.tsx           # Login form
    │   ├── (auth)/signup/page.tsx          # Signup with role toggle
    │   ├── onboarding/student/page.tsx     # AI parse → review & edit
    │   ├── onboarding/researcher/page.tsx  # Profile → create project
    │   ├── discover/page.tsx               # Swipe UI + filter sidebar
    │   ├── dashboard/page.tsx              # Role-aware dashboard
    │   └── matches/[id]/page.tsx           # In-app chat thread
    ├── components/
    │   ├── SwipeCard.tsx       # Drag / touch / keyboard swipe card
    │   └── Navbar.tsx
    └── lib/
        ├── types.ts            # All TypeScript interfaces
        ├── api.ts              # Axios client + all API call functions
        └── auth.ts             # localStorage JWT helpers
```

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Python | 3.11+ | [python.org](https://python.org) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| PostgreSQL | 16 | `brew install postgresql@16` |
| Git | any | pre-installed on macOS |
| Docker *(optional)* | 24+ | [docker.com](https://docker.com) |

---

## Local Setup

### 1 — Clone the repo

```bash
git clone https://github.com/stardess/ThinkR.git
cd ThinkR
```

---

### 2 — Database

**Install and start PostgreSQL (Homebrew):**

```bash
brew install postgresql@16
brew services start postgresql@16
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
```

**Create the user and database:**

```bash
psql postgres -c "CREATE USER thinkr WITH PASSWORD 'thinkr_dev';"
psql postgres -c "CREATE DATABASE thinkr OWNER thinkr;"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE thinkr TO thinkr;"
```

Tables are created automatically when the backend starts for the first time.

---

### 3 — Backend

```bash
cd backend

# Copy and configure environment variables
cp .env.example .env
# Edit .env — at minimum set OPENAI_API_KEY if you want AI ingestion

# Install dependencies
pip install -r requirements.txt

# Start the API server (auto-reloads on file changes)
uvicorn app.main:app --reload
```

The API will be available at **http://localhost:8000**

Interactive API docs: **http://localhost:8000/docs**

---

### 4 — Frontend

Open a new terminal:

```bash
cd frontend

# Copy environment file
cp .env.local.example .env.local

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at **http://localhost:3000**

---

### 5 — Run with Docker (alternative)

Requires Docker Desktop to be running.

```bash
# From the project root
cp backend/.env.example backend/.env
# Edit backend/.env as needed

docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

---

## Environment Variables

### `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL asyncpg connection string |
| `SECRET_KEY` | ✅ | JWT signing secret (min 32 chars — change in production) |
| `ALGORITHM` | ✅ | JWT algorithm (default: `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ✅ | Token lifetime (default: `10080` = 1 week) |
| `OPENAI_API_KEY` | ⚠️ optional | Enables AI resume ingestion (GPT-4o-mini). Without it, students fill in their profile manually. |
| `AWS_ACCESS_KEY_ID` | ⚠️ optional | S3 file uploads (resume storage) |
| `AWS_SECRET_ACCESS_KEY` | ⚠️ optional | S3 file uploads |
| `AWS_REGION` | ⚠️ optional | S3 region (default: `us-east-1`) |
| `S3_BUCKET_NAME` | ⚠️ optional | S3 bucket name |
| `FRONTEND_URL` | ✅ | CORS allowed origin (default: `http://localhost:3000`) |
| `ENVIRONMENT` | ✅ | `development` or `production` |

### `frontend/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (default: `http://localhost:8000`) |

---

## API Reference

All authenticated endpoints require `Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | — | Register (returns JWT + user) |
| `POST` | `/auth/login` | — | Login (returns JWT + user) |

### Students

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/students/me` | Student | Get own profile |
| `PUT` | `/students/me` | Student | Update own profile |
| `GET` | `/students/:id` | — | Get student by ID (PII hidden if anonymous) |
| `POST` | `/students/ingest` | Student | AI-parse resume text or file upload |

### Researchers

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/researchers/me` | Researcher | Get own profile |
| `PUT` | `/researchers/me` | Researcher | Update own profile |
| `POST` | `/researchers/me/projects` | Researcher | Create a research project |
| `GET` | `/researchers/me/projects` | Researcher | List own projects |
| `PATCH` | `/researchers/me/projects/:id/toggle` | Researcher | Toggle project active/inactive |

### Discover

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/discover` | Student | Ranked project feed (excludes already-swiped) |

Query params: `remote_only=true`, `domain=<string>`, `max_hours=<int>`

### Matches

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/matches/swipe` | Student | Swipe on a project (`direction: "right"/"left"`) |
| `POST` | `/matches/researcher-swipe` | Researcher | Swipe on an interested student |
| `GET` | `/matches` | Any | List all matches for authenticated user |

### Messages

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/messages/:match_id` | Participant | Get message thread (mutual matches only) |
| `POST` | `/messages/:match_id` | Participant | Send a message |

---

## User Flows

### Student

```
Sign up (role: student)
  → AI Onboarding: paste bio / upload resume
  → Review & edit parsed fields
  → Discover feed: swipe right on interesting projects
  → Dashboard: track pending & mutual matches
  → Chat: message matched professors
```

### Researcher

```
Sign up (role: researcher)
  → Profile setup: institution, lab, research areas
  → Create project: title, plain-language description, required skills
  → Dashboard: review students who swiped right
  → Swipe back: right = mutual match, left = pass
  → Chat: message matched students
```

---

## Milestones

| Phase | Deliverable | Target |
|---|---|---|
| M1 — Foundation | Auth, profile models, DB schema | Week 2 |
| M2 — Ingestion | AI ingestion service, student profile flow | Week 4 |
| M3 — Matching Core | Project listings, scoring, swipe UI | Week 6 |
| M4 — Dashboard + Chat | Dashboards, match detail, messaging | Week 8 |
| M5 — Polish & Launch | Notifications, settings, accessibility, deploy | Week 10 |

---

## Out of Scope (v1)

- Mobile native apps (iOS / Android)
- University LDAP / SSO integration
- Formal application tracking or offer workflows
- Video interview scheduling
- Public publication or citation feeds
