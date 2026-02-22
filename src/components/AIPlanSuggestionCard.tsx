import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface AIPlanExercise {
  name: string;
  muscleGroup: string;
  subMuscle: string;
  equipment: string;
  movementPattern: string;
  isUnilateral: boolean;
  sets: number;
  minReps: number;
  maxReps: number;
}

interface AIPlanDay {
  dayOfWeek: number;
  dayType: "strength" | "rest" | "cardio";
  workoutName: string | null;
  exercises: AIPlanExercise[];
}

export interface AIPlan {
  planName: string;
  days: AIPlanDay[];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dayTypeBadge(type: string) {
  const styles: Record<string, string> = {
    strength: "bg-primary/10 text-primary border-primary/20",
    rest: "bg-muted text-muted-foreground border-border",
    cardio: "bg-accent/10 text-accent-foreground border-accent/20",
  };
  return styles[type] || styles.rest;
}

interface AIPlanSuggestionCardProps {
  plan: AIPlan;
  applying: boolean;
  onUsePlan: () => void;
  onDismiss: () => void;
  dismissLabel?: string;
}

export default function AIPlanSuggestionCard({
  plan,
  applying,
  onUsePlan,
  onDismiss,
  dismissLabel = "Start from scratch",
}: AIPlanSuggestionCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
      {/* Card label */}
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Suggested plan
        </span>
      </div>

      {/* Plan name */}
      <h2 className="text-xl font-semibold">{plan.planName}</h2>

      {/* Day rows */}
      <div className="divide-y divide-border">
        {plan.days
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
          .map((day) => (
            <div key={day.dayOfWeek} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold w-10 shrink-0">{DAY_NAMES[day.dayOfWeek - 1]}</span>
                <Badge variant="outline" className={`text-xs ${dayTypeBadge(day.dayType)}`}>
                  {day.dayType.charAt(0).toUpperCase() + day.dayType.slice(1)}
                </Badge>
                {day.workoutName && (
                  <span className="text-sm text-muted-foreground">{day.workoutName}</span>
                )}
              </div>
              {day.exercises && day.exercises.length > 0 && (
                <div className="ml-12 space-y-0.5">
                  {day.exercises.map((ex, i) => (
                    <p key={i} className="text-xs">
                      <span className="text-muted-foreground">{ex.name}</span>
                      <span className="text-muted-foreground/50"> — {ex.sets}×{ex.minReps}–{ex.maxReps} reps</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Footer note */}
      <div className="border-t border-border pt-4">
        <p className="text-xs italic text-muted-foreground/70">
          This is a starting point — you can edit everything after creating
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-2">
        <Button
          onClick={onUsePlan}
          disabled={applying}
          className="w-full rounded-2xl py-5"
        >
          {applying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Creating…
            </>
          ) : (
            "Use this plan"
          )}
        </Button>
        <button
          onClick={onDismiss}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}
