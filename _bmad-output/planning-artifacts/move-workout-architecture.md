# Move Workout (Week Editor) — Architecture & Logic Design (v1)

> Author: Bruce Banner (Architect) · Date: 2026-07-13 · Status: Draft for review
> Requirements: [move-workout-requirements.md](./move-workout-requirements.md)
> Mandate: kill the directional-override corruption; one shared resolver; server-side integrity; fix weekUtils Sunday + isToday bugs.

---

## 1. Core Decision — Absolute Assignment, Not Directional Deltas

The current `phase_day_overrides` stores **directional deltas** ("workout moved FROM X TO Y"), one row read two ways (inbound/outbound). Rendering requires replaying and tracing deltas (`resolveOriginalDow`), which does not compose — chained moves fork or orphan rows. **This is the root cause.**

Replace with **absolute per-calendar-day assignment**: each row is self-describing —
> "This week, calendar-day D shows the workout from template-day S (or rest if S is null)."

No from/to. No inbound/outbound. No tracing. Each calendar slot's content is decided by **at most one self-contained row**, keyed by the calendar slot. A second move to the same slot is a harmless idempotent upsert — the exact race that corrupts today.

## 2. Data Model

**New table `week_day_assignments`** (retire `phase_day_overrides`; keep it one release, then drop in a follow-up migration).

```sql
create table public.week_day_assignments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  phase_id           uuid not null references public.phases(id) on delete cascade,
  week_start_date    date not null,                         -- always a Monday
  day_of_week        smallint not null check (day_of_week between 1 and 7),        -- CALENDAR slot
  source_day_of_week smallint check (source_day_of_week between 1 and 7),          -- template day whose workout sits here; NULL = rest
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, phase_id, week_start_date, day_of_week)
);

alter table public.week_day_assignments enable row level security;
create policy "own rows" on public.week_day_assignments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Semantics**
- No row for a slot → slot shows its own template day (pure plan).
- Row with `source_day_of_week = S` → slot shows template day S's workout.
- Row with `source_day_of_week = NULL` → slot is an explicit rest (its own workout was moved away).
- **Reset week** = `DELETE WHERE user_id, phase_id, week_start_date`. Zero rows = pure template.

**Integrity**
- RLS: owner-only (above).
- Unique key on the calendar slot guarantees one row per slot.
- Range checks on both DOW columns.
- **Conservation** (every workout appears exactly once) is maintained by the *operations*, not a DB constraint — Rule of Three, no exotic constraint until earned.

## 3. Single Shared Resolver — `src/lib/weekSchedule.ts`

All schedule logic lives here; `Today.tsx`, `WeekStrip`, and the Week Editor consume it. The `isToday` reference-equality bug dies here (compare `yyyy-MM-dd` strings).

```ts
type Assignment = { day_of_week: number; source_day_of_week: number | null };

interface EffectiveDay {
  dayOfWeek: number;              // calendar slot 1..7
  date: Date;
  dayType: 'strength' | 'cardio' | 'rest';
  workoutName: string | null;
  phaseDay: PhaseDay | null;      // resolved template day (null = rest)
  sourceDayOfWeek: number | null; // which template DOW supplies content (for "rescheduled from…")
  isToday: boolean;
  isOverridden: boolean;          // differs from template
}

// Pure. No I/O.
resolveWeekSchedule(weekStart: string, phaseDays: PhaseDay[], assignments: Assignment[]): EffectiveDay[]
```

**Resolution (per slot dow 1..7):**
```
a = assignments.find(x => x.day_of_week === dow)
sourceDow    = a ? a.source_day_of_week : dow      // a with null → rest
isOverridden = !!a
phaseDay     = sourceDow == null ? null : phaseDays.find(d => d.day_of_week === sourceDow)
```

## 4. Move Operation — `planMove()`

```ts
// Returns the rows to upsert (onConflict: user_id,phase_id,week_start_date,day_of_week)
planMove(sourceDow: number, targetDow: number, schedule: EffectiveDay[]): Assignment[]
```

Let `src = schedule[sourceDow]`, `tgt = schedule[targetDow]`, `srcContent = src.sourceDayOfWeek`.

- **Target is REST (move):**
  `[{day_of_week: targetDow, source_day_of_week: srcContent}, {day_of_week: sourceDow, source_day_of_week: null}]`
- **Target is ACTIVE (swap):**
  `[{day_of_week: targetDow, source_day_of_week: srcContent}, {day_of_week: sourceDow, source_day_of_week: tgt.sourceDayOfWeek}]`

Both rows key distinct calendar slots → one `upsert`. Chaining is safe because each op reads *current resolved state* and rewrites absolute content — there is no history to corrupt.

**Cleanup nicety:** if a written row restores a slot to its own template (`source_day_of_week === day_of_week`), delete the row instead of writing it, so "0 rows = pure plan" stays true. Optional polish, not correctness-critical.

## 5. Eligibility (validation — resolver-adjacent, pure)

Inputs: `EffectiveDay`, plus `completedDates: Set<string>`, `inProgressDates: Set<string>`, `todayStr`.

```
canPickUp(day):  day.dayType !== 'rest'
              && !completed(day) && !inProgress(day)
              && (isToday(day) || isFuture(day) || isPastUncompleted(day))   // missed days movable

canDrop(source, day):
   day !== source
   && !completed(day) && !inProgress(day)
   && (isToday(day) || isFuture(day))            // never place into the past
   && !(isPast(source) && day.dayType !== 'rest')  // missed source → rest only (swap needs both today-or-future)
```

## 6. Supporting Fixes

- **weekUtils Sunday boundary:** `getWeekStartDate()` no-arg Sunday branch currently returns *next* Monday (`diff = 1`) — the "Sunday excluded as target" bug. Change so Sunday belongs to *its* Monday-week (`diff = -6`), matching the explicit-date branch. Add boundary unit tests (Sat/Sun/Mon). Regression-check `Today.tsx` current+next-week fetch.
- **isToday reference-equality:** removed by the resolver's string comparison — no separate fix needed.

## 7. Affected Files

| File | Change |
|---|---|
| `supabase/migrations/<ts>_week_day_assignments.sql` | **new** — table + RLS |
| `src/integrations/supabase/types.ts` | regen after migration |
| `src/lib/weekSchedule.ts` | **new** — resolver + planMove + eligibility |
| `src/lib/weekUtils.ts` | Sunday fix + tests |
| `src/pages/Today.tsx` | consume resolver; fetch assignments; drop inline resolution logic |
| `src/components/WeekStrip.tsx` | consume resolver output |
| `src/components/MoveWorkoutSheet.tsx` | **replaced** by Week Editor surface (UX — Thor) |
| `src/components/DayPeekSheet.tsx` | "Move" action opens the editor |

## 8. Test Plan (Vitest)

- `weekUtils`: boundary dates (Sat, Sun, Mon; explicit + no-arg).
- `resolveWeekSchedule`: pure template · single move · swap · chained moves · all-rest week.
- `planMove`: move-to-rest · swap · chained/idempotent (same slot twice) · restore-to-template deletes row.
- eligibility: missed source→rest OK · missed source→active blocked · completed excluded (source & target) · in-progress locked · today valid as source and target.

## 9. Open Items / Handoffs

- **UX (Thor):** the Week Editor surface — tap-to-pick / tap-to-place visuals, entry point (from Today? dedicated screen?), picked-up state, "Reset week to plan" placement, empty state.
- **Scope confirm:** editor edits **current week only**; `Today.tsx` still resolves *next* week purely from template (assignments simply absent there). No behaviour change to the 14-day strip beyond correct resolution.
- **Retire `phase_day_overrides`:** stop reading/writing it this release; drop in a follow-up migration once confirmed dead.
