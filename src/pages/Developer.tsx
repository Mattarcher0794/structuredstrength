import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Database, Search, ShieldCheck } from "lucide-react";

const DEV_SESSION_KEY = "dev_unlocked";

export default function Developer() {
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem(DEV_SESSION_KEY) !== "true") {
      navigate("/profile", { replace: true });
    }
  }, [navigate]);

  if (sessionStorage.getItem(DEV_SESSION_KEY) !== "true") return null;

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-28">
      <button
        onClick={() => navigate("/profile")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Profile
      </button>

      <h1 className="text-2xl font-semibold mb-1">Developer</h1>
      <p className="text-sm text-muted-foreground mb-8">Tools here are for testing only.</p>

      {/* Exercise API */}
      <Card className="rounded-2xl border-border p-5 mb-4">
        <div className="flex items-start gap-3">
          <Search className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">Exercise API</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full text-muted-foreground">
                Experimental
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Search external exercise database via RapidAPI</p>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-xs"
              onClick={() => navigate("/profile/developer/exercise-api")}
            >
              Open API Search
            </Button>
          </div>
        </div>
      </Card>

      {/* Data Tools */}
      <Card className="rounded-2xl border-border p-5 mb-4">
        <div className="flex items-start gap-3">
          <Database className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm">Data tools</span>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="outline" className="rounded-xl text-xs" disabled>
                Clear my test data
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl text-xs" disabled>
                Reseed exercises
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* System Status */}
      <Card className="rounded-2xl border-border p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm">System Status</span>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">exercise-search-external</p>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full text-muted-foreground">
                  v1.0.1
                </Badge>
              </div>
              <div className="text-[11px] text-muted-foreground/70 space-y-0.5">
                <p>• Fixed incorrect RapidAPI query parameter (search instead of name)</p>
                <p>• Added secure RapidAPI proxy via Edge Function</p>
                <p>• Removed client-side API key handling</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
