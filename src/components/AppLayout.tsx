import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4.5rem)" }}>
      <main>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
