import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  showClose?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
  maxHeightClass?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  showClose = true,
  children,
  footer,
  closeOnBackdrop = true,
  maxHeightClass = "max-h-[80vh]",
}: BottomSheetProps) {
  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/60"
          onClick={() => closeOnBackdrop && onOpenChange(false)}
        />
        <DrawerPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border-t border-border bg-card",
            maxHeightClass,
          )}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1.5 w-10 rounded-full bg-muted" />
          </div>

          {/* Header */}
          {(title || showClose) && (
            <div className="relative flex items-center justify-center px-5 pt-1 pb-2">
              {title && (
                <DrawerPrimitive.Title className="text-lg font-semibold text-foreground font-[Playfair_Display]">
                  {title}
                </DrawerPrimitive.Title>
              )}
              {showClose && (
                <button
                  onClick={() => onOpenChange(false)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
              {footer}
            </div>
          )}
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
