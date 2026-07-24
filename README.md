# StructuredStrength

A mobile-first strength-training PWA for planning, running, and tracking structured workout programs. Build multi-week training phases (manually or with AI), rearrange your week non-destructively, log sets live with automatic PB detection and rest timers, and track weight and progress photos over time.

Live app: [structuredstrength.vercel.app](https://structuredstrength.vercel.app)

---

## Features

- **Training phases** — multi-week programs with a workout assigned to each day (strength / cardio / rest).
- **AI plan generation** — describe your goals and let Claude generate a full phase, schema-enforced and matched against the exercise library.
- **Week Editor** — rearrange any week (move or swap workouts) without ever mutating the phase template; resets cleanly back to plan.
- **Live workout logging** — set-by-set logging with weight carry-forward, add/delete bonus sets, exercise swaps, and a rest timer with audio cue.
- **Automatic PB detection** — heaviest-weight-then-reps ranking flags personal bests live during a workout and across history.
- **Progress tracking** — weight log with chart, and guided front/side/back progress-photo check-ins with side-by-side comparison.
- **Momentum** — on-plan streak tracking (rest-day-forgiving) and a weekly-progress card on the home screen.
- **Installable PWA** with a native iOS wrapper via Capacitor.

---

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite (PWA)
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives)
- **State / data:** TanStack React Query
- **Animation:** Framer Motion, canvas-confetti
- **Icons:** Lucide React
- **Backend:** Supabase (Postgres + Auth + RLS + Edge Functions)
- **AI:** Anthropic Claude (via a Supabase Edge Function)
- **Native:** Capacitor (iOS)
- **Hosting:** Vercel (frontend), Supabase (backend)
- **Package manager:** bun

---

## Getting Started

**Prerequisites:** [bun](https://bun.sh), Node.js v24+.

```bash
# Clone
git clone https://github.com/Mattarcher0794/structuredstrength.git
cd structuredstrength

# Install dependencies
bun install

# Configure environment (see below)
cp .env.example .env

# Start the dev server (http://localhost:8080)
bun run dev
```

### Environment variables

Create a `.env` file (gitignored) with:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

The anon key is public-safe. The service role key and any Edge Function secrets are **never** stored in the repo — they live in Supabase secrets only. In production, Vercel reads these from its own project environment settings, not from `.env`.

---

## Scripts

```bash
bun run dev        # Dev server at http://localhost:8080
bun run build      # Production build
bun run lint       # ESLint
bun test           # Run tests once (Vitest)
bun run test:watch # Run tests in watch mode
```

Tests are colocated with source (`src/**/*.{test,spec}.{ts,tsx}`) and run in jsdom.

---

## Project Structure

```
src/
├── App.tsx                  # Root: providers, routing, auth guard
├── config/features.ts       # Feature flags
├── hooks/                   # useAuth + toast
├── integrations/supabase/   # Client singleton + generated types
├── lib/                     # Pure, tested logic: week scheduling, streaks,
│                            #   PB detection, exercise matching, AI plan service
├── pages/                   # Route-level components
└── components/              # Shell, nav, shared UI + shadcn/ui primitives
```

### Key routes

| Route | Purpose |
|---|---|
| `/` | Home: greeting, weekly progress, 14-day strip, today's workout |
| `/phases` | List phases by status |
| `/phases/new` | Create a phase manually or via AI |
| `/phases/:id` | View/edit days, activate, copy, delete |
| `/workout/:sessionId` | Live full-screen workout logging |
| `/history` | Completed sessions with PB indicators |
| `/week` | Week Editor — rearrange the current week |
| `/weight` | Weight log + chart |
| `/progress-photos` | Progress-photo timeline + check-in flow |
| `/profile` | Settings, sign out |

---

## Architecture Notes

- **Scheduling** is non-destructive. A phase holds a 7-day template; the Week Editor writes absolute per-calendar-day assignments (`week_day_assignments`) resolved by a single pure module (`src/lib/weekSchedule.ts`) shared by the home screen, week strip, and editor. Resetting a week just deletes its rows.
- **PB detection** uses one shared ranking helper (`src/lib/pbDetection.ts`) — heaviest weight wins, ties broken by reps — driving both live and history views.
- **Data access** goes through the Supabase client SDK with TanStack Query; there is no custom backend server. Row-Level Security scopes all data to the owning user.
- **Day-of-week** is 1=Monday … 7=Sunday internally; weeks are Monday-based.

---

## Deployment

Production auto-deploys on push to `main` via Vercel. Follow the branch workflow:

```bash
git checkout main && git pull
git checkout -b feat/your-branch-name
# make changes, then
git push origin feat/your-branch-name
# open a PR → merge to main → Vercel deploys
```

Branch naming: `feat/...`, `fix/...`, `chore/...`. Never commit directly to `main`.

---

## License

Private project. All rights reserved.
