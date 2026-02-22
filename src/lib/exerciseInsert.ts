import { supabase } from "@/integrations/supabase/client";

interface AIExerciseInput {
  name: string;
  muscle_group: "Upper" | "Lower" | "Core" | "Full Body";
  sub_muscle: string;
  equipment: string;
  movement_pattern: "Push" | "Pull" | "Squat" | "Hinge" | "Lunge" | "Carry" | "Core";
  is_unilateral: boolean;
}

/**
 * Insert an AI-generated exercise as unapproved.
 * Returns the new exercise id on success, null on failure.
 */
export async function insertAIExercise(input: AIExerciseInput): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("exercises")
      .insert({
        name: input.name,
        muscle_group: input.muscle_group,
        sub_muscle: input.sub_muscle,
        equipment: input.equipment,
        movement_pattern: input.movement_pattern,
        is_unilateral: input.is_unilateral,
        source: "ai_generated",
        is_approved: false,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !data) return null;
    return data.id;
  } catch {
    return null;
  }
}
