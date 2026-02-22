import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a fitness planning assistant for a structured strength training app. 
Generate a weekly training plan for a new phase. 
Return only valid JSON. No explanation, no markdown, no code fences. 
Raw JSON only.`;

const JSON_STRUCTURE = `{
  "planName": string,
  "days": [
    {
      "dayOfWeek": number (1=Mon through 7=Sun),
      "dayType": "strength" or "rest" or "cardio",
      "workoutName": string or null,
      "exercises": [
        {
          "name": string,
          "muscleGroup": "Upper" or "Lower" or "Core" or "Full Body",
          "subMuscle": string,
          "equipment": "Barbell" or "Dumbbell" or "Cable" or "Machine" or "Bodyweight" or "Band" or "Smith" or "Landmine" or "Kettlebell" or "Other",
          "movementPattern": "Push" or "Pull" or "Squat" or "Hinge" or "Lunge" or "Carry" or "Core",
          "isUnilateral": boolean,
          "sets": number,
          "minReps": number,
          "maxReps": number
        }
      ]
    }
  ]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lengthWeeks, isReturningUser, lastTwoPhases, recentSessions, phaseName } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let userPrompt: string;
    const phaseNameLine = phaseName ? `Phase name: ${phaseName}\n` : "";

    if (!isReturningUser) {
      userPrompt = `Create a beginner-friendly training phase for someone just starting out.
${phaseNameLine}Phase length: ${lengthWeeks} weeks.
Use exactly 3 strength days and 4 rest days per week.
Focus on a balanced upper/lower split.

Return this exact JSON structure:
${JSON_STRUCTURE}`;
    } else {
      userPrompt = `Analyse this user's training history and generate a progressive next phase.
${phaseNameLine}Phase length: ${lengthWeeks} weeks.

Previous phases:
${JSON.stringify(lastTwoPhases)}

Recent session data:
${JSON.stringify(recentSessions)}

Rules:
- Progress volume modestly from the last phase (add 1-2 sets per muscle group where appropriate)
- Maintain a similar weekly structure to what the user has been doing
- Rotate exercise variations where beneficial for hypertrophy
- Keep the same number of strength days as the previous phase
- Use the phase name as inspiration for the training focus if relevant

Return this exact JSON structure:
${JSON_STRUCTURE}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to parse the JSON content - strip markdown fences if present
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const plan = JSON.parse(cleaned);

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
