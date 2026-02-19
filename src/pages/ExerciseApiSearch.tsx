import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ArrowLeft, AlertTriangle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DEV_SESSION_KEY = "dev_unlocked";

interface ExerciseResult {
  exerciseId?: string;
  id?: string;
  name: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
  gifUrl?: string;
  instructions?: string[];
  secondaryMuscles?: string[];
}

export default function ExerciseApiSearch() {
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem(DEV_SESSION_KEY) !== "true") {
      navigate("/profile", { replace: true });
    }
  }, [navigate]);

  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseResult | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (term: string) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/exercise-search-external?q=${encodeURIComponent(term)}`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        setError(`API request failed (${res.status})`);
        setResults([]);
      } else {
        const data = await res.json();
        const list = Array.isArray(data.results) ? data.results : [];
        setResults(list);
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setError("Network error — please check your connection");
        setResults([]);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchTerm.trim().length < 2) {
      setResults([]);
      setSearched(false);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(searchTerm.trim()), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, doSearch]);

  const openDetail = (ex: ExerciseResult) => {
    setSelectedExercise(ex);
    setDetailOpen(true);
  };

  if (sessionStorage.getItem(DEV_SESSION_KEY) !== "true") return null;

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-28">
      <button
        onClick={() => navigate("/profile/developer")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Developer
      </button>

      <h1 className="text-2xl font-semibold mb-1">Exercise API</h1>
      <p className="text-sm text-muted-foreground mb-6">Search external exercise database via secure proxy</p>

      {/* Search input */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search exercises…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-2xl border-border p-4">
              <div className="flex gap-3">
                <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && searched && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No results found</p>
      )}

      {/* Results */}
      {!loading && !error && results.length > 0 && (
        <div className="space-y-3">
          {results.map((ex, i) => (
            <Card
              key={ex.exerciseId || ex.id || i}
              className="rounded-2xl border-border p-4 active:scale-[0.98] transition-transform cursor-pointer"
              onClick={() => openDetail(ex)}
            >
              <div className="flex gap-3 items-center">
                {ex.gifUrl && (
                  <img
                    src={ex.gifUrl}
                    alt={ex.name}
                    className="h-12 w-12 rounded-lg object-cover shrink-0 bg-muted"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ex.name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {ex.bodyPart && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full text-muted-foreground">
                        {ex.bodyPart}
                      </Badge>
                    )}
                    {ex.target && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full text-muted-foreground">
                        {ex.target}
                      </Badge>
                    )}
                    {ex.equipment && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full text-muted-foreground">
                        {ex.equipment}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <BottomSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={selectedExercise?.name || "Exercise"}
        maxHeightClass="max-h-[85vh]"
      >
        {selectedExercise && (
          <div className="space-y-4 pt-2 pb-4">
            {selectedExercise.gifUrl && (
              <img
                src={selectedExercise.gifUrl}
                alt={selectedExercise.name}
                className="w-full max-h-48 object-contain rounded-xl bg-muted"
              />
            )}

            <div className="flex flex-wrap gap-2">
              {selectedExercise.bodyPart && (
                <Badge variant="secondary" className="rounded-full text-xs">
                  {selectedExercise.bodyPart}
                </Badge>
              )}
              {selectedExercise.target && (
                <Badge variant="secondary" className="rounded-full text-xs">
                  {selectedExercise.target}
                </Badge>
              )}
              {selectedExercise.equipment && (
                <Badge variant="secondary" className="rounded-full text-xs">
                  {selectedExercise.equipment}
                </Badge>
              )}
            </div>

            {selectedExercise.secondaryMuscles && selectedExercise.secondaryMuscles.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Secondary muscles</p>
                <p className="text-sm">{selectedExercise.secondaryMuscles.join(", ")}</p>
              </div>
            )}

            {selectedExercise.instructions && selectedExercise.instructions.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Instructions</p>
                <ol className="list-decimal list-inside space-y-1">
                  {selectedExercise.instructions.map((s, i) => (
                    <li key={i} className="text-sm text-foreground/90">{s}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
