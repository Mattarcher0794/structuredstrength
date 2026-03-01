import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40"
          />
          {/* Sheet */}
          <motion.div
            initial={{ translateY: "100%" }}
            animate={{ translateY: 0 }}
            exit={{ translateY: "100%" }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="fixed bottom-0 left-0 right-0 z-[51] rounded-t-2xl bg-background max-h-[85vh] overflow-y-auto"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3">
              <div className="h-1 w-9 rounded-full bg-muted" />
            </div>

            {/* Header */}
            <div className="px-6 pt-4">
              <h2 className="text-center text-lg font-semibold">{title}</h2>
            </div>

            {/* Content */}
            <div className="px-6 pt-5 pb-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
