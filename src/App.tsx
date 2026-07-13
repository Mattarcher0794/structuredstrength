import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Today from "@/pages/Today";
import Phases from "@/pages/Phases";
import PhaseCreate from "@/pages/PhaseCreate";
import PhaseDetail from "@/pages/PhaseDetail";
import WorkoutBuilder from "@/pages/WorkoutBuilder";
import ActiveWorkout from "@/pages/ActiveWorkout";
import WorkoutSummary from "@/pages/WorkoutSummary";
import History from "@/pages/History";
import WorkoutDetail from "@/pages/WorkoutDetail";
import Profile from "@/pages/Profile";
import Developer from "@/pages/Developer";
import ExerciseApiSearch from "@/pages/ExerciseApiSearch";
import WeightTracker from "@/pages/WeightTracker";
import WeekEditor from "@/pages/WeekEditor";
import ProgressPhotos from "@/pages/ProgressPhotos";
import ProgressPhotosCompare from "@/pages/ProgressPhotosCompare";
import StravaCallback from "@/pages/StravaCallback";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Today />} />
        <Route path="phases" element={<Phases />} />
        <Route path="phases/new" element={<PhaseCreate />} />
        <Route path="phases/:id" element={<PhaseDetail />} />
        <Route path="phases/:phaseId/day/:dayId" element={<WorkoutBuilder />} />
        <Route path="history" element={<History />} />
        <Route path="history/:sessionId" element={<WorkoutDetail />} />
        <Route path="profile" element={<Profile />} />
        <Route path="profile/developer" element={<Developer />} />
        <Route path="profile/developer/exercise-api" element={<ExerciseApiSearch />} />
      </Route>
      <Route path="weight" element={<WeightTracker />} />
      <Route path="week" element={<WeekEditor />} />
      <Route path="progress-photos" element={<ProgressPhotos />} />
      <Route path="progress-photos/compare/:angle" element={<ProgressPhotosCompare />} />
      <Route path="strava/callback" element={<StravaCallback />} />
      <Route path="workout/:sessionId" element={<ActiveWorkout />} />
      <Route path="workout/:sessionId/summary" element={<WorkoutSummary />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
