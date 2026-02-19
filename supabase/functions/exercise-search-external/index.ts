import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  // ---- CORS headers ----
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };

  // ---- Handle preflight ----
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `https://edb-with-videos-and-images-by-ascendapi.p.rapidapi.com/api/v1/exercises/search?name=${encodeURIComponent(query)}`,
      {
        headers: {
          "X-RapidAPI-Key": Deno.env.get("RAPIDAPI_KEY")!,
          "X-RapidAPI-Host": Deno.env.get("RAPIDAPI_HOST")!,
        },
      }
    );

    const data = await response.json();

    return new Response(
      JSON.stringify({ results: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (_error) {
    return new Response(
      JSON.stringify({ error: "Search failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
