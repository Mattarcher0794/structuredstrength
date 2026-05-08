import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

type Status = "loading" | "success" | "error" | "denied";

export default function StravaCallback() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (authLoading) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      setStatus("denied");
      return;
    }

    if (!code || !user) {
      setStatus("error");
      return;
    }

    (async () => {
      const { error: fnError } = await supabase.functions.invoke("strava-oauth", {
        body: { code, userId: user.id },
      });
      if (fnError) {
        setStatus("error");
      } else {
        setStatus("success");
        setTimeout(() => navigate("/profile"), 1500);
      }
    })();
  }, [authLoading, user, navigate]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ background: "#F5F2EF" }}
    >
      {status === "loading" && (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C4899A] border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Connecting your Strava account…</p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle2 className="h-12 w-12" style={{ color: "#C4899A" }} />
          <p className="mt-4 text-lg font-medium">Strava connected!</p>
        </>
      )}

      {status === "denied" && (
        <>
          <p className="text-base">Could not connect Strava. Please try again.</p>
          <Button onClick={() => navigate("/profile")} className="mt-6 rounded-2xl">
            Back to Profile
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <p className="text-base">Something went wrong. Please try again.</p>
          <Button onClick={() => navigate("/profile")} className="mt-6 rounded-2xl">
            Back to Profile
          </Button>
        </>
      )}
    </div>
  );
}
