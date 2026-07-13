# Move Workout — Requirements Definition (v1)

> Author: Black Widow (Analyst) · Date: 2026-07-13 · Status: Draft for review
> Feature: rescheduling workouts within the current week for StructuredStrength
> Supersedes: the current `phase_day_overrides` directional-row implementation (buggy, logic duplicated across `Today.tsx` and `MoveWorkoutSheet.tsx`)

---

## 1. Problem & Intent

Users need to rearrange the training days in **their current week** without editing their underlying plan. The existing "Move workout" bolt-on conflates *move* and *swap* into one ambiguous override row, forcing every render to reverse-engineer intent — the source of the bugs, the chain-corruption, and the duplicated resolution logic.

**Decision: rebuild from scratch as a "Week Editor" surface**, not a one-shot move button.

## 2. The Model (locked)

- **Week Editor** — a surface showing the current Mon–Sun week's 7 days and their *effective arrangement*.
- **Effective arrangement** — the phase template as modified by *this week's* moves.
- **Move operation (atomic)** — pick up a day's workout (tap), place it on another day (tap). A "reorder" is just several atomic moves in sequence.
- **Placement resolution (deterministic — no prompt):**
  - Target is a **rest** day → **MOVE** (source workout relocates to target; source day becomes rest).
  - Target is an **active** day → **SWAP** (the two days trade workouts).
- **Reset week to plan** — one action wipes all of this week's moves and reverts to the template.

## 3. Functional Requirements

| # | Requirement |
|---|---|
| FR1 | User can open a Week Editor for the **current** week. |
| FR2 | User taps an eligible **source** day to "pick up" its workout (visible picked-up state). |
| FR3 | User taps an eligible **target** day to place it. Tapping the source again cancels. |
| FR4 | Target is **rest** → source workout moves to target; source becomes rest. |
| FR5 | Target is **active** → the two days' workouts swap. |
| FR6 | Moves **compose**: each move operates on the *current* effective arrangement; the result is always coherent (no orphaned, duplicated, or lost workouts). |
| FR7 | "Reset this week to my plan" reverts the whole week to template (with confirmation). |
| FR8 | Changes apply to the **current week only**; the phase template is never modified; next week resets automatically. |
| FR9 | Today screen and WeekStrip reflect the **same** effective arrangement as the editor, immediately after any change. |

## 4. Eligibility Rules

**A day can be a SOURCE (picked up) if:**
- It is an **active** day (strength/cardio) — rest days have nothing to pick up.
- It is **not completed**.
- It is **today, a future day, OR a past uncompleted (missed) day** this week.

**A day can be a TARGET (placed onto) if:**
- It is **today or a future day** (cannot place a workout into the past).
- It is **not completed** (a finished workout can't be overwritten).
- It may be rest (→ move) or active (→ swap).

**Cross-cutting constraints:**
- Source ≠ target.
- All moves are contained within the current Mon–Sun week.
- **SWAP requires BOTH days to be today-or-later.** A missed (past) source can therefore only be *moved onto a rest day*, never swapped (swap would push a workout into the past).
- A day with an **in-progress session** is locked as both source and target.

## 5. Edge Cases (enumerated)

| # | Case | Resolution |
|---|---|---|
| E1 | Today → future rest | Move. |
| E2 | Today → future active | Swap. |
| E3 | Missed (past) source → future rest | Move only (forward). |
| E4 | Missed (past) source → future active | **Blocked** — would swap into the past. Offer move only if target is rest. |
| E5 | Target already completed | Excluded as target. |
| E6 | Source already completed | Excluded as source. |
| E7 | Chained moves (A→B then B→C) | Must compose cleanly; Reset always restores template. |
| E8 | Day has in-progress session | Locked (neither source nor target). |
| E9 | Today is **Sunday** | Sunday must be a valid source AND target. (Fixes current `weekUtils` Sunday quirk.) |
| E10 | Whole week is rest | Editor shows empty state — nothing to move. |

## 6. Out of Scope (v1)

- Cross-week moves.
- Permanent edits to the phase template.
- True drag-and-drop (v1 is tap-to-pick / tap-to-place).
- Bump/skip semantics (dropped — swap-only).
- Per-move undo (only full "reset week").
- Consolidation with the separate "Train anyway" override system — **overlap flagged**, deferred.

## 7. Handoff Notes for Architect (Bruce Banner)

The requirements are UX-neutral on storage. Key design questions for the logic/data-model phase:

1. **Represent the effective arrangement so chained moves compose without corruption.** The current directional 1-row/2-row override model is the root cause of bugs — reconsider it. Candidate: store an explicit per-calendar-day assignment for the week (which template day occupies each date), so a move is a single well-defined write and Reset = delete this week's rows.
2. **Single source of truth for schedule resolution** — one shared resolver used by Today, WeekStrip, and the editor. Kill the duplicated logic.
3. **Server-side integrity** — RLS + constraints on the storage table (currently none).
4. **Fix `weekUtils` Sunday handling** (E9) and the `isToday` reference-equality bug in `Today.tsx`.
5. React Query key hygiene — scoped invalidation after a move.
