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
          function: string | null
          id: string
          level: Database["public"]["Enums"]["assessment_level"]
          median_score: number | null
          pillar_medians: Json | null
          refreshed_at: string
          region: string | null
          sample_size: number
          sector: string | null
          size_band: string | null
        }
        Insert: {
          function?: string | null
          id?: string
          level: Database["public"]["Enums"]["assessment_level"]
          median_score?: number | null
          pillar_medians?: Json | null
          refreshed_at?: string
          region?: string | null
          sample_size?: number
          sector?: string | null
          size_band?: string | null
        }
        Update: {
          function?: string | null
          id?: string
          level?: Database["public"]["Enums"]["assessment_level"]
          median_score?: number | null
          pillar_medians?: Json | null
          refreshed_at?: string
          region?: string | null
          sample_size?: number
          sector?: string | null
          size_band?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
          cta_type: string | null
          cta_url: string | null
          effort: number | null
          function: string | null
          how_to_know: string | null
          id: string
          impact: number | null
          last_reviewed_at: string | null
          lens: string
          notes: string | null
          pillar: number
          size_bands: string[] | null
          tags: string[] | null
          tier_band: string | null
          time_to_value: string | null
          title: string
          updated_at: string
          what_to_do: string | null
          why_matters: string | null
        }
        Insert: {
          active?: boolean
          applies_to_tier: number
          body: string
          created_at?: string
          cta_type?: string | null
          cta_url?: string | null
          effort?: number | null
          function?: string | null
          how_to_know?: string | null
          id?: string
          impact?: number | null
          last_reviewed_at?: string | null
          lens?: string
          notes?: string | null
          pillar: number
          size_bands?: string[] | null
          tags?: string[] | null
          tier_band?: string | null
          time_to_value?: string | null
          title: string
          updated_at?: string
          what_to_do?: string | null
          why_matters?: string | null
        }
        Update: {
          active?: boolean
          applies_to_tier?: number
          body?: string
          created_at?: string
          cta_type?: string | null
          cta_url?: string | null
          effort?: number | null
          function?: string | null
          how_to_know?: string | null
          id?: string
          impact?: number | null
          last_reviewed_at?: string | null
          lens?: string
          notes?: string | null
          pillar?: number
          size_bands?: string[] | null
          tags?: string[] | null
          tier_band?: string | null
          time_to_value?: string | null
          title?: string
          updated_at?: string
          what_to_do?: string | null
          why_matters?: string | null
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
      question_variants: {
        Row: {
          created_at: string
          function: string
          id: string
          options: Json
          prompt: string
          question_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          function: string
          id?: string
          options: Json
          prompt: string
          question_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          function?: string
          id?: string
          options?: Json
          prompt?: string
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_variants_question_id_fkey"
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
          detail: Json
          id: string
          level: Database["public"]["Enums"]["assessment_level"]
          pillar: number
          position: number
          prompt: string
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          detail?: Json
          id: string
          level: Database["public"]["Enums"]["assessment_level"]
          pillar: number
          position: number
          prompt: string
          status?: string
          updated_at?: string
          version?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          detail?: Json
          id?: string
          level?: Database["public"]["Enums"]["assessment_level"]
          pillar?: number
          position?: number
          prompt?: string
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          aioi_score: number | null
          benchmark_excluded: boolean
          cap_flags: Json
          claude_payload: Json | null
          created_at: string
          diagnosis: string | null
          generated_at: string | null
          hotspots: Json | null
          id: string
          move_ids: string[] | null
          overall_tier: Database["public"]["Enums"]["maturity_tier"] | null
          pillar_tiers: Json | null
          plan: Json | null
          recommendations: Json | null
          recommendations_generated_at: string | null
          respondent_id: string
          score_audit: Json
          updated_at: string
        }
        Insert: {
          aioi_score?: number | null
          benchmark_excluded?: boolean
          cap_flags?: Json
          claude_payload?: Json | null
          created_at?: string
          diagnosis?: string | null
          generated_at?: string | null
          hotspots?: Json | null
          id?: string
          move_ids?: string[] | null
          overall_tier?: Database["public"]["Enums"]["maturity_tier"] | null
          pillar_tiers?: Json | null
          plan?: Json | null
          recommendations?: Json | null
          recommendations_generated_at?: string | null
          respondent_id: string
          score_audit?: Json
          updated_at?: string
        }
        Update: {
          aioi_score?: number | null
          benchmark_excluded?: boolean
          cap_flags?: Json
          claude_payload?: Json | null
          created_at?: string
          diagnosis?: string | null
          generated_at?: string | null
          hotspots?: Json | null
          id?: string
          move_ids?: string[] | null
          overall_tier?: Database["public"]["Enums"]["maturity_tier"] | null
          pillar_tiers?: Json | null
          plan?: Json | null
          recommendations?: Json | null
          recommendations_generated_at?: string | null
          respondent_id?: string
          score_audit?: Json
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
          function: string | null
          id: string
          legacy_size_band: string | null
          level: Database["public"]["Enums"]["assessment_level"]
          org_size: string | null
          pain: string | null
          region: string | null
          role: string | null
          sector: string | null
          slug: string
          started_at: string
          submitted_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          consent_benchmark?: boolean
          consent_marketing?: boolean
          created_at?: string
          function?: string | null
          id?: string
          legacy_size_band?: string | null
          level: Database["public"]["Enums"]["assessment_level"]
          org_size?: string | null
          pain?: string | null
          region?: string | null
          role?: string | null
          sector?: string | null
          slug?: string
          started_at?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          consent_benchmark?: boolean
          consent_marketing?: boolean
          created_at?: string
          function?: string | null
          id?: string
          legacy_size_band?: string | null
          level?: Database["public"]["Enums"]["assessment_level"]
          org_size?: string | null
          pain?: string | null
          region?: string | null
          role?: string | null
          sector?: string | null
          slug?: string
          started_at?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string | null
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_report_by_slug: {
        Args: { _consent_marketing?: boolean; _slug: string }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      gen_slug: { Args: never; Returns: string }
      get_assessment_count: { Args: never; Returns: number }
      get_auth_email_state: { Args: { _email: string }; Returns: Json }
      get_outcomes_for_report: {
        Args: { _slug: string }
        Returns: {
          active: boolean
          applies_to_tier: number
          body: string
          created_at: string
          cta_type: string | null
          cta_url: string | null
          effort: number | null
          function: string | null
          how_to_know: string | null
          id: string
          impact: number | null
          last_reviewed_at: string | null
          lens: string
          notes: string | null
          pillar: number
          size_bands: string[] | null
          tags: string[] | null
          tier_band: string | null
          time_to_value: string | null
          title: string
          updated_at: string
          what_to_do: string | null
          why_matters: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "outcomes_library"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_report_by_slug: { Args: { _slug: string }; Returns: Json }
      is_my_respondent: { Args: { _respondent_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalize_size_band: { Args: { _org_size: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recompute_benchmarks: { Args: { _min_sample?: number }; Returns: number }
    }
    Enums: {
      assessment_level: "company" | "function" | "individual"
      maturity_tier:
        | "Dormant"
        | "Exploring"
        | "Deployed"
        | "Integrated"
        | "Leveraged"
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
        "Exploring",
        "Deployed",
        "Integrated",
        "Leveraged",
        "AI-Native",
      ],
    },
  },
} as const
