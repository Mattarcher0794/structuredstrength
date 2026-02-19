import { useState, useRef, useEffect, useCallback } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PasscodeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  passcode?: string;
  title?: string;
  description?: string;
}

export default function PasscodeSheet({
  open,
  onOpenChange,
  onSuccess,
  passcode = "1234",
  title = "Developer access",
  description = "Enter passcode to continue.",
}: PasscodeSheetProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const handleSubmit = useCallback(() => {
    if (value === passcode) {
      onSuccess();
      onOpenChange(false);
    } else {
      setError(true);
      setShake(true);
      setValue("");
      setTimeout(() => setShake(false), 500);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [value, passcode, onSuccess, onOpenChange]);

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title} showClose={false}>
      <p className="text-center text-sm text-muted-foreground mb-5">{description}</p>

      <div className={cn("mb-2", shake && "animate-[shake_0.4s_ease-in-out]")}>
        <Input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={value}
          onChange={(e) => {
            setError(false);
            setValue(e.target.value.replace(/\D/g, "").slice(0, 4));
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="••••"
          className="rounded-2xl text-center text-lg tracking-[0.5em] font-mono"
          autoComplete="off"
        />
      </div>

      {error && (
        <p className="text-center text-xs text-destructive mb-3">Incorrect passcode</p>
      )}

      <div className="space-y-3 mt-4">
        <Button
          onClick={handleSubmit}
          disabled={value.length < 4}
          className="w-full rounded-2xl py-5 text-sm font-medium"
        >
          Continue
        </Button>
        <Button
          variant="outline"
          className="w-full rounded-2xl py-5 text-sm font-medium"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
      </div>
    </BottomSheet>
  );
}
