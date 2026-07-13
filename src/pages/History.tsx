import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { PageTitleRow } from "@/components/PageTitleRow";
import { useScrollHeader } from "@/hooks/useScrollHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft, Clock, Trophy } from "lucide-react";
import {
  format,
  differenceInMinutes,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isToday,
  startOfDay,
  isSameMonth,
} from "date-fns";
import { detectSessionPBs } from "@/lib/historyPBDetection";

// ─── Streak Calendar ────────────────────────────────────────────────────────

type CalendarSession = { date: string; scheduled_day_type: string };

function StreakCalendar({
  sessions,
  viewMonth,
  direction,
  onPrev,
  onNext,
}: {
  sessions: CalendarSession[];
  viewMonth: Date;
  direction: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const today = startOfDay(new Date());
  const atCurrentMonth = isSameMonth(viewMonth, new Date());

  const sessionMap = new Map<string, string>();
  sessions.forEach((s) => sessionMap.set(s.date, s.scheduled_day_type));

  const firstDay = startOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: firstDay, end: endOfMonth(viewMonth) });

  // Monday-first offset: getDay returns 0=Sun..6=Sat, convert to 0=Mon..6=Sun
  const leadingEmpty = (getDay(firstDay) + 6) % 7;

  type Status = "strength" | "cardio" | "rest" | "blank";

  const getStatus = (day: Date): Status => {
    const dateStr = format(day, "yyyy-MM-dd");
    if (sessionMap.has(dateStr)) {
      return sessionMap.get(dateStr) === "cardio" ? "cardio" : "strength";
    }
    if (day > today || isToday(day)) return "blank";
    return "rest";
  };

  const bgColor: Record<Status, string> = {
    strength: "hsl(350, 40%, 72%)",
    cardio: "var(--cardio)",
    rest: "hsl(30, 12%, 92%)",
    blank: "transparent",
  };

  const textColor: Record<Status, string> = {
    strength: "#ffffff",
    cardio: "hsl(20, 10%, 20%)",
    rest: "hsl(20, 6%, 55%)",
    blank: "hsl(20, 6%, 72%)",
  };

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div
      className="rounded-2xl bg-card border border-border"
      style={{ padding: "16px 16px 14px" }}
    >
      {/* Month navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <button
          onClick={onPrev}
          style={{
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            border: "1px solid hsl(30, 15%, 90%)",
            background: "transparent",
            cursor: "pointer",
            color: "hsl(20, 6%, 55%)",
          }}
        >
          <ChevronLeft size={16} />
        </button>

        <span style={{ fontSize: 15, fontWeight: 600, color: "hsl(20, 10%, 15%)" }}>
          {format(viewMonth, "MMMM yyyy")}
        </span>

        <button
          onClick={onNext}
          disabled={atCurrentMonth}
          style={{
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            border: "1px solid hsl(30, 15%, 90%)",
            background: "transparent",
            cursor: atCurrentMonth ? "default" : "pointer",
            color: "hsl(20, 6%, 55%)",
            opacity: atCurrentMonth ? 0.3 : 1,
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day-of-week headers — static, never animates */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 3,
          marginBottom: 4,
        }}
      >
        {dayLabels.map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              fontSize: 10,
              fontWeight: 700,
              color: "hsl(20, 6%, 55%)",
              letterSpacing: "0.06em",
              paddingBottom: 4,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid — slides on month change */}
      <div style={{ overflow: "hidden" }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={format(viewMonth, "yyyy-MM")}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d * 32, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -32, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}
          >
            {Array.from({ length: leadingEmpty }).map((_, i) => (
              <div key={`empty-${i}`} style={{ aspectRatio: "1" }} />
            ))}

            {days.map((day) => {
              const status = getStatus(day);
              const todayRing = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 7,
                    background: bgColor[status],
                    border: todayRing
                      ? "2px solid hsl(350, 40%, 72%)"
                      : "2px solid transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: status === "blank" || status === "rest" ? 400 : 700,
                      color: textColor[status],
                      lineHeight: 1,
                    }}
                  >
                    {format(day, "d")}
                  </span>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 12,
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        {[
          { color: "hsl(350, 40%, 72%)", label: "Strength" },
          { color: "var(--cardio)", label: "Cardio" },
          { color: "hsl(30, 12%, 92%)", label: "Rest", border: "hsl(30, 15%, 85%)" },
        ].map((x) => (
          <div key={x.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: x.color,
                border: x.border ? `1px solid ${x.border}` : "none",
              }}
            />
            <span style={{ fontSize: 10, color: "hsl(20, 6%, 55%)" }}>{x.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { scrollRef, opacity, handleScroll } = useScrollHeader();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [calDirection, setCalDirection] = useState(0);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workout_sessions")
        .select("*, phase_days(workout_name), session_sets(id)")
        .eq("user_id", user!.id)
        .eq("status", "completed")
        .order("date", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: pbSessionIds } = useQuery({
    queryKey: ["history-pbs", sessions.map((s: any) => s.id).join(",")],
    queryFn: () =>
      detectSessionPBs(
        sessions.map((s: any) => ({ id: s.id, started_at: s.started_at }))
      ),
    enabled: sessions.length > 0,
  });

  const { data: calendarSessions = [] } = useQuery({
    queryKey: ["calendar-sessions", user?.id, format(viewMonth, "yyyy-MM")],
    queryFn: async () => {
      const { data } = await supabase
        .from("workout_sessions")
        .select("date, scheduled_day_type")
        .eq("user_id", user!.id)
        .eq("status", "completed")
        .gte("date", format(startOfMonth(viewMonth), "yyyy-MM-dd"))
        .lte("date", format(endOfMonth(viewMonth), "yyyy-MM-dd"));
      return (data ?? []) as CalendarSession[];
    },
    enabled: !!user,
  });

  return (
    <>
      <PageHeader title="Progress" opacity={opacity} />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="bg-background"
        style={{ height: "100vh", overflowY: "auto", paddingTop: "env(safe-area-inset-top)" }}
      >
        <PageTitleRow title="Progress" />
        <div className="mx-auto max-w-lg px-5 pb-32">

          {/* Streak calendar */}
          <StreakCalendar
            sessions={calendarSessions}
            viewMonth={viewMonth}
            direction={calDirection}
            onPrev={() => { setCalDirection(-1); setViewMonth((m) => subMonths(m, 1)); }}
            onNext={() => { setCalDirection(1); setViewMonth((m) => addMonths(m, 1)); }}
          />

          {/* Session list separator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              margin: "24px 0 14px",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "hsl(20, 6%, 55%)",
                whiteSpace: "nowrap",
              }}
            >
              Recent sessions
            </span>
            <div
              style={{ flex: 1, height: 1, background: "hsl(30, 15%, 90%)" }}
            />
          </div>

          {/* Session list */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border p-8 text-center">
              <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <h2 className="text-lg font-display font-semibold mb-2">No workouts yet</h2>
              <p className="text-sm text-muted-foreground">
                Your completed workouts will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s: any) => {
                const duration =
                  s.completed_at && s.started_at
                    ? differenceInMinutes(
                        new Date(s.completed_at),
                        new Date(s.started_at)
                      )
                    : null;
                const hasPB = pbSessionIds?.has(s.id) ?? false;
                return (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/history/${s.id}`)}
                    className="w-full rounded-2xl bg-card border border-border p-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">
                          {s.phase_days?.workout_name || "Workout"}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(s.date), "EEE, MMM d")}
                          {duration !== null && ` · ${duration} min`}
                          {` · ${s.session_sets?.length || 0} sets`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasPB && (
                          <Trophy className="h-3.5 w-3.5" style={{ color: "var(--pb-gold)" }} />
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
