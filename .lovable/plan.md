

# 💪 Structured Strength — Fitness Phase Planner MVP

A calm, premium workout planning and execution app for experienced women who want structured autonomy without the noise.

---

## Data Model

### Core Tables

**profiles** — `id (FK auth.users)`, `display_name`, `default_rest_seconds (default 90)`, `created_at`

**exercises** — `id`, `name`, `muscle_group (Upper/Lower)`, `sub_muscle`, `equipment`, `movement_pattern`, `is_unilateral`, `is_custom`, `created_by_user_id (nullable)`

**phases** — `id`, `user_id`, `name`, `length_weeks`, `start_date`, `status (active/completed/draft)`, `created_at`

**phase_days** — `id`, `phase_id`, `day_of_week (1-7)`, `day_type (rest/cardio/strength)`, `workout_name`

**phase_day_exercises** — `id`, `phase_day_id`, `exercise_id`, `order_index`, `num_sets`, `min_reps`, `max_reps`, `notes`, `rest_seconds`

**workout_sessions** — `id`, `user_id`, `phase_id`, `phase_day_id`, `date`, `started_at`, `completed_at`, `status (in_progress/completed/abandoned)`

**session_sets** — `id`, `workout_session_id`, `exercise_id`, `exercise_name_snapshot`, `set_number`, `reps`, `weight`, `completed_at`

**session_exercise_swaps** — `id`, `workout_session_id`, `original_exercise_id`, `replacement_exercise_id`

> Plan is stored once (phase + weekly structure). Sessions are instances referencing the plan. Exercise name snapshots in set logs ensure history survives plan edits.

---

## Pages & Navigation

1. **Auth** — Sign up / Login (email + password)
2. **Today (Home)** — Shows today's session from active phase, quick "Start Workout" entry point
3. **Phases** — List of all phases (active, draft, completed)
4. **Create/Edit Phase** — Name, length, start date → leads to weekly structure editor
5. **Weekly Structure Editor** — 7-day view, assign day types, tap Strength days to build workouts
6. **Workout Builder** — Filter by muscle group → pick exercises → set sets/reps/rest per exercise, drag to reorder
7. **Active Workout** — The core logging screen: exercise cards with set rows, tap to log weight+reps, auto-start rest timer, swap button per exercise
8. **History** — Chronological list of completed workouts
9. **Workout Detail** — Full breakdown of a past session (exercises, sets, reps, weights, duration)

### Navigation Map
- Bottom tab bar: **Today** | **Phases** | **History** | **Profile**
- Today → Start Workout → Active Workout (full-screen, no tab bar)
- Phases → Phase Detail → Weekly Editor → Workout Builder
- History → Workout Detail

---

## Key User Flows

### Phase Creation Flow
1. User taps "New Phase" → enters name + weeks
2. Sees 7-day week grid → taps each day to set type (Rest/Cardio/Strength)
3. Taps a Strength day → opens Workout Builder
4. Filters by Upper/Lower → browses exercises → adds to workout → sets reps/sets per exercise → reorders
5. Repeats for each Strength day → saves phase → optionally activates

### Workout Execution Flow
1. Today screen shows today's planned workout from active phase
2. User taps "Start Workout" → session created, timer begins
3. For each exercise: sees target sets/reps, logs weight + reps per set
4. Completing a set auto-starts rest timer (countdown overlay, pause/reset controls)
5. If equipment unavailable → tap exercise → "Swap" → see filtered alternatives (same muscle group + movement pattern) → select replacement (session-only swap)
6. After all exercises → "Finish Workout" → session saved with duration

---

## State Management
- **Auth state** via Supabase `onAuthStateChange`
- **Active phase** derived from phases where `status = 'active'`
- **Today's workout** computed: active phase → current week number from start_date → today's day_of_week → matching phase_day
- **Active workout session** tracked in React state + persisted to DB on each set completion
- **Rest timer** local React state (countdown), auto-triggered on set completion
- **React Query** for all data fetching/caching with optimistic updates for set logging

---

## API Shape (Supabase RLS-protected tables)
All data access through Supabase client with RLS policies ensuring `user_id = auth.uid()`. Key queries:
- `GET phases` — user's phases
- `GET phase_days + phase_day_exercises` — weekly structure for a phase
- `INSERT workout_sessions` — start a session
- `INSERT session_sets` — log each set (optimistic)
- `GET workout_sessions + session_sets` — history
- `GET exercises` — library (filtered by muscle_group, movement_pattern, equipment)

---

## UI & Design Direction
- **Light mode only**, white/off-white backgrounds
- **Muted rose/blush** accent color (`hsl(350, 40%, 72%)` range) for buttons, active states
- Warm neutral grays for text and borders
- Soft rounded corners (`rounded-2xl`), generous padding
- Clean sans-serif typography, calm supportive microcopy
- Rest timer as a subtle overlay/bottom sheet, not aggressive
- Empty states with encouraging, non-patronizing messages
- Minimal iconography (Lucide icons), no emoji overload

---

## Seed Content
~45 exercises covering:
- **Lower/Glutes**: Hip Thrust (Barbell, Smith), Romanian Deadlift, Bulgarian Split Squat, Cable Kickback, Glute Bridge, Sumo Deadlift
- **Lower/Quads**: Back Squat, Leg Press, Leg Extension, Walking Lunge, Goblet Squat, Hack Squat
- **Lower/Hamstrings**: Lying Leg Curl, Seated Leg Curl, Stiff-Leg Deadlift, Nordic Curl
- **Lower/Calves**: Standing Calf Raise, Seated Calf Raise
- **Upper/Back**: Lat Pulldown, Seated Cable Row, Barbell Row, Dumbbell Row, Face Pull, Pull-Up
- **Upper/Chest**: Bench Press, Incline Dumbbell Press, Cable Fly, Chest Press Machine, Push-Up
- **Upper/Shoulders**: Overhead Press, Lateral Raise, Rear Delt Fly, Arnold Press
- **Upper/Biceps**: Barbell Curl, Dumbbell Curl, Cable Curl, Hammer Curl
- **Upper/Triceps**: Tricep Pushdown, Overhead Tricep Extension, Dips, Skull Crushers
- **Core**: Cable Crunch, Plank, Hanging Leg Raise, Pallof Press

---

## Risks & Assumptions
- **Assumption**: One active phase at a time (simplifies "Today" logic)
- **Assumption**: Weeks align to calendar weeks starting from `start_date`
- **Risk**: Rest timer accuracy during background/screen lock — mitigated by using timestamps rather than intervals
- **Risk**: Offline workout logging not supported in MVP — user needs connectivity
- **Assumption**: Exercise library is global (seed data) + user can't add custom exercises in MVP (keeps scope tight)
- **Risk**: Phase editing while a session is in progress — we'll prevent plan edits during active sessions

