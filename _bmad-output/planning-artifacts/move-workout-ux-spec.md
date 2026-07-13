# Week Editor — UX Specification (v1)

> Author: Thor (UX Designer) · Date: 2026-07-13 · Status: Draft for review
> Requirements: [move-workout-requirements.md](./move-workout-requirements.md) · Architecture: [move-workout-architecture.md](./move-workout-architecture.md)
> Design system: warm off-white `#F5F2EF`, white cards (radius 16px), pink `#C4899A` (dark text `#993556`), gold `#B8860B`, cardio blue `#A8D4E0`/text `#5a9bae`, muted `#8a8279`, DM Sans body + Playfair Display display, Lucide icons, no emoji in UI, Framer Motion, bottom sheets via `BottomSheet.tsx`.

---

## 1. Entry Points

- **Primary — "Rearrange week"**: subtle text/icon action adjacent to the WeekStrip / "This Week" card on `Today.tsx`. Icon: `CalendarSync` / `ArrowLeftRight`. Copy: "Rearrange week". Opens the editor in idle state.
- **Secondary — DayPeekSheet shortcut**: the existing "Move this workout" button opens the editor **with that day already picked up** (pre-armed placement). Preserves old muscle memory.
- Remove the current "↔ Move workout" link from the today workout card (superseded).

## 2. Surface & Route

- **Full-screen route** `/week`, slide-up transition (mirror `ExerciseSearch.tsx` overlay pattern + Framer Motion). Not a bottom sheet.
- Runs **outside** BottomNav (full-screen mode), like ActiveWorkout.
- Dismiss: header `X` (top-right) → returns to Today.

## 3. Layout Anatomy (top → bottom)

1. **Header**: "This week" (Playfair, 22px/600) + close `X`.
2. **Subheader** (12px, muted): date range + "changes apply to this week only". Persistent trust cue.
3. **Reset affordance**: "Reset week to plan" — text button, **only rendered when ≥1 assignment exists this week**. Tap → `ConfirmBottomSheet`: *"Reset this week to your plan? Your rearrangements will be cleared."*
4. **Picking banner** (only in picked-up state): pink-tint strip — `hand-finger` icon + "Moving {workout} — tap a day to place it" + underlined "Cancel".
5. **Seven day-cards** (Mon→Sun), each: left column day-abbr + date; main = workout name + type/exercise-count or "Rest"; right = state chip.

**Day-card base**: white, radius 16px, 0.5px border `rgba(0,0,0,0.07)`, padding ~11–13px, min tap height 44px.

## 4. States

### Idle
- Eligible **source** cards (active + not completed + today/future/missed) show a faint grip affordance (`grip-vertical`, muted) hinting movability; tappable.
- Completed cards: `circle-check` (pink), "Completed", opacity ~0.5, **not tappable**.
- Rest / past / in-progress cards: muted, not tappable as source.
- Today: day-abbr in pink + "Today" in the subline.

### Picked-up (a source is selected)
- **Picked card**: 2px pink border, subtle lift shadow `0 6px 16px rgba(196,137,154,0.28)`, `MOVING` pill (pink-tint). Tapping it again = cancel.
- **Valid targets**: 1.5px **dashed** pink border + right chip:
  - Rest target → `arrow-down-left` + **"Move here"**.
  - Active target → `arrows-exchange` + **"Swap"**.
- **Invalid days** (completed, past, in-progress, and — when source is a missed/past day — any *active* day since swap needs both today-or-future): dimmed, no chip, not tappable.
- Picking banner + Cancel visible.

### Placement (target tapped)
- Framer Motion: the two cards animate trading positions (move = source content slides to target, source→rest; swap = cross-fade/slide exchange).
- Toast (sonner): move → "Leg Day moved to Sat 19 Jul"; swap → "Swapped Leg Day and Zone 2 Cardio".
- Return to idle; Reset affordance now visible.

### Empty
- Whole week is rest / no active phase → centered calm state: muted calendar icon + "Nothing to rearrange — this week is all rest." No picking affordances.

## 5. Eligibility → Affordance Map

| Day condition | As source | As target (while picking) |
|---|---|---|
| Active, today/future, not completed | Pickable (grip) | Rest→"Move here" · Active→"Swap" |
| Active, **missed** (past, uncompleted) | Pickable | Only **rest** targets valid (no swap into past) |
| Completed | Locked (check) | Locked |
| Rest | Not a source | "Move here" (if today/future) |
| Past (any) | Only if active+missed | Never a target (dimmed) |
| In-progress session | Locked | Locked |

## 6. Motion & Feel

- Overlay: slide-up 300ms (match app).
- Card reorder on place: Framer Motion `layout` animation, ~250–300ms ease.
- Pick-up: quick scale/border transition (~150ms). Respect `prefers-reduced-motion` (crossfade instead of travel).

## 7. Accessibility

- Cards are `<button>`s with clear `aria-label` (e.g. "Wednesday 16 July, Leg Day, tap to move").
- Picked/target state conveyed by text chip (not colour alone) — "Move here"/"Swap"/"Moving" labels carry meaning for colour-blind users.
- 44px min tap targets throughout.

## 8. Copy Bank

- Entry: "Rearrange week"
- Subheader: "14–20 July · changes apply to this week only"
- Picking: "Moving {workout} — tap a day to place it" / "Cancel"
- Chips: "Move here" · "Swap" · "Moving" · "Completed"
- Reset: "Reset week to plan" → confirm "Reset this week to your plan? Your rearrangements will be cleared." / "Reset" / "Keep changes"
- Toasts: "{workout} moved to {date}" · "Swapped {a} and {b}" · "Week reset to your plan"
- Empty: "Nothing to rearrange — this week is all rest."

## 9. New / Changed Components (for Dev)

| Component | Change |
|---|---|
| `src/pages/WeekEditor.tsx` | **new** — full-screen route `/week`, consumes `weekSchedule.ts` resolver + `planMove` |
| `src/components/WeekDayCard.tsx` | **new** — day-row with idle/picked/target/locked variants |
| `src/App.tsx` | add `/week` route (outside AppLayout) |
| `src/pages/Today.tsx` | add "Rearrange week" entry near WeekStrip; remove old "↔ Move workout" link |
| `src/components/DayPeekSheet.tsx` | "Move this workout" → navigate to `/week` with pre-picked day (route state / query param) |
| `src/components/MoveWorkoutSheet.tsx` | **retire** (replaced by WeekEditor) |
| Reset confirm | reuse `ConfirmBottomSheet` |

## 10. Open Items / Handoff (JARVIS)

- Pre-armed entry from DayPeek: pass picked day via router state (`navigate('/week', { state: { pickDow } })`).
- Confirm toast strings with final workout-name formatting.
- The reorder animation is a nice-to-have; a non-animated correct state swap is acceptable for v1 if Framer `layout` proves fiddly on the list.
