import { useState, useRef, useCallback } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import BottomNav from "./BottomNav";
import { PageTransition } from "./PageTransition";
import { BarbellLogo } from "./BarbellLogo";

const TOP_LEVEL_PATHS = new Set(["/", "/phases", "/history", "/profile"]);

const ROUTE_META: Record<string, { title: string; isInner: boolean }> = {
  "/":                { title: "",                 isInner: false },
  "/phases":          { title: "Phases",           isInner: false },
  "/history":         { title: "History",          isInner: false },
  "/profile":         { title: "Profile",          isInner: false },
  "/weight":          { title: "Weight",           isInner: true },
  "/progress-photos": { title: "Progress Photos",  isInner: true },
};

// Routes that should not show the header at all
const NO_HEADER_PATTERNS = [
  /^\/workout\/[^/]+$/,          // ActiveWorkout
  /^\/workout\/[^/]+\/summary$/, // WorkoutSummary
  /^\/progress-photos\/compare/, // ProgressPhotosCompare
  /^\/auth$/,
];

function matchRouteMeta(pathname: string) {
  // Exact match first
  if (ROUTE_META[pathname]) return ROUTE_META[pathname];
  // Inner pages not explicitly listed (phases/:id, history/:sessionId, etc.)
  return { title: "", isInner: true };
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollY(scrollRef.current.scrollTop);
    }
  }, []);

  const pathname = location.pathname;
  const hideHeader = NO_HEADER_PATTERNS.some((p) => p.test(pathname));
  const meta = matchRouteMeta(pathname);
  const isHomePage = pathname === "/";

  const headerOpacity = Math.min(1, Math.max(0, (scrollY - 60) / 60));

  // Animation key
  const isTopLevel = TOP_LEVEL_PATHS.has(pathname);
  const animationKey = isTopLevel ? "__top__" : pathname;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Fixed header */}
      {!hideHeader && (
        <header
          className="fixed top-0 left-0 right-0 z-50"
          style={{
            paddingTop: "env(safe-area-inset-top, 0px)",
            backgroundColor: `rgba(245, 242, 239, ${headerOpacity})`,
            borderBottom: `1px solid rgba(0, 0, 0, ${headerOpacity * 0.08})`,
          }}
        >
          <div className="flex items-center justify-center h-11 px-4 relative">
            {meta.isInner && (
              <button
                onClick={() => navigate(-1)}
                className="absolute left-4 flex items-center justify-center h-10 w-10"
                style={{ opacity: headerOpacity }}
              >
                <ChevronLeft size={24} className="text-foreground/70" />
              </button>
            )}
            <div style={{ opacity: headerOpacity }}>
              {isHomePage ? (
                <BarbellLogo size={28} />
              ) : meta.title ? (
                <span className="text-sm font-medium text-foreground/80 tracking-wide">
                  {meta.title}
                </span>
              ) : null}
            </div>
          </div>
        </header>
      )}

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: hideHeader ? 0 : "calc(44px + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4.5rem)",
        }}
      >
        <AnimatePresence mode="sync">
          <PageTransition key={animationKey}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
