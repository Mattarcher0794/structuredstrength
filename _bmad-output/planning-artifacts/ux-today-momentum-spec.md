# Today Momentum — UX Spec (WS-D)

> Author: Thor (UX Designer) · Date: 2026-07-13 · Status: Spec for build (→ JARVIS)
> Source: UX review finding #7 / ux-improvements-plan.md WS-D

Surface **momentum** on the Today home screen (the daily touchpoint) so returning is rewarded. Two signals, decided with the user: an **on-plan streak** and an **"on a roll" nudge**. (Last-PB deferred.)

## Guiding principle
Rest is part of the plan. The streak must **never break because the user correctly rested.** It rewards adherence, treats scheduled rest as success.

## 1. The streak — "sessions on plan"

**Definition:** the count of consecutive **scheduled training sessions the user completed**, walking backwards from today, where:
- a **rest** day is *neutral* — skipped, neither counts nor breaks the streak;
- a **completed** scheduled training day *increments* the streak;
- a **missed** scheduled training day (past, not completed) *ends* the streak;
- **today**, if it's a scheduled training day not yet done, is a *grace* day — it neither counts nor breaks (the day isn't over).

Bounded by the active phase's `start_date` (a streak lives within the current phase).

**Algorithm (pure, unit-testable — mirror weekSchedule/pbDetection ethos):**
```
computeSessionStreak(today, phaseStartDate, phaseDays, assignmentsByWeekStart, completedDates) -> number
  streak = 0
  cursor = today
  while cursor >= phaseStartDate:
    weekStart = mondayOf(cursor)
    schedule = resolveWeekSchedule(weekStart, phaseDays, assignmentsByWeekStart[weekStart] ?? [])   // cache per weekStart
    day = schedule[dowOf(cursor)]              // reuse the existing resolver
    dstr = yyyy-MM-dd(cursor)
    if day.dayType !== "rest":
      if completedDates.has(dstr) streak++
      else if dstr < todayStr break            // missed → stop
      // else today & not done → grace: skip
    cursor -= 1 day
  return streak
```

**Data needed (Today.tsx):**
- `phase.start_date` (already have active phase).
- `completedDates`: **all** completed session dates in the phase (extend the current week-only query to phase-wide, keyed `["phase-completed-dates", phaseId]`).
- `phaseDays` (already have).
- `week_day_assignments` for the weeks the walk touches — fetch phase-wide (`["phase-assignments", phaseId]`), group by `week_start_date`.

## 2. The "on a roll" nudge
A single derived line, using the streak + this-week progress (both already computed on Today):
- `streak >= 3` → **"On a roll — {streak} sessions on plan"**
- else if completed ≥ planned-so-far this week and completed > 0 → **"On plan this week"**
- else if completed === 0 → keep the existing **"{n} sessions left this week"**
- (Keep the existing "sessions left / all done / beyond plan" copy as the fallback.)

Keep it warm, never punishing. No "you broke your streak" messaging — a reset streak just quietly shows the new (small) number.

## 3. Placement & hierarchy
Fold into the **existing "This week" card** — do NOT add a competing card.
- **Streak badge** top-right of the card header, aligned with the "THIS WEEK" label: a `Flame` (Lucide) icon + count in a small **primary-tinted pill** (`bg-primary/12 text-primary`). Gold is reserved for PBs, so streak uses primary to stay distinct. **Only rendered when streak ≥ 1.**
- Existing "X of Y complete" + progress bar unchanged.
- Bottom line becomes the **contextual nudge** (§2).

## 4. States
- **No streak (0):** no badge; nudge falls back to existing copy. (No zero-state guilt.)
- **New/first phase, no history:** streak 0, behaves as today.
- **Streak of 1:** badge shows "1" — fine, it's a start.

## 5. Motion (reuse WS-B)
When the streak increments (after completing a session and returning to Today), the badge can `SPRING_POP` in. Reduced-motion-safe via the shared `usePopVariants`/preset. Nice-to-have, not required for v1.

## 6. Handoff to JARVIS
- New pure helper `src/lib/streak.ts` → `computeSessionStreak(...)` + unit tests (edge cases: rest-only week, missed day breaks, today grace, phase-start bound, first phase).
- Today.tsx: two new queries (phase-wide completed dates + assignments), compute streak via the helper, render the badge + nudge in the "This week" card.
- Copy per §2. Icon: Lucide `Flame`.
