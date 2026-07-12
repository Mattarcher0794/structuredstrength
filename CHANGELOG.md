# Changelog

| Date | Branch/PR | File | Change |
|---|---|---|---|
| 2026-07-12 | feat/migrate-off-lovable | src/pages/Auth.tsx, src/pages/Profile.tsx, supabase/functions/suggest-plan, vite.config.ts, index.html, vercel.json, .env.example | Migrated off Lovable — removed Lovable OAuth broker (email/password only) and lovable-tagger; rewrote suggest-plan to call Anthropic API directly (Claude Opus 4.8 + structured outputs) replacing the Lovable AI gateway; origin-relative Strava redirect; frontend now hosted on Vercel (structuredstrength.vercel.app), backend on self-owned Supabase project (eu-west-2). All data + auth (password hashes intact) + storage migrated |
| 2026-03-17 | fix/bottom-sheet-keyboard-offset | src/components/BottomSheet.tsx | Fixed virtual keyboard covering bottom sheet inputs — visualViewport listener lifts sheet above keyboard |
| 2026-03-17 | feat/progress-photos-compare | src/pages/ProgressPhotosCompare.tsx, src/pages/ProgressPhotos.tsx, src/App.tsx | Progress photo comparison — single angle viewer with side-by-side compare mode |
| 2026-03-17 | feat/progress-photos | src/pages/ProgressPhotos.tsx, src/pages/Today.tsx, src/App.tsx, supabase | Progress photos — home card, timeline grid, guided 3-step check-in flow, Supabase Storage bucket |
| 2026-03-17 | feat/weight-tracking | src/pages/WeightTracker.tsx, src/pages/Today.tsx, src/App.tsx, supabase | Weight tracking — home card CTA, /weight page with Recharts line chart, weight_logs table |
| 2026-03-17 | feat/rest-timer-sound | src/lib/restTimerSound.ts, src/pages/ActiveWorkout.tsx | Audio ding on rest timer complete and skip via Web Audio API |
| 2026-03-07 | feat/capacitor-ios | capacitor.config.ts, vite.config.ts, ios/, package.json | Added Capacitor iOS native wrapper — app builds and runs in iOS simulator |
| 2026-03-07 | feat/previous-session-history-strip | ActiveWorkout.tsx | Added previous session history strip to ActiveExerciseCard — collapsed by default, expands to full set-by-set breakdown, Framer Motion animation, hidden when no history |
| 2026-03-05 | PR #1 | BottomNav.tsx | Smoke test: renamed History tab to Log (reverted) |
| 2026-03-05 | PR #2 | .gitignore | Added .env and .env.* to gitignore |
