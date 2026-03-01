import { useState, useEffect, useRef } from "react";
import { GripVertical, Trash2 } from "lucide-react";

interface ExerciseConfigCardProps {
  id: string;
  name: string;
  numSets: number;
  minReps: number;
  maxReps: number;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: string, value: number) => void;
}

function NumericField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  const [display, setDisplay] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplay(String(value));
  }, [value]);

  return (
    <div className="flex-1 flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
        {label}
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={display}
        onChange={(e) => setDisplay(e.target.value)}
        onFocus={() => inputRef.current?.select()}
        onBlur={() => {
          const num = parseInt(display, 10);
          if (isNaN(num) || num < 1) {
            setDisplay(String(value));
          } else {
            setDisplay(String(num));
            if (num !== value) onCommit(num);
          }
        }}
        autoCorrect="off"
        spellCheck={false}
        className="h-[52px] w-full rounded-xl border border-border bg-card text-center text-xl font-medium text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background px-3"
      />
    </div>
  );
}

export default function ExerciseConfigCard({
  id,
  name,
  numSets,
  minReps,
  maxReps,
  onRemove,
  onUpdate,
}: ExerciseConfigCardProps) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      {/* Exercise header */}
      <div className="flex items-center gap-2 mb-4">
        <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />
        <span className="flex-1 text-sm font-medium truncate">{name}</span>
        <button onClick={() => onRemove(id)}>
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </button>
      </div>

      {/* Prescription section */}
      <div className="ml-6">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2 block">
          Prescription
        </span>
        <div className="rounded-xl bg-muted/30 p-4">
          <div className="flex gap-3">
            <NumericField
              label="Sets"
              value={numSets}
              onCommit={(v) => onUpdate(id, "num_sets", v)}
            />
            <NumericField
              label="Min reps"
              value={minReps}
              onCommit={(v) => onUpdate(id, "min_reps", v)}
            />
            <NumericField
              label="Max reps"
              value={maxReps}
              onCommit={(v) => onUpdate(id, "max_reps", v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
