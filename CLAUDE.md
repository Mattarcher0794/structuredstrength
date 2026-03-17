# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Last updated: 2026-03-17
> Keep this doc updated after every session that changes schema, adds components, ships pending work, or deploys Edge Functions. This is the single source of truth passed between Claude instances.

---

## COMMANDS

```bash
bun run dev        # Dev server at http://localhost:8080
bun run build      # Production build
bun run lint       # ESLint
bun test           # Run all tests once (vitest)
bun run test:watch # Run tests in watch mode
```

Tests live in `src/**/*.{test,spec}.{ts,tsx}`, run in jsdom via Vitest. The test suite is minimal (placeholder only) — test files are colocated with source.

---

## OPERATING MODE
You are not a generic assistant. You are:
- Technical product advisor
- Architecture reviewer
- Prompt hardener for Lovable
- System coherence enforcer
- Long-term thinking partner

Responses must be: structured, technical, precise, concise, no fluff, risks flagged explicitly.

---

## ENGINEERING RULES
- 1–3 changes max per step
- One clarification question if unclear
- No silent refactors
- No parallel systems
- Protect existing architecture
- Specify files changed on every edit
- Minimal diffs only
- Production-safe error handling
- Backwards compatible
- No secrets in repo

Edge Function changes require: version bump + System Status update + changelog entry.
Versioning: additive = minor, bugfix = patch, API contract change = major.

After every committed feature or fix, update CHANGELOG.md with a new row (most recent first) and update the "Most recent change" row and "Last updated" date in CLAUDE.md. Only do this after the code has been committed — never mid-task.

---

## STACK
React 18 + TypeScript + Vite PWA (not React Native), Supabase (Postgres + Auth + RLS), Tailwind CSS, shadcn/ui, Framer Motion, Lucide React icons, canvas-confetti, TanStack React Query. Lovable Pro active. Local dev via VSCode + Claude Code.

---

## REPO
- GitHub: https://github.com/Mattarcher0794/structuredstrength
- Main branch: main
- Lovable sync: bidirectional, auto-syncs on merge to main
- Local dev: `bun run dev` (port 8080)
- Package manager: bun
- Node version: v24.14.0

**Git workflow:**
```
git checkout main
git pull
git checkout -b feat/your-branch-name
# make changes
git push origin feat/your-branch-name
# open PR → merge → Lovable auto-syncs
```
Branch naming: `feat/...`, `fix/...`, `chore/...`
Never edit main directly.

---

## SUPABASE
- Project URL: (add here — safe to store)
- Anon key: (add here — safe to store)
- Service role key: NEVER here — lives in `.env` only
- Migration tracking: `/supabase` folder in repo

**Important:** Lovable preview reads env vars from Lovable project settings, not from `.env`. If `.env` is removed from git tracking, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Lovable project settings to prevent runtime error: `supabaseUrl is required`.

Future improvement: create `.env.example` and move env vars fully into Lovable settings.

---

## ENVIRONMENT VARIABLES
Keys only — never values:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

`.env` and `.env.*` are gitignored.

---

## USER ACCOUNTS
- Victoria (beta tester) UID: 8a03ac53-82a2-49de-a59e-ea68c1c312a8
- Matt (developer) UID: 127d95eb-4e2a-4217-a693-79970e91fdbb

---

## DATABASE SCHEMA

**phases**
id, user_id, name, status (active/draft/completed), total_weeks, created_at

**phase_days**
id, phase_id, day_of_week (1=Mon 7=Sun), day_type (strength/rest/cardio), workout_name

**phase_day_exercises**
id, phase_day_id, exercise_id, sets, min_reps, max_reps, rest_seconds, order_index

**exercises**
id, name, muscle_group, sub_muscle, equipment, movement_pattern, source, is_approved, created_by

**workout_sessions**
id, user_id, phase_id, phase_day_id, workout_name, started_at, completed_at, status (in_progress/completed), is_schedule_override

**session_sets**
id, workout_session_id, exercise_id, exercise_name_snapshot, set_number, reps, weight, completed_at
Note: exercise_name_snapshot preserves name at log time — protects history if exercise record is later edited.

**session_exercise_swaps**
Per-session exercise substitutions — written when user swaps an exercise mid-workout.

**phase_day_overrides**
id, phase_id, user_id, week_start_date (date, always Monday), original_day_of_week (int 1-7), overridden_day_of_week (int 1-7), created_at
UNIQUE INDEX on (phase_id, user_id, week_start_date, original_day_of_week)

**profiles**
user_id, display_name, default_rest_seconds

**weight_logs**
id, user_id, weight_kg (numeric), logged_at (timestamptz)

**progress_photos**
id, user_id, photo_url (text), angle (text: front/side/back), taken_at (timestamptz)

**nutrition_daily**
Daily nutrition — feature-flagged OFF.

---

## FEATURE FLAGS
`src/config/features.ts`
- `showNutrition: false` — gates NutritionCard on Today screen and nutrition_daily table usage

---

## EDGE FUNCTIONS

| Function | Version | Last changed | Summary |
|---|---|---|---|
| suggest-plan | — | — | AI plan generation. Called by aiPlanService.ts with user history context. |

---

## PROJECT STRUCTURE
```
src/
├── App.tsx                    — Root: providers, routing, auth guard
├── main.tsx                   — Entry point
├── config/features.ts         — Feature flags
├── hooks/
│   ├── useAuth.tsx             — Supabase auth context (onAuthStateChange)
│   └── use-toast.ts
├── integrations/supabase/
│   ├── client.ts               — Supabase client singleton
│   └── types.ts                — Auto-generated DB types (do not edit)
├── lib/
│   ├── weekUtils.ts            — Date/week helpers (Mon-based weeks)
│   ├── pbDetection.ts          — Live PB detection during workout
│   ├── historyPBDetection.ts   — PB detection for history views
│   ├── exerciseMatching.ts     — Fuzzy-match AI exercise names to DB
│   ├── exerciseInsert.ts       — Insert new exercises from AI
│   ├── aiPlanService.ts        — Calls suggest-plan Edge Function
│   └── restTimerSound.ts       — Web Audio API ding, played on rest timer zero and skip
├── pages/                      — Route-level components
└── components/
    ├── AppLayout.tsx            — Shell: Outlet + AnimatePresence + BottomNav
    ├── BottomNav.tsx            — 4 tabs: Today, Phases, History, Profile
    ├── BottomSheet.tsx          — Shared bottom sheet (React Portal)
    ├── WeekStrip.tsx            — 14-day scrollable calendar strip
    ├── MoveWorkoutSheet.tsx     — Workout reschedule bottom sheet
    ├── DayPeekSheet.tsx         — Day tap bottom sheet
    ├── ExerciseSearch.tsx       — Full-screen exercise search overlay
    └── ui/                      — shadcn/ui primitives (do not touch)
```

---

## PAGES & ROUTES

| Route | Page | Purpose |
|---|---|---|
| / | Today.tsx | Home: greeting, weekly progress, WeekStrip, today workout card |
| /phases | Phases.tsx | List phases grouped by status |
| /phases/new | PhaseCreate.tsx | Create phase manually or via AI |
| /phases/:id | PhaseDetail.tsx | View/edit day types, AI suggest, activate, copy, delete |
| /phases/:phaseId/day/:dayId | WorkoutBuilder.tsx | Add/configure exercises for a training day |
| /workout/:sessionId | ActiveWorkout.tsx | Live workout — full screen, no nav |
| /workout/:sessionId/summary | WorkoutSummary.tsx | Post-workout summary |
| /history | History.tsx | Completed sessions with PB trophy indicators |
| /history/:sessionId | WorkoutDetail.tsx | Past session detail |
| /profile | Profile.tsx | Name, rest timer, sign out, passcode-gated Developer access |
| /auth | Auth.tsx | Sign in / sign up |
| /weight | WeightTracker.tsx | Weight log: line chart (Recharts), log weight bottom sheet, weight history list |
| /progress-photos | ProgressPhotos.tsx | Progress photos: scrollable timeline grid, guided 3-step check-in flow |
| /progress-photos/compare/:angle | ProgressPhotosCompare.tsx | Full screen photo viewer: single angle across dates, side-by-side comparison mode |

---

## KEY SYSTEMS

### Auth
useAuth.tsx wraps onAuthStateChange. App.tsx ProtectedRoutes guard redirects to /auth when user is null.

### Phase & Scheduling
A Phase contains 7 phase_days (one per weekday). Today.tsx resolves the active workout by fetching phase_days + phase_day_overrides for current and next week, computing a 14-entry effectiveWeekSchedule.

### Phase Day Overrides
Non-destructive weekly schedule swap. Phase template never modified. Overrides reset each week.

Reading logic per day:
1. Inbound override (another day moved TO this day) — use that phase_day
2. Outbound override (this day moved AWAY) — treat as rest
3. Neither — use phase template

**resolveOriginalDow(effectiveDow, overrides)** — traces through existing overrides before writing new rows. Critical — prevents chain corruption.

Swap rules:
- Scenario A (active→active): write 2 rows
- Scenario B (active→rest): write 1 row only
- Rest days cannot initiate swaps
- Swaps are week-contained
- Completed days cannot be swapped
- Past days cannot be swap targets
- Today IS a valid swap target (>= comparison, not >)

Home screen fetches overrides for current + next week. Re-fetches both after any swap.

### Active Workout Flow
ActiveWorkout.tsx: ActiveExerciseCard + InactiveExerciseCard. Logging a set: inserts session_sets → getPreviousBest() → rest timer starts. EditableSetPill for post-log edits. Swap writes to session_exercise_swaps.
Rest timer plays an audio ding (via `restTimerSound.ts`) on both natural countdown to zero and manual skip. Uses Web Audio API — no external packages.

### PB Detection
- Live (pbDetection.ts): getPreviousBest(exerciseId, currentSessionId) → MAX(weight) excluding current session. Trophy if weight strictly > effectiveBest AND previousBest not null.
- History (historyPBDetection.ts): detectSessionPBs() batch scan, detectSetPBs() for WorkoutDetail.

### AI Plan System
aiPlanService.ts → suggest-plan Edge Function (with user history context) → AIPlanSuggestionCard. On accept: exerciseMatching.ts fuzzy-matches, exerciseInsert.ts creates unmatched exercises.

---

## HOME SCREEN LAYOUT
1. Greeting (time-aware + first name, large serif font)
2. THIS WEEK card: "X of Y sessions complete", progress bar, "X sessions left"
3. WeekStrip (14-day)
4. Today workout card: phase name + week indicator + progress bar + workout name + exercise count pill
   - Strength: "Start workout →" + "↔ Move workout"
   - Cardio: "I did it" button only — no "TRAIN ANYWAY"
   - Rest: rest day card + "TRAIN ANYWAY" / "Choose a workout"
   - Week counter: ALL completed workout_sessions regardless of day_type

---

## WORKOUT LOGGING
Weight pre-filled from previous session. Within-session carry forward. Select-all on focus.
Inputs: `type="text"` `inputMode="numeric"` (reps) / `inputMode="decimal"` (weight). `enterKeyHint="next"/"done"`.
Rest timer uses profile default_rest_seconds.

---

## PROGRESS TRACKING

### Weight Tracking
- Table: `weight_logs` (user_id, weight_kg, logged_at)
- Home card (Today.tsx): shows last logged date + weight. Empty state: "Log your first weight →". Taps to /weight.
- WeightTracker.tsx: Recharts ResponsiveContainer line chart (pink #C4899A line), kg on Y-axis, dates on X-axis. "Log weight" button opens BottomSheet with numeric input. History list below chart.
- Query key: `["weight-logs", user?.id]`
- Units: kg only

### Progress Photos
- Table: `progress_photos` (user_id, photo_url, angle, taken_at)
- Storage bucket: `progress-photos` (private, path pattern: {user_id}/{timestamp}-{angle}.jpg)
- Home card (Today.tsx): shows last logged date + 3 thumbnails. Empty state: "Log your first check-in →". Taps to /progress-photos.
- ProgressPhotos.tsx: scrollable timeline grid, grouped by date, 3 photos per row (front/side/back). "Add check-in" opens guided 3-step bottom sheet flow (front → side → back, photo library only, all 3 must be submitted together).
- ProgressPhotosCompare.tsx: full screen dark background page. Single angle view with arrow navigation (ChevronLeft/Right). "Compare" CTA toggles side-by-side mode — latest photo fixed on right, older entries navigable on left with arrow buttons and dot indicator. "Compare" hidden if only 1 entry exists.
- Query keys: `["progress-photos-latest", user?.id]`, `["progress-photos", user?.id]`, `["progress-photos-angle", user?.id, angle]`

---

## SESSION SUMMARY (WorkoutSummary.tsx)
Trophy 48px gold, stats row (duration/sets/exercises, flex:1), PB callout, Done pinned to bottom.
Confetti on mount (80 particles), second burst if PBs (40 particles, 600ms delay).

---

## BOTTOM SHEETS (all use BottomSheet.tsx — React Portal)
Props: isOpen, onClose, title, children. No X — tap outside to dismiss. Z-index: backdrop 100, sheet 101. Framer Motion slide-up 300ms.

Keyboard awareness: uses `visualViewport` resize/scroll listener to detect virtual keyboard height (`window.innerHeight - visualViewport.height`) and applies it as a `bottom` offset on the sheet, lifting it above the keyboard. Falls back gracefully if `visualViewport` is unavailable. This pattern is already in place — any new sheet with inputs gets it for free.

1. MoveWorkoutSheet — today + future uncompleted days, same week. Confirmation step before writing.
2. DayPeekSheet — tapped day detail. "Move this workout" CTA on eligible days.
3. Pick a workout — rest day train anyway flow.

---

## EXERCISE SEARCH (ExerciseSearch.tsx)
Full-screen overlay (not bottom sheet). Slide-up animation. Auto-focused. Multi-field search: name, sub_muscle, equipment, movement_pattern. Used for: swap, add mid-workout, phase builder.

---

## DESIGN SYSTEM
- Background: warm off-white ~#F5F2EF
- Cards: white, ~16px border-radius, subtle border + shadow
- Primary pink: #C4899A
- Muted gold (PB): #B8860B
- Cardio blue: #A8D4E0
- Greeting: large serif font
- Section labels: uppercase tracked muted grey ("THIS WEEK", "PRESCRIPTION")
- Phase name: pink, uppercase, tracked
- Buttons: full-width rounded pill
- Lucide icons throughout
- No emoji in UI except toasts
- Tailwind + shadcn

---

## QUERY CONVENTIONS
- All queries inline in page/component files using useQuery/useMutation — no custom data hooks
- Query key format: `["active-phase", user?.id]`, `["session-sets", sessionId]`
- Day-of-week: 1=Monday, 7=Sunday internally (JS 0=Sunday converted on every boundary)
- Week boundaries: Monday-based. Sunday = "next Monday" when no explicit date given

---

## PENDING WORK (priority order)
1. Move workout fix — allow today as valid swap target (scoped, ready to build)
2. Onboarding — stepped flow: experience / goal / days / equipment / injuries — AI generates phase
3. Rest day "Train anyway" consolidation — replace with override mechanic
4. Phase completion flow
5. Branded email via Resend custom SMTP
6. Error states audit
7. Empty states audit
8. Stabilise env var setup — move to Lovable project settings, create .env.example
9. HealthKit integration planning (Capacitor iOS wrapper is now live — see CAPACITOR iOS section)

---

## CAPACITOR iOS

The app has a Capacitor iOS native wrapper (`ios/` folder). Key facts for any future work:

**How the iOS app works**
- `capacitor.config.ts` is the source of truth. Run `npx cap sync ios` after any change to it or after `bun run build`.
- Web assets are synced to `ios/App/App/public/`. After any `bun run build`, always run `npx cap sync ios`, then do a Clean Build Folder (Shift+Cmd+K) in Xcode before running.
- The app uses Swift Package Manager (SPM), not CocoaPods — there is no Podfile.

**`iosScheme` does NOT work**
`iosScheme: 'https'` in `capacitor.config.ts` is silently rejected at runtime by `CAPInstanceDescriptor.normalize()` in `@capacitor/ios`. The validation only accepts custom schemes — standard schemes like `https` are explicitly blocked and reset to `"capacitor"`. The app **always** runs at `capacitor://localhost` on iOS regardless of this setting. Do not waste time trying `iosScheme` variants.

**The networking fix: CapacitorHttp**
Fetch requests from `capacitor://localhost` to HTTPS endpoints fail with "Load failed" in WKWebView (cross-origin restriction). The fix is `CapacitorHttp: { enabled: true }` in `capacitor.config.ts` (already set). This patches `fetch()` and `XMLHttpRequest` to route through native iOS URLSession instead of WKWebView, bypassing the restriction. No new packages needed — built into `@capacitor/core` v4+.

**ATS (App Transport Security)**
`Info.plist` has no `NSAppTransportSecurity` block — this means default ATS applies (HTTPS required). Supabase satisfies default ATS. Do not add `NSAllowsArbitraryLoads: true` for production. If a domain-specific exception is needed, use `NSExceptionDomains` with `NSAllowsArbitraryLoads: false`.

**Auth NOT yet confirmed end-to-end — blocked by Netskope on dev machine**
CapacitorHttp is correctly configured and routes `fetch()` through native iOS URLSession. However, auth has not been confirmed working because the dev MacBook has Netskope MDM installed. The iOS simulator shares the Mac's network stack, so Netskope intercepts URLSession traffic from the simulator the same as from a physical device connected to the same machine. No auth requests appear in Supabase logs from either the simulator or the physical device when run from this Mac.

Session persistence uses the default localStorage-based storage (no custom adapter needed — `@capacitor/preferences` adapter was explored and reverted). The standard `client.ts` with no storage override is correct.

**TLS failure caused by Netskope (affects simulator AND physical device on this Mac)**
Auth fails with `NSURLErrorDomain / A TLS error caused the secure connection to fail.` The cert chain shows Supabase's cert issued by `ca.and-digital.eu.goskope.com` → `caadmin.netskope.com`. Netskope is installed at OS/MDM level on the MacBook and intercepts all outbound TLS regardless of network or device — including the iOS simulator's URLSession calls.

This is **not a code bug**. CapacitorHttp is correctly configured. Auth is expected to work on any device not running through a Netskope-managed Mac.

**Dev workaround:** Test iOS auth on Victoria's device (UID: 8a03ac53-82a2-49de-a59e-ea68c1c312a8) or a personal iPhone connected to Xcode — not via this Mac's simulator. Alternatively, test the web PWA build in a browser to validate auth logic independently of Capacitor.

IT path: request Netskope policy exception for the Supabase project URL — low priority given consumer users are unaffected.

**`@capacitor/preferences` is installed but not used**
The package is in `package.json` and registered as `PreferencesPlugin` in `ios/App/App/capacitor.config.json`. It was added during debugging and not removed from deps. It is not referenced in any app code.

---

## KNOWN ISSUES / PARKED
- iOS Safari ignores enterKeyHint — keyboard return key label uncontrollable on iOS PWA
- "Train anyway" and override mechanic are two separate systems (consolidation deferred)
- Sunday excluded as swap target when today is Sunday
- Lovable preview env vars not yet migrated to Lovable settings (currently relying on committed .env)
- `@capacitor/preferences` in package.json is unused — can be removed when convenient
- Capacitor iOS auth untestable on work-managed Mac — Netskope MDM intercepts TLS from both the iOS simulator and physical devices tethered to this Mac. Use Victoria's device or a personal iPhone (not via this Mac's Xcode) to validate iOS auth end-to-end

---

## CHANGELOG
Full history: see CHANGELOG.md in repo root.

Most recent change:
| 2026-03-17 | feat/weight-tracking | src/pages/WeightTracker.tsx, src/pages/Today.tsx, src/App.tsx, supabase | Weight tracking — home card CTA, /weight page with Recharts line chart, weight_logs table |
