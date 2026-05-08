import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getValidAccessToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  // 1. Fetch the user's strava_connections row
  const { data: connection, error } = await supabase
    .from("strava_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (error || !connection) {
    throw new Error(`No active Strava connection found for user ${userId}`);
  }

  // 2. Check if token is still valid (with 5 minute buffer)
  const expiresAt = new Date(connection.token_expires_at).getTime();
  const nowWithBuffer = Date.now() + 5 * 60 * 1000;

  if (expiresAt > nowWithBuffer) {
    // Token still valid
    return connection.access_token;
  }

  // 3. Token expired — refresh it
  const refreshRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("STRAVA_CLIENT_ID"),
      client_secret: Deno.env.get("STRAVA_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    }),
  });

  if (!refreshRes.ok) {
    const err = await refreshRes.text();
    throw new Error(`Strava token refresh failed: ${err}`);
  }

  const refreshData = await refreshRes.json();

  // 4. Update strava_connections with new tokens
  const { error: updateError } = await supabase
    .from("strava_connections")
    .update({
      access_token: refreshData.access_token,
      refresh_token: refreshData.refresh_token,
      token_expires_at: new Date(refreshData.expires_at * 1000).toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(`Failed to update refreshed tokens: ${updateError.message}`);
  }

  console.log(`Token refreshed successfully for user ${userId}`);
  return refreshData.access_token;
}
