import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ConfirmBottomSheetProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmBottomSheet({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmBottomSheetProps) {
  return (
    <BottomSheet open={open} onOpenChange={(o) => !o && onCancel()} title={title} showClose={false}>
      <p className="text-center text-sm text-muted-foreground mb-6 leading-relaxed">
        {description}
      </p>
      <div className="space-y-3">
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full rounded-2xl py-5 text-sm font-medium"
          variant={variant === "destructive" ? "destructive" : "default"}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {confirmLabel}
        </Button>
        <Button
          variant="outline"
          className="w-full rounded-2xl py-5 text-sm font-medium"
          disabled={isLoading}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
      </div>
    </BottomSheet>
  );
}
