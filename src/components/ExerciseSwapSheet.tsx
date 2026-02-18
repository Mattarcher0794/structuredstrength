import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  originalExerciseId: string;
  muscleGroup: string;
  movementPattern: string;
}

export default function ExerciseSwapSheet({ open, onClose, sessionId, originalExerciseId, muscleGroup, movementPattern }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: alternatives = [] } = useQuery({
    queryKey: ["swap-alternatives", muscleGroup, movementPattern],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercises")
        .select("*")
        .eq("muscle_group", muscleGroup)
        .neq("id", originalExerciseId)
        .order("name");
      return data ?? [];
    },
    enabled: open && !!muscleGroup,
  });

  // Sort: same movement pattern first
  const sorted = [...alternatives].sort((a: any, b: any) => {
    const aMatch = a.movement_pattern === movementPattern ? 0 : 1;
    const bMatch = b.movement_pattern === movementPattern ? 0 : 1;
    return aMatch - bMatch || a.name.localeCompare(b.name);
  }).filter((ex: any) => !search || ex.name.toLowerCase().includes(search.toLowerCase()));

  const swapMutation = useMutation({
    mutationFn: async (replacementId: string) => {
      // Upsert swap
      await supabase.from("session_exercise_swaps").upsert(
        { workout_session_id: sessionId, original_exercise_id: originalExerciseId, replacement_exercise_id: replacementId },
        { onConflict: "workout_session_id,original_exercise_id" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-swaps", sessionId] });
      onClose();
    },
  });

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh]">
        <SheetHeader>
          <SheetTitle className="text-left">Swap exercise</SheetTitle>
        </SheetHeader>
        <p className="text-xs text-muted-foreground mb-3">Same muscle group · similar movements shown first</p>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="rounded-xl mb-3 h-9 text-sm" />
        <div className="overflow-y-auto max-h-[45vh] space-y-1">
          {sorted.map((ex: any) => (
            <button
              key={ex.id}
              onClick={() => swapMutation.mutate(ex.id)}
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors"
            >
              <span className="font-medium">{ex.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">{ex.sub_muscle} · {ex.equipment}</span>
              {ex.movement_pattern === movementPattern && (
                <span className="ml-2 text-[10px] text-primary font-medium">same pattern</span>
              )}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
