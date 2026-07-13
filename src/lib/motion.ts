import { useReducedMotion } from "framer-motion";

/**
 * Shared motion presets — fast, eased, reduced-motion-aware. Keeps
 * micro-interactions consistent instead of ad-hoc durations per component.
 */

export const SPRING_POP = { type: "spring", stiffness: 500, damping: 30, mass: 0.6 } as const;
export const DUR = { fast: 0.15, base: 0.22 } as const;

/**
 * Enter/exit "pop" for list items (e.g. set pills). Falls back to a plain
 * fade when the user prefers reduced motion.
 */
export function usePopVariants() {
  const reduce = useReducedMotion();
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: DUR.fast },
    };
  }
  return {
    initial: { scale: 0.6, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.6, opacity: 0 },
    transition: SPRING_POP,
  };
}
