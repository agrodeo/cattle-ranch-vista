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
        ]
      }
      ai_chat_conversations: {
        Row: {
          cabaña_id: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cabaña_id: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cabaña_id?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_conversations_cabaña_id_fkey"
            columns: ["cabaña_id"]
            isOneToOne: false
            referencedRelation: "cabañas"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          role: Database["public"]["Enums"]["chat_message_role"]
          timestamp: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          role: Database["public"]["Enums"]["chat_message_role"]
          timestamp?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          role?: Database["public"]["Enums"]["chat_message_role"]
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_documents: {
        Row: {
          animal_id: string
          cabaña_id: string
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          animal_id: string
          cabaña_id: string
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          animal_id?: string
          cabaña_id?: string
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      animal_vaccines: {
        Row: {
          animal_id: string
          cabaña_id: string
          created_at: string | null
          created_by: string
          date: string
          dose: string | null
          dose_number: number | null
          id: string
          is_complete: boolean | null
          lot: string | null
          next_due: string | null
          requirement_id: string | null
          route: string | null
          vaccine_code: string
        }
        Insert: {
          animal_id: string
          cabaña_id: string
          created_at?: string | null
          created_by: string
          date: string
          dose?: string | null
          dose_number?: number | null
          id?: string
          is_complete?: boolean | null
          lot?: string | null
          next_due?: string | null
          requirement_id?: string | null
          route?: string | null
          vaccine_code: string
        }
        Update: {
          animal_id?: string
          cabaña_id?: string
          created_at?: string | null
          created_by?: string
          date?: string
          dose?: string | null
          dose_number?: number | null
          id?: string
          is_complete?: boolean | null
          lot?: string | null
          next_due?: string | null
          requirement_id?: string | null
          route?: string | null
          vaccine_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "animal_vaccines_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_vaccines_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "cabaña_vaccination_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_vaccines_vaccine_code_fkey"
            columns: ["vaccine_code"]
            isOneToOne: false
            referencedRelation: "vaccines"
            referencedColumns: ["code"]
          },
        ]
      }
      animal_weight_history: {
        Row: {
          animal_id: string
          cabaña_id: string
          created_at: string | null
          dias_desde_ultimo_pesaje: number | null
          edad_dias: number | null
          evento_id: string | null
          fecha: string
          ganancia_diaria: number | null
          id: string
          notas: string | null
          peso_anterior: number | null
          peso_kg: number
          tipo_pesaje: string | null
          updated_at: string | null
        }
        Insert: {
          animal_id: string
          cabaña_id: string
          created_at?: string | null
          dias_desde_ultimo_pesaje?: number | null
          edad_dias?: number | null
          evento_id?: string | null
          fecha: string
          ganancia_diaria?: number | null
          id?: string
          notas?: string | null
          peso_anterior?: number | null
          peso_kg: number
          tipo_pesaje?: string | null
          updated_at?: string | null
        }
        Update: {
          animal_id?: string
          cabaña_id?: string
          created_at?: string | null
          dias_desde_ultimo_pesaje?: number | null
          edad_dias?: number | null
          evento_id?: string | null
          fecha?: string
          ganancia_diaria?: number | null
          id?: string
          notas?: string | null
          peso_anterior?: number | null
          peso_kg?: number
          tipo_pesaje?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_weight_history_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_weight_history_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          birth_date: string | null
          breed: string | null
          cabaña_id: string | null
          caravana_electronica: string | null
          circunferencia_escrotal: number | null
          color: string | null
          condicion_corporal: string | null
          corral_id: string | null
          defuncion_id: string | null
          dna_verified: boolean | null
          esta_preñada: boolean | null
          father_breed: string | null
          father_id: string | null
          father_name: string | null
          father_registration: string | null
          fecha_destete: string | null
          fecha_muerte: string | null
          fecha_probable_parto: string | null
          fecha_servicio: string | null
          fecha_ultima_preñez: string | null
          fecha_ultimo_pesaje: string | null
          ganancia_diaria_kg: number | null
          id: string
          id_tag: string | null
          is_castrated: boolean | null
          mocho: string | null
          mother_breed: string | null
          mother_id: string | null
          mother_name: string | null
          mother_registration: string | null
          name: string | null
          observaciones: string | null
          peso_actual_kg: number | null
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
          caravana_electronica?: string | null
          circunferencia_escrotal?: number | null
          color?: string | null
          condicion_corporal?: string | null
          corral_id?: string | null
          defuncion_id?: string | null
          dna_verified?: boolean | null
          esta_preñada?: boolean | null
          father_breed?: string | null
          father_id?: string | null
          father_name?: string | null
          father_registration?: string | null
          fecha_destete?: string | null
          fecha_muerte?: string | null
          fecha_probable_parto?: string | null
          fecha_servicio?: string | null
          fecha_ultima_preñez?: string | null
          fecha_ultimo_pesaje?: string | null
          ganancia_diaria_kg?: number | null
          id?: string
          id_tag?: string | null
          is_castrated?: boolean | null
          mocho?: string | null
          mother_breed?: string | null
          mother_id?: string | null
          mother_name?: string | null
          mother_registration?: string | null
          name?: string | null
          observaciones?: string | null
          peso_actual_kg?: number | null
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
          caravana_electronica?: string | null
          circunferencia_escrotal?: number | null
          color?: string | null
          condicion_corporal?: string | null
          corral_id?: string | null
          defuncion_id?: string | null
          dna_verified?: boolean | null
          esta_preñada?: boolean | null
          father_breed?: string | null
          father_id?: string | null
          father_name?: string | null
          father_registration?: string | null
          fecha_destete?: string | null
          fecha_muerte?: string | null
          fecha_probable_parto?: string | null
          fecha_servicio?: string | null
          fecha_ultima_preñez?: string | null
          fecha_ultimo_pesaje?: string | null
          ganancia_diaria_kg?: number | null
          id?: string
          id_tag?: string | null
          is_castrated?: boolean | null
          mocho?: string | null
          mother_breed?: string | null
          mother_id?: string | null
          mother_name?: string | null
          mother_registration?: string | null
          name?: string | null
          observaciones?: string | null
          peso_actual_kg?: number | null
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
            foreignKeyName: "animals_defuncion_id_fkey"
            columns: ["defuncion_id"]
            isOneToOne: false
            referencedRelation: "defunciones"
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
            foreignKeyName: "artificial_inseminations_female_id_fkey"
            columns: ["female_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_customers: {
        Row: {
          appstore_original_transaction_id: string | null
          cabana_id: string
          country_code: string | null
          created_at: string | null
          id: string
          last_provider: string | null
          mp_payer_id: string | null
          play_purchase_token: string | null
        }
        Insert: {
          appstore_original_transaction_id?: string | null
          cabana_id: string
          country_code?: string | null
          created_at?: string | null
          id?: string
          last_provider?: string | null
          mp_payer_id?: string | null
          play_purchase_token?: string | null
        }
        Update: {
          appstore_original_transaction_id?: string | null
          cabana_id?: string
          country_code?: string | null
          created_at?: string | null
          id?: string
          last_provider?: string | null
          mp_payer_id?: string | null
          play_purchase_token?: string | null
        }
        Relationships: []
      }
      billing_payments: {
        Row: {
          amount_cents: number | null
          cabana_id: string
          currency: string | null
          external_payment_id: string
          happened_at: string | null
          id: string
          provider: string
          raw: Json | null
          status: string
        }
        Insert: {
          amount_cents?: number | null
          cabana_id: string
          currency?: string | null
          external_payment_id: string
          happened_at?: string | null
          id?: string
          provider: string
          raw?: Json | null
          status: string
        }
        Update: {
          amount_cents?: number | null
          cabana_id?: string
          currency?: string | null
          external_payment_id?: string
          happened_at?: string | null
          id?: string
          provider?: string
          raw?: Json | null
          status?: string
        }
        Relationships: []
      }
      billing_prices: {
        Row: {
          active: boolean
          amount_cents: number
          billing_interval: string
          created_at: string | null
          currency: string
          external_sku: string | null
          id: string
          product_code: string
          provider: string
        }
        Insert: {
          active?: boolean
          amount_cents: number
          billing_interval?: string
          created_at?: string | null
          currency?: string
          external_sku?: string | null
          id?: string
          product_code: string
          provider?: string
        }
        Update: {
          active?: boolean
          amount_cents?: number
          billing_interval?: string
          created_at?: string | null
          currency?: string
          external_sku?: string | null
          id?: string
          product_code?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_prices_product_code_fkey"
            columns: ["product_code"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["code"]
          },
        ]
      }
      billing_products: {
        Row: {
          code: string
          description: string | null
          name: string
        }
        Insert: {
          code: string
          description?: string | null
          name: string
        }
        Update: {
          code?: string
          description?: string | null
          name?: string
        }
        Relationships: []
      }
      billing_subscriptions: {
        Row: {
          cabana_id: string
          created_at: string | null
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          external_id: string | null
          id: string
          product_code: string
          provider: string
          status: string
          trial_end: string | null
          updated_at: string | null
        }
        Insert: {
          cabana_id: string
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          external_id?: string | null
          id?: string
          product_code: string
          provider: string
          status: string
          trial_end?: string | null
          updated_at?: string | null
        }
        Update: {
          cabana_id?: string
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          external_id?: string | null
          id?: string
          product_code?: string
          provider?: string
          status?: string
          trial_end?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_subscriptions_product_code_fkey"
            columns: ["product_code"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["code"]
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
      cabaña_vaccination_requirements: {
        Row: {
          cabaña_id: string
          country: string
          created_at: string
          description: string | null
          doses_required: number | null
          frequency_months: number | null
          id: string
          interval_between_doses_days: number | null
          is_active: boolean
          is_mandatory: boolean
          max_age_months: number | null
          min_age_months: number | null
          sex_restriction: string | null
          updated_at: string
          vaccine_name: string
          vaccine_type: string
        }
        Insert: {
          cabaña_id: string
          country?: string
          created_at?: string
          description?: string | null
          doses_required?: number | null
          frequency_months?: number | null
          id?: string
          interval_between_doses_days?: number | null
          is_active?: boolean
          is_mandatory?: boolean
          max_age_months?: number | null
          min_age_months?: number | null
          sex_restriction?: string | null
          updated_at?: string
          vaccine_name: string
          vaccine_type: string
        }
        Update: {
          cabaña_id?: string
          country?: string
          created_at?: string
          description?: string | null
          doses_required?: number | null
          frequency_months?: number | null
          id?: string
          interval_between_doses_days?: number | null
          is_active?: boolean
          is_mandatory?: boolean
          max_age_months?: number | null
          min_age_months?: number | null
          sex_restriction?: string | null
          updated_at?: string
          vaccine_name?: string
          vaccine_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cabaña_vaccination_requirements_cabaña"
            columns: ["cabaña_id"]
            isOneToOne: false
            referencedRelation: "cabañas"
            referencedColumns: ["id"]
          },
        ]
      }
      cabañas: {
        Row: {
          country_code: string | null
          id: string
          language: string | null
          location: string | null
          location_updated_at: string | null
          name: string
          owner_id: string | null
          province_code: string | null
        }
        Insert: {
          country_code?: string | null
          id?: string
          language?: string | null
          location?: string | null
          location_updated_at?: string | null
          name: string
          owner_id?: string | null
          province_code?: string | null
        }
        Update: {
          country_code?: string | null
          id?: string
          language?: string | null
          location?: string | null
          location_updated_at?: string | null
          name?: string
          owner_id?: string | null
          province_code?: string | null
        }
        Relationships: []
      }
      catalogo_causas: {
        Row: {
          activo: boolean
          cabaña_id: string
          created_at: string | null
          id: string
          nombre: string
          orden: number | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean
          cabaña_id: string
          created_at?: string | null
          id?: string
          nombre: string
          orden?: number | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean
          cabaña_id?: string
          created_at?: string | null
          id?: string
          nombre?: string
          orden?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      corral_movements: {
        Row: {
          animal_id: string
          cabaña_id: string
          corral_anterior_id: string | null
          corral_nuevo_id: string | null
          created_at: string
          fecha_movimiento: string
          id: string
          motivo: string | null
          registrado_por: string | null
        }
        Insert: {
          animal_id: string
          cabaña_id: string
          corral_anterior_id?: string | null
          corral_nuevo_id?: string | null
          created_at?: string
          fecha_movimiento?: string
          id?: string
          motivo?: string | null
          registrado_por?: string | null
        }
        Update: {
          animal_id?: string
          cabaña_id?: string
          corral_anterior_id?: string | null
          corral_nuevo_id?: string | null
          created_at?: string
          fecha_movimiento?: string
          id?: string
          motivo?: string | null
          registrado_por?: string | null
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
      custom_benchmarks: {
        Row: {
          birth_weight_excellent: number
          birth_weight_good: number
          birth_weight_poor: number
          breed: string | null
          cabaña_id: string
          created_at: string
          daily_gain_excellent: number
          daily_gain_good: number
          daily_gain_poor: number
          id: string
          updated_at: string
          weaning_weight_excellent: number
          weaning_weight_good: number
          weaning_weight_poor: number
        }
        Insert: {
          birth_weight_excellent?: number
          birth_weight_good?: number
          birth_weight_poor?: number
          breed?: string | null
          cabaña_id: string
          created_at?: string
          daily_gain_excellent?: number
          daily_gain_good?: number
          daily_gain_poor?: number
          id?: string
          updated_at?: string
          weaning_weight_excellent?: number
          weaning_weight_good?: number
          weaning_weight_poor?: number
        }
        Update: {
          birth_weight_excellent?: number
          birth_weight_good?: number
          birth_weight_poor?: number
          breed?: string | null
          cabaña_id?: string
          created_at?: string
          daily_gain_excellent?: number
          daily_gain_good?: number
          daily_gain_poor?: number
          id?: string
          updated_at?: string
          weaning_weight_excellent?: number
          weaning_weight_good?: number
          weaning_weight_poor?: number
        }
        Relationships: []
      }
      defunciones: {
        Row: {
          animal_id: string
          cabaña_id: string
          causa_id: string | null
          causa_texto: string | null
          created_at: string | null
          edad_dias: number | null
          edad_meses: number | null
          fecha_defuncion: string
          id: string
          notas: string | null
          registrado_por: string
          updated_at: string | null
        }
        Insert: {
          animal_id: string
          cabaña_id: string
          causa_id?: string | null
          causa_texto?: string | null
          created_at?: string | null
          edad_dias?: number | null
          edad_meses?: number | null
          fecha_defuncion: string
          id?: string
          notas?: string | null
          registrado_por: string
          updated_at?: string | null
        }
        Update: {
          animal_id?: string
          cabaña_id?: string
          causa_id?: string | null
          causa_texto?: string | null
          created_at?: string | null
          edad_dias?: number | null
          edad_meses?: number | null
          fecha_defuncion?: string
          id?: string
          notas?: string | null
          registrado_por?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "defunciones_causa_id_fkey"
            columns: ["causa_id"]
            isOneToOne: false
            referencedRelation: "catalogo_causas"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          cabaña_id: string
          creado_por: string
          created_at: string
          fecha: string
          id: string
          notas: string | null
          payload: Json | null
          tipo: string
          updated_at: string
        }
        Insert: {
          cabaña_id: string
          creado_por: string
          created_at?: string
          fecha?: string
          id?: string
          notas?: string | null
          payload?: Json | null
          tipo: string
          updated_at?: string
        }
        Update: {
          cabaña_id?: string
          creado_por?: string
          created_at?: string
          fecha?: string
          id?: string
          notas?: string | null
          payload?: Json | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_categories: {
        Row: {
          cabaña_id: string | null
          created_at: string
          id: string
          is_system: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          cabaña_id?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          cabaña_id?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_categories_cabaña_id_fkey"
            columns: ["cabaña_id"]
            isOneToOne: false
            referencedRelation: "cabañas"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_recurring: {
        Row: {
          amount: number
          cabaña_id: string
          category_id: string | null
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          description: string | null
          end_date: string | null
          frequency: string
          id: string
          interval_days: number | null
          is_active: boolean
          last_run_date: string | null
          name: string
          next_run_date: string | null
          start_date: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          cabaña_id: string
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          frequency: string
          id?: string
          interval_days?: number | null
          is_active?: boolean
          last_run_date?: string | null
          name: string
          next_run_date?: string | null
          start_date?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cabaña_id?: string
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          interval_days?: number | null
          is_active?: boolean
          last_run_date?: string | null
          name?: string
          next_run_date?: string | null
          start_date?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_recurring_cabaña_id_fkey"
            columns: ["cabaña_id"]
            isOneToOne: false
            referencedRelation: "cabañas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_recurring_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      finances: {
        Row: {
          amount: number | null
          buyer_destination: string | null
          buyer_document: string | null
          buyer_name: string | null
          cabaña_id: string | null
          category_id: string | null
          date: string | null
          description: string | null
          id: string
          type: string | null
        }
        Insert: {
          amount?: number | null
          buyer_destination?: string | null
          buyer_document?: string | null
          buyer_name?: string | null
          cabaña_id?: string | null
          category_id?: string | null
          date?: string | null
          description?: string | null
          id?: string
          type?: string | null
        }
        Update: {
          amount?: number | null
          buyer_destination?: string | null
          buyer_document?: string | null
          buyer_name?: string | null
          cabaña_id?: string | null
          category_id?: string | null
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
          {
            foreignKeyName: "finances_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      finances_animal_sales: {
        Row: {
          animal_id: string
          finance_id: string
          id: string
          unit_price: number | null
        }
        Insert: {
          animal_id: string
          finance_id: string
          id?: string
          unit_price?: number | null
        }
        Update: {
          animal_id?: string
          finance_id?: string
          id?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finances_animal_sales_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finances_animal_sales_finance_id_fkey"
            columns: ["finance_id"]
            isOneToOne: false
            referencedRelation: "finances"
            referencedColumns: ["id"]
          },
        ]
      }
      herd_settings: {
        Row: {
          cabaña_id: string
          compliance_mode: string
          country: string
          created_at: string
          herd_type: string | null
          id: string
          lat: number | null
          lng: number | null
          region: string | null
          service_type: string | null
          updated_at: string
        }
        Insert: {
          cabaña_id: string
          compliance_mode?: string
          country: string
          created_at?: string
          herd_type?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          region?: string | null
          service_type?: string | null
          updated_at?: string
        }
        Update: {
          cabaña_id?: string
          compliance_mode?: string
          country?: string
          created_at?: string
          herd_type?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          region?: string | null
          service_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ia: {
        Row: {
          animales_ids: string[]
          created_at: string
          evento_id: string | null
          extras_toro: Json | null
          id: string
          raza_toro: string | null
          toro_id: string | null
          toro_nombre: string
          updated_at: string
        }
        Insert: {
          animales_ids: string[]
          created_at?: string
          evento_id?: string | null
          extras_toro?: Json | null
          id?: string
          raza_toro?: string | null
          toro_id?: string | null
          toro_nombre: string
          updated_at?: string
        }
        Update: {
          animales_ids?: string[]
          created_at?: string
          evento_id?: string | null
          extras_toro?: Json | null
          id?: string
          raza_toro?: string | null
          toro_id?: string | null
          toro_nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ia_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      individual_reproductive_kpis: {
        Row: {
          animal_id: string
          años_reproductivos: number
          cabaña_id: string
          created_at: string
          id: string
          last_calculated_at: string
          porcentaje_paricion: number
          porcentaje_preñez: number
          total_ias_fallidas: number
          total_inseminaciones: number
          total_partos_exitosos: number
          total_preñeces_detectadas: number
          total_preñeces_perdidas: number
          total_servicios: number
          total_servicios_fallidos: number
          updated_at: string
        }
        Insert: {
          animal_id: string
          años_reproductivos?: number
          cabaña_id: string
          created_at?: string
          id?: string
          last_calculated_at?: string
          porcentaje_paricion?: number
          porcentaje_preñez?: number
          total_ias_fallidas?: number
          total_inseminaciones?: number
          total_partos_exitosos?: number
          total_preñeces_detectadas?: number
          total_preñeces_perdidas?: number
          total_servicios?: number
          total_servicios_fallidos?: number
          updated_at?: string
        }
        Update: {
          animal_id?: string
          años_reproductivos?: number
          cabaña_id?: string
          created_at?: string
          id?: string
          last_calculated_at?: string
          porcentaje_paricion?: number
          porcentaje_preñez?: number
          total_ias_fallidas?: number
          total_inseminaciones?: number
          total_partos_exitosos?: number
          total_preñeces_detectadas?: number
          total_preñeces_perdidas?: number
          total_servicios?: number
          total_servicios_fallidos?: number
          updated_at?: string
        }
        Relationships: []
      }
      jurisdictions: {
        Row: {
          code: string
          country: string
          created_at: string
          name: string
          parent_code: string | null
        }
        Insert: {
          code: string
          country: string
          created_at?: string
          name: string
          parent_code?: string | null
        }
        Update: {
          code?: string
          country?: string
          created_at?: string
          name?: string
          parent_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jurisdictions_parent_code_fkey"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "jurisdictions"
            referencedColumns: ["code"]
          },
        ]
      }
      pesajes: {
        Row: {
          created_at: string
          evento_id: string | null
          id: string
          mediciones: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          evento_id?: string | null
          id?: string
          mediciones: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          evento_id?: string | null
          id?: string
          mediciones?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesajes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      preñeces: {
        Row: {
          animal_id: string
          cabaña_id: string
          causa_perdida: string | null
          created_at: string
          cria_id: string | null
          dias_gestacion: number | null
          dias_gestacion_perdida: number | null
          estado: string
          estado_final: string | null
          evento_id: string | null
          fecha_deteccion: string | null
          fecha_estimada_parto: string | null
          fecha_fin: string | null
          fecha_finalizacion: string | null
          fecha_inicio: string
          fecha_parto_real: string | null
          fecha_perdida: string | null
          fecha_servicio_ia: string | null
          id: string
          motivo_finalizacion: string | null
          notas: string | null
          observaciones_perdida: string | null
          origen: string
          resultado_parto: string | null
          tipo: string | null
          tipo_origen: string | null
          tipo_perdida: string | null
          updated_at: string
        }
        Insert: {
          animal_id: string
          cabaña_id: string
          causa_perdida?: string | null
          created_at?: string
          cria_id?: string | null
          dias_gestacion?: number | null
          dias_gestacion_perdida?: number | null
          estado?: string
          estado_final?: string | null
          evento_id?: string | null
          fecha_deteccion?: string | null
          fecha_estimada_parto?: string | null
          fecha_fin?: string | null
          fecha_finalizacion?: string | null
          fecha_inicio: string
          fecha_parto_real?: string | null
          fecha_perdida?: string | null
          fecha_servicio_ia?: string | null
          id?: string
          motivo_finalizacion?: string | null
          notas?: string | null
          observaciones_perdida?: string | null
          origen: string
          resultado_parto?: string | null
          tipo?: string | null
          tipo_origen?: string | null
          tipo_perdida?: string | null
          updated_at?: string
        }
        Update: {
          animal_id?: string
          cabaña_id?: string
          causa_perdida?: string | null
          created_at?: string
          cria_id?: string | null
          dias_gestacion?: number | null
          dias_gestacion_perdida?: number | null
          estado?: string
          estado_final?: string | null
          evento_id?: string | null
          fecha_deteccion?: string | null
          fecha_estimada_parto?: string | null
          fecha_fin?: string | null
          fecha_finalizacion?: string | null
          fecha_inicio?: string
          fecha_parto_real?: string | null
          fecha_perdida?: string | null
          fecha_servicio_ia?: string | null
          id?: string
          motivo_finalizacion?: string | null
          notas?: string | null
          observaciones_perdida?: string | null
          origen?: string
          resultado_parto?: string | null
          tipo?: string | null
          tipo_origen?: string | null
          tipo_perdida?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preñeces_cria_id_fkey"
            columns: ["cria_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preñeces_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cabaña_id: string | null
          created_at: string
          department: string | null
          email: string | null
          employee_code: string | null
          full_name: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          is_internal_profile: boolean | null
          language: string | null
          last_login: string | null
          position: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          cabaña_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          employee_code?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          is_internal_profile?: boolean | null
          language?: string | null
          last_login?: string | null
          position?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          cabaña_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          employee_code?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          is_internal_profile?: boolean | null
          language?: string | null
          last_login?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_cabaña_id_fkey"
            columns: ["cabaña_id"]
            isOneToOne: false
            referencedRelation: "cabañas"
            referencedColumns: ["id"]
          },
        ]
      }
      reproductive_active_years: {
        Row: {
          animal_id: string
          calving_occurred: boolean | null
          created_at: string
          id: string
          is_active: boolean | null
          pregnancy_detected: boolean | null
          started_at_18_months: boolean | null
          updated_at: string
          year: number
        }
        Insert: {
          animal_id: string
          calving_occurred?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          pregnancy_detected?: boolean | null
          started_at_18_months?: boolean | null
          updated_at?: string
          year: number
        }
        Update: {
          animal_id?: string
          calving_occurred?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          pregnancy_detected?: boolean | null
          started_at_18_months?: boolean | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      reproductive_activities: {
        Row: {
          animal_id: string
          cabaña_id: string
          created_at: string | null
          created_by: string | null
          detalle: Json | null
          evento_id: string | null
          fecha_actividad: string
          id: string
          resultado: string | null
          tipo_actividad: string
        }
        Insert: {
          animal_id: string
          cabaña_id: string
          created_at?: string | null
          created_by?: string | null
          detalle?: Json | null
          evento_id?: string | null
          fecha_actividad: string
          id?: string
          resultado?: string | null
          tipo_actividad: string
        }
        Update: {
          animal_id?: string
          cabaña_id?: string
          created_at?: string | null
          created_by?: string | null
          detalle?: Json | null
          evento_id?: string | null
          fecha_actividad?: string
          id?: string
          resultado?: string | null
          tipo_actividad?: string
        }
        Relationships: [
          {
            foreignKeyName: "reproductive_activities_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      reproductive_alerts: {
        Row: {
          alert_date: string
          alert_type: string
          animal_id: string
          animal_tag: string | null
          cabaña_id: string
          created_at: string
          days_overdue: number | null
          expected_date: string | null
          fecha_limite: string | null
          id: string
          notes: string | null
          prioridad: string | null
          status: string
          updated_at: string
        }
        Insert: {
          alert_date?: string
          alert_type: string
          animal_id: string
          animal_tag?: string | null
          cabaña_id: string
          created_at?: string
          days_overdue?: number | null
          expected_date?: string | null
          fecha_limite?: string | null
          id?: string
          notes?: string | null
          prioridad?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          alert_date?: string
          alert_type?: string
          animal_id?: string
          animal_tag?: string | null
          cabaña_id?: string
          created_at?: string
          days_overdue?: number | null
          expected_date?: string | null
          fecha_limite?: string | null
          id?: string
          notes?: string | null
          prioridad?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      reproductive_annual_metrics: {
        Row: {
          animal_id: string
          cabaña_id: string
          calving_rate: number | null
          calvings_count: number | null
          created_at: string
          days_open_total: number | null
          id: string
          pregnancies_count: number | null
          pregnancy_rate: number | null
          services_count: number | null
          updated_at: string
          year: number
        }
        Insert: {
          animal_id: string
          cabaña_id: string
          calving_rate?: number | null
          calvings_count?: number | null
          created_at?: string
          days_open_total?: number | null
          id?: string
          pregnancies_count?: number | null
          pregnancy_rate?: number | null
          services_count?: number | null
          updated_at?: string
          year: number
        }
        Update: {
          animal_id?: string
          cabaña_id?: string
          calving_rate?: number | null
          calvings_count?: number | null
          created_at?: string
          days_open_total?: number | null
          id?: string
          pregnancies_count?: number | null
          pregnancy_rate?: number | null
          services_count?: number | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      reproductive_config: {
        Row: {
          cabaña_id: string
          created_at: string | null
          edad_minima_hembra_servicio: number | null
          gestacion_default: number | null
          id: string
          periodo_check_parto: number | null
          updated_at: string | null
        }
        Insert: {
          cabaña_id: string
          created_at?: string | null
          edad_minima_hembra_servicio?: number | null
          gestacion_default?: number | null
          id?: string
          periodo_check_parto?: number | null
          updated_at?: string | null
        }
        Update: {
          cabaña_id?: string
          created_at?: string | null
          edad_minima_hembra_servicio?: number | null
          gestacion_default?: number | null
          id?: string
          periodo_check_parto?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reproductive_current_state: {
        Row: {
          animal_id: string
          cabaña_id: string
          created_at: string
          estado_actual: string
          evento_deteccion_id: string | null
          evento_servicio_id: string | null
          fecha_deteccion_preñez: string | null
          fecha_esperada_parto: string | null
          fecha_servicio: string | null
          fecha_ultimo_cambio: string
          id: string
          notas: string | null
          tipo_servicio: string | null
          updated_at: string
        }
        Insert: {
          animal_id: string
          cabaña_id: string
          created_at?: string
          estado_actual?: string
          evento_deteccion_id?: string | null
          evento_servicio_id?: string | null
          fecha_deteccion_preñez?: string | null
          fecha_esperada_parto?: string | null
          fecha_servicio?: string | null
          fecha_ultimo_cambio?: string
          id?: string
          notas?: string | null
          tipo_servicio?: string | null
          updated_at?: string
        }
        Update: {
          animal_id?: string
          cabaña_id?: string
          created_at?: string
          estado_actual?: string
          evento_deteccion_id?: string | null
          evento_servicio_id?: string | null
          fecha_deteccion_preñez?: string | null
          fecha_esperada_parto?: string | null
          fecha_servicio?: string | null
          fecha_ultimo_cambio?: string
          id?: string
          notas?: string | null
          tipo_servicio?: string | null
          updated_at?: string
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
      reproductive_loss_causes: {
        Row: {
          categoria: string | null
          causa: string
          created_at: string
          descripcion: string | null
          id: string
          is_active: boolean
          tipo: string
        }
        Insert: {
          categoria?: string | null
          causa: string
          created_at?: string
          descripcion?: string | null
          id?: string
          is_active?: boolean
          tipo: string
        }
        Update: {
          categoria?: string | null
          causa?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          is_active?: boolean
          tipo?: string
        }
        Relationships: []
      }
      reproductive_outcomes: {
        Row: {
          animal_id: string
          cabaña_id: string
          created_at: string
          cria_id: string | null
          dias_gestacion: number | null
          evento_origen_id: string | null
          fecha_deteccion_preñez: string | null
          fecha_outcome: string
          fecha_servicio: string | null
          id: string
          notas: string | null
          tipo_outcome: string
        }
        Insert: {
          animal_id: string
          cabaña_id: string
          created_at?: string
          cria_id?: string | null
          dias_gestacion?: number | null
          evento_origen_id?: string | null
          fecha_deteccion_preñez?: string | null
          fecha_outcome: string
          fecha_servicio?: string | null
          id?: string
          notas?: string | null
          tipo_outcome: string
        }
        Update: {
          animal_id?: string
          cabaña_id?: string
          created_at?: string
          cria_id?: string | null
          dias_gestacion?: number | null
          evento_origen_id?: string | null
          fecha_deteccion_preñez?: string | null
          fecha_outcome?: string
          fecha_servicio?: string | null
          id?: string
          notas?: string | null
          tipo_outcome?: string
        }
        Relationships: []
      }
      reproductive_state_history: {
        Row: {
          actividad_origen_id: string | null
          animal_id: string
          cabaña_id: string
          created_at: string
          estado_anterior: string | null
          estado_nuevo: string
          evento_origen_id: string | null
          fecha_cambio: string
          id: string
          notas: string | null
          updated_at: string
        }
        Insert: {
          actividad_origen_id?: string | null
          animal_id: string
          cabaña_id: string
          created_at?: string
          estado_anterior?: string | null
          estado_nuevo: string
          evento_origen_id?: string | null
          fecha_cambio?: string
          id?: string
          notas?: string | null
          updated_at?: string
        }
        Update: {
          actividad_origen_id?: string | null
          animal_id?: string
          cabaña_id?: string
          created_at?: string
          estado_anterior?: string | null
          estado_nuevo?: string
          evento_origen_id?: string | null
          fecha_cambio?: string
          id?: string
          notas?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
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
      tactos: {
        Row: {
          created_at: string
          evento_id: string | null
          id: string
          resultados: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          evento_id?: string | null
          id?: string
          resultados: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          evento_id?: string | null
          id?: string
          resultados?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tactos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
          updated_at: string | null
          username: string | null
        }
        Insert: {
          cabaña_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          employee_code?: string | null
          full_name?: string | null
          hire_date?: string | null
          id: string
          is_active?: boolean | null
          is_internal_profile?: boolean | null
          last_login?: string | null
          position?: string | null
          updated_at?: string | null
          username?: string | null
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
          updated_at?: string | null
          username?: string | null
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
      vaccination_schemes: {
        Row: {
          breed: string | null
          country: string
          created_at: string
          description: string | null
          frequency_days: number | null
          id: string
          is_active: boolean
          is_mandatory: boolean
          max_age_months: number | null
          min_age_months: number | null
          name: string
          notes: string | null
          region: string | null
          season_restriction: string | null
          sex_restriction: string | null
          updated_at: string
          vaccine_type: string
        }
        Insert: {
          breed?: string | null
          country: string
          created_at?: string
          description?: string | null
          frequency_days?: number | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          max_age_months?: number | null
          min_age_months?: number | null
          name: string
          notes?: string | null
          region?: string | null
          season_restriction?: string | null
          sex_restriction?: string | null
          updated_at?: string
          vaccine_type: string
        }
        Update: {
          breed?: string | null
          country?: string
          created_at?: string
          description?: string | null
          frequency_days?: number | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          max_age_months?: number | null
          min_age_months?: number | null
          name?: string
          notes?: string | null
          region?: string | null
          season_restriction?: string | null
          sex_restriction?: string | null
          updated_at?: string
          vaccine_type?: string
        }
        Relationships: []
      }
      vaccine_aliases: {
        Row: {
          alias: string
          created_at: string
          id: string
          vaccine_code: string
        }
        Insert: {
          alias: string
          created_at?: string
          id?: string
          vaccine_code: string
        }
        Update: {
          alias?: string
          created_at?: string
          id?: string
          vaccine_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccine_aliases_vaccine_code_fkey"
            columns: ["vaccine_code"]
            isOneToOne: false
            referencedRelation: "vaccines"
            referencedColumns: ["code"]
          },
        ]
      }
      vaccine_campaigns: {
        Row: {
          created_at: string
          id: string
          jurisdiction_code: string
          label: string
          vaccine_code: string
          window_end: string
          window_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          jurisdiction_code: string
          label: string
          vaccine_code: string
          window_end: string
          window_start: string
        }
        Update: {
          created_at?: string
          id?: string
          jurisdiction_code?: string
          label?: string
          vaccine_code?: string
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccine_campaigns_jurisdiction_code_fkey"
            columns: ["jurisdiction_code"]
            isOneToOne: false
            referencedRelation: "jurisdictions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "vaccine_campaigns_vaccine_code_fkey"
            columns: ["vaccine_code"]
            isOneToOne: false
            referencedRelation: "vaccines"
            referencedColumns: ["code"]
          },
        ]
      }
      vaccine_rules: {
        Row: {
          active: boolean
          booster_interval_days: number | null
          category: string
          coverage_window_days: number | null
          created_at: string
          id: string
          jurisdiction_code: string
          mandatory: boolean
          max_age_days: number | null
          min_age_days: number
          notes: string | null
          one_time: boolean
          pregnancy_ok: boolean
          sex: string
          source_url: string | null
          updated_at: string
          vaccine_code: string
          version: number
        }
        Insert: {
          active?: boolean
          booster_interval_days?: number | null
          category?: string
          coverage_window_days?: number | null
          created_at?: string
          id?: string
          jurisdiction_code: string
          mandatory?: boolean
          max_age_days?: number | null
          min_age_days?: number
          notes?: string | null
          one_time?: boolean
          pregnancy_ok?: boolean
          sex?: string
          source_url?: string | null
          updated_at?: string
          vaccine_code: string
          version?: number
        }
        Update: {
          active?: boolean
          booster_interval_days?: number | null
          category?: string
          coverage_window_days?: number | null
          created_at?: string
          id?: string
          jurisdiction_code?: string
          mandatory?: boolean
          max_age_days?: number | null
          min_age_days?: number
          notes?: string | null
          one_time?: boolean
          pregnancy_ok?: boolean
          sex?: string
          source_url?: string | null
          updated_at?: string
          vaccine_code?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "vaccine_rules_jurisdiction_code_fkey"
            columns: ["jurisdiction_code"]
            isOneToOne: false
            referencedRelation: "jurisdictions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "vaccine_rules_vaccine_code_fkey"
            columns: ["vaccine_code"]
            isOneToOne: false
            referencedRelation: "vaccines"
            referencedColumns: ["code"]
          },
        ]
      }
      vaccines: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          species: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          species?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          species?: string
        }
        Relationships: []
      }
      vacunaciones: {
        Row: {
          animales_ids: string[]
          created_at: string
          dosis: string | null
          evento_id: string | null
          id: string
          lote: string | null
          proxima_dosis: string | null
          updated_at: string
          vacuna: string
          via: string | null
        }
        Insert: {
          animales_ids: string[]
          created_at?: string
          dosis?: string | null
          evento_id?: string | null
          id?: string
          lote?: string | null
          proxima_dosis?: string | null
          updated_at?: string
          vacuna: string
          via?: string | null
        }
        Update: {
          animales_ids?: string[]
          created_at?: string
          dosis?: string | null
          evento_id?: string | null
          id?: string
          lote?: string | null
          proxima_dosis?: string | null
          updated_at?: string
          vacuna?: string
          via?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vacunaciones_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      vacunas_historial: {
        Row: {
          animal_id: string
          cabaña_id: string
          created_at: string
          dose_number: number | null
          dosis: string | null
          evento_id: string | null
          fecha: string
          id: string
          lote: string | null
          proxima_dosis: string | null
          vacuna: string
          via: string | null
        }
        Insert: {
          animal_id: string
          cabaña_id: string
          created_at?: string
          dose_number?: number | null
          dosis?: string | null
          evento_id?: string | null
          fecha: string
          id?: string
          lote?: string | null
          proxima_dosis?: string | null
          vacuna: string
          via?: string | null
        }
        Update: {
          animal_id?: string
          cabaña_id?: string
          created_at?: string
          dose_number?: number | null
          dosis?: string | null
          evento_id?: string | null
          fecha?: string
          id?: string
          lote?: string | null
          proxima_dosis?: string | null
          vacuna?: string
          via?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vacunas_historial_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_tasks: {
        Row: {
          animal_id: string
          cabaña_id: string
          completed_at: string | null
          created_at: string | null
          estado: string | null
          fecha_programada: string
          id: string
          notas: string | null
          preñez_id: string | null
          tipo_tarea: string
        }
        Insert: {
          animal_id: string
          cabaña_id: string
          completed_at?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_programada: string
          id?: string
          notas?: string | null
          preñez_id?: string | null
          tipo_tarea: string
        }
        Update: {
          animal_id?: string
          cabaña_id?: string
          completed_at?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_programada?: string
          id?: string
          notas?: string | null
          preñez_id?: string | null
          tipo_tarea?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_tasks_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_tasks_preñez_id_fkey"
            columns: ["preñez_id"]
            isOneToOne: false
            referencedRelation: "preñeces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vaccination_history_unified: {
        Row: {
          animal_id: string | null
          cabaña_id: string | null
          created_at: string | null
          dose_number: number | null
          dosis: string | null
          fecha: string | null
          id: string | null
          is_complete: boolean | null
          lote: string | null
          proxima_dosis: string | null
          requirement_id: string | null
          source_table: string | null
          vacuna: string | null
          via: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_subscription: {
        Args: {
          cabana_uuid: string
          duration_months?: number
          plan_name: Database["public"]["Enums"]["subscription_plan"]
        }
        Returns: undefined
      }
      add_default_death_causes_to_cabana: {
        Args: { _cabana_id: string }
        Returns: undefined
      }
      backfill_animal_weights_v2: { Args: never; Returns: undefined }
      calculate_age_months: { Args: { birth_date: string }; Returns: number }
      calculate_ai_success_rate: {
        Args: {
          filter_bull_name?: string
          filter_cabaña_id?: string
          filter_corral_id?: string
          filter_year?: number
        }
        Returns: {
          pending_results: number
          success_rate: number
          total_inseminations: number
          total_pregnancies: number
        }[]
      }
      calculate_corral_kpis: {
        Args: { _corral_id: string; _year?: number }
        Returns: Json
      }
      calculate_daily_gain: {
        Args: {
          current_weight: number
          days_between: number
          previous_weight: number
        }
        Returns: number
      }
      calculate_individual_kpis: {
        Args: { _animal_id: string; _year?: number }
        Returns: Json
      }
      calculate_individual_reproductive_percentages: {
        Args: { _animal_id: string }
        Returns: Json
      }
      calculate_reproductive_kpis: {
        Args: { _cabana_id: string }
        Returns: {
          active_alerts: number
          age_months: number
          alert_types: string[]
          animal_id: string
          category: string
          corral_id: string
          corral_name: string
          days_open: number
          expected_calving_date: string
          id_tag: string
          individual_calving_rate: number
          individual_pregnancy_rate: number
          is_pregnant: boolean
          last_service_date: string
          lifetime_calvings: number
          lifetime_pregnancies: number
          lifetime_services: number
          name: string
          performance_level: string
          pregnancy_date: string
          reproductive_years: number
          total_offspring: number
        }[]
      }
      calculate_reproductive_performance: {
        Args: { _animal_id: string }
        Returns: {
          calving_percentage: number
          confirmed_pregnancies: number
          live_calves: number
          pregnancy_percentage: number
          total_reproductive_years: number
        }[]
      }
      can_add_animals: { Args: { user_uuid: string }; Returns: boolean }
      can_modify_data: { Args: { user_uuid: string }; Returns: boolean }
      categorize_animal: {
        Args: { birth_date: string; reference_date?: string; sex: string }
        Returns: string
      }
      check_consanguinity: {
        Args: { animal_father_id: string; animal_mother_id: string }
        Returns: number
      }
      check_overdue_pregnancies:
        | { Args: never; Returns: undefined }
        | { Args: { _cabana_id: string }; Returns: number }
      check_reproductive_alerts: { Args: never; Returns: undefined }
      classify_weighing_type: {
        Args: {
          animal_birth_date: string
          animal_status: string
          weighing_date: string
        }
        Returns: string
      }
      compile_rules_for_ranch: {
        Args: { _cabana_id: string }
        Returns: {
          booster_interval_days: number
          campaign_windows: Json
          category: string
          coverage_window_days: number
          mandatory: boolean
          max_age_days: number
          min_age_days: number
          notes: string
          one_time: boolean
          pregnancy_ok: boolean
          sex: string
          vaccine_code: string
          vaccine_name: string
        }[]
      }
      compute_due_vaccines_for_animal: {
        Args: { _animal_id: string }
        Returns: Json
      }
      create_animal_sale: {
        Args: {
          _amount: number
          _animal_ids: string[]
          _buyer_destination: string
          _buyer_document: string
          _buyer_name: string
          _cabana_id: string
          _category_id: string
          _date: string
          _description: string
          _unit_prices: number[]
        }
        Returns: string
      }
      create_company_with_owner: {
        Args: {
          company_name: string
          country?: string
          owner_name: string
          owner_password: string
          owner_username: string
          region?: string
        }
        Returns: {
          error_message: string
          success: boolean
          user_data: Json
        }[]
      }
      create_finance_category: {
        Args: { _name: string; _type: string; _user_id: string }
        Returns: string
      }
      create_finance_movement: {
        Args: {
          _amount: number
          _buyer_destination?: string
          _buyer_document?: string
          _buyer_name?: string
          _category_id?: string
          _date: string
          _description?: string
          _type: string
          _user_id: string
        }
        Returns: string
      }
      create_finance_recurring: {
        Args: {
          _amount: number
          _category_id?: string
          _description?: string
          _end_date?: string
          _frequency: string
          _name: string
          _start_date?: string
          _type: string
          _user_id: string
        }
        Returns: string
      }
      delete_finance_movement: {
        Args: { _movement_id: string; _user_id: string }
        Returns: undefined
      }
      delete_finance_recurring: {
        Args: { _id: string; _user_id: string }
        Returns: undefined
      }
      get_animal_reproductive_report: {
        Args: { _animal_id: string }
        Returns: {
          calving_percentage: number
          current_state: string
          outcomes_history: Json
          pregnancy_percentage: number
          reproductive_years: number
          state_history: Json
          state_since: string
          total_failed_pregnancies: number
          total_inseminations: number
          total_pregnancies: number
          total_services: number
          total_successful_births: number
        }[]
      }
      get_animal_vaccination_status: {
        Args: { _animal_id: string; _cabaña_id: string }
        Returns: {
          days_overdue: number
          is_mandatory: boolean
          last_vaccination_date: string
          next_due_date: string
          requirement_id: string
          status: string
          vaccine_name: string
          vaccine_type: string
        }[]
      }
      get_animal_weight_history: {
        Args: { _animal_id: string }
        Returns: {
          dias_desde_ultimo: number
          edad_dias: number
          fecha: string
          ganancia_diaria: number
          id: string
          notas: string
          peso_anterior: number
          peso_kg: number
          tipo_pesaje: string
        }[]
      }
      get_current_entitlements: { Args: { cabana_uuid: string }; Returns: Json }
      get_current_user_cabana: { Args: never; Returns: string }
      get_current_user_cabana_id: { Args: never; Returns: string }
      get_enhanced_reproductive_metrics: {
        Args: { _cabana_id: string; _filters?: Json }
        Returns: {
          active_alerts: number
          age_months: number
          alert_types: string[]
          animal_id: string
          category: string
          corral_id: string
          corral_name: string
          days_open: number
          expected_calving_date: string
          id_tag: string
          individual_calving_rate: number
          individual_pregnancy_rate: number
          is_pregnant: boolean
          last_service_date: string
          lifetime_calvings: number
          lifetime_pregnancies: number
          lifetime_services: number
          name: string
          performance_level: string
          pregnancy_date: string
          reproductive_years: number
          total_offspring: number
        }[]
      }
      get_finance_summary: {
        Args: { _from_date?: string; _to_date?: string; _user_id: string }
        Returns: {
          balance: number
          egresos: number
          ingresos: number
        }[]
      }
      get_herd_vaccination_stats: {
        Args: { _cabana_id: string }
        Returns: Json
      }
      get_herd_weight_summary: {
        Args: { _cabana_id: string; _date_from?: string; _date_to?: string }
        Returns: {
          animales_pesados: number
          ganancia_diaria_promedio: number
          low_performers: Json
          peso_promedio: number
          por_categoria: Json
          top_performers: Json
          total_weighings: number
        }[]
      }
      get_mortality_reports: {
        Args: { _date_from?: string; _date_to?: string; _user_id: string }
        Returns: {
          animal_breed: string
          animal_id: string
          animal_id_tag: string
          animal_name: string
          animal_sex: string
          cabana_id: string
          causa_nombre: string
          causa_texto: string
          edad_dias: number
          edad_meses: number
          fecha_defuncion: string
          id: string
          notas: string
        }[]
      }
      get_plan_limits: { Args: { plan_code: string }; Returns: Json }
      get_service_pregnancy_stats: {
        Args: { _service_id: string }
        Returns: Json
      }
      get_sistema_credenciales: {
        Args: never
        Returns: {
          email: string
          sistema_nombre: string
        }[]
      }
      get_subscription_status: {
        Args: { cabana_uuid: string }
        Returns: {
          can_add_animals: boolean
          current_animals_count: number
          is_read_only: boolean
          is_subscription_active: boolean
          is_trial_active: boolean
          max_animals: number
          plan: Database["public"]["Enums"]["subscription_plan"]
          trial_days_remaining: number
        }[]
      }
      get_temporal_production_analysis: {
        Args: {
          _cabana_id: string
          _date_from?: string
          _date_to?: string
          _filters?: Json
          _group_by?: string
          _tipo_pesaje?: string
        }
        Returns: {
          adg_promedio: number
          cantidad_animales: number
          cantidad_pesajes: number
          mejora_vs_anterior: number
          percentil_25: number
          percentil_75: number
          periodo: string
          periodo_orden: number
          peso_destete_promedio: number
          peso_final_promedio: number
          peso_nacimiento_promedio: number
          year: number
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
      get_vaccination_alerts_for_animal: {
        Args: { _animal_id: string; _cabaña_id: string }
        Returns: {
          days_since_last: number
          days_until_due: number
          description: string
          is_mandatory: boolean
          last_vaccination_date: string
          next_due_date: string
          requirement_id: string
          status: string
          vaccine_name: string
          vaccine_type: string
        }[]
      }
      get_vaccination_compliance: {
        Args: { _animal_id: string; _cabana_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_password: { Args: { _password: string }; Returns: string }
      is_valid_password_reset_token: {
        Args: { _token: string }
        Returns: boolean
      }
      list_finance_categories: {
        Args: { _type: string; _user_id: string }
        Returns: {
          cabaña_id: string
          id: string
          is_system: boolean
          name: string
          type: string
        }[]
      }
      list_finance_movements: {
        Args: {
          _category_id?: string
          _from_date?: string
          _search?: string
          _to_date?: string
          _type?: string
          _user_id: string
        }
        Returns: {
          amount: number
          buyer_destination: string
          buyer_document: string
          buyer_name: string
          cabaña_id: string
          category_id: string
          category_name: string
          date: string
          description: string
          id: string
          type: string
        }[]
      }
      list_finance_recurring: {
        Args: { _user_id: string }
        Returns: {
          amount: number
          cabaña_id: string
          category_id: string
          created_at: string
          day_of_month: number
          day_of_week: number
          description: string
          end_date: string
          frequency: string
          id: string
          interval_days: number
          is_active: boolean
          last_run_date: string
          name: string
          next_run_date: string
          start_date: string
          type: string
          updated_at: string
        }[]
      }
      list_finance_reports:
        | {
            Args: { _user_id: string }
            Returns: {
              amount: number
              category_name: string
              date: string
              type: string
            }[]
          }
        | {
            Args: { _from_date?: string; _to_date?: string; _user_id: string }
            Returns: {
              amount: number
              category_name: string
              date: string
              type: string
            }[]
          }
      log_security_event: {
        Args: {
          _action: string
          _details?: Json
          _record_id?: string
          _table_name: string
        }
        Returns: undefined
      }
      manage_death_causes:
        | {
            Args: {
              _action: string
              _activo?: boolean
              _id?: string
              _nombre?: string
              _orden?: number
            }
            Returns: Json
          }
        | {
            Args: {
              _action: string
              _activo?: boolean
              _id?: string
              _nombre?: string
              _orden?: number
              _user_id: string
            }
            Returns: Json
          }
      marcar_defuncion:
        | {
            Args: {
              _animal_id: string
              _causa_id?: string
              _causa_texto?: string
              _fecha_defuncion: string
              _notas?: string
            }
            Returns: Json
          }
        | {
            Args: {
              _animal_id: string
              _causa_id?: string
              _causa_texto?: string
              _fecha_defuncion: string
              _notas?: string
              _user_id: string
            }
            Returns: Json
          }
      mark_pregnancy_failed: {
        Args: { _pregnancy_id: string; _reason?: string }
        Returns: boolean
      }
      migrate_existing_offspring_to_outcomes: {
        Args: { _cabana_id: string }
        Returns: number
      }
      migrate_existing_reproductive_data: { Args: never; Returns: undefined }
      migrate_historical_weighings: { Args: never; Returns: string }
      prepare_user_migration: { Args: never; Returns: undefined }
      process_calving_event: {
        Args: {
          _cabana_id: string
          _cria_id?: string
          _evento_id?: string
          _fecha_parto: string
          _mother_id: string
          _notas?: string
        }
        Returns: string
      }
      process_pregnancy_detection:
        | {
            Args: {
              _animal_id: string
              _cabana_id: string
              _evento_id: string
              _fecha_tacto: string
              _observaciones?: string
              _resultado: string
            }
            Returns: string
          }
        | {
            Args: {
              _animal_id: string
              _cabana_id: string
              _fecha_tacto: string
              _observaciones?: string
              _resultado: string
            }
            Returns: string
          }
      record_vaccination: {
        Args: {
          _animal_id: string
          _created_by?: string
          _date: string
          _dose?: string
          _lot?: string
          _route?: string
          _vaccine_code: string
        }
        Returns: Json
      }
      register_calving_event: {
        Args: {
          _cabana_id?: string
          _calf_id?: string
          _fecha_parto?: string
          _mother_id: string
          _observaciones?: string
        }
        Returns: string
      }
      register_reproductive_activity:
        | {
            Args: {
              _animal_id: string
              _cabana_id: string
              _detalle?: Json
              _fecha_actividad: string
              _tipo_actividad: string
            }
            Returns: string
          }
        | {
            Args: {
              _animal_id: string
              _detalle?: Json
              _fecha_actividad: string
              _resultado?: string
              _tipo_actividad: string
            }
            Returns: string
          }
      register_service_activity: {
        Args: {
          _animal_id: string
          _cabana_id: string
          _evento_id: string
          _fecha_servicio: string
          _notas?: string
          _tipo_servicio: string
        }
        Returns: string
      }
      rpc_corral_complete_kpis: {
        Args: { _user_id: string }
        Returns: {
          animal_count: number
          avg_daily_gain: number
          avg_weight: number
          consanguinity_risk_count: number
          corral_id: string
          corral_name: string
          female_count: number
          hectareas: number
          highest_severity: string
          last_weighing_date: string
          male_count: number
          pregnancy_rate: number
          recent_weighings_count: number
          vaccination_alerts: number
          vaccination_percentage: number
          vaccination_status: string
        }[]
      }
      rpc_report_corrals_last_season: {
        Args: { _user_id: string }
        Returns: {
          avg_adg_season: number
          avg_weight: number
          calving_rate: number
          corral_id: string
          headcount: number
          name: string
          pregnancy_rate: number
        }[]
      }
      rpc_report_production_animals: {
        Args: { _user_id: string; filters_json?: Json }
        Returns: {
          adg_percentile: number
          adg_recent_90d: number
          adg_season: number
          animal_id: string
          category: string
          corral_id: string
          corral_name: string
          last_weight_date: string
          last_weight_kg: number
          name: string
          tag: string
          weighs_count: number
          weight_birth: number
          weight_final: number
          weight_weaning: number
          weight_yearling: number
        }[]
      }
      rpc_report_reproduction_animals: {
        Args: { _user_id: string; filters_json: Json }
        Returns: {
          animal_id: string
          calving_rate: number
          calvings: number
          category: string
          corral_id: string
          corral_name: string
          exposures: number
          is_repeater: boolean
          live_calving_rate: number
          live_calvings: number
          name: string
          open_days: number
          pregnancies: number
          pregnancy_rate: number
          tag: string
        }[]
      }
      rpc_report_reproductive_females: {
        Args: { _user_id: string; filters_json?: Json }
        Returns: {
          age_months: number
          animal_id: string
          category: string
          corral_id: string
          corral_name: string
          expected_calving_date: string
          is_pregnant: boolean
          last_service_date: string
          name: string
          pregnancy_checks_count: number
          pregnancy_date: string
          services_count: number
          tag: string
        }[]
      }
      rpc_reproductive_detailed_metrics: {
        Args: { _user_id: string; filters_json?: Json }
        Returns: {
          active_alerts: number
          age_months: number
          alert_types: string[]
          animal_id: string
          category: string
          corral_id: string
          corral_name: string
          days_open: number
          expected_calving_date: string
          individual_calving_rate: number
          individual_pregnancy_rate: number
          is_pregnant: boolean
          last_service_date: string
          lifetime_calvings: number
          lifetime_pregnancies: number
          lifetime_services: number
          name: string
          performance_level: string
          pregnancy_date: string
          reproductive_years: number
          tag: string
          total_offspring: number
        }[]
      }
      update_finance_movement: {
        Args: {
          _amount: number
          _buyer_destination?: string
          _buyer_document?: string
          _buyer_name?: string
          _category_id?: string
          _date: string
          _description?: string
          _movement_id: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      update_pregnancy_status: {
        Args: {
          _estado: string
          _result_source?: string
          _service_animal_ids: string[]
          _user_id: string
        }
        Returns: Json
      }
      update_reproductive_metrics: {
        Args: {
          _animal_id: string
          _increment_calvings?: number
          _increment_pregnancies?: number
          _increment_services?: number
          _year: number
        }
        Returns: undefined
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
    }
    Enums: {
      app_role: "admin" | "employee" | "read_only"
      chat_message_role: "user" | "assistant"
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
      chat_message_role: ["user", "assistant"],
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
