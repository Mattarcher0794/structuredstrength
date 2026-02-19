import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ArrowLeft, AlertTriangle, Search, KeyRound, Eye, EyeOff } from "lucide-react";

const DEV_SESSION_KEY = "dev_unlocked";
const API_KEY_STORAGE = "rapidapiKey";
const API_HOST = "edb-with-videos-and-images-by-ascendapi.p.rapidapi.com";
const BASE_URL = `https://${API_HOST}`;

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

function maskKey(key: string) {
  if (key.length <= 4) return "••••";
  return "••••" + key.slice(-4);
}

export default function ExerciseApiSearch() {
  const navigate = useNavigate();

  // Route guard
  useEffect(() => {
    if (sessionStorage.getItem(DEV_SESSION_KEY) !== "true") {
      navigate("/profile", { replace: true });
    }
  }, [navigate]);

  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem(API_KEY_STORAGE) || "");
  const [keySheetOpen, setKeySheetOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [fullDetail, setFullDetail] = useState<ExerciseResult | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save API key
  const handleSaveKey = () => {
    const trimmed = keyInput.trim();
    if (trimmed) {
      sessionStorage.setItem(API_KEY_STORAGE, trimmed);
      setApiKey(trimmed);
    }
    setKeyInput("");
    setShowKeyInput(false);
    setKeySheetOpen(false);
  };

  // Debounced search
  const doSearch = useCallback(
    async (term: string, key: string) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setSearched(true);

      try {
        const res = await fetch(
          `${BASE_URL}/api/v1/exercises/search?name=${encodeURIComponent(term)}`,
          {
            headers: {
              "X-RapidAPI-Key": key,
              "X-RapidAPI-Host": API_HOST,
            },
            signal: controller.signal,
          }
        );
        if (!res.ok) {
          setError(`API request failed (${res.status})`);
          setResults([]);
        } else {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data?.data ?? data?.exercises ?? [];
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
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!apiKey || searchTerm.trim().length < 2) {
      setResults([]);
      setSearched(false);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(searchTerm.trim(), apiKey), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, apiKey, doSearch]);

  // Fetch full details
  const fetchFullDetail = async (exerciseId: string) => {
    if (!apiKey) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/exercises/${exerciseId}`, {
        headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": API_HOST },
      });
      if (res.ok) {
        const data = await res.json();
        setFullDetail(data?.data ?? data);
      }
    } catch {
      // silently fail — partial data still visible
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = (ex: ExerciseResult) => {
    setSelectedExercise(ex);
    setFullDetail(null);
    setDetailOpen(true);
  };

  if (sessionStorage.getItem(DEV_SESSION_KEY) !== "true") return null;

  const detail = fullDetail || selectedExercise;

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-28">
      <button
        onClick={() => navigate("/profile/developer")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Developer
      </button>

      <h1 className="text-2xl font-semibold mb-1">Exercise API</h1>
      <p className="text-sm text-muted-foreground mb-6">Search external exercise database via RapidAPI</p>

      {/* API Configuration */}
      <Card className="rounded-2xl border-border p-5 mb-4">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Host</p>
            <p className="text-xs font-mono text-foreground/80 break-all">{API_HOST}</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">API Key</p>
              <p className="text-sm font-mono">
                {apiKey ? maskKey(apiKey) : <span className="text-destructive">Not set</span>}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-xs"
              onClick={() => setKeySheetOpen(true)}
            >
              <KeyRound className="h-3.5 w-3.5 mr-1" />
              {apiKey ? "Update Key" : "Set Key"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Warning banner */}
      {!apiKey && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 mb-4">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive">API key required to search</p>
        </div>
      )}

      {/* Search input */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search exercises…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 rounded-xl"
          disabled={!apiKey}
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

      {/* API Key Sheet */}
      <BottomSheet open={keySheetOpen} onOpenChange={setKeySheetOpen} title="Set API Key">
        <div className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">
            Enter your RapidAPI key. It will be stored in sessionStorage only and never sent to our servers.
          </p>
          <div className="relative">
            <Input
              type={showKeyInput ? "text" : "password"}
              placeholder="Paste API key…"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="rounded-xl pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showKeyInput ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => {
                setKeyInput("");
                setShowKeyInput(false);
                setKeySheetOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button className="flex-1 rounded-xl" onClick={handleSaveKey} disabled={!keyInput.trim()}>
              Save
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Detail Sheet */}
      <BottomSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={detail?.name || "Exercise"}
        maxHeightClass="max-h-[85vh]"
      >
        {detail && (
          <div className="space-y-4 pt-2 pb-4">
            {detail.gifUrl && (
              <img
                src={detail.gifUrl}
                alt={detail.name}
                className="w-full max-h-48 object-contain rounded-xl bg-muted"
              />
            )}

            <div className="flex flex-wrap gap-2">
              {detail.bodyPart && (
                <Badge variant="secondary" className="rounded-full text-xs">
                  {detail.bodyPart}
                </Badge>
              )}
              {detail.target && (
                <Badge variant="secondary" className="rounded-full text-xs">
                  {detail.target}
                </Badge>
              )}
              {detail.equipment && (
                <Badge variant="secondary" className="rounded-full text-xs">
                  {detail.equipment}
                </Badge>
              )}
            </div>

            {detail.secondaryMuscles && detail.secondaryMuscles.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Secondary muscles</p>
                <p className="text-sm">{detail.secondaryMuscles.join(", ")}</p>
              </div>
            )}

            {detail.instructions && detail.instructions.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Instructions</p>
                <ol className="list-decimal list-inside space-y-1">
                  {detail.instructions.map((s, i) => (
                    <li key={i} className="text-sm text-foreground/90">{s}</li>
                  ))}
                </ol>
              </div>
            )}

            {!fullDetail && (detail.exerciseId || detail.id) && (
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => fetchFullDetail((detail.exerciseId || detail.id)!)}
                disabled={detailLoading}
              >
                {detailLoading ? "Loading…" : "Fetch full details"}
              </Button>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
