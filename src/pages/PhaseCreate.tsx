import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

export default function PhaseCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [weeks, setWeeks] = useState("6");

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: phase } = await supabase
        .from("phases")
        .insert({ user_id: user!.id, name, length_weeks: parseInt(weeks) })
        .select()
        .single();
      if (!phase) throw new Error("Failed to create phase");

      // Create 7 days (all rest by default)
      const days = Array.from({ length: 7 }, (_, i) => ({
        phase_id: phase.id,
        day_of_week: i + 1,
        day_type: "rest" as const,
      }));
      await supabase.from("phase_days").insert(days);
      return phase;
    },
    onSuccess: (phase) => {
      navigate(`/phases/${phase.id}`);
    },
  });

  return (
    <div className="mx-auto max-w-lg px-5 pt-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="text-2xl font-semibold mb-6">New phase</h1>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label>Phase name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Glute Focus Block"
            className="rounded-2xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Length (weeks)</Label>
          <Input
            type="number"
            min="1"
            max="52"
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
            className="rounded-2xl w-24"
          />
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!name.trim() || createMutation.isPending}
          className="w-full rounded-2xl py-5"
        >
          {createMutation.isPending ? "Creating…" : "Create phase"}
        </Button>
      </div>
    </div>
  );
}
