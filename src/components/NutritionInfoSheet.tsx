import { BottomSheet } from "@/components/ui/bottom-sheet";

interface NutritionInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NutritionInfoSheet({ open, onOpenChange }: NutritionInfoSheetProps) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Apple Health sync">
      <div className="space-y-4 pb-4">
        <div className="space-y-3">
          <Step number={1} text="Log food in MyFitnessPal (or any Apple Health nutrition app)." />
          <Step number={2} text="It syncs to Apple Health." />
          <Step number={3} text="This app reads daily totals and updates automatically when you open the app or refresh." />
        </div>
        <div className="rounded-xl bg-muted/60 p-3.5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Note:</strong> Live Apple Health reading requires the wrapped iOS app (coming soon).
          </p>
        </div>
      </div>
    </BottomSheet>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {number}
      </span>
      <p className="text-sm text-foreground leading-relaxed pt-0.5">{text}</p>
    </div>
  );
}
