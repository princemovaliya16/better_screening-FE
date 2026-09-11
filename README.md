# better_screening-FE

Frontend for **Better Screening** — a multi-tenant AI recruitment/interview platform.
React + Vite + TypeScript, styled with Tailwind CSS. See the full architecture and
build plan at `/home/prince/.claude/plans/hi-this-is-merry-milner.md` (or wherever it's
been moved to in this repo going forward).

## Status: Phase 6 — notifications, dashboard, team management (polish)

What's implemented so far:
- Vite + React + TypeScript scaffold, Tailwind CSS v4 (via `@tailwindcss/vite`), path
  alias (`@/*` → `src/*`).
- React Router with two route trees: `/app/*` (authenticated recruiter shell) and
  `/interview-room/:token/*` (candidate portal — deliberately isolated, no recruiter
  code/data ever imported there).
- TanStack Query for server state; a typed `api` client wrapping `fetch`, attaching the
  JWT and unwrapping the backend's `{isError, message, data}` response envelope.
- `AuthContext` (session) and `OrgContext` (current organization, fetched via React
  Query) — real, working signup/login pages wired to the backend's `/auth/signup` and
  `/auth/login` endpoints.
- A small design-system primitive set (`components/ui`): Button, Input, Select,
  Textarea, Field, Card, Badge, Modal, Logo.
- **Jobs**: list with filters, a create/edit form with dynamic field arrays for skills
  and interview rounds (each round with its own dynamic question list), a details page.
- **Candidates**: list with filters, an "Add candidate" modal, a details page (stage
  change, notes, per-candidate interview list, delete).
- **Interviews**: list with status filter, a "Schedule interview" modal (from the
  candidate details page), a details page (reschedule/cancel/send-invitation, question
  list).
- Verified end-to-end in a real browser (Playwright against the live backend):
  signup → create job with rounds/skills → add candidate → schedule interview
  (candidate stage auto-advances) → edit an existing job (values pre-populate
  correctly) — zero console errors throughout.

- **Candidate interview room** (`/interview-room/:token`, isolated route tree, no
  recruiter code/data reachable): landing → device check (camera/mic preview) →
  one question at a time, each recorded then uploaded before advancing → thank-you
  screen. A single whole-round countdown (not per-question) is shown throughout and
  auto-submits on expiry. Reopening the link mid-round resumes at the first
  unanswered question rather than restarting.
  - Simplification vs. the original plan: uploads are **blocking per question**
    (record → upload → then advance) rather than a background queue that lets the
    candidate start the next question while the previous one still uploads. This
    still satisfies "nothing is lost on a crash" (each answer is durably stored
    before moving on) with much less moving-part complexity; a background queue
    with retry is a reasonable later upgrade if upload latency becomes an issue.
- Verified end-to-end in a real browser (Playwright, real MediaRecorder via Chrome's
  fake-device flags, actual presigned uploads to MinIO — not mocked): the full
  candidate flow (landing → device check → record both questions → thank-you),
  resuming correctly at question 2 after simulating a crash (with the countdown
  continuing from the original deadline, not resetting), and the Phase 2 recruiter
  flows (job creation, candidate creation, interview scheduling) — zero console
  errors throughout.

- **AI question generation**: in the job edit form, once a round is saved (has a real
  backend id), a "✨ Generate with AI" button suggests new questions for that round —
  appended into the editable field array, nothing persisted until the recruiter saves.
- **AI email composer**: from a candidate's details page, "Compose email" opens a
  modal — pick a type, optionally tie it to an interview, optionally add guidance,
  "Compose with AI" drafts a subject/body the recruiter can edit before sending. Sent
  emails are logged and shown in an "Emails" history section on the same page.
- **AI evaluation** (interview details page): once a candidate's round is submitted,
  an "AI Evaluation" card polls for status (`transcribing` → `evaluating` →
  `completed`, or `transcription_failed`) and renders the full result once ready —
  overall score, recommendation, the 5 competency scores, strengths/weaknesses,
  communication note, and per-question score+feedback inline with each question. A
  "Retry evaluation" action is available while non-terminal.
- Verified end-to-end in a real browser: job creation → AI-generate 5 questions on a
  round → save → candidate creation → AI-compose → edit → send an email (landed in
  Maildev) → logged in the candidate's email history; separately, a full
  submit → transcript → evaluation pipeline run rendering correctly on the interview
  details page — zero console errors throughout.

- **Dashboard**: real KPI cards (open jobs, candidates, interviews this week, avg AI
  evaluation score), a candidate-pipeline funnel (bar per stage), and a recent-activity
  feed — all backed by `GET /dashboard`.
- **Settings** (`/app/settings`, tabbed): "Company & AI" (org name, AI-round toggle,
  default round duration/timezone), "Notifications" (evaluation-ready /
  new-application toggles), and — admin-only — "Team" (member list with role
  dropdown and remove, an invite modal, all three server-side protections
  (self-removal, last-admin demote, last-admin remove) surfaced as inline errors).
- **Accept-invite** (`/accept-invite?token=...`, public route — note: a query param,
  not a path param, matching the backend's invite-link format): set your name and
  password, then land signed in on the dashboard.
- **Notifications bell** (recruiter shell topbar): unread-count badge polling every
  20s, a dropdown listing recent notifications, click-to-navigate-and-mark-read, and
  mark-all-read. Fed by `EvaluationModule`'s "AI evaluation ready" notification (and
  extensible to other types later) — no push/SSE, `refetchInterval` polling per the
  plan's v1 real-time strategy.
- Verified end-to-end in a real browser: signup → empty-state dashboard renders
  without crashing → create a job → dashboard now shows the KPI and activity entry →
  all three settings tabs → invite a team member → appears in the team list →
  separately, accepting that invite via the actual `/accept-invite` link → landing
  signed in → confirming a non-admin recruiter's Settings has no Team tab — zero
  console errors throughout.

Not yet built: global search (the plan's `SearchModule` — deferred; there's no
public-facing search surface yet to justify it) and a personal profile-editing page
(no backend endpoint for a user editing their own name/avatar exists yet).

## Getting started

```bash
cp .env.example .env.local     # VITE_API_URL defaults to http://localhost:3000/v1
npm install
npm run dev                    # http://localhost:5173
```

Requires the backend (`better_screening-BE`) running locally — see its README.

### Useful scripts

```bash
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run lint       # oxlint
npm run preview    # preview a production build
```

### Conventions

- `src/app/` — route tree, providers, and the two top-level layouts
  (`RecruiterShellLayout`, `InterviewRoomLayout`).
- `src/features/<name>/` — one folder per feature area; the candidate-facing
  `interview-room` feature must never import from recruiter feature folders.
- `src/components/ui/` — design-system primitives; `src/components/patterns/` —
  composite patterns reused across features.
- `src/context/` — cross-cutting React context (auth session, current organization).
- `src/lib/api/` — typed API client + per-resource API modules + a `queryKeys` factory
  that namespaces every React Query cache key by `organizationId`.
