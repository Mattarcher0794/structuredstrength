import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayTypes = ["rest", "cardio", "strength"] as const;
const typeStyles: Record<string, string> = {
  rest: "bg-muted text-muted-foreground",
  cardio: "bg-accent text-accent-foreground",
  strength: "bg-primary/15 text-primary",
};

export default function PhaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: phase } = useQuery({
    queryKey: ["phase", id],
    queryFn: async () => {
      const { data } = await supabase.from("phases").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: days = [] } = useQuery({
    queryKey: ["phase-days", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("phase_days")
        .select("*, phase_day_exercises(id)")
        .eq("phase_id", id!)
        .order("day_of_week");
      return data ?? [];
    },
    enabled: !!id,
  });

  const toggleDayType = useMutation({
    mutationFn: async ({ dayId, currentType }: { dayId: string; currentType: string }) => {
      const idx = dayTypes.indexOf(currentType as any);
      const next = dayTypes[(idx + 1) % dayTypes.length];
      await supabase.from("phase_days").update({ day_type: next }).eq("id", dayId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phase-days", id] }),
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("phases").update({ status: "completed" }).eq("user_id", user!.id).eq("status", "active");
      await supabase.from("phases").update({ status: "active", start_date: new Date().toISOString().split("T")[0] }).eq("id", id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phases"] });
      queryClient.invalidateQueries({ queryKey: ["active-phase"] });
      queryClient.invalidateQueries({ queryKey: ["phase", id] });
      toast({ title: "Phase activated!" });
    },
  });

  if (!phase) return null;

  return (
    <div className="mx-auto max-w-lg px-5 pt-6">
      <button onClick={() => navigate("/phases")} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Phases
      </button>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold">{phase.name}</h1>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", typeStyles[phase.status] || "bg-muted text-muted-foreground")}>
          {phase.status}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-6">{phase.length_weeks} weeks · Tap a day to cycle its type</p>

      <div className="space-y-2 mb-6">
        {days.map((day: any, i: number) => (
          <div key={day.id} className="flex items-center gap-3 rounded-2xl bg-card border border-border p-3">
            <span className="w-10 text-xs font-medium text-muted-foreground">{dayNames[i]}</span>
            <button
              onClick={() => toggleDayType.mutate({ dayId: day.id, currentType: day.day_type })}
              className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors", typeStyles[day.day_type])}
            >
              {day.day_type}
            </button>
            <div className="flex-1" />
            {day.day_type === "strength" && (
              <button
                onClick={() => navigate(`/phases/${id}/day/${day.id}`)}
                className="flex items-center gap-1 text-xs font-medium text-primary"
              >
                {day.phase_day_exercises?.length || 0} exercises
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {phase.status === "draft" && (
        <Button onClick={() => activateMutation.mutate()} className="w-full rounded-2xl py-5" disabled={activateMutation.isPending}>
          Activate phase
        </Button>
      )}
    </div>
  );
}
