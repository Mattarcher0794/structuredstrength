import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmationSheetProps {
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

export default function ConfirmationSheet({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationSheetProps) {
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onCancel()}>
      <DrawerContent className="mx-4 mb-0 rounded-t-3xl border-t border-border bg-card px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 [&>div:first-child]:mx-auto [&>div:first-child]:mb-4 [&>div:first-child]:h-1.5 [&>div:first-child]:w-10 [&>div:first-child]:rounded-full [&>div:first-child]:bg-muted">
        <h2 className="text-center text-lg font-semibold text-foreground mb-2 font-[Playfair_Display]">
          {title}
        </h2>
        <p className="text-center text-sm text-muted-foreground mb-6 leading-relaxed">
          {description}
        </p>

        <div className="space-y-3">
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "w-full rounded-2xl py-5 text-sm font-medium",
              variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "",
            )}
            variant={variant === "destructive" ? "destructive" : "default"}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>

          <DrawerClose asChild>
            <Button
              variant="outline"
              className="w-full rounded-2xl py-5 text-sm font-medium"
              disabled={isLoading}
            >
              {cancelLabel}
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
