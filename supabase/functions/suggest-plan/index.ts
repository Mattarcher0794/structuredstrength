import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a fitness planning assistant for a structured strength training app.
Generate a weekly training plan for a new phase.`;

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    planName: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dayOfWeek: { type: "integer", enum: [1, 2, 3, 4, 5, 6, 7] },
          dayType: { type: "string", enum: ["strength", "rest", "cardio"] },
          workoutName: { type: ["string", "null"] },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                muscleGroup: { type: "string", enum: ["Upper", "Lower", "Core", "Full Body"] },
                subMuscle: { type: "string" },
                equipment: {
                  type: "string",
                  enum: ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Band", "Smith", "Landmine", "Kettlebell", "Other"],
                },
                movementPattern: {
                  type: "string",
                  enum: ["Push", "Pull", "Squat", "Hinge", "Lunge", "Carry", "Core"],
                },
                isUnilateral: { type: "boolean" },
                sets: { type: "integer" },
                minReps: { type: "integer" },
                maxReps: { type: "integer" },
              },
              required: ["name", "muscleGroup", "subMuscle", "equipment", "movementPattern", "isUnilateral", "sets", "minReps", "maxReps"],
              additionalProperties: false,
            },
          },
        },
        required: ["dayOfWeek", "dayType", "workoutName", "exercises"],
        additionalProperties: false,
      },
    },
  },
  required: ["planName", "days"],
  additionalProperties: false,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lengthWeeks, isReturningUser, lastTwoPhases, recentSessions, phaseName } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    let userPrompt: string;
    const phaseNameLine = phaseName ? `Phase name: ${phaseName}\n` : "";

    if (!isReturningUser) {
      userPrompt = `Create a beginner-friendly training phase for someone just starting out.
${phaseNameLine}Phase length: ${lengthWeeks} weeks.
Use exactly 3 strength days and 4 rest days per week.
Focus on a balanced upper/lower split.`;
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
- Use the phase name as inspiration for the training focus if relevant`;
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: PLAN_SCHEMA } },
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || response.stop_reason === "refusal") {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = JSON.parse(textBlock.text);

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("suggest-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
