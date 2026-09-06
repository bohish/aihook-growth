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
      account_snapshots: {
        Row: {
          account_id: string | null
          captured_at: string
          id: string
          is_demo: boolean
          metrics: Json
          score: number
          subscores: Json
          user_id: string
        }
        Insert: {
          account_id?: string | null
          captured_at?: string
          id?: string
          is_demo?: boolean
          metrics?: Json
          score?: number
          subscores?: Json
          user_id: string
        }
        Update: {
          account_id?: string | null
          captured_at?: string
          id?: string
          is_demo?: boolean
          metrics?: Json
          score?: number
          subscores?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "tiktok_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_reports: {
        Row: {
          content_dna: Json
          created_at: string
          id: string
          is_demo: boolean
          model: string | null
          payload: Json
          score: number
          score_delta: number | null
          snapshot_id: string | null
          subscores: Json
          summary: string | null
          user_id: string
        }
        Insert: {
          content_dna?: Json
          created_at?: string
          id?: string
          is_demo?: boolean
          model?: string | null
          payload?: Json
          score?: number
          score_delta?: number | null
          snapshot_id?: string | null
          subscores?: Json
          summary?: string | null
          user_id: string
        }
        Update: {
          content_dna?: Json
          created_at?: string
          id?: string
          is_demo?: boolean
          model?: string | null
          payload?: Json
          score?: number
          score_delta?: number | null
          snapshot_id?: string | null
          subscores?: Json
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_reports_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "account_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      content_features: {
        Row: {
          created_at: string
          duration_bucket: string | null
          has_offer: boolean | null
          has_person_on_camera: boolean | null
          hook_type: string | null
          id: string
          tags: string[]
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          duration_bucket?: string | null
          has_offer?: boolean | null
          has_person_on_camera?: boolean | null
          hook_type?: string | null
          id?: string
          tags?: string[]
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          duration_bucket?: string | null
          has_offer?: boolean | null
          has_person_on_camera?: boolean | null
          hook_type?: string | null
          id?: string
          tags?: string[]
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_features_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "tiktok_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      hook_analyses: {
        Row: {
          account_id: string | null
          analyzed_at: string | null
          confidence: number | null
          created_at: string
          error_message: string | null
          hook_summary: string | null
          hook_type: string | null
          id: string
          onscreen_text: string | null
          share_url: string | null
          spoken_text: string | null
          status: string
          updated_at: string
          user_id: string
          video_id: string
          visual_description: string | null
        }
        Insert: {
          account_id?: string | null
          analyzed_at?: string | null
          confidence?: number | null
          created_at?: string
          error_message?: string | null
          hook_summary?: string | null
          hook_type?: string | null
          id?: string
          onscreen_text?: string | null
          share_url?: string | null
          spoken_text?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_id: string
          visual_description?: string | null
        }
        Update: {
          account_id?: string | null
          analyzed_at?: string | null
          confidence?: number | null
          created_at?: string
          error_message?: string | null
          hook_summary?: string | null
          hook_type?: string | null
          id?: string
          onscreen_text?: string | null
          share_url?: string | null
          spoken_text?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_id?: string
          visual_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hook_analyses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "tiktok_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          locale: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          updated_at?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          action: string | null
          confidence: string
          created_at: string
          evidence: string | null
          id: string
          impact: string
          priority: number
          report_id: string
          target_metric: string | null
          title: string
          user_id: string
        }
        Insert: {
          action?: string | null
          confidence?: string
          created_at?: string
          evidence?: string | null
          id?: string
          impact?: string
          priority?: number
          report_id: string
          target_metric?: string | null
          title: string
          user_id: string
        }
        Update: {
          action?: string | null
          confidence?: string
          created_at?: string
          evidence?: string | null
          id?: string
          impact?: string
          priority?: number
          report_id?: string
          target_metric?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "ai_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_accounts: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          follower_count: number
          following_count: number
          id: string
          is_demo: boolean
          likes_count: number
          updated_at: string
          user_id: string
          username: string
          video_count: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          follower_count?: number
          following_count?: number
          id?: string
          is_demo?: boolean
          likes_count?: number
          updated_at?: string
          user_id: string
          username: string
          video_count?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          follower_count?: number
          following_count?: number
          id?: string
          is_demo?: boolean
          likes_count?: number
          updated_at?: string
          user_id?: string
          username?: string
          video_count?: number
        }
        Relationships: []
      }
      tiktok_connections: {
        Row: {
          access_token_encrypted: string | null
          connected_at: string | null
          created_at: string
          error_message: string | null
          id: string
          is_demo: boolean
          open_id: string | null
          refresh_token_encrypted: string | null
          scopes: string[]
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          connected_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_demo?: boolean
          open_id?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[]
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          connected_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_demo?: boolean
          open_id?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[]
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tiktok_videos: {
        Row: {
          account_id: string | null
          caption: string | null
          created_at: string
          duration_seconds: number | null
          external_id: string
          id: string
          is_demo: boolean
          published_at: string | null
          share_url: string | null
          thumbnail_url: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          external_id: string
          id?: string
          is_demo?: boolean
          published_at?: string | null
          share_url?: string | null
          thumbnail_url?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          external_id?: string
          id?: string
          is_demo?: boolean
          published_at?: string | null
          share_url?: string | null
          thumbnail_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_videos_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "tiktok_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      video_metrics: {
        Row: {
          captured_at: string
          comments: number
          engagement_rate: number
          id: string
          likes: number
          shares: number
          user_id: string
          video_id: string
          views: number
        }
        Insert: {
          captured_at?: string
          comments?: number
          engagement_rate?: number
          id?: string
          likes?: number
          shares?: number
          user_id: string
          video_id: string
          views?: number
        }
        Update: {
          captured_at?: string
          comments?: number
          engagement_rate?: number
          id?: string
          likes?: number
          shares?: number
          user_id?: string
          video_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_metrics_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "tiktok_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_plans: {
        Row: {
          created_at: string
          days: Json
          id: string
          report_id: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          days?: Json
          id?: string
          report_id: string
          user_id: string
          week_start?: string
        }
        Update: {
          created_at?: string
          days?: Json
          id?: string
          report_id?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plans_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "ai_reports"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
