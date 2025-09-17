import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReproductiveState {
  id: string;
  animal_id: string;
  estado_actual: string;
  fecha_ultimo_cambio: string;
  fecha_servicio?: string;
  fecha_deteccion_preñez?: string;
  fecha_esperada_parto?: string;
  tipo_servicio?: string;
  notas?: string;
  evento_servicio_id?: string;
  evento_deteccion_id?: string;
}

interface PregnancyRecord {
  id: string;
  animal_id: string;
  estado_final: string;
  fecha_inicio: string;
  fecha_estimada_parto?: string;
  fecha_finalizacion?: string;
  origen: string;
  tipo: string;
  motivo_finalizacion?: string;
  cria_id?: string;
}

export function useReproductiveState(animalId: string) {
  const [currentState, setCurrentState] = useState<ReproductiveState | null>(null);
  const [pregnancyHistory, setPregnancyHistory] = useState<PregnancyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCurrentState = async () => {
    if (!animalId) return;
    
    try {
      setLoading(true);
      
      // Fetch current reproductive state
      const { data: stateData, error: stateError } = await supabase
        .from('reproductive_current_state')
        .select('*')
        .eq('animal_id', animalId)
        .single();

      if (stateError && stateError.code !== 'PGRST116') {
        throw stateError;
      }

      setCurrentState(stateData);

      // Fetch pregnancy history
      const { data: pregnancyData, error: pregnancyError } = await supabase
        .from('preñeces')
        .select('*')
        .eq('animal_id', animalId)
        .order('fecha_inicio', { ascending: false });

      if (pregnancyError) {
        throw pregnancyError;
      }

      setPregnancyHistory(pregnancyData || []);
    } catch (error) {
      console.error("Error fetching reproductive state:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el estado reproductivo",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateReproductiveState = async (updates: Partial<ReproductiveState>) => {
    if (!animalId) return;

    try {
      // Get current user's cabaña_id
      const { data: cabanaId } = await supabase.rpc('get_current_user_cabana_id');
      
      const { error } = await supabase
        .from('reproductive_current_state')
        .upsert({
          animal_id: animalId,
          cabaña_id: cabanaId,
          ...updates
        });

      if (error) throw error;

      await fetchCurrentState();
      
      toast({
        title: "Estado actualizado",
        description: "El estado reproductivo se ha actualizado correctamente",
      });
    } catch (error) {
      console.error("Error updating reproductive state:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado reproductivo",
      });
    }
  };

  const registerService = async (serviceData: {
    fecha_servicio: string;
    tipo_servicio: 'servicio' | 'inseminacion_artificial';
    evento_servicio_id?: string;
    notas?: string;
  }) => {
    const newState = serviceData.tipo_servicio === 'servicio' 
      ? 'servicio_pendiente' 
      : 'ia_pendiente';

    await updateReproductiveState({
      estado_actual: newState,
      fecha_servicio: serviceData.fecha_servicio,
      tipo_servicio: serviceData.tipo_servicio,
      evento_servicio_id: serviceData.evento_servicio_id,
      fecha_ultimo_cambio: serviceData.fecha_servicio,
      notas: serviceData.notas
    });
  };

  const processPregnancyDetection = async (detectionData: {
    fecha_deteccion: string;
    resultado: 'preñada' | 'vacia';
    evento_deteccion_id?: string;
    notas?: string;
  }) => {
    if (!currentState) return;

    let newState: string;
    
    if (detectionData.resultado === 'preñada') {
      if (currentState.estado_actual === 'servicio_pendiente') {
        newState = 'preñez_servicio';
      } else if (currentState.estado_actual === 'ia_pendiente') {
        newState = 'preñez_ia';
      } else {
        newState = 'preñez_activa';
      }
    } else {
      if (currentState.estado_actual === 'servicio_pendiente') {
        newState = 'servicio_fallido';
      } else if (currentState.estado_actual === 'ia_pendiente') {
        newState = 'ia_fallida';
      } else {
        return; // No change needed
      }
    }

    await updateReproductiveState({
      estado_actual: newState,
      fecha_deteccion_preñez: detectionData.fecha_deteccion,
      evento_deteccion_id: detectionData.evento_deteccion_id,
      fecha_ultimo_cambio: detectionData.fecha_deteccion,
      notas: detectionData.notas
    });

    // Create pregnancy record if pregnant
    if (detectionData.resultado === 'preñada') {
      const { error } = await supabase
        .from('preñeces')
        .insert({
          animal_id: animalId,
          cabaña_id: (await supabase.rpc('get_current_user_cabana_id')).data,
          origen: currentState.tipo_servicio === 'servicio' ? 'servicio' : 'IA',
          tipo: newState === 'preñez_servicio' ? 'por_servicio' : 
                newState === 'preñez_ia' ? 'por_ia' : 'activa',
          fecha_inicio: currentState.fecha_servicio || detectionData.fecha_deteccion,
          fecha_estimada_parto: new Date(
            new Date(currentState.fecha_servicio || detectionData.fecha_deteccion)
              .getTime() + (283 * 24 * 60 * 60 * 1000)
          ).toISOString().split('T')[0],
          estado_final: 'activa'
        });

      if (error) {
        console.error("Error creating pregnancy record:", error);
      }
    }
  };

  const registerCalving = async (calvingData: {
    fecha_parto: string;
    cria_id?: string;
    resultado: 'exitoso' | 'fallido';
    notas?: string;
  }) => {
    if (!currentState) return;

    let newState: string;
    
    if (currentState.estado_actual === 'preñez_servicio') {
      newState = 'preñez_exitosa_servicio';
    } else if (currentState.estado_actual === 'preñez_ia') {
      newState = 'preñez_exitosa_ia';
    } else {
      newState = 'preñez_exitosa';
    }

    await updateReproductiveState({
      estado_actual: newState,
      fecha_ultimo_cambio: calvingData.fecha_parto,
      notas: calvingData.notas
    });

    // Update active pregnancy
    const activePregnancy = pregnancyHistory.find(p => p.estado_final === 'activa');
    if (activePregnancy) {
      const { error } = await supabase
        .from('preñeces')
        .update({
          estado_final: calvingData.resultado === 'exitoso' ? 'exitosa' : 'fallida',
          fecha_finalizacion: calvingData.fecha_parto,
          cria_id: calvingData.cria_id,
          motivo_finalizacion: calvingData.resultado === 'exitoso' 
            ? 'parto_exitoso' : 'parto_fallido'
        })
        .eq('id', activePregnancy.id);

      if (error) {
        console.error("Error updating pregnancy record:", error);
      }
    }
  };

  useEffect(() => {
    fetchCurrentState();
  }, [animalId]);

  return {
    currentState,
    pregnancyHistory,
    loading,
    refresh: fetchCurrentState,
    registerService,
    processPregnancyDetection,
    registerCalving,
    updateReproductiveState
  };
}