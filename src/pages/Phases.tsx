import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function PhaseCard({ phase, navigate, activateMutation, statusColors }: any) {
  return (
    <button
      onClick={() => navigate(`/phases/${phase.id}`)}
      className="w-full rounded-2xl bg-card border border-border p-4 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{phase.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {phase.length_weeks} weeks
            {phase.start_date && ` · Started ${phase.start_date}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", statusColors[phase.status])}>
            {phase.status}
          </span>
          {phase.status === "draft" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-primary"
              onClick={(e) => { e.stopPropagation(); activateMutation.mutate(phase.id); }}
            >
              Activate
            </Button>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </button>
  );
}

export default function Phases() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: phases = [], isLoading } = useQuery({
    queryKey: ["phases", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("phases")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const activePhases = phases.filter((p: any) => p.status === "active");
  const draftPhases = phases.filter((p: any) => p.status === "draft");
  const completedPhases = phases.filter((p: any) => p.status === "completed");

  const activateMutation = useMutation({
    mutationFn: async (phaseId: string) => {
      // Deactivate current active
      await supabase.from("phases").update({ status: "completed" }).eq("user_id", user!.id).eq("status", "active");
      await supabase.from("phases").update({ status: "active" }).eq("id", phaseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phases"] });
      queryClient.invalidateQueries({ queryKey: ["active-phase"] });
      toast({ title: "Phase activated" });
    },
  });

  const statusColors: Record<string, string> = {
    active: "bg-primary/15 text-primary",
    draft: "bg-muted text-muted-foreground",
    completed: "bg-muted text-muted-foreground",
  };

  return (
    <div className="mx-auto max-w-lg px-5 pt-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Phases</h1>
        <Button onClick={() => navigate("/phases/new")} size="sm" className="rounded-2xl gap-1">
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : phases.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-8 text-center">
          <h2 className="text-lg font-display font-semibold mb-2">No phases yet</h2>
          <p className="text-sm text-muted-foreground mb-4">Build your first training phase to get started.</p>
          <Button onClick={() => navigate("/phases/new")} className="rounded-2xl">Create phase</Button>
        </div>
      ) : (
        <>
          {/* Active phase */}
          {activePhases.length > 0 && (
            <div className="space-y-3">
              {activePhases.map((phase: any) => (
                <PhaseCard key={phase.id} phase={phase} navigate={navigate} activateMutation={activateMutation} statusColors={statusColors} />
              ))}
            </div>
          )}

          {/* Draft phases */}
          {draftPhases.length > 0 && (
            <>
              <h2 className="text-sm font-medium text-muted-foreground mt-8 mb-3">Draft phases</h2>
              <div className="space-y-3">
                {draftPhases.map((phase: any) => (
                  <PhaseCard key={phase.id} phase={phase} navigate={navigate} activateMutation={activateMutation} statusColors={statusColors} />
                ))}
              </div>
            </>
          )}

          {/* Completed phases */}
          {completedPhases.length > 0 && (
            <>
              <h2 className="text-sm font-medium text-muted-foreground mt-8 mb-3">Previous phases</h2>
              <div className="space-y-3">
                {completedPhases.map((phase: any) => (
                  <PhaseCard key={phase.id} phase={phase} navigate={navigate} activateMutation={activateMutation} statusColors={statusColors} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
