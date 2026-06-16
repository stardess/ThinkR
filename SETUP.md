# ThinkR — Setup Guide (run it on your machine)

How to pull the `demo-branch` and run the full stack locally. Takes ~10 minutes.

> macOS (Homebrew) commands shown. Linux is the same except for installing
> Postgres; Windows users should use WSL2.

---

## 0 — Prerequisites

| Tool | Version | Install (macOS) |
|---|---|---|
| Python | 3.11+ | `brew install python@3.11` |
| Node.js | 20+ | `brew install node` |
| PostgreSQL | 16 | `brew install postgresql@16` |
| Git | any | pre-installed |

Check what you have:

```bash
python3 --version   # ≥ 3.11
node --version      # ≥ 20
psql --version      # ≥ 14 is fine
```

---

## 1 — Get the code

```bash
git clone https://github.com/stardess/ThinkR.git
cd ThinkR
git checkout demo-branch
git pull origin demo-branch
```

---

## 2 — Database

Start Postgres and create the user + database the app expects:

```bash
brew services start postgresql@16
# make sure psql is on your PATH (Apple Silicon path shown):
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

psql postgres -c "CREATE USER thinkr WITH PASSWORD 'thinkr_dev';"
psql postgres -c "CREATE DATABASE thinkr OWNER thinkr;"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE thinkr TO thinkr;"
```

> Tables (and the `prior_experience` column) are created automatically the
> first time the backend starts — no manual migration needed.

---

## 3 — Backend (terminal A)

```bash
cd backend

# create + activate a virtualenv
python3 -m venv venv
source venv/bin/activate

# install dependencies
pip install -r requirements.txt

# create your local env file from the template
cp .env.example .env
```

Open `backend/.env` and set at least **`SECRET_KEY`** (any 32+ char string):

```bash
# quick way to generate one:
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

- `OPENAI_API_KEY` is **optional**. Without it, AI resume parsing just returns
  empty fields and the student fills the profile in manually — everything else
  works. With a key, the "Parse with AI" step in onboarding works.
- The default `DATABASE_URL` already matches the user/db from step 2.

Start the API (leave it running):

```bash
uvicorn app.main:app --reload
```

Verify in another shell: `curl http://localhost:8000/health` → `{"status":"ok"}`
Interactive API docs: http://localhost:8000/docs

---

## 4 — Seed demo data (terminal B)

With the backend running:

```bash
cd backend
source venv/bin/activate     # if not already active
python scripts/seed.py
```

Creates 3 researchers, 5 projects, 4 students, and 2 pre-seeded swipes.
All demo accounts use password **`ThinkR2026!`**:

| Role | Emails |
|---|---|
| Students | `alex.kim@student.edu`, `sofia.rodriguez@student.edu`, `jordan.lee@student.edu`, `sam.taylor@student.edu` |
| Researchers | `marcus.chen@university.edu`, `elena.ramirez@university.edu`, `leo.vasquez@university.edu` |

> Re-seed any time for a clean slate:
> ```bash
> psql "postgresql://thinkr:thinkr_dev@localhost:5432/thinkr" -c "TRUNCATE users CASCADE;"
> python scripts/seed.py
> ```

---

## 5 — Frontend (terminal C)

```bash
cd frontend
cp .env.local.example .env.local   # points NEXT_PUBLIC_API_URL at :8000
npm install
npm run dev
```

Open **http://localhost:3000** and log in with any account above.

---

## 6 — Quick check that it all works

```bash
# from backend/ with the venv active and the API running:
python scripts/e2e_smoke.py        # should end with "19 checks passed."
```

Or click through it using **`DEMO.md`** (a 6-scene walkthrough).

---

## Notes / troubleshooting

- **`.env` files are not in git** (they hold secrets). You must create both from
  their `*.example` templates — steps 3 and 5.
- **Port already in use** (`8000`/`3000`): stop the other process, or run the
  backend on another port with `uvicorn app.main:app --reload --port 8001` and
  set `NEXT_PUBLIC_API_URL=http://localhost:8001` in `frontend/.env.local`.
- **DB connection refused**: make sure `brew services start postgresql@16` ran
  and the role/db from step 2 exist (`psql -l` lists databases).
- **`psql: command not found`**: add Postgres to your PATH (see step 2).
- **CORS errors in the browser**: confirm `FRONTEND_URL=http://localhost:3000`
  in `backend/.env` matches where the frontend is served.

---

## Three terminals, summarized

```
A: cd backend  && source venv/bin/activate && uvicorn app.main:app --reload
B: cd backend  && source venv/bin/activate && python scripts/seed.py   (once)
C: cd frontend && npm run dev
```
