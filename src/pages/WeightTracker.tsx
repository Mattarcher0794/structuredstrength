import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";
import { BottomSheet } from "@/components/BottomSheet";

export default function WeightTracker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [weightInput, setWeightInput] = useState("");

  const { data: weightLogs = [], isLoading } = useQuery({
    queryKey: ["weight-logs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", user!.id)
        .order("logged_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  const logMutation = useMutation({
    mutationFn: async (kg: number) => {
      const { error } = await supabase.from("weight_logs").insert({
        user_id: user!.id,
        weight_kg: kg,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weight-logs", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["latest-weight", user?.id] });
      toast("Weight logged ✓");
      setSheetOpen(false);
      setWeightInput("");
    },
    onError: () => {
      toast("Something went wrong");
    },
  });

  const handleSave = () => {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val <= 0) {
      toast("Enter a valid weight");
      return;
    }
    logMutation.mutate(val);
  };

  const chartData = weightLogs.map((l: any) => ({
    date: format(new Date(l.logged_at), "d MMM"),
    kg: Number(l.weight_kg),
  }));

  const kgValues = chartData.map((d) => d.kg);
  const minKg = kgValues.length ? Math.floor(Math.min(...kgValues) - 2) : 0;
  const maxKg = kgValues.length ? Math.ceil(Math.max(...kgValues) + 2) : 100;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-display font-semibold">Weight</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-32">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : chartData.length < 2 ? (
          <div className="rounded-2xl bg-card border border-border p-8 text-center mt-4">
            <p className="text-muted-foreground text-sm">
              Log a few weights to see your trend
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border p-4 mt-4">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: string, index: number) => {
                    if (index === 0) return value;
                    const prevValue = chartData[index - 1]?.date;
                    return value === prevValue ? "" : value;
                  }}
                />
                <YAxis
                  domain={[minKg, maxKg]}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  tickFormatter={(value: number) => `${value}`}
                  label={{ value: "kg", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" }, offset: 4 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    fontSize: 13,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Weight log list */}
        {weightLogs.length > 0 && (
          <div className="mt-6 space-y-2">
            {[...weightLogs].reverse().map((l: any) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-xl bg-card border border-border px-4 py-3"
              >
                <span className="text-sm text-muted-foreground">
                  {format(new Date(l.logged_at), "d MMM yyyy")}
                </span>
                <span className="text-xs font-normal">{Number(l.weight_kg)} kg</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 pb-8 bg-gradient-to-t from-background via-background to-transparent">
        <Button
          onClick={() => setSheetOpen(true)}
          className="w-full rounded-2xl py-6 text-base font-medium"
          size="lg"
        >
          Log weight
        </Button>
      </div>

      {/* Log sheet */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Log weight"
      >
        <div className="space-y-4 pb-4">
          <Input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 84.5"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            enterKeyHint="done"
            autoFocus
            className="text-center text-lg"
          />
          <Button
            onClick={handleSave}
            disabled={logMutation.isPending}
            className="w-full rounded-2xl py-5 text-base font-medium"
            size="lg"
          >
            {logMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
