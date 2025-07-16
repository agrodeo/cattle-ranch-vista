export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          animal_id: string | null
          date: string | null
          description: string | null
          id: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          animal_id?: string | null
          date?: string | null
          description?: string | null
          id?: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          animal_id?: string | null
          date?: string | null
          description?: string | null
          id?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          birth_date: string | null
          breed: string | null
          cabaña_id: string | null
          circunferencia_escrotal: number | null
          color: string | null
          condicion_corporal: string | null
          corral_id: string | null
          dna_verified: boolean | null
          father_breed: string | null
          father_id: string | null
          father_name: string | null
          father_registration: string | null
          fecha_destete: string | null
          fecha_muerte: string | null
          fecha_servicio: string | null
          id: string
          id_tag: string | null
          mocho: string | null
          mother_breed: string | null
          mother_id: string | null
          mother_name: string | null
          mother_registration: string | null
          name: string | null
          observaciones: string | null
          peso_destete: number | null
          peso_destete_mejorado: number | null
          peso_final: number | null
          peso_final_mejorado: number | null
          peso_nacer: number | null
          peso_nacimiento: number | null
          registration_father_level: string | null
          registration_level: string | null
          registration_level_override: string | null
          registration_mother_level: string | null
          registration_override_reason: string | null
          resultado_preñez: string | null
          sex: string | null
          status: string | null
          tipo_parto: string | null
          tipo_servicio: string | null
          toro_servicio_id: string | null
        }
        Insert: {
          birth_date?: string | null
          breed?: string | null
          cabaña_id?: string | null
          circunferencia_escrotal?: number | null
          color?: string | null
          condicion_corporal?: string | null
          corral_id?: string | null
          dna_verified?: boolean | null
          father_breed?: string | null
          father_id?: string | null
          father_name?: string | null
          father_registration?: string | null
          fecha_destete?: string | null
          fecha_muerte?: string | null
          fecha_servicio?: string | null
          id?: string
          id_tag?: string | null
          mocho?: string | null
          mother_breed?: string | null
          mother_id?: string | null
          mother_name?: string | null
          mother_registration?: string | null
          name?: string | null
          observaciones?: string | null
          peso_destete?: number | null
          peso_destete_mejorado?: number | null
          peso_final?: number | null
          peso_final_mejorado?: number | null
          peso_nacer?: number | null
          peso_nacimiento?: number | null
          registration_father_level?: string | null
          registration_level?: string | null
          registration_level_override?: string | null
          registration_mother_level?: string | null
          registration_override_reason?: string | null
          resultado_preñez?: string | null
          sex?: string | null
          status?: string | null
          tipo_parto?: string | null
          tipo_servicio?: string | null
          toro_servicio_id?: string | null
        }
        Update: {
          birth_date?: string | null
          breed?: string | null
          cabaña_id?: string | null
          circunferencia_escrotal?: number | null
          color?: string | null
          condicion_corporal?: string | null
          corral_id?: string | null
          dna_verified?: boolean | null
          father_breed?: string | null
          father_id?: string | null
          father_name?: string | null
          father_registration?: string | null
          fecha_destete?: string | null
          fecha_muerte?: string | null
          fecha_servicio?: string | null
          id?: string
          id_tag?: string | null
          mocho?: string | null
          mother_breed?: string | null
          mother_id?: string | null
          mother_name?: string | null
          mother_registration?: string | null
          name?: string | null
          observaciones?: string | null
          peso_destete?: number | null
          peso_destete_mejorado?: number | null
          peso_final?: number | null
          peso_final_mejorado?: number | null
          peso_nacer?: number | null
          peso_nacimiento?: number | null
          registration_father_level?: string | null
          registration_level?: string | null
          registration_level_override?: string | null
          registration_mother_level?: string | null
          registration_override_reason?: string | null
          resultado_preñez?: string | null
          sex?: string | null
          status?: string | null
          tipo_parto?: string | null
          tipo_servicio?: string | null
          toro_servicio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animals_cabaña_id_fkey"
            columns: ["cabaña_id"]
            isOneToOne: false
            referencedRelation: "cabañas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_corral_id_fkey"
            columns: ["corral_id"]
            isOneToOne: false
            referencedRelation: "corrales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_toro_servicio"
            columns: ["toro_servicio_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      artificial_inseminations: {
        Row: {
          bull_id: string | null
          bull_name: string
          cabaña_id: string
          created_at: string
          created_by: string | null
          female_id: string
          id: string
          insemination_date: string
          is_pregnant: boolean | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          bull_id?: string | null
          bull_name: string
          cabaña_id: string
          created_at?: string
          created_by?: string | null
          female_id: string
          id?: string
          insemination_date: string
          is_pregnant?: boolean | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          bull_id?: string | null
          bull_name?: string
          cabaña_id?: string
          created_at?: string
          created_by?: string | null
          female_id?: string
          id?: string
          insemination_date?: string
          is_pregnant?: boolean | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artificial_inseminations_bull_id_fkey"
            columns: ["bull_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artificial_inseminations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artificial_inseminations_female_id_fkey"
            columns: ["female_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      bulls: {
        Row: {
          birth_weight: number | null
          breed: string | null
          cabaña_id: string | null
          coat_color: string | null
          color: string | null
          created_at: string
          created_by: string | null
          final_weight: number | null
          genetic_health_observations: string | null
          horn_status: string | null
          id: string
          insemination_center: string | null
          internal_code: string | null
          is_genotyped: boolean | null
          name: string
          nationality: string | null
          official_registration_number: string | null
          owner: string | null
          registration_level: string | null
          scrotal_circumference: number | null
          updated_at: string
          weaning_weight: number | null
        }
        Insert: {
          birth_weight?: number | null
          breed?: string | null
          cabaña_id?: string | null
          coat_color?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          final_weight?: number | null
          genetic_health_observations?: string | null
          horn_status?: string | null
          id?: string
          insemination_center?: string | null
          internal_code?: string | null
          is_genotyped?: boolean | null
          name: string
          nationality?: string | null
          official_registration_number?: string | null
          owner?: string | null
          registration_level?: string | null
          scrotal_circumference?: number | null
          updated_at?: string
          weaning_weight?: number | null
        }
        Update: {
          birth_weight?: number | null
          breed?: string | null
          cabaña_id?: string | null
          coat_color?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          final_weight?: number | null
          genetic_health_observations?: string | null
          horn_status?: string | null
          id?: string
          insemination_center?: string | null
          internal_code?: string | null
          is_genotyped?: boolean | null
          name?: string
          nationality?: string | null
          official_registration_number?: string | null
          owner?: string | null
          registration_level?: string | null
          scrotal_circumference?: number | null
          updated_at?: string
          weaning_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bulls_cabaña_id_fkey"
            columns: ["cabaña_id"]
            isOneToOne: false
            referencedRelation: "cabañas"
            referencedColumns: ["id"]
          },
        ]
      }
      cabañas: {
        Row: {
          id: string
          location: string | null
          name: string
        }
        Insert: {
          id?: string
          location?: string | null
          name: string
        }
        Update: {
          id?: string
          location?: string | null
          name?: string
        }
        Relationships: []
      }
      corrales: {
        Row: {
          cabaña_id: string | null
          created_at: string
          hectareas: number | null
          id: string
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cabaña_id?: string | null
          created_at?: string
          hectareas?: number | null
          id?: string
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cabaña_id?: string | null
          created_at?: string
          hectareas?: number | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corrales_cabaña_id_fkey"
            columns: ["cabaña_id"]
            isOneToOne: false
            referencedRelation: "cabañas"
            referencedColumns: ["id"]
          },
        ]
      }
      finances: {
        Row: {
          amount: number | null
          cabaña_id: string | null
          date: string | null
          description: string | null
          id: string
          type: string | null
        }
        Insert: {
          amount?: number | null
          cabaña_id?: string | null
          date?: string | null
          description?: string | null
          id?: string
          type?: string | null
        }
        Update: {
          amount?: number | null
          cabaña_id?: string | null
          date?: string | null
          description?: string | null
          id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finances_cabaña_id_fkey"
            columns: ["cabaña_id"]
            isOneToOne: false
            referencedRelation: "cabañas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reproductive_events: {
        Row: {
          animal_id: string
          cabaña_id: string
          calving_date: string | null
          created_at: string
          id: string
          linked_calf_id: string | null
          notes: string | null
          pregnancy_outcome: string | null
          pregnancy_status: string | null
          updated_at: string
          year: number
        }
        Insert: {
          animal_id: string
          cabaña_id: string
          calving_date?: string | null
          created_at?: string
          id?: string
          linked_calf_id?: string | null
          notes?: string | null
          pregnancy_outcome?: string | null
          pregnancy_status?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          animal_id?: string
          cabaña_id?: string
          calving_date?: string | null
          created_at?: string
          id?: string
          linked_calf_id?: string | null
          notes?: string | null
          pregnancy_outcome?: string | null
          pregnancy_status?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      services: {
        Row: {
          bull_id: string | null
          female_id: string | null
          id: string
          notes: string | null
          outcome: string | null
          service_date: string | null
        }
        Insert: {
          bull_id?: string | null
          female_id?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
          service_date?: string | null
        }
        Update: {
          bull_id?: string | null
          female_id?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
          service_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_bull_id_fkey"
            columns: ["bull_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_female_id_fkey"
            columns: ["female_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_passwords: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          password_text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          password_text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          password_text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          cabaña_id: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
        }
        Insert: {
          cabaña_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
        }
        Update: {
          cabaña_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_cabaña_id_fkey"
            columns: ["cabaña_id"]
            isOneToOne: false
            referencedRelation: "cabañas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_age_months: {
        Args: { birth_date: string }
        Returns: number
      }
      calculate_ai_success_rate: {
        Args: {
          filter_year?: number
          filter_corral_id?: string
          filter_bull_name?: string
          filter_cabaña_id?: string
        }
        Returns: {
          total_inseminations: number
          total_pregnancies: number
          success_rate: number
          pending_results: number
        }[]
      }
      calculate_reproductive_performance: {
        Args: { animal_uuid: string }
        Returns: {
          porcentaje_preñez: number
          porcentaje_paricion: number
          total_reproductive_years: number
          confirmed_pregnancies: number
          live_calves: number
        }[]
      }
      categorize_animal: {
        Args: { birth_date: string; sex: string; reference_date?: string }
        Returns: string
      }
      check_consanguinity: {
        Args: { animal_father_id: string; animal_mother_id: string }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employee" | "read_only"
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
      app_role: ["admin", "employee", "read_only"],
    },
  },
} as const
