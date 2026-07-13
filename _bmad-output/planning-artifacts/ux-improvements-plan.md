# StructuredStrength — UX Improvements Implementation Plan

> Author: Thor (UX Designer) · Date: 2026-07-13 · Status: Plan for review
> Source: product-wide UX review (lenses: retention / coherence / visual polish)
> Excluded by request: the draft-phase dead-end finding.

The work is grouped into **four workstreams**, ordered so the foundation lands first and everything else builds on it. WS-A and WS-B are consistency/polish (low risk, high felt-quality). WS-C and WS-D are features that deserve their own scoping pass before build.

---

## WS-A — Consistency foundation
*Shared tokens + components. Do this first — the later work depends on it. Low risk.*

**A1. Secondary-colour design tokens** (review finding #5)
- Add tokens to the theme (`index.css`): `--pb-gold` (#B8860B), `--cardio` (#A8D4E0 / text #5a9bae), `--strava` (#FC4C02), progress rose, confetti set.
- Replace hardcoded hex in: WorkoutSummary, WorkoutDetail, History, WeekStrip, Today, Profile.
- Outcome: one place to change a brand colour; kills 5-file drift.
- Effort: S–M · Owner: JARVIS

**A2. `<BackBar>` shared component** (finding #3)
- One component: back chevron + label, consistent convention (label = destination, e.g. "History", "Phases").
- Replace the bespoke back rows in WorkoutDetail, PhaseCreate, PhaseDetail, WorkoutBuilder.
- Effort: S · Owner: JARVIS

**A3. Standardise destructive confirmations** (finding #6)
- Adopt `ConfirmBottomSheet` everywhere; replace the `AlertDialog` in WorkoutDetail (delete workout).
- Effort: S · Owner: JARVIS

**A4. Loading-state convention** (finding #4)
- One approach: skeletons for content lists/detail. Add the missing **WorkoutDetail** loading state (currently renders null → blank flash). Align Weight/Photos (spinner → skeleton where it's content).
- Consider a small shared `<Skeleton>`/`<CardSkeleton>` helper.
- Effort: S–M · Owner: JARVIS

**A5. Minor consistency mop-up** (bundled P2s)
- Card padding scale (settle on `p-4`/`p-5` roles), label tracking (`tracking-widest` for section labels), verb parity ("Log weight" / "Log check-in" or "Add" for both).
- Effort: S · Owner: JARVIS · *lowest priority; safe to trail the others.*

---

## WS-B — Micro-interactions & motion *(new — requested)*
*Make the high-frequency moments feel alive. Purposeful, fast, reduced-motion-safe.*

**Motion principles (apply throughout):**
- Fast: 150–250ms; physical easing (`ease-out` for enters, spring for tactile).
- Purposeful, never decorative-for-its-own-sake; never block input.
- **Respect `prefers-reduced-motion`** — swap travel for a crossfade/instant.
- Shared **motion tokens** (durations + easings) in one module so it's consistent (fixes the current 200/250ms/ad-hoc drift).

**B0. Motion tokens** — define `DUR` / `EASE` constants + a reduced-motion helper. Foundation for the rest. *Effort: S.*

**Prioritised by frequency (highest impact first):**
| # | Moment | Today | Proposed micro-interaction |
|---|---|---|---|
| B1 | **Log a set** (the most-repeated action) | pill just appears | pill **pops/springs in**; input clears with a subtle settle |
| B2 | **Complete an exercise** (allDone) | card dims instantly | card **settles** + a completion tick draws in before it dims |
| B3 | **Delete a set** (just shipped) | pill vanishes | pill **animates out** (scale/fade); Undo restores with a pop |
| B4 | **Rest timer** | *verify current UI* | if numeric-only, add a **progress ring** counting down |
| B5 | **Day ticked done** (WeekStrip / "Completed today") | static check | checkmark **scale/draw-in** |
| B6 | **Button/CTA press** | inconsistent | uniform **active:scale(0.98)** tactile feedback on primary actions |
| B7 | **Stat / progress numbers** | snap | optional **count-up** on weekly progress + summary stats |
| B8 | **List/card entrance** | appear | optional **stagger-in** on Today cards & history list |

- B1–B3 are the money moments (in-workout, high frequency) — do these first.
- B4 (rest ring) is a standout delight if the timer is currently just a number — **verify first.**
- B7/B8 are nice-to-have; include only if cheap.
- Effort: M overall · Owner: JARVIS (Thor to spec exact feels if wanted)

---

## WS-C — Coherence: unify "train differently today" (finding #1)
*The biggest conceptual seam. Deserves its own scoping — do NOT freehand it.*

- Problem: "Train anyway" (rest day → `is_schedule_override` session) and the Week Editor (`week_day_assignments`) are two models for the same intent.
- Direction: funnel both through the Week Editor model — a rest-day "train anyway" becomes a one-day assignment/move rather than a separate override session.
- **Needs Bruce Banner (Architect):** reconcile `is_schedule_override` sessions vs `week_day_assignments`; migration/back-compat for existing override sessions; define the single "change today" entry point.
- Also retires parked pending-item #3.
- Effort: M–L · Flow: mini requirements → architecture → build (like the Week Editor).

---

## WS-D — Retention: momentum on Today (finding #7)
*The one additive bet that changes behaviour, not just polish.*

- Surface **streak** ("🔥 4-day streak" equivalent, no emoji per system — use an icon), **last PB**, and/or a "you're on a roll" nudge on the Today screen (the daily touchpoint), so returning is rewarded.
- Needs light design (what to show, where, hierarchy vs the existing "This week" card) + a streak calc (derive from completed sessions).
- Effort: M · Flow: quick UX spec (Thor) → build (JARVIS). Pairs naturally with WS-B motion (the streak/PB reveal is a great micro-moment).

---

## Recommended sequencing
1. **WS-A** (foundation: tokens, BackBar, confirm, loading) — small PRs, immediate felt-quality lift.
2. **WS-B** (motion tokens + B1–B3 first) — builds on A's tokens; biggest "feels premium" jump.
3. **WS-C** and **WS-D** — each as its own scoped feature (Banner for C's data model; Thor spec for D), sequenced after the polish lands.

## Owners / Avengers
- **JARVIS (Dev):** all of WS-A, WS-B build.
- **Bruce Banner (Architect):** WS-C data-model reconciliation.
- **Thor (UX):** WS-B feel spec (if desired), WS-D design spec.
