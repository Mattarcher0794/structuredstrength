import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getValidAccessToken } from "./utils/refreshToken.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // OPTIONS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // -------------------------------------------------------
  // GET — Strava webhook verification challenge
  // Strava sends: ?hub.mode=subscribe&hub.challenge=xxx&hub.verify_token=yyy
  // We must echo back { "hub.challenge": "xxx" }
  // -------------------------------------------------------
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("hub.challenge");
    const verifyToken = url.searchParams.get("hub.verify_token");

    // Verify the token matches what we set during webhook registration
    const expectedToken = Deno.env.get("STRAVA_WEBHOOK_VERIFY_TOKEN");
    if (verifyToken !== expectedToken) {
      console.error("Webhook verify token mismatch");
      return new Response("Forbidden", { status: 403 });
    }

    console.log("Strava webhook verification successful");
    return new Response(
      JSON.stringify({ "hub.challenge": challenge }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // -------------------------------------------------------
  // POST — Incoming activity event from Strava
  // -------------------------------------------------------
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Strava webhook event received:", JSON.stringify(body));

      // Only process activity create events — ignore updates, deletes, athlete events
      if (body.object_type !== "activity" || body.aspect_type !== "create") {
        console.log(`Ignoring event: ${body.object_type} / ${body.aspect_type}`);
        // Must return 200 quickly or Strava will retry
        return new Response("ok", { status: 200 });
      }

      const stravaAthleteId = body.owner_id;
      const stravaActivityId = body.object_id;

      // Initialise Supabase with service role
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // 1. Look up user by strava_athlete_id
      const { data: connection, error: connError } = await supabase
        .from("strava_connections")
        .select("user_id")
        .eq("strava_athlete_id", stravaAthleteId)
        .eq("is_active", true)
        .single();

      if (connError || !connection) {
        console.error(`No user found for athlete ${stravaAthleteId}`);
        return new Response("ok", { status: 200 }); // Still 200 to stop retries
      }

      const userId = connection.user_id;

      // 2. Get valid access token (refreshes if expired)
      const accessToken = await getValidAccessToken(supabase, userId);

      // 3. Fetch full activity details from Strava API
      const activityRes = await fetch(
        `https://www.strava.com/api/v3/activities/${stravaActivityId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!activityRes.ok) {
        console.error(`Failed to fetch activity ${stravaActivityId}`);
        return new Response("ok", { status: 200 });
      }

      const activity = await activityRes.json();
      console.log(`Activity type: ${activity.type}, name: ${activity.name}`);

      // 4. Filter — only process Runs
      if (activity.type !== "Run") {
        console.log(`Ignoring non-Run activity: ${activity.type}`);
        return new Response("ok", { status: 200 });
      }

      // 5. Check for duplicate — prevent processing same activity twice
      const { data: existing } = await supabase
        .from("strava_activities")
        .select("id")
        .eq("strava_activity_id", stravaActivityId)
        .maybeSingle();

      if (existing) {
        console.log(`Activity ${stravaActivityId} already processed — skipping`);
        return new Response("ok", { status: 200 });
      }

      // 6. Determine activity date (Mon=1, Sun=7)
      const activityDate = new Date(activity.start_date_local);
      const jsDay = activityDate.getDay(); // 0=Sun, 1=Mon...6=Sat
      const dayOfWeek = jsDay === 0 ? 7 : jsDay; // Convert to Mon=1, Sun=7

      // Format date as YYYY-MM-DD for matching
      const activityDateStr = activityDate.toISOString().split("T")[0];

      // 7. Check if there is a scheduled cardio day for this user today
      // Find the user's active phase
      const { data: activePhase } = await supabase
        .from("phases")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      let phaseDayId: string | null = null;
      let phaseId: string | null = null;

      if (activePhase) {
        // Check phase_day_overrides first
        // Calculate week_start_date (Monday of the activity's week)
        const weekStart = new Date(activityDate);
        const diff = weekStart.getDay() === 0 ? -6 : 1 - weekStart.getDay();
        weekStart.setDate(weekStart.getDate() + diff);
        const weekStartStr = weekStart.toISOString().split("T")[0];

        const { data: override } = await supabase
          .from("phase_day_overrides")
          .select("original_day_of_week")
          .eq("phase_id", activePhase.id)
          .eq("user_id", userId)
          .eq("week_start_date", weekStartStr)
          .eq("overridden_day_of_week", dayOfWeek)
          .maybeSingle();

        const lookupDow = override ? override.original_day_of_week : dayOfWeek;

        const { data: phaseDay } = await supabase
          .from("phase_days")
          .select("id, day_type")
          .eq("phase_id", activePhase.id)
          .eq("day_of_week", lookupDow)
          .eq("day_type", "cardio")
          .maybeSingle();

        if (phaseDay) {
          phaseDayId = phaseDay.id;
          phaseId = activePhase.id;
          console.log(`Matched to scheduled cardio day: ${phaseDay.id}`);
        } else {
          console.log("No scheduled cardio day found — logging as unscheduled");
        }
      }

      // 8. Write workout_session row
      const activityStartDate = new Date(activity.start_date_local);

      const { data: session, error: sessionError } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: userId,
          phase_id: phaseId,
          phase_day_id: phaseDayId,
          date: activityStartDate.toISOString().split("T")[0],
          started_at: activity.start_date_local,
          completed_at: new Date(
            activityStartDate.getTime() +
            activity.elapsed_time * 1000
          ).toISOString(),
          status: "completed",
          scheduled_day_type: "cardio",
          is_schedule_override: false,
        })
        .select("id")
        .single();

      if (sessionError || !session) {
        console.error("Failed to insert workout_session:", sessionError);
        return new Response("ok", { status: 200 });
      }

      // 9. Write strava_activities audit row
      const { error: activityError } = await supabase
        .from("strava_activities")
        .insert({
          user_id: userId,
          strava_activity_id: stravaActivityId,
          activity_type: activity.type,
          started_at: activity.start_date_local,
          distance_meters: activity.distance,
          duration_seconds: activity.elapsed_time,
          workout_session_id: session.id,
        });

      if (activityError) {
        console.error("Failed to insert strava_activity:", activityError);
        // Non-fatal — session was already written
      }

      console.log(`Successfully logged run for user ${userId}, session ${session.id}`);
      return new Response("ok", { status: 200 });

    } catch (err) {
      console.error("Webhook handler error:", err);
      // Always return 200 to Strava — otherwise it retries aggressively
      return new Response("ok", { status: 200 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
