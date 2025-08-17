import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useHybridAuth } from "@/hooks/useHybridAuth";

interface HerdSettings {
  id?: string;
  cabaña_id: string;
  country: string;
  region?: string | null;
  lat?: number | null;
  lng?: number | null;
  herd_type?: string | null;
  service_type?: string | null;
  compliance_mode: string;
  created_at?: string;
  updated_at?: string;
}

interface VaccineRule {
  vaccine_code: string;
  vaccine_name: string;
  mandatory: boolean;
  one_time: boolean;
  booster_interval_days?: number | null;
  coverage_window_days?: number | null;
  sex: string;
  min_age_days: number;
  max_age_days?: number | null;
  category: string;
  pregnancy_ok: boolean;
  notes?: string | null;
  campaign_windows: any;
}

interface DueVaccine {
  vaccine_code: string;
  vaccine_name: string;
  mandatory: boolean;
  one_time: boolean;
  is_due: boolean;
  rationale: string;
  last_dose_date?: string;
  next_due_date?: string;
  days_since_last?: number;
  campaign_active: boolean;
  current_campaign?: any;
}

export function useLocationAwareVaccination() {
  const [herdSettings, setHerdSettings] = useState<HerdSettings | null>(null);
  const [rules, setRules] = useState<VaccineRule[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useHybridAuth();

  const fetchHerdSettings = async () => {
    if (!currentUser?.cabañaId) return;

    try {
      const { data, error } = await supabase
        .from('herd_settings')
        .select('*')
        .eq('cabaña_id', currentUser.cabañaId)
        .maybeSingle();

      if (error) throw error;
      setHerdSettings(data as HerdSettings);
    } catch (error) {
      console.error("Error fetching herd settings:", error);
    }
  };

  const fetchRules = async () => {
    if (!currentUser?.cabañaId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('compile_rules_for_ranch', {
        _cabana_id: currentUser.cabañaId
      });

      if (error) throw error;
      setRules((data || []) as VaccineRule[]);
    } catch (error) {
      console.error("Error fetching vaccination rules:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las reglas de vacunación",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveHerdSettings = async (settings: Partial<HerdSettings>) => {
    if (!currentUser?.cabañaId) return;

    try {
      const settingsData = {
        cabaña_id: currentUser.cabañaId,
        country: settings.country || '',
        region: settings.region,
        lat: settings.lat,
        lng: settings.lng,
        herd_type: settings.herd_type,
        service_type: settings.service_type,
        compliance_mode: settings.compliance_mode || 'strict',
      };

      const { data, error } = await supabase
        .from('herd_settings')
        .upsert(settingsData)
        .select()
        .single();

      if (error) throw error;

      setHerdSettings(data as HerdSettings);
      await fetchRules(); // Refresh rules when settings change

      toast({
        title: "Configuración guardada",
        description: "Las reglas de vacunación se han actualizado según tu ubicación",
      });

      return data;
    } catch (error) {
      console.error("Error saving herd settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la configuración",
      });
      throw error;
    }
  };

  const getDueVaccinesForAnimal = async (animalId: string): Promise<DueVaccine[]> => {
    try {
      const { data, error } = await supabase.rpc('compute_due_vaccines_for_animal', {
        _animal_id: animalId
      });

      if (error) throw error;
      const result = data as any;
      return result?.due_vaccines || [];
    } catch (error) {
      console.error("Error computing due vaccines:", error);
      return [];
    }
  };

  const recordVaccination = async (
    animalId: string,
    vaccineCode: string,
    date: Date,
    lot?: string,
    dose?: string,
    route?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('record_vaccination', {
        _animal_id: animalId,
        _vaccine_code: vaccineCode,
        _date: date.toISOString().split('T')[0],
        _lot: lot,
        _dose: dose,
        _route: route
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || "Error desconocido");
      }

      toast({
        title: "Vacunación registrada",
        description: result?.message || "Vacunación registrada correctamente",
      });

      return result;
    } catch (error) {
      console.error("Error recording vaccination:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Error al registrar vacunación",
      });
      throw error;
    }
  };

  const getAvailableVaccines = async () => {
    try {
      const { data, error } = await supabase
        .from('vaccines')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching vaccines:", error);
      return [];
    }
  };

  const getVaccineAliases = async () => {
    try {
      const { data, error } = await supabase
        .from('vaccine_aliases')
        .select('*, vaccines(name)')
        .order('alias');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching vaccine aliases:", error);
      return [];
    }
  };

  const getJurisdictions = async () => {
    try {
      const { data, error } = await supabase
        .from('jurisdictions')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching jurisdictions:", error);
      return [];
    }
  };

  useEffect(() => {
    if (currentUser?.cabañaId) {
      fetchHerdSettings();
      fetchRules();
    }
  }, [currentUser?.cabañaId]);

  return {
    herdSettings,
    rules,
    loading,
    fetchHerdSettings,
    fetchRules,
    saveHerdSettings,
    getDueVaccinesForAnimal,
    recordVaccination,
    getAvailableVaccines,
    getVaccineAliases,
    getJurisdictions,
  };
}