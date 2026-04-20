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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      benchmarks_materialised: {
        Row: {
          id: string
          level: Database["public"]["Enums"]["assessment_level"]
          median_score: number | null
          pillar_medians: Json | null
          refreshed_at: string
          sample_size: number
          sector: string | null
          size_band: string | null
        }
        Insert: {
          id?: string
          level: Database["public"]["Enums"]["assessment_level"]
          median_score?: number | null
          pillar_medians?: Json | null
          refreshed_at?: string
          sample_size?: number
          sector?: string | null
          size_band?: string | null
        }
        Update: {
          id?: string
          level?: Database["public"]["Enums"]["assessment_level"]
          median_score?: number | null
          pillar_medians?: Json | null
          refreshed_at?: string
          sample_size?: number
          sector?: string | null
          size_band?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          id: string
          name: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      outcomes_library: {
        Row: {
          active: boolean
          applies_to_tier: number
          body: string
          created_at: string
          effort: number | null
          id: string
          impact: number | null
          pillar: number
          time_to_value: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          applies_to_tier: number
          body: string
          created_at?: string
          effort?: number | null
          id?: string
          impact?: number | null
          pillar: number
          time_to_value?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          applies_to_tier?: number
          body?: string
          created_at?: string
          effort?: number | null
          id?: string
          impact?: number | null
          pillar?: number
          time_to_value?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_options: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          label: string
          question_id: string
          tier: number
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          label: string
          question_id: string
          tier: number
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          label?: string
          question_id?: string
          tier?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          active: boolean
          created_at: string
          id: string
          level: Database["public"]["Enums"]["assessment_level"]
          pillar: number
          position: number
          prompt: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id: string
          level: Database["public"]["Enums"]["assessment_level"]
          pillar: number
          position: number
          prompt: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["assessment_level"]
          pillar?: number
          position?: number
          prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          aioi_score: number | null
          claude_payload: Json | null
          created_at: string
          diagnosis: string | null
          generated_at: string | null
          hotspots: Json | null
          id: string
          overall_tier: Database["public"]["Enums"]["maturity_tier"] | null
          pdf_path: string | null
          pillar_tiers: Json | null
          plan: Json | null
          respondent_id: string
          updated_at: string
        }
        Insert: {
          aioi_score?: number | null
          claude_payload?: Json | null
          created_at?: string
          diagnosis?: string | null
          generated_at?: string | null
          hotspots?: Json | null
          id?: string
          overall_tier?: Database["public"]["Enums"]["maturity_tier"] | null
          pdf_path?: string | null
          pillar_tiers?: Json | null
          plan?: Json | null
          respondent_id: string
          updated_at?: string
        }
        Update: {
          aioi_score?: number | null
          claude_payload?: Json | null
          created_at?: string
          diagnosis?: string | null
          generated_at?: string | null
          hotspots?: Json | null
          id?: string
          overall_tier?: Database["public"]["Enums"]["maturity_tier"] | null
          pdf_path?: string | null
          pillar_tiers?: Json | null
          plan?: Json | null
          respondent_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: true
            referencedRelation: "respondents"
            referencedColumns: ["id"]
          },
        ]
      }
      respondents: {
        Row: {
          consent_benchmark: boolean
          consent_marketing: boolean
          created_at: string
          id: string
          level: Database["public"]["Enums"]["assessment_level"]
          org_size: string | null
          pain: string | null
          role: string | null
          sector: string | null
          slug: string
          started_at: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_benchmark?: boolean
          consent_marketing?: boolean
          created_at?: string
          id?: string
          level: Database["public"]["Enums"]["assessment_level"]
          org_size?: string | null
          pain?: string | null
          role?: string | null
          sector?: string | null
          slug?: string
          started_at?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_benchmark?: boolean
          consent_marketing?: boolean
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["assessment_level"]
          org_size?: string | null
          pain?: string | null
          role?: string | null
          sector?: string | null
          slug?: string
          started_at?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      responses: {
        Row: {
          created_at: string
          id: string
          question_id: string
          respondent_id: string
          tier: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          respondent_id: string
          tier: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          respondent_id?: string
          tier?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "respondents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gen_slug: { Args: never; Returns: string }
      is_my_respondent: { Args: { _respondent_id: string }; Returns: boolean }
      normalize_size_band: { Args: { _org_size: string }; Returns: string }
      recompute_benchmarks: { Args: { _min_sample?: number }; Returns: number }
    }
    Enums: {
      assessment_level: "company" | "function" | "individual"
      maturity_tier:
        | "Dormant"
        | "Reactive"
        | "Exploratory"
        | "Operational"
        | "Integrated"
        | "AI-Native"
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
    Enums: {
      assessment_level: ["company", "function", "individual"],
      maturity_tier: [
        "Dormant",
        "Reactive",
        "Exploratory",
        "Operational",
        "Integrated",
        "AI-Native",
      ],
    },
  },
} as const
