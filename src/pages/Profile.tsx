import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { PageTitleRow } from "@/components/PageTitleRow";
import { useScrollHeader } from "@/hooks/useScrollHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LogOut, ChevronRight, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import PasscodeSheet from "@/components/PasscodeSheet";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { scrollRef, opacity, handleScroll } = useScrollHeader();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [passcodeOpen, setPasscodeOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const [displayName, setDisplayName] = useState("");
  const [restSeconds, setRestSeconds] = useState("90");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setRestSeconds(String(profile.default_rest_seconds));
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      await supabase.from("profiles").update({
        display_name: displayName,
        default_rest_seconds: parseInt(restSeconds) || 90,
      }).eq("user_id", user!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profile updated" });
    },
  });

  return (
    <>
      <PageHeader title="Profile" opacity={opacity} />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="bg-background"
        style={{ height: '100vh', overflowY: 'auto', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <PageTitleRow title="Profile" />
        <div className="mx-auto max-w-lg px-5">

          <div className="space-y-5">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={user?.email || ""} disabled className="rounded-2xl opacity-60" />
        </div>
        <div className="space-y-1.5">
          <Label>Display name</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-2xl" placeholder="Optional" />
        </div>
        <div className="space-y-1.5">
          <Label>Default rest timer (seconds)</Label>
          <Input type="number" value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} className="rounded-2xl w-24" />
        </div>
        <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="rounded-2xl">
          Save changes
        </Button>
      </div>

      {/* Integrations */}
      <div className="mt-12 pt-6 border-t border-border">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Integrations</p>
        <StravaIntegration userId={user?.id} />
      </div>

      <div className="mt-12 pt-6 border-t border-border">
        <Button variant="ghost" onClick={signOut} className="text-muted-foreground gap-2">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>

      {/* Developer */}
      <div className="mt-8 pt-6 border-t border-border">
        <button
          onClick={() => setPasscodeOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl px-1 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            Developer
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full text-muted-foreground">
              beta
            </Badge>
          </span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

          <PasscodeSheet
            open={passcodeOpen}
            onOpenChange={setPasscodeOpen}
            onSuccess={() => {
              sessionStorage.setItem("dev_unlocked", "true");
              navigate("/profile/developer");
            }}
          />
        </div>
      </div>
    </>
  );
}

function StravaIntegration({ userId }: { userId: string | undefined }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stravaConnection } = useQuery({
    queryKey: ["strava-connection", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("strava_connections")
        .select("*")
        .eq("user_id", userId!)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const handleConnect = () => {
    const redirectUri = `${window.location.origin}/strava/callback`;
    window.location.href = `https://www.strava.com/oauth/authorize?client_id=237190&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&approval_prompt=auto&scope=activity:read_all`;
  };

  const handleDisconnect = async () => {
    await supabase
      .from("strava_connections")
      .update({ is_active: false })
      .eq("user_id", userId!);
    queryClient.invalidateQueries({ queryKey: ["strava-connection", userId] });
    toast({ title: "Strava disconnected" });
  };

  if (!stravaConnection) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-lg font-bold mb-3" style={{ color: "var(--strava)" }}>STRAVA</p>
        <Button
          variant="outline"
          onClick={handleConnect}
          className="w-full rounded-2xl border-primary text-foreground hover:bg-primary/5"
        >
          Connect Strava
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-lg font-bold mb-2" style={{ color: "var(--strava)" }}>STRAVA</p>
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <span>Connected</span>
      </div>
      <button
        onClick={handleDisconnect}
        className="mt-3 text-xs text-muted-foreground hover:text-foreground"
      >
        Disconnect
      </button>
    </div>
  );
}
