import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { NutritionInfoSheet } from "@/components/NutritionInfoSheet";

interface MacroBarProps {
  label: string;
  value: number | null;
  unit: string;
  color: string;
  max: number;
}

function MacroBar({ label, value, unit, color, max }: MacroBarProps) {
  const pct = value != null ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground">
          {value != null ? `${Math.round(value)}${unit}` : "—"}
        </span>
      </div>
      <div className="h-[6px] rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CalorieRing({ value, max }: { value: number | null; max: number }) {
  const pct = value != null ? Math.min((value / max) * 100, 100) : 0;
  const radius = 32;
  const stroke = 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="78" height="78" className="-rotate-90">
        <circle cx="39" cy="39" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx="39" cy="39" r={radius} fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold leading-none">{value != null ? value : "—"}</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">kcal</span>
      </div>
    </div>
  );
}

export function NutritionCard() {
  const { user } = useAuth();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [infoOpen, setInfoOpen] = useState(false);

  const { data: nutrition } = useQuery({
    queryKey: ["nutrition-today", user?.id, todayStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("nutrition_daily")
        .select("*")
        .eq("user_id", user!.id)
        .eq("date", todayStr)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const hasData = nutrition != null;
  const lastSynced = nutrition?.last_synced_at
    ? formatDistanceToNow(new Date(nutrition.last_synced_at), { addSuffix: true })
    : null;

  return (
    <>
      <div className="mb-6 rounded-2xl bg-card border border-border p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Nutrition
        </p>

        {hasData ? (
          <div className="flex items-center gap-5">
            <CalorieRing value={nutrition.calories} max={2500} />
            <div className="flex-1 space-y-2.5">
              <MacroBar label="Protein" value={Number(nutrition.protein_g)} unit="g" color="bg-rose-300/80" max={200} />
              <MacroBar label="Carbs" value={Number(nutrition.carbs_g)} unit="g" color="bg-amber-300/80" max={300} />
              <MacroBar label="Fat" value={Number(nutrition.fat_g)} unit="g" color="bg-sky-300/80" max={100} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-5">
            <CalorieRing value={null} max={2500} />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">No nutrition data today</p>
              <button
                onClick={() => setInfoOpen(true)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Set up Apple Health sync →
              </button>
            </div>
          </div>
        )}

        {lastSynced && (
          <p className="mt-2.5 text-[10px] text-muted-foreground">Updated {lastSynced}</p>
        )}
      </div>

      <NutritionInfoSheet open={infoOpen} onOpenChange={setInfoOpen} />
    </>
  );
}
