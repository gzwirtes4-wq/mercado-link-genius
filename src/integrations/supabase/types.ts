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
      affiliate_links: {
        Row: {
          clicks: number
          created_at: string
          id: string
          product_id: string
          short_code: string | null
          url: string
          user_id: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          id?: string
          product_id: string
          short_code?: string | null
          url: string
          user_id: string
        }
        Update: {
          clicks?: number
          created_at?: string
          id?: string
          product_id?: string
          short_code?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          available_at: string | null
          created_at: string
          id: string
          order_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          available_at?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          available_at?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          account_identifier: string | null
          connected_at: string | null
          created_at: string
          id: string
          last_error: string | null
          ml_user_id: string | null
          nickname: string | null
          provider: string
          scope: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_identifier?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          ml_user_id?: string | null
          nickname?: string | null
          provider?: string
          scope?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_identifier?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          ml_user_id?: string | null
          nickname?: string | null
          provider?: string
          scope?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meli_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          buyer_reference: string | null
          created_at: string
          external_order_id: string | null
          id: string
          ordered_at: string
          product_title: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          buyer_reference?: string | null
          created_at?: string
          external_order_id?: string | null
          id?: string
          ordered_at?: string
          product_title?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          buyer_reference?: string | null
          created_at?: string
          external_order_id?: string | null
          id?: string
          ordered_at?: string
          product_title?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json
          highlight: boolean
          id: string
          name: string
          price_cents: number
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json
          highlight?: boolean
          id?: string
          name: string
          price_cents?: number
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json
          highlight?: boolean
          id?: string
          name?: string
          price_cents?: number
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          external_id: string | null
          free_shipping: boolean
          id: string
          image_url: string | null
          is_new: boolean
          original_price: number | null
          permalink: string | null
          price: number
          rating: number
          reviews_count: number
          sold_quantity: number
          source: string
          title: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          external_id?: string | null
          free_shipping?: boolean
          id?: string
          image_url?: string | null
          is_new?: boolean
          original_price?: number | null
          permalink?: string | null
          price?: number
          rating?: number
          reviews_count?: number
          sold_quantity?: number
          source?: string
          title: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          external_id?: string | null
          free_shipping?: boolean
          id?: string
          image_url?: string | null
          is_new?: boolean
          original_price?: number | null
          permalink?: string | null
          price?: number
          rating?: number
          reviews_count?: number
          sold_quantity?: number
          source?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          id: string
          message: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_products: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "admin"
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
    Enums: {
      app_role: ["user", "admin"],
    },
  },
} as const
