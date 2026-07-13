import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackBarProps {
  /** Label — the destination screen (e.g. "History", "Phases"), or "Back" when the origin varies. */
  label: string;
  onClick: () => void;
  className?: string;
}

/** Shared back navigation row. One style + convention across all detail screens. */
export function BackBar({ label, onClick, className }: BackBarProps) {
  return (
    <button
      onClick={onClick}
      className={cn("flex items-center gap-1 text-sm text-muted-foreground mb-4", className)}
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </button>
  );
}
