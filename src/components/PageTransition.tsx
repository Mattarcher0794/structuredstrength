import { motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, x: '100%' },
  animate: { opacity: 1, x: 0 },
};

const animateTransition = {
  duration: 0.25,
  ease: [0.25, 0.1, 0.25, 1.0] as [number, number, number, number],
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit={{ opacity: 0, transition: { duration: 0.05 } }}
      transition={animateTransition}
      style={{ width: "100%", height: "100%", overflowX: "hidden" }}
    >
      {children}
    </motion.div>
  );
}
