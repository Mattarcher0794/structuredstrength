// Vercel Cron target — pings Supabase once a day so the project never hits the
// free-tier 7-day inactivity auto-pause. Read-only; uses the public anon key
// (same values already set as Vercel env vars for the frontend build).
//
// Wired up in vercel.json → "crons". Any PostgREST query counts as database
// activity, so RLS returning zero rows is fine — the point is to touch Postgres.
//
// Uses the classic Vercel Node (req, res) handler signature — typed via node:http
// (VercelRequest/Response extend these) to stay zero-dependency and lint-clean.
import type { ServerResponse } from "node:http";

export default async function handler(_req: unknown, res: ServerResponse): Promise<void> {
  res.setHeader("content-type", "application/json");

  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: "Supabase env vars missing" }));
    return;
  }

  try {
    const r = await fetch(`${url}/rest/v1/exercises?select=id&limit=1`, {
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}` },
    });
    res.statusCode = r.ok ? 200 : 502;
    res.end(JSON.stringify({ ok: r.ok, status: r.status, at: new Date().toISOString() }));
  } catch (err) {
    res.statusCode = 502;
    res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  }
}
