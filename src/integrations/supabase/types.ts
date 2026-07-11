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
      activity_logs: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          entity_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      addresses: {
        Row: {
          city: string
          country: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          line1: string
          line2: string | null
          name: string
          phone: string | null
          postal_code: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          country: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          line1: string
          line2?: string | null
          name: string
          phone?: string | null
          postal_code: string
          state: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          line1?: string
          line2?: string | null
          name?: string
          phone?: string | null
          postal_code?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          position: number
          show_in_slider: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          position?: number
          show_in_slider?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          position?: number
          show_in_slider?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          position: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          phone: string | null
          topic: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          phone?: string | null
          topic: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          phone?: string | null
          topic?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order_subtotal: number | null
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_subtotal?: number | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_subtotal?: number | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          alt_cta_label: string | null
          alt_cta_link: string | null
          created_at: string
          cta_label: string | null
          cta_link: string | null
          id: string
          image_url: string
          is_active: boolean
          kicker: string | null
          mobile_image_url: string | null
          position: number
          stat_label: string | null
          stat_number: string | null
          subtitle: string | null
          title_line1: string | null
          title_line2: string | null
          updated_at: string
        }
        Insert: {
          alt_cta_label?: string | null
          alt_cta_link?: string | null
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          kicker?: string | null
          mobile_image_url?: string | null
          position?: number
          stat_label?: string | null
          stat_number?: string | null
          subtitle?: string | null
          title_line1?: string | null
          title_line2?: string | null
          updated_at?: string
        }
        Update: {
          alt_cta_label?: string | null
          alt_cta_link?: string | null
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          kicker?: string | null
          mobile_image_url?: string | null
          position?: number
          stat_label?: string | null
          stat_number?: string | null
          subtitle?: string | null
          title_line1?: string | null
          title_line2?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color: string | null
          created_at: string
          id: string
          image_snapshot: string | null
          line_total: number
          name_snapshot: string
          order_id: string
          product_id: string | null
          qty: number
          size: string | null
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          image_snapshot?: string | null
          line_total?: number
          name_snapshot: string
          order_id: string
          product_id?: string | null
          qty?: number
          size?: string | null
          unit_price?: number
          variant_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          image_snapshot?: string | null
          line_total?: number
          name_snapshot?: string
          order_id?: string
          product_id?: string | null
          qty?: number
          size?: string | null
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          courier_name: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          discount: number
          id: string
          notes: string | null
          number: string
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          payment_receipt_url: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipping: number
          shipping_address: Json | null
          shipping_status: Database["public"]["Enums"]["shipping_status"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax: number
          total: number
          tracking: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          courier_name?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          discount?: number
          id?: string
          notes?: string | null
          number?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          payment_receipt_url?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping?: number
          shipping_address?: Json | null
          shipping_status?: Database["public"]["Enums"]["shipping_status"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          total?: number
          tracking?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          courier_name?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          discount?: number
          id?: string
          notes?: string | null
          number?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          payment_receipt_url?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping?: number
          shipping_address?: Json | null
          shipping_status?: Database["public"]["Enums"]["shipping_status"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          total?: number
          tracking?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          payment_method: string
          raw_response: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          transaction_ref: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          payment_method: string
          raw_response?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_ref?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          payment_method?: string
          raw_response?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          position: number
          product_id: string
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id: string
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          author_name: string
          body: string | null
          created_at: string
          helmet_size: string | null
          helpful: number
          id: string
          product_id: string
          rating: number
          title: string | null
          updated_at: string
          user_id: string | null
          verified: boolean
        }
        Insert: {
          author_name: string
          body?: string | null
          created_at?: string
          helmet_size?: string | null
          helpful?: number
          id?: string
          product_id: string
          rating: number
          title?: string | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          author_name?: string
          body?: string | null
          created_at?: string
          helmet_size?: string | null
          helpful?: number
          id?: string
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          color: string | null
          color_hex: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          price_override: number | null
          product_id: string
          size: string | null
          sku: string | null
          stock: number
        }
        Insert: {
          barcode?: string | null
          color?: string | null
          color_hex?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price_override?: number | null
          product_id: string
          size?: string | null
          sku?: string | null
          stock?: number
        }
        Update: {
          barcode?: string | null
          color?: string | null
          color_hex?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price_override?: number | null
          product_id?: string
          size?: string | null
          sku?: string | null
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          badge: string | null
          brand_id: string | null
          category_id: string | null
          certifications: string[] | null
          compare_price: number | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          meta_description: string | null
          meta_title: string | null
          name: string
          price: number
          rating: number | null
          reviews_count: number | null
          sku: string | null
          slug: string
          specs: Json | null
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          updated_at: string
          weight: number | null
        }
        Insert: {
          badge?: string | null
          brand_id?: string | null
          category_id?: string | null
          certifications?: string[] | null
          compare_price?: number | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          name: string
          price?: number
          rating?: number | null
          reviews_count?: number | null
          sku?: string | null
          slug: string
          specs?: Json | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          updated_at?: string
          weight?: number | null
        }
        Update: {
          badge?: string | null
          brand_id?: string | null
          category_id?: string | null
          certifications?: string[] | null
          compare_price?: number | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          price?: number
          rating?: number | null
          reviews_count?: number | null
          sku?: string | null
          slug?: string
          specs?: Json | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      returns: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          reason: string | null
          refund_amount: number | null
          status: Database["public"]["Enums"]["return_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          reason?: string | null
          refund_amount?: number | null
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          reason?: string | null
          refund_amount?: number | null
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          bank_account_number: string | null
          bank_iban: string | null
          bank_name: string | null
          bank_title: string | null
          currency: string
          currency_symbol: string
          easypaisa_number: string | null
          easypaisa_title: string | null
          easypaisa_qr_url: string | null
          jazzcash_qr_url: string | null
          bank_qr_url: string | null
          easypaisa_logo_url: string | null
          jazzcash_logo_url: string | null
          bank_logo_url: string | null
          cod_logo_url: string | null
          email_from: string | null
          faqs: Json | null
          free_shipping_enabled: boolean
          free_shipping_threshold: number
          hero_headline: string | null
          hero_subline: string | null
          id: string
          jazzcash_number: string | null
          jazzcash_title: string | null
          logo_url: string | null
          map_iframe_url: string | null
          payment_modes_enabled: string[]
          promo_ticker: string[] | null
          shipping_flat: number
          shipping_rates_city: Json | null
          store_address: string | null
          store_email: string | null
          store_name: string
          store_phone: string | null
          tax_inclusive: boolean
          tax_rate: number
          theme: Json | null
          invoice_terms: string | null
          stamp_url: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          bank_title?: string | null
          currency?: string
          currency_symbol?: string
          easypaisa_number?: string | null
          easypaisa_title?: string | null
          easypaisa_qr_url?: string | null
          jazzcash_qr_url?: string | null
          bank_qr_url?: string | null
          easypaisa_logo_url?: string | null
          jazzcash_logo_url?: string | null
          bank_logo_url?: string | null
          cod_logo_url?: string | null
          email_from?: string | null
          faqs?: Json | null
          free_shipping_enabled?: boolean
          free_shipping_threshold?: number
          hero_headline?: string | null
          hero_subline?: string | null
          id?: string
          jazzcash_number?: string | null
          jazzcash_title?: string | null
          logo_url?: string | null
          map_iframe_url?: string | null
          payment_modes_enabled?: string[]
          promo_ticker?: string[] | null
          shipping_flat?: number
          shipping_rates_city?: Json | null
          store_address?: string | null
          store_email?: string | null
          store_name?: string
          store_phone?: string | null
          tax_inclusive?: boolean
          tax_rate?: number
          theme?: Json | null
          invoice_terms?: string | null
          stamp_url?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          bank_title?: string | null
          currency?: string
          currency_symbol?: string
          easypaisa_number?: string | null
          easypaisa_title?: string | null
          easypaisa_qr_url?: string | null
          jazzcash_qr_url?: string | null
          bank_qr_url?: string | null
          easypaisa_logo_url?: string | null
          jazzcash_logo_url?: string | null
          bank_logo_url?: string | null
          cod_logo_url?: string | null
          email_from?: string | null
          faqs?: Json | null
          free_shipping_enabled?: boolean
          free_shipping_threshold?: number
          hero_headline?: string | null
          hero_subline?: string | null
          id?: string
          jazzcash_number?: string | null
          jazzcash_title?: string | null
          logo_url?: string | null
          map_iframe_url?: string | null
          payment_modes_enabled?: string[]
          promo_ticker?: string[] | null
          shipping_flat?: number
          shipping_rates_city?: Json | null
          store_address?: string | null
          store_email?: string | null
          store_name?: string
          store_phone?: string | null
          tax_inclusive?: boolean
          tax_rate?: number
          theme?: Json | null
          invoice_terms?: string | null
          stamp_url?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_variant_stock: {
        Args: { qty_to_dec: number; var_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_usage: {
        Args: { coupon_id: string }
        Returns: undefined
      }
      sync_product_stock: { Args: { prod_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "staff" | "customer"
      order_status:
        | "pending"
        | "processing"
        | "packed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "returned"
      payment_mode:
        | "card"
        | "cod"
        | "easypaisa"
        | "jazzcash"
        | "nayapay"
        | "bank"
      payment_status: "pending" | "paid" | "refunded" | "failed"
      product_status: "draft" | "active" | "archived"
      return_status:
        | "requested"
        | "approved"
        | "received"
        | "refunded"
        | "rejected"
      shipping_status: "pending" | "label_created" | "in_transit" | "delivered"
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
      app_role: ["admin", "staff", "customer"],
      order_status: [
        "pending",
        "processing",
        "packed",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
      payment_mode: ["card", "cod", "easypaisa", "jazzcash", "nayapay", "bank"],
      payment_status: ["pending", "paid", "refunded", "failed"],
      product_status: ["draft", "active", "archived"],
      return_status: [
        "requested",
        "approved",
        "received",
        "refunded",
        "rejected",
      ],
      shipping_status: ["pending", "label_created", "in_transit", "delivered"],
    },
  },
} as const
