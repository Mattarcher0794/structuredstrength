import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

interface SummaryState {
  sessionId: string;
  workoutName: string;
  sessionPBs: Array<{ exerciseId: string; exerciseName: string; weight: number }>;
  startedAt: string;
}

export default function WorkoutSummary() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as SummaryState | null;

  // Redirect if no state (e.g. direct URL access)
  useEffect(() => {
    if (!state) navigate("/", { replace: true });
  }, [state, navigate]);

  const sessionId = state?.sessionId;
  const sessionPBs = state?.sessionPBs ?? [];

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ["workout-summary-stats", sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("session_sets")
        .select("id, exercise_id")
        .eq("workout_session_id", sessionId!);
      const sets = data ?? [];
      const totalSets = sets.length;
      const exercises = new Set(sets.map((s) => s.exercise_id)).size;
      return { totalSets, exercises };
    },
    enabled: !!sessionId,
  });

  // Duration
  const durationMins = state?.startedAt
    ? Math.round((Date.now() - new Date(state.startedAt).getTime()) / 60000)
    : 0;

  // Confetti on mount
  useEffect(() => {
    if (!sessionId) return;

    const colors = ["#C4899A", "#B8860B", "#FFFFFF"];

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { x: 0.5, y: 0.3 },
      colors,
      gravity: 1.2,
      scalar: 0.8,
      ticks: 200,
    });

    if (sessionPBs.length > 0) {
      const timer = setTimeout(() => {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { x: 0.3, y: 0.5 },
          colors,
          gravity: 1.2,
          scalar: 0.8,
          ticks: 200,
        });
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { x: 0.7, y: 0.5 },
          colors,
          gravity: 1.2,
          scalar: 0.8,
          ticks: 200,
        });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [sessionId, sessionPBs.length]);

  if (!state) return null;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Content area — vertically centred above the pinned button */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full pb-[96px]">
        {/* Header */}
        <div className="text-center mb-8">
          <Trophy className="h-8 w-8 mx-auto mb-3" style={{ color: "#B8860B" }} />
          <h1 className="text-2xl font-bold mb-1">Workout complete</h1>
          <p className="text-sm text-muted-foreground">{state.workoutName}</p>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-8 mb-8">
          <StatItem value={`${durationMins}`} label="mins" />
          <StatItem value={`${stats?.totalSets ?? 0}`} label="sets" />
          <StatItem value={`${stats?.exercises ?? 0}`} label="exercises" />
        </div>

        {/* PB callout */}
        {sessionPBs.length > 0 && (
          <div
            className="w-full rounded-2xl border p-4"
            style={{
              backgroundColor: "#FFFBEB",
              borderColor: "rgba(184, 134, 11, 0.3)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4" style={{ color: "#B8860B" }} />
              <span className="text-sm font-semibold" style={{ color: "#B8860B" }}>
                Personal bests
              </span>
            </div>
            <div className="space-y-1">
              {sessionPBs.map((pb) => (
                <div key={pb.exerciseId} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{pb.exerciseName}</span>
                  <span className="font-semibold text-foreground">{pb.weight}kg</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pinned Done button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background p-6 z-50">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={() => navigate("/", { replace: true })}
            className="w-full h-12 rounded-xl text-base font-semibold"
          >
            Done
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
