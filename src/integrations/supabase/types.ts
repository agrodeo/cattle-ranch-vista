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
      password_reset_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_user_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      sistema_credenciales: {
        Row: {
          created_at: string
          email: string
          id: string
          password_hash: string
          sistema_nombre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          password_hash: string
          sistema_nombre?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          password_hash?: string
          sistema_nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cabaña_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_trial_active: boolean | null
          max_animals: number
          max_users: number
          plan: Database["public"]["Enums"]["subscription_plan"]
          subscription_end_date: string | null
          subscription_start_date: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string | null
        }
        Insert: {
          cabaña_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_trial_active?: boolean | null
          max_animals?: number
          max_users?: number
          plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          cabaña_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_trial_active?: boolean | null
          max_animals?: number
          max_users?: number
          plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_cabaña_id_fkey"
            columns: ["cabaña_id"]
            isOneToOne: true
            referencedRelation: "cabañas"
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
        Relationships: [
          {
            foreignKeyName: "user_passwords_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_passwords_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          cabaña_id: string | null
          created_at: string | null
          department: string | null
          email: string | null
          employee_code: string | null
          full_name: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          is_internal_profile: boolean | null
          last_login: string | null
          position: string | null
        }
        Insert: {
          cabaña_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          employee_code?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          is_internal_profile?: boolean | null
          last_login?: string | null
          position?: string | null
        }
        Update: {
          cabaña_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          employee_code?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          is_internal_profile?: boolean | null
          last_login?: string | null
          position?: string | null
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
      activate_subscription: {
        Args: {
          cabana_uuid: string
          plan_name: Database["public"]["Enums"]["subscription_plan"]
          duration_months?: number
        }
        Returns: undefined
      }
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
      create_company_with_owner: {
        Args: {
          company_name: string
          owner_name: string
          owner_email: string
          owner_password: string
        }
        Returns: {
          user_data: Json
          success: boolean
          error_message: string
        }[]
      }
      generate_employee_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_sistema_credenciales: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          sistema_nombre: string
        }[]
      }
      get_subscription_status: {
        Args: { cabana_uuid: string }
        Returns: {
          plan: Database["public"]["Enums"]["subscription_plan"]
          is_trial_active: boolean
          trial_days_remaining: number
          is_subscription_active: boolean
          max_animals: number
          max_users: number
          current_animals_count: number
          current_users_count: number
          can_add_animals: boolean
          can_add_users: boolean
          is_read_only: boolean
        }[]
      }
      get_user_cabana_info: {
        Args: { user_uuid: string }
        Returns: {
          cabana_id: string
          cabana_name: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_role_by_id: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_valid_password_reset_token: {
        Args: { _token: string }
        Returns: boolean
      }
      update_subscription_plan: {
        Args: {
          cabana_uuid: string
          new_plan: Database["public"]["Enums"]["subscription_plan"]
        }
        Returns: undefined
      }
      verify_sistema_login: {
        Args: { input_email: string; input_password: string }
        Returns: boolean
      }
      verify_user_login: {
        Args: { input_identifier: string; input_password: string }
        Returns: {
          user_data: Json
          success: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "employee" | "read_only"
      subscription_plan:
        | "free"
        | "personal"
        | "productor"
        | "cabana"
        | "corporativo"
        | "avanzado"
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
      subscription_plan: [
        "free",
        "personal",
        "productor",
        "cabana",
        "corporativo",
        "avanzado",
      ],
    },
  },
} as const
