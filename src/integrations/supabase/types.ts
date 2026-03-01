export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      exercises: {
        Row: {
          created_at: string
          created_by: string | null
          equipment: string
          id: string
          is_approved: boolean
          is_unilateral: boolean
          movement_pattern: string
          muscle_group: string
          name: string
          source: string
          sub_muscle: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          equipment: string
          id?: string
          is_approved?: boolean
          is_unilateral?: boolean
          movement_pattern: string
          muscle_group: string
          name: string
          source?: string
          sub_muscle: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          equipment?: string
          id?: string
          is_approved?: boolean
          is_unilateral?: boolean
          movement_pattern?: string
          muscle_group?: string
          name?: string
          source?: string
          sub_muscle?: string
        }
        Relationships: []
      }
      nutrition_daily: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string | null
          date: string
          fat_g: number | null
          id: string
          last_synced_at: string | null
          protein_g: number | null
          source: string
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          date: string
          fat_g?: number | null
          id?: string
          last_synced_at?: string | null
          protein_g?: number | null
          source?: string
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          date?: string
          fat_g?: number | null
          id?: string
          last_synced_at?: string | null
          protein_g?: number | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      phase_day_exercises: {
        Row: {
          exercise_id: string
          id: string
          max_reps: number
          min_reps: number
          notes: string | null
          num_sets: number
          order_index: number
          phase_day_id: string
          rest_seconds: number | null
        }
        Insert: {
          exercise_id: string
          id?: string
          max_reps?: number
          min_reps?: number
          notes?: string | null
          num_sets?: number
          order_index?: number
          phase_day_id: string
          rest_seconds?: number | null
        }
        Update: {
          exercise_id?: string
          id?: string
          max_reps?: number
          min_reps?: number
          notes?: string | null
          num_sets?: number
          order_index?: number
          phase_day_id?: string
          rest_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "phase_day_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase_day_exercises_phase_day_id_fkey"
            columns: ["phase_day_id"]
            isOneToOne: false
            referencedRelation: "phase_days"
            referencedColumns: ["id"]
          },
        ]
      }
      phase_day_overrides: {
        Row: {
          created_at: string | null
          id: string
          original_day_of_week: number
          overridden_day_of_week: number
          phase_id: string
          user_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          original_day_of_week: number
          overridden_day_of_week: number
          phase_id: string
          user_id: string
          week_start_date: string
        }
        Update: {
          created_at?: string | null
          id?: string
          original_day_of_week?: number
          overridden_day_of_week?: number
          phase_id?: string
          user_id?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "phase_day_overrides_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      phase_days: {
        Row: {
          day_of_week: number
          day_type: string
          id: string
          phase_id: string
          workout_name: string | null
        }
        Insert: {
          day_of_week: number
          day_type?: string
          id?: string
          phase_id: string
          workout_name?: string | null
        }
        Update: {
          day_of_week?: number
          day_type?: string
          id?: string
          phase_id?: string
          workout_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phase_days_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      phases: {
        Row: {
          created_at: string
          id: string
          length_weeks: number
          name: string
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          length_weeks?: number
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          length_weeks?: number
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_rest_seconds: number
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_rest_seconds?: number
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_rest_seconds?: number
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_exercise_swaps: {
        Row: {
          id: string
          original_exercise_id: string
          replacement_exercise_id: string
          workout_session_id: string
        }
        Insert: {
          id?: string
          original_exercise_id: string
          replacement_exercise_id: string
          workout_session_id: string
        }
        Update: {
          id?: string
          original_exercise_id?: string
          replacement_exercise_id?: string
          workout_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercise_swaps_original_exercise_id_fkey"
            columns: ["original_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercise_swaps_replacement_exercise_id_fkey"
            columns: ["replacement_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercise_swaps_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_sets: {
        Row: {
          completed_at: string | null
          exercise_id: string
          exercise_name_snapshot: string
          id: string
          reps: number | null
          set_number: number
          weight: number | null
          workout_session_id: string
        }
        Insert: {
          completed_at?: string | null
          exercise_id: string
          exercise_name_snapshot: string
          id?: string
          reps?: number | null
          set_number: number
          weight?: number | null
          workout_session_id: string
        }
        Update: {
          completed_at?: string | null
          exercise_id?: string
          exercise_name_snapshot?: string
          id?: string
          reps?: number | null
          set_number?: number
          weight?: number | null
          workout_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_sets_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          date: string
          id: string
          is_schedule_override: boolean
          phase_day_id: string | null
          phase_id: string | null
          scheduled_day_type: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          date?: string
          id?: string
          is_schedule_override?: boolean
          phase_day_id?: string | null
          phase_id?: string | null
          scheduled_day_type?: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          date?: string
          id?: string
          is_schedule_override?: boolean
          phase_day_id?: string | null
          phase_id?: string | null
          scheduled_day_type?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_phase_day_id_fkey"
            columns: ["phase_day_id"]
            isOneToOne: false
            referencedRelation: "phase_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_phase_day_owner: { Args: { _phase_day_id: string }; Returns: boolean }
      is_phase_owner: { Args: { _phase_id: string }; Returns: boolean }
      is_session_owner: { Args: { _session_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
