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
          father_id: string | null
          fecha_destete: string | null
          fecha_muerte: string | null
          fecha_servicio: string | null
          id: string
          id_tag: string | null
          mocho: string | null
          mother_id: string | null
          name: string | null
          observaciones: string | null
          peso_destete: number | null
          peso_destete_mejorado: number | null
          peso_final: number | null
          peso_final_mejorado: number | null
          peso_nacer: number | null
          peso_nacimiento: number | null
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
          father_id?: string | null
          fecha_destete?: string | null
          fecha_muerte?: string | null
          fecha_servicio?: string | null
          id?: string
          id_tag?: string | null
          mocho?: string | null
          mother_id?: string | null
          name?: string | null
          observaciones?: string | null
          peso_destete?: number | null
          peso_destete_mejorado?: number | null
          peso_final?: number | null
          peso_final_mejorado?: number | null
          peso_nacer?: number | null
          peso_nacimiento?: number | null
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
          father_id?: string | null
          fecha_destete?: string | null
          fecha_muerte?: string | null
          fecha_servicio?: string | null
          id?: string
          id_tag?: string | null
          mocho?: string | null
          mother_id?: string | null
          name?: string | null
          observaciones?: string | null
          peso_destete?: number | null
          peso_destete_mejorado?: number | null
          peso_final?: number | null
          peso_final_mejorado?: number | null
          peso_nacer?: number | null
          peso_nacimiento?: number | null
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
      users: {
        Row: {
          cabaña_id: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          cabaña_id?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          cabaña_id?: string | null
          full_name?: string | null
          id?: string
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
