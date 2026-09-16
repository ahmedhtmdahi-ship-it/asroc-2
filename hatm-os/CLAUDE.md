# CLAUDE.md — HATM OS (حوتمة) MVP

You are building **HATM OS**, an AI operations assistant for training-program
management. Read this file fully before writing any code. The reference
documents in `docs/` are the source of truth for architecture and contracts.

## Who I am and how to work with me

I'm Hatem — operations manager of a training center in Egypt. I run cohorts
(React, Flutter, Power BI…), sessions on Zoom, attendance in Google Sheets,
follow-ups by email/WhatsApp. I know the domain deeply; I'm learning the
engineering side. So:

- Explain decisions briefly in Arabic or English, whichever is clearer. Code and
  comments in English.
- When something is ambiguous, ask **one consolidated question**, not five small
  ones. Never guess on domain rules (attendance thresholds, message wording).
- Prefer boring, well-tested choices over clever ones. This must run unattended
  24/7 on one VPS.
- Show me what you're about to do before big changes. Small changes: just do them.

## What we are building (scope — do NOT exceed)

One end-to-end flow, working for real, with real integrations:

```
"اقفل سيشن React"
  → fetch Zoom participant report
  → compute net minutes (merge overlapping intervals)
  → match Zoom names to trainee roster (AI service; ambiguous → human review)
  → apply program attendance rules → status per trainee
  → [APPROVAL] write attendance to Google Sheet
  → compose absence / partial-attendance emails
  → [APPROVAL] send emails
  → log everything
```

Plus a minimal web UI to drive it: Mission Control (priorities + chat command),
Review screen, Approval Inbox, Session view, Activity log.

**Out of scope for MVP** (don't build, don't scaffold): multi-tenant, roles,
WhatsApp, Drive indexing, template engine, report engine, quality gate.
Keep a `tenant_id` column on root tables but don't implement tenancy.

## Non-negotiable architecture rules

Layers (see `docs/00-architecture.md`): L0 persistence → L1 adapters →
L2 domain (pure) → L3 orchestration → L4 intelligence → L5 API → L6 UI.

1. **`app/domain/` has zero I/O.** No HTTP, no DB, no file access. Pure
   functions only. If you need I/O there, you're in the wrong layer.
2. **The AI service never executes.** It returns suggestions + confidence.
   Orchestration decides. Adapters execute.
3. **Every external side effect goes through `ApprovalGate`** and is written to
   `ActivityLog`. No email sent, no sheet cell written without an approved
   `Approval` row. Feature flag `FF_SEND_EMAIL=false` by default.
4. **Adapters implement abstract interfaces** in `app/adapters/base.py`.
5. **Workflow runs are persistent and resumable.** State lives in the DB
   (`WorkflowRun.context`), never only in memory. A run pauses for review /
   approval and resumes hours later from the same step.
6. **Idempotency everywhere it matters:** approvals, outbound messages, workflow
   steps. Double-click must never double-send.
7. **Never write to a sheet cell by address** (`C5`). Read the header row, map
   column name → index, write by name.
8. **Anti-spam gate**: max 1 sent message per trainee per 24h, enforced in one
   function all sends pass through.

## Stack (fixed — don't substitute)

- Python 3.11, FastAPI, SQLAlchemy 2.0 (typed `Mapped[]`), Alembic, PostgreSQL 15
- Celery + Redis (worker + beat), `tenacity` for retries, `httpx`
- Google APIs via service account; Zoom via Server-to-Server OAuth
- AI service: separate FastAPI app in `ai/`, port 8100, stateless,
  `rapidfuzz` + `sentence-transformers` (`paraphrase-multilingual-MiniLM-L12-v2`)
- Frontend: React + TypeScript + Vite + Tailwind, RTL Arabic, mobile-first
- Docker Compose for everything; `.env` for secrets (never committed)
- Tests: pytest (backend), vitest (frontend)

## Repository layout

```
hatm-os/
├── CLAUDE.md                ← this file
├── docs/
│   ├── 00-architecture.md   ← contracts, data model, phase gates
│   ├── 01-backend.md        ← implementation guide with reference code
│   ├── 02-ai.md
│   └── 03-frontend.md
├── docker-compose.yml
├── backend/                 ← FastAPI app (app/, alembic/, tests/)
├── ai/                      ← matching + intent service
├── frontend/                ← React app
└── prototype/hatm-os-prototype.html   ← clickable prototype of the UX; match its flow
```

`docs/01-backend.md` contains reference implementations for every backend
module (models, Zoom adapter, duration engine, rules engine, sheets adapter,
workflow engine, approval gate, templates, antispam, celery, endpoints).
**Start from that code.** Improve it where it's wrong; don't rewrite it from
scratch in a different style.

`docs/00-architecture.md` §5 defines the JSON contracts between backend ↔ AI
and backend ↔ frontend. **Do not change a contract without telling me.**

## Domain rules (defaults — confirm with me before changing)

```json
{
  "basis": "planned_duration",
  "late_threshold_min": 15,
  "early_leave_threshold_min": 10,
  "thresholds": [
    {"status": "present", "min_pct": 80},
    {"status": "partial", "min_pct": 50},
    {"status": "absent",  "min_pct": 0}
  ],
  "modifiers": {"flag_review_if_disconnects_gt": 3}
}
```

Name matching: auto-match only if `best ≥ 0.88 AND (best − second) ≥ 0.10`.
**A false positive is far worse than a review.** When in doubt, `needs_review`.

Arabic normalization is mandatory: strip diacritics/tatweel, أإآ→ا, ة→ه, ى→ي,
ؤ→و, ئ→ي, Arabic-Indic digits → ASCII, remove emoji/device suffixes
("'s iPhone"), unify "عبد الرحمن"/"عبدالرحمن". Handle transliteration
(Ahmed/Ahmad/أحمد) via a table of common Egyptian names + fuzzy.

## Build order and gates

Work in this order. Each phase has an acceptance gate; **don't move on until the
gate passes and I've confirmed.**

### Phase 0 — Foundation
- `docker compose up` brings up postgres, redis, api, worker, beat, ai, frontend
- Alembic migrations for all models in `docs/00-architecture.md` §4
- `@logged` ActivityLog decorator working
- OpenAPI served at `/api/openapi.json`; frontend runs against a mock
- `pytest` and `vitest` both green (even if few tests)
- **Gate:** fresh clone → `cp .env.example .env` → `docker compose up` → health
  checks pass on all services.

### Phase 1 — Attendance core
- `ZoomAdapter` (S2S OAuth, instances lookup, double-URL-encoded UUID,
  pagination, `ReportNotReady` → pause + retry via beat)
- `domain/duration.py` with the 10 tests in `docs/01-backend.md` §5 passing
- `domain/rules.py` with tests
- `SheetsAdapter` (header mapping, batchUpdate, snapshot before write)
- `WorkflowEngine` + `close_session` definition (steps 1–6)
- AI `/match` endpoint meeting the contract, with a test set of ≥100 mocked
  Arabic/English name cases; report precision/recall
- Frontend: Review screen + Session view (keyboard-first, RTL)
- **Gate:** I close a real session from my Zoom account end-to-end; numbers
  match my manual count; ambiguous names land in Review; confirming a name
  saves an alias; sheet is written only after I approve. Replaying the same
  session yields identical results.

### Phase 2 — Communication
- `ApprovalGate` generic + expiry + idempotency
- `domain/templates.py` with Jinja2 `StrictUndefined` (missing variable = error)
- `GmailAdapter` (drafts first; `send` behind `FF_SEND_EMAIL`)
- `AntiSpamGate`; feedback reminder loop that stops on reply
- Steps 7–9 of `close_session` (compose → approve → send)
- AI `/parse` intent endpoint (`close_session`, `send_reminders`,
  `daily_brief`, `search`, `unknown`) with one-consolidated-clarification rule
- Frontend: Approval Inbox with full preview, per-recipient exclude, edit,
  no optimistic UI, disabled button after click
- **Gate:** impossible to send without approval; double-approve = one send;
  antispam blocks a second message within 24h; a missing template variable
  fails loudly instead of sending `{{ name }}`.

### Phase 3 — Mission Control
- Aggregation endpoints, priority ranking (explainable — return `reasoning`),
  daily brief at 07:00 via beat, WebSocket push, `/api/command` wired to
  `/parse`
- Frontend: Mission Control matching `prototype/hatm-os-prototype.html`
- **Gate:** the whole prototype flow works on real data in < 90 seconds.

## Conventions

- Branch per phase (`phase-0`, `phase-1`…). Small commits with clear messages.
- Every PR-sized change: run tests, run `ruff`, update `docs/` if a contract or
  rule changed.
- Errors: raise `AppError` subclasses with a stable `code`; API returns
  `{"error": {"code", "message", ...}}` — this shape is a contract.
- Logging: structured JSON. Log at adapter boundaries and workflow transitions.
- No real trainee data in the repo, fixtures, or tests. Use faked Arabic names.
- Secrets only in `.env`. `.env.example` lists every variable with a comment.
- Timezone: store UTC, display `Africa/Cairo`.

## Things that will bite you (from experience)

- Zoom recurring meetings: each occurrence has its own UUID; list instances
  first. UUIDs starting with `/` or containing `//` need double URL-encoding.
- Zoom participant reports lag 15–30 min after a meeting ends. Pause and retry,
  don't fail.
- One person appears as multiple rows in Zoom reports; rows can overlap
  (phone + laptop). Sum of durations is wrong — merge intervals.
- SQLAlchemy JSON columns: `list.append()` is not tracked; reassign the list.
- Google service account must be shared on the sheet as Editor, and Gmail needs
  domain-wide delegation — otherwise 403 with no useful message.
- `MIMEText(body, "plain", "utf-8")` or Arabic emails arrive garbled.

## How to start right now

1. Read `docs/00-architecture.md` fully, then skim `docs/01-backend.md`,
   `docs/02-ai.md`, `docs/03-frontend.md`, and open the prototype HTML.
2. Propose the Phase 0 plan as a short checklist. Wait for my OK.
3. Build Phase 0. Show me `docker compose up` output and the health checks.
4. Ask me for Zoom / Google credentials only when Phase 1 needs them, with exact
   instructions for what to create and where to paste it.
