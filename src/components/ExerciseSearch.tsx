import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ArrowLeft, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ExerciseResult {
  id: string;
  name: string;
  muscle_group: string;
  movement_pattern: string;
  equipment: string;
  sub_muscle: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Called when user taps an exercise */
  onSelect: (exercise: ExerciseResult) => void;
  /** Pre-filter by muscle group (optional) */
  defaultMuscleGroup?: string;
  /** Highlight exercises with this movement pattern */
  highlightMovementPattern?: string;
  /** Exercise IDs to exclude from results */
  excludeIds?: string[];
}

const muscleGroups = ["All", "Upper", "Lower", "Core", "Full Body"];

export default function ExerciseSearch({
  open,
  onClose,
  title,
  onSelect,
  defaultMuscleGroup,
  highlightMovementPattern,
  excludeIds = [],
}: Props) {
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string>(defaultMuscleGroup || "All");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setSearch("");
      setMuscleFilter(defaultMuscleGroup || "All");
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open, defaultMuscleGroup]);

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises-search"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercises")
        .select("*")
        .order("name");
      return data ?? [];
    },
    enabled: open,
  });

  const filtered = exercises
    .filter((ex: any) => {
      if (excludeIds.includes(ex.id)) return false;
      const matchesMuscle =
        muscleFilter === "All" || ex.muscle_group === muscleFilter;
      const matchesSearch =
        !search ||
        [ex.name, ex.sub_muscle, ex.equipment, ex.movement_pattern].some(
          (field) => field?.toLowerCase().includes(search.toLowerCase())
        );
      return matchesMuscle && matchesSearch;
    })
    .sort((a: any, b: any) => {
      if (highlightMovementPattern) {
        const aMatch = a.movement_pattern === highlightMovementPattern ? 0 : 1;
        const bMatch = b.movement_pattern === highlightMovementPattern ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[100] flex flex-col bg-background"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3 shrink-0">
            <button
              onClick={onClose}
              className="flex items-center justify-center h-9 w-9 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Cancel"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="flex-1 text-lg font-semibold text-center pr-9">
              {title}
            </h1>
          </div>

          {/* Search input */}
          <div className="px-5 pb-3 shrink-0 relative">
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises..."
              className="rounded-xl h-10 text-sm pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 px-5 pb-3 overflow-x-auto shrink-0">
            {muscleGroups.map((mg) => (
              <button
                key={mg}
                onClick={() => setMuscleFilter(mg)}
                className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  muscleFilter === mg
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {mg}
              </button>
            ))}
          </div>

          {/* Results */}
          <div
            className="flex-1 overflow-y-auto px-5"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No exercises found
              </p>
            ) : (
              <div className="space-y-0.5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                {filtered.map((ex: any) => (
                  <button
                    key={ex.id}
                    onClick={() => {
                      onSelect({
                        id: ex.id,
                        name: ex.name,
                        muscle_group: ex.muscle_group,
                        movement_pattern: ex.movement_pattern,
                        equipment: ex.equipment,
                        sub_muscle: ex.sub_muscle,
                      });
                    }}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">{ex.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {ex.sub_muscle} · {ex.equipment}
                    </span>
                    {highlightMovementPattern &&
                      ex.movement_pattern === highlightMovementPattern && (
                        <span className="ml-2 text-[10px] text-primary font-medium">
                          same pattern
                        </span>
                      )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
