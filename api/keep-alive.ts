// Vercel Cron target — pings Supabase once a day so the project never hits the
// free-tier 7-day inactivity auto-pause. Read-only; uses the public anon key
// (same values already set as Vercel env vars for the frontend build).
//
// Wired up in vercel.json → "crons". Any PostgREST query counts as database
// activity, so RLS returning zero rows is fine — the point is to touch Postgres.

export default async function handler(): Promise<Response> {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Supabase env vars missing" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  try {
    const res = await fetch(`${url}/rest/v1/exercises?select=id&limit=1`, {
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}` },
    });

    return new Response(
      JSON.stringify({ ok: res.ok, status: res.status, at: new Date().toISOString() }),
      {
        status: res.ok ? 200 : 502,
        headers: { "content-type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }
}
