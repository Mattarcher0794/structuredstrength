import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    <div className="mx-auto max-w-lg px-5 pt-12">
      <h1 className="text-2xl font-semibold mb-6">Profile</h1>

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

      <div className="mt-12 pt-6 border-t border-border">
        <Button variant="ghost" onClick={signOut} className="text-muted-foreground gap-2">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}
