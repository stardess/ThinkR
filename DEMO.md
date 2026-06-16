# ThinkR — Demo Runbook

A guided walkthrough that showcases every visual tool and backend capability, plus a
one-command automated check that proves the whole flow runs. Follow the scenes in
order for a ~6-minute live demo.

---

## 0 — Boot the stack

```bash
# 1. Postgres (Homebrew) — should already be running
brew services start postgresql@16

# 2. Backend  (terminal A)
cd backend
./venv/bin/uvicorn app.main:app --reload          # http://localhost:8000  (docs at /docs)

# 3. Seed pristine demo data  (terminal B, backend running)
cd backend && ./venv/bin/python scripts/seed.py

# 4. Frontend (terminal C)
cd frontend && npm run dev                          # http://localhost:3000
```

**Demo accounts** — password for all: `ThinkR2026!`

| Role | Email | Notes |
|---|---|---|
| Student | `alex.kim@student.edu` | CS/ML, strong profile, has prior research |
| Student | `jordan.lee@student.edu` | Public Health senior — used for the professor-request demo |
| Student | `sofia.rodriguez@student.edu` | Biology sophomore |
| Researcher | `marcus.chen@university.edu` | CS/Medicine — owns the AI/ML projects |
| Researcher | `elena.ramirez@university.edu` | Biology lab |

> Pre-seeded so the dashboards aren't empty: Alex already swiped on *AI-Assisted Sepsis Detection* (97.5%), Sofia on *Mitochondrial Stress* (84%).

---

## Scene 1 — Student discover feed + compatibility scoring  *(visual centerpiece)*

1. Sign in as **alex.kim@student.edu** → lands on **/discover**.
2. Point out on each **swipe card**:
   - The big **score % + tier badge** in the header (Jobright-style: Strong / Good / Partial / Low).
   - Click **"Why _NN_% match?"** → the **score breakdown** expands: six signals, each with a mini bar and a plain-English reason ("3 of 3 required skills matched", "Meets Junior+ requirement"…).
3. **Swipe** — drag the card, use the ✓ / ✕ buttons, or the **← / → arrow keys**. Right = interested, left = pass.

> **Backend:** `GET /discover` ranks active projects by `compute_compatibility_detailed()` (skills 30 / academic-year 20 / availability 20 / interests 15 / preferred 10 / prior-experience 5), excludes already-swiped, returns `compatibility_score`, `tier`, and `score_breakdown`. `POST /matches/swipe` records the swipe.

---

## Scene 2 — Student dashboard + live notifications

1. Go to **Dashboard**. Show the **stats**, **profile-completeness bar**, and matches grouped into **Waiting for response** vs **Mutual matches**.
2. Click **"Edit profile →"** (the completeness card) → **/profile**. Show the full editable profile, including **Prior research experience** ("boosts your match score"). Save → inline **✓ Saved**.

> **Backend:** `GET /matches`, `GET /students/me`, `PUT /students/me`. The Navbar polls `GET /notifications/summary` every 15s and pops **slide-in toast banners** when something new arrives.

---

## Scene 3 — Professor reviews the inbound queue and accepts

1. Sign out → sign in as **marcus.chen@university.edu**.
2. On the **Researcher Dashboard**, show **active projects** (toggle one active/inactive) and the **"Students who swiped right"** queue — each row now shows the **student's name, year, major, top skills, and compatibility %**.
3. Click **✓** on the highest-scoring student → it becomes a **mutual match** and moves to **Mutual matches**.
4. Note the red **notification badge** on the Dashboard nav link.

> **Backend:** `GET /matches` (scoped to *this* researcher's projects, with student identity), `POST /matches/researcher-swipe` flips `researcher_interest` → `is_mutual=true`.

---

## Scene 4 — Professor browses students + sends a proactive request

1. Click **Browse Students** → **/dashboard/students**.
2. Use the **"Match for:"** dropdown to pick a project — the grid **re-ranks students by score**. Show the **tier legend** and click **"Why? ▼"** on a card to reveal the breakdown.
3. Click **Interested** on **Jordan Lee** → toast **"Request sent 👍"**.

> **Backend:** `GET /students?project_id=…` scores every public student against the project; `POST /matches/professor-request` creates a match with `researcher_interest=true, student_interest=false`.

---

## Scene 5 — Student accepts the professor's request  *(the new two-sided flow)*

1. Sign out → sign in as **jordan.lee@student.edu**.
2. A **toast banner** fires and the dashboard shows a pulsing **"A researcher reached out to you"** section at the top, with the project, professor, and compatibility %.
3. Click **✓ Accept** → instant **"🎉 You're matched!"** banner; the card moves to **Mutual matches**.

> **Backend:** `GET /notifications/summary` now returns `incoming_requests` for students; accepting calls `POST /matches/swipe` (right), which flips the existing request to `is_mutual=true`.

---

## Scene 6 — Mutual-match chat + scheduling

1. From either side, open a **Mutual match → Chat →**.
2. Send a message; show real-time-feel bubbles, avatars, timestamps.
3. Click **📅 Schedule Call** → modal with **Open Zoom** / **Open Google Meet** buttons.

> **Backend:** `GET/POST /messages/{match_id}` (gated to mutual matches). Scheduling opens a meeting link client-side.

---

## Feature → implementation map

| Capability | Where it shows | Backend |
|---|---|---|
| Swipe feed w/ score badges | `/discover`, `SwipeCard.tsx` | `GET /discover` |
| Score breakdown ("why NN%?") | `ScoreBreakdown.tsx` on cards + browse grid | `score_breakdown` in `discover` / `students` |
| Compatibility scoring (6 signals) | tier badge + breakdown | `services/matching.py` |
| Student accept professor request | dashboard "reached out" section | `notifications.summary.incoming_requests`, `matches/swipe` |
| Professor inbound queue (w/ identity) | researcher dashboard | `GET /matches` + `MatchOut.student` |
| Browse + proactive request | `/dashboard/students` | `GET /students`, `matches/professor-request` |
| Live notification banners | toasts in `Navbar.tsx` | `GET /notifications/summary` (15s poll) |
| Mutual chat + scheduling | `/matches/[id]` | `messages` router |
| Profile editing | `/profile` | `PUT /students/me` |

---

## Automated proof it all runs

A scripted end-to-end smoke test drives the live API through the entire flow
(auth → discover/scoring → swipe → professor queue → accept → browse → proactive
request → **student accepts** → chat) and asserts each step:

```bash
# backend running + freshly seeded
cd backend && ./venv/bin/python scripts/e2e_smoke.py
```

Expected tail:

```
========== SUMMARY ==========
  19 checks passed.
```

> Re-seed any time for a clean slate:
> `psql "postgresql://thinkr:thinkr_dev@localhost:5432/thinkr" -c "TRUNCATE users CASCADE;" && ./venv/bin/python scripts/seed.py`
