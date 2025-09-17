import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReproductiveState {
  id: string;
  animal_id: string;
  estado_actual: string;
  fecha_servicio?: string;
  fecha_deteccion_preñez?: string;
  fecha_esperada_parto?: string;
  notas?: string;
  updated_at: string;
}

interface ReproductiveAlert {
  id: string;
  animal_id: string;
  alert_type: string;
  animal_tag?: string;
  expected_date?: string;
  days_overdue: number;
  status: string;
  notes?: string;
  prioridad: string;
  fecha_limite?: string;
}

interface ReproductiveKPI {
  animal_id: string;
  id_tag: string;
  name?: string;
  age_months: number;
  category: string;
  corral_id?: string;
  corral_name?: string;
  is_pregnant: boolean;
  pregnancy_date?: string;
  expected_calving_date?: string;
  last_service_date?: string;
  days_open: number;
  reproductive_years: number;
  total_offspring: number;
  lifetime_services: number;
  lifetime_pregnancies: number;
  lifetime_calvings: number;
  individual_pregnancy_rate: number;
  individual_calving_rate: number;
  performance_level: string;
  active_alerts: number;
  alert_types: string[];
}

export function useReproductiveSystem() {
  const [states, setStates] = useState<ReproductiveState[]>([]);
  const [alerts, setAlerts] = useState<ReproductiveAlert[]>([]);
  const [kpis, setKpis] = useState<ReproductiveKPI[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Register service or artificial insemination
  const registerReproductiveActivity = async (
    animalId: string,
    tipoActividad: 'servicio' | 'inseminacion_artificial',
    fechaActividad: string,
    cabanaId: string,
    detalle?: any
  ) => {
    try {
      const { data, error } = await supabase.rpc('register_reproductive_activity', {
        _animal_id: animalId,
        _tipo_actividad: tipoActividad,
        _fecha_actividad: fechaActividad,
        _cabana_id: cabanaId,
        _detalle: detalle
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error registering reproductive activity:', error);
      throw error;
    }
  };

  // Process pregnancy detection (tacto)
  const processPregnancyDetection = async (
    animalId: string,
    fechaTacto: string,
    resultado: 'preñada' | 'vacia',
    cabanaId: string,
    observaciones?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('process_pregnancy_detection', {
        _animal_id: animalId,
        _fecha_tacto: fechaTacto,
        _resultado: resultado,
        _cabana_id: cabanaId,
        _observaciones: observaciones
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error processing pregnancy detection:', error);
      throw error;
    }
  };

  // Register calving event
  const registerCalvingEvent = async (
    motherId: string,
    calfId?: string,
    fechaParto?: string,
    cabanaId?: string,
    observaciones?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('register_calving_event', {
        _mother_id: motherId,
        _calf_id: calfId,
        _fecha_parto: fechaParto || new Date().toISOString().split('T')[0],
        _cabana_id: cabanaId,
        _observaciones: observaciones
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error registering calving event:', error);
      throw error;
    }
  };

  // Calculate individual KPIs
  const calculateIndividualKPIs = async (animalId: string, year?: number) => {
    try {
      const { data, error } = await supabase.rpc('calculate_individual_kpis', {
        _animal_id: animalId,
        _year: year || new Date().getFullYear()
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error calculating individual KPIs:', error);
      throw error;
    }
  };

  // Calculate corral KPIs
  const calculateCorralKPIs = async (corralId: string, year?: number) => {
    try {
      const { data, error } = await supabase.rpc('calculate_corral_kpis', {
        _corral_id: corralId,
        _year: year || new Date().getFullYear()
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error calculating corral KPIs:', error);
      throw error;
    }
  };

  // Check overdue pregnancies and create alerts
  const checkOverduePregnancies = async () => {
    try {
      const { error } = await supabase.rpc('check_overdue_pregnancies');
      if (error) throw error;
      
      toast({
        title: "Verificación completada",
        description: "Se han verificado las preñeces vencidas y creado alertas según corresponda",
      });
      
      // Refresh alerts
      loadAlerts();
    } catch (error) {
      console.error('Error checking overdue pregnancies:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo verificar las preñeces vencidas",
      });
    }
  };

  // Migrate existing reproductive data
  const migrateExistingData = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('migrate_existing_reproductive_data');
      if (error) throw error;
      
      toast({
        title: "Migración completada",
        description: "Se han migrado los datos reproductivos existentes",
      });
    } catch (error) {
      console.error('Error migrating reproductive data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo migrar los datos reproductivos",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load reproductive states
  const loadStates = async (cabanaId: string) => {
    try {
      const { data, error } = await supabase
        .from('reproductive_current_state')
        .select('*')
        .eq('cabaña_id', cabanaId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setStates(data || []);
    } catch (error) {
      console.error('Error loading reproductive states:', error);
    }
  };

  // Load reproductive alerts
  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('reproductive_alerts')
        .select('*')
        .eq('status', 'pending')
        .order('prioridad', { ascending: false })
        .order('days_overdue', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading reproductive alerts:', error);
    }
  };

  // Load reproductive KPIs
  const loadKPIs = async (cabanaId: string, year?: number) => {
    try {
      // Use the calculate_reproductive_kpis function instead of direct table access
      const { data, error } = await supabase.rpc('calculate_reproductive_kpis', { 
        _cabana_id: cabanaId 
      });

      if (error) throw error;
      setKpis(data || []);
    } catch (error) {
      console.error('Error loading reproductive KPIs:', error);
    }
  };

  // Mark alert as resolved
  const markAlertAsResolved = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('reproductive_alerts')
        .update({ status: 'resolved' })
        .eq('id', alertId);

      if (error) throw error;
      
      // Remove from local state
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      
      toast({
        title: "Alerta resuelta",
        description: "La alerta ha sido marcada como resuelta",
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo resolver la alerta",
      });
    }
  };

  return {
    // Data
    states,
    alerts,
    kpis,
    loading,
    
    // Actions
    registerReproductiveActivity,
    processPregnancyDetection,
    registerCalvingEvent,
    calculateIndividualKPIs,
    calculateCorralKPIs,
    checkOverduePregnancies,
    migrateExistingData,
    markAlertAsResolved,
    
    // Data loading
    loadStates,
    loadAlerts,
    loadKPIs,
  };
}