import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import BottomNav from "./BottomNav";
import { PageTransition } from "./PageTransition";

const TOP_LEVEL_PATHS = new Set(["/", "/phases", "/history", "/profile"]);

export default function AppLayout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Only animate within a section, not between top-level tabs
  const isTopLevel = TOP_LEVEL_PATHS.has(location.pathname);
  const animationKey = isTopLevel ? "__top__" : location.pathname;

  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4.5rem)" }}>
      <main>
        <AnimatePresence mode="sync">
          <PageTransition key={animationKey}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
}
