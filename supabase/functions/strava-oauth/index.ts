import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { code, userId } = await req.json();

    if (!code || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing code or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exchange code for tokens with Strava
    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: Deno.env.get("STRAVA_CLIENT_ID"),
        client_secret: Deno.env.get("STRAVA_CLIENT_SECRET"),
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Strava token exchange failed:", err);
      return new Response(
        JSON.stringify({ error: "Strava token exchange failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenRes.json();

    const {
      access_token,
      refresh_token,
      expires_at, // unix timestamp (seconds)
      athlete,
      scope,
    } = tokenData;

    // Initialise Supabase with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upsert into strava_connections
    const { error: upsertError } = await supabase
      .from("strava_connections")
      .upsert(
        {
          user_id: userId,
          strava_athlete_id: athlete.id,
          access_token,
          refresh_token,
          token_expires_at: new Date(expires_at * 1000).toISOString(),
          scope: scope ?? "activity:read",
          is_active: true,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "strava_athlete_id" }
      );

    if (upsertError) {
      console.error("DB upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save connection" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, athleteId: athlete.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
