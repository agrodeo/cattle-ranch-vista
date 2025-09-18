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
  tipo?: string;
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
      
      // Fetch animal data for current state
      const { data: animalData, error: animalError } = await supabase
        .from('animals')
        .select('*')
        .eq('id', animalId)
        .single();

      if (animalError) {
        throw animalError;
      }

      // Fetch offspring for validation
      const { data: offspringData, error: offspringError } = await supabase
        .from('animals')
        .select('id, birth_date, name, id_tag')
        .eq('mother_id', animalId)
        .not('birth_date', 'is', null)
        .order('birth_date', { ascending: false });

      // Fetch services (IA and natural)
      const { data: serviceData, error: serviceError } = await supabase
        .from('ia')
        .select(`
          id, 
          toro_nombre,
          eventos!inner(
            id,
            fecha,
            tipo
          )
        `)
        .contains('animales_ids', [animalId])
        .order('eventos.fecha', { ascending: false });

      // Fetch pregnancy history from preñeces table
      const { data: pregnancyData, error: pregnancyError } = await supabase
        .from('preñeces')
        .select('*')
        .eq('animal_id', animalId)
        .order('fecha_inicio', { ascending: false });

      let pregnancyHistory: any[] = pregnancyData || [];
      
      // Validate and create missing pregnancy records for offspring
      if (offspringData && offspringData.length > 0) {
        for (const offspring of offspringData) {
          const birthDate = new Date(offspring.birth_date);
          
          // Check for pregnancy record within 10 months before birth
          const tenMonthsBefore = new Date(birthDate);
          tenMonthsBefore.setMonth(tenMonthsBefore.getMonth() - 10);
          
          const existingPregnancy = pregnancyHistory.find(p => {
            const pregnancyDate = new Date(p.fecha_inicio);
            const pregnancyEndDate = new Date(p.fecha_finalizacion || p.fecha_estimada_parto || birthDate);
            
            // Check if pregnancy overlaps with expected period
            return pregnancyDate >= tenMonthsBefore && pregnancyEndDate <= new Date(birthDate.getTime() + 30 * 24 * 60 * 60 * 1000);
          });
          
          if (!existingPregnancy) {
            // Find service within 10 months before birth
            const relatedService = serviceData?.find(s => {
              const serviceDate = new Date(s.eventos.fecha);
              return serviceDate >= tenMonthsBefore && serviceDate <= birthDate;
            });
            
            // Calculate pregnancy start date
            const gestationPeriod = 283;
            let pregnancyStart: Date;
            let origen: string;
            
            if (relatedService) {
              pregnancyStart = new Date(relatedService.eventos.fecha);
              origen = relatedService.eventos.tipo === 'ia' ? 'IA' : 'servicio';
            } else {
              pregnancyStart = new Date(birthDate);
              pregnancyStart.setDate(pregnancyStart.getDate() - gestationPeriod);
              origen = 'detectada';
            }
            
            const mockPregnancy = {
              id: 'offspring-' + offspring.id,
              animal_id: animalId,
              estado_final: 'exitosa',
              fecha_inicio: pregnancyStart.toISOString().split('T')[0],
              fecha_estimada_parto: offspring.birth_date,
              fecha_finalizacion: offspring.birth_date,
              origen: origen,
              tipo: 'exitosa',
              motivo_finalizacion: 'parto_exitoso',
              cria_id: offspring.id
            };
            pregnancyHistory.push(mockPregnancy);
          }
        }
      }
      
      // Validate pregnancy count vs offspring count
      const offspringCount = offspringData?.length || 0;
      const successfulPregnancies = pregnancyHistory.filter(p => p.estado_final === 'exitosa').length;
      
      if (offspringCount > successfulPregnancies) {
        // Create additional successful pregnancies if needed
        const missingPregnancies = offspringCount - successfulPregnancies;
        for (let i = 0; i < missingPregnancies; i++) {
          const estimatedDate = new Date();
          estimatedDate.setFullYear(estimatedDate.getFullYear() - (i + 1));
          
          const additionalPregnancy = {
            id: 'estimated-' + animalId + '-' + i,
            animal_id: animalId,
            estado_final: 'exitosa',
            fecha_inicio: estimatedDate.toISOString().split('T')[0],
            fecha_estimada_parto: new Date(estimatedDate.getTime() + 283 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            origen: 'estimada',
            tipo: 'exitosa',
            motivo_finalizacion: 'parto_exitoso'
          };
          pregnancyHistory.push(additionalPregnancy);
        }
      }
      
      // Check for current pregnancy state based on animal data
      if (animalData && animalData.esta_preñada) {
        const activePregnancy = pregnancyHistory.find(p => p.estado_final === 'activa');
        
        if (!activePregnancy) {
          // Create active pregnancy based on current animal state
          let fechaInicio: string;
          let origen: string = 'detectada';
          
          // Check for recent service
          const recentService = serviceData?.find(s => {
            const serviceDate = new Date(s.eventos.fecha);
            const tenMonthsAgo = new Date();
            tenMonthsAgo.setMonth(tenMonthsAgo.getMonth() - 10);
            return serviceDate >= tenMonthsAgo;
          });
          
          if (recentService) {
            fechaInicio = recentService.eventos.fecha;
            origen = recentService.eventos.tipo === 'ia' ? 'IA' : 'servicio';
          } else if (animalData.fecha_servicio) {
            fechaInicio = animalData.fecha_servicio;
            origen = animalData.tipo_servicio === 'inseminacion_artificial' ? 'IA' : 'servicio';
          } else {
            fechaInicio = animalData.fecha_ultima_preñez || new Date().toISOString().split('T')[0];
          }
          
          let fechaEstimadaParto = animalData.fecha_probable_parto;
          if (!fechaEstimadaParto && fechaInicio) {
            const inicioDate = new Date(fechaInicio);
            inicioDate.setDate(inicioDate.getDate() + 283);
            fechaEstimadaParto = inicioDate.toISOString().split('T')[0];
          } else if (!fechaEstimadaParto) {
            // If no service in 10 months, set FPP to 5 months from now
            const fiveMonthsFromNow = new Date();
            fiveMonthsFromNow.setMonth(fiveMonthsFromNow.getMonth() + 5);
            fechaEstimadaParto = fiveMonthsFromNow.toISOString().split('T')[0];
          }
          
          const currentPregnancy = {
            id: 'current-' + animalData.id,
            animal_id: animalData.id,
            estado_final: 'activa',
            fecha_inicio: fechaInicio,
            fecha_estimada_parto: fechaEstimadaParto,
            origen: origen,
            tipo: 'activa'
          };
          pregnancyHistory.unshift(currentPregnancy);
        }
      }

      // Create current state from animal data
      if (animalData) {
        const currentState: ReproductiveState = {
          id: animalData.id,
          animal_id: animalData.id,
          estado_actual: animalData.esta_preñada ? 'preñez_activa' : 'sin_actividad',
          fecha_ultimo_cambio: animalData.fecha_ultima_preñez || new Date().toISOString().split('T')[0],
          fecha_servicio: animalData.fecha_servicio,
          fecha_esperada_parto: animalData.fecha_probable_parto,
          tipo_servicio: animalData.tipo_servicio,
          notas: animalData.observaciones
        };
        setCurrentState(currentState);
      }

      // Sort by fecha_inicio descending
      pregnancyHistory.sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime());

      setPregnancyHistory(pregnancyHistory);
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
    try {
      // Get current user's cabaña_id
      const { data: cabanaId } = await supabase.rpc('get_current_user_cabana_id');
      
      // Calculate expected birth date (283 days from service)
      const serviceDate = new Date(serviceData.fecha_servicio);
      const expectedBirth = new Date(serviceDate);
      expectedBirth.setDate(expectedBirth.getDate() + 283);
      
      // Create pending pregnancy record
      const { error: pregnancyError } = await supabase
        .from('preñeces')
        .insert({
          animal_id: animalId,
          cabaña_id: cabanaId,
          origen: serviceData.tipo_servicio === 'inseminacion_artificial' ? 'IA' : 'servicio',
          tipo: serviceData.tipo_servicio === 'inseminacion_artificial' ? 'pendiente_ia' : 'pendiente_servicio',
          fecha_inicio: serviceData.fecha_servicio,
          fecha_estimada_parto: expectedBirth.toISOString().split('T')[0],
          estado_final: 'pendiente',
          evento_id: serviceData.evento_servicio_id
        });

      if (pregnancyError) {
        console.error("Error creating pregnancy record:", pregnancyError);
      }

      const newState = serviceData.tipo_servicio === 'servicio' 
        ? 'servicio_pendiente' 
        : 'ia_pendiente';

      await updateReproductiveState({
        estado_actual: newState,
        fecha_servicio: serviceData.fecha_servicio,
        tipo_servicio: serviceData.tipo_servicio,
        evento_servicio_id: serviceData.evento_servicio_id,
        fecha_ultimo_cambio: serviceData.fecha_servicio,
        fecha_esperada_parto: expectedBirth.toISOString().split('T')[0],
        notas: serviceData.notas
      });
    } catch (error) {
      console.error("Error registering service:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar el servicio",
      });
    }
  };

  const processPregnancyDetection = async (detectionData: {
    fecha_deteccion: string;
    resultado: 'preñada' | 'vacia';
    evento_deteccion_id?: string;
    notas?: string;
  }) => {
    try {
      const { data: cabanaId } = await supabase.rpc('get_current_user_cabana_id');
      
      // Find pending pregnancy
      const pendingPregnancy = pregnancyHistory.find(p => p.estado_final === 'pendiente');
      
      if (detectionData.resultado === 'preñada') {
        if (pendingPregnancy) {
          // Update pending pregnancy to active
          const { error } = await supabase
            .from('preñeces')
            .update({
              estado_final: 'activa',
              tipo: pendingPregnancy.tipo?.includes('ia') ? 'activa_ia' : 'activa_servicio',
              fecha_deteccion: detectionData.fecha_deteccion,
              notas: detectionData.notas
            })
            .eq('id', pendingPregnancy.id);

          if (error) {
            console.error("Error updating pregnancy record:", error);
          }
        } else {
          // Create new active pregnancy
          let fechaInicio = detectionData.fecha_deteccion;
          let origen = 'tacto';
          
          // Check for recent service
          if (currentState?.fecha_servicio) {
            const serviceDate = new Date(currentState.fecha_servicio);
            const detectionDate = new Date(detectionData.fecha_deteccion);
            const daysDiff = (detectionDate.getTime() - serviceDate.getTime()) / (1000 * 3600 * 24);
            
            if (daysDiff >= 0 && daysDiff <= 300) { // Within 10 months
              fechaInicio = currentState.fecha_servicio;
              origen = currentState.tipo_servicio === 'inseminacion_artificial' ? 'IA' : 'servicio';
            }
          }
          
          const expectedBirth = new Date(fechaInicio);
          expectedBirth.setDate(expectedBirth.getDate() + 283);
          
          const { error } = await supabase
            .from('preñeces')
            .insert({
              animal_id: animalId,
              cabaña_id: cabanaId,
              origen: origen,
              tipo: 'activa',
              fecha_inicio: fechaInicio,
              fecha_estimada_parto: expectedBirth.toISOString().split('T')[0],
              fecha_deteccion: detectionData.fecha_deteccion,
              estado_final: 'activa',
              evento_id: detectionData.evento_deteccion_id,
              notas: detectionData.notas
            });

          if (error) {
            console.error("Error creating pregnancy record:", error);
          }
        }
        
        // Update animal pregnancy status
        await supabase
          .from('animals')
          .update({
            esta_preñada: true,
            fecha_probable_parto: new Date(
              new Date(currentState?.fecha_servicio || detectionData.fecha_deteccion)
                .getTime() + (283 * 24 * 60 * 60 * 1000)
            ).toISOString().split('T')[0]
          })
          .eq('id', animalId);
          
      } else { // resultado === 'vacia'
        if (pendingPregnancy) {
          // Mark pending pregnancy as failed
          const { error } = await supabase
            .from('preñeces')
            .update({
              estado_final: 'vacia',
              fecha_finalizacion: detectionData.fecha_deteccion,
              motivo_finalizacion: 'tacto_vacia',
              notas: detectionData.notas
            })
            .eq('id', pendingPregnancy.id);

          if (error) {
            console.error("Error updating pregnancy record:", error);
          }
        }
        
        // Update animal status
        await supabase
          .from('animals')
          .update({
            esta_preñada: false,
            fecha_probable_parto: null
          })
          .eq('id', animalId);
      }

      await updateReproductiveState({
        estado_actual: detectionData.resultado === 'preñada' ? 'preñez_activa' : 'vacia',
        fecha_deteccion_preñez: detectionData.fecha_deteccion,
        evento_deteccion_id: detectionData.evento_deteccion_id,
        fecha_ultimo_cambio: detectionData.fecha_deteccion,
        notas: detectionData.notas
      });
      
    } catch (error) {
      console.error("Error processing pregnancy detection:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo procesar la detección de preñez",
      });
    }
  };

  const registerCalving = async (calvingData: {
    fecha_parto: string;
    cria_id?: string;
    resultado: 'exitoso' | 'fallido';
    notas?: string;
  }) => {
    try {
      // Find active pregnancy
      const activePregnancy = pregnancyHistory.find(p => p.estado_final === 'activa');
      
      if (activePregnancy) {
        // Update active pregnancy
        const { error } = await supabase
          .from('preñeces')
          .update({
            estado_final: calvingData.resultado === 'exitoso' ? 'exitosa' : 'fallida',
            fecha_finalizacion: calvingData.fecha_parto,
            cria_id: calvingData.cria_id,
            motivo_finalizacion: calvingData.resultado === 'exitoso' 
              ? 'parto_exitoso' : 'parto_fallido',
            notas: calvingData.notas
          })
          .eq('id', activePregnancy.id);

        if (error) {
          console.error("Error updating pregnancy record:", error);
        }
      } else if (calvingData.cria_id) {
        // Create successful pregnancy if calf exists but no active pregnancy
        const { data: cabanaId } = await supabase.rpc('get_current_user_cabana_id');
        
        // Calculate pregnancy start (283 days before birth)
        const birthDate = new Date(calvingData.fecha_parto);
        const pregnancyStart = new Date(birthDate);
        pregnancyStart.setDate(pregnancyStart.getDate() - 283);
        
        const { error } = await supabase
          .from('preñeces')
          .insert({
            animal_id: animalId,
            cabaña_id: cabanaId,
            origen: 'detectada',
            tipo: 'exitosa',
            fecha_inicio: pregnancyStart.toISOString().split('T')[0],
            fecha_estimada_parto: calvingData.fecha_parto,
            fecha_finalizacion: calvingData.fecha_parto,
            estado_final: 'exitosa',
            cria_id: calvingData.cria_id,
            motivo_finalizacion: 'parto_exitoso',
            notas: calvingData.notas
          });

        if (error) {
          console.error("Error creating pregnancy record:", error);
        }
      }
      
      // Update animal status
      await supabase
        .from('animals')
        .update({
          esta_preñada: false,
          fecha_probable_parto: null
        })
        .eq('id', animalId);

      await updateReproductiveState({
        estado_actual: 'post_parto',
        fecha_ultimo_cambio: calvingData.fecha_parto,
        notas: calvingData.notas
      });
      
    } catch (error) {
      console.error("Error registering calving:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar el parto",
      });
    }
  };

  const checkOverduePregnancies = async () => {
    try {
      const overduePregnancies = pregnancyHistory.filter(p => {
        if (p.estado_final !== 'activa' || !p.fecha_estimada_parto) return false;
        
        const expectedDate = new Date(p.fecha_estimada_parto);
        const twoWeeksLater = new Date(expectedDate);
        twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
        
        return new Date() > twoWeeksLater;
      });
      
      if (overduePregnancies.length > 0) {
        const { data: cabanaId } = await supabase.rpc('get_current_user_cabana_id');
        
        for (const pregnancy of overduePregnancies) {
          // Create alert for overdue pregnancy
          await supabase
            .from('reproductive_alerts')
            .insert({
              animal_id: animalId,
              cabaña_id: cabanaId,
              alert_type: 'overdue_calving',
              expected_date: pregnancy.fecha_estimada_parto,
              days_overdue: Math.floor(
                (new Date().getTime() - new Date(pregnancy.fecha_estimada_parto).getTime()) / (1000 * 3600 * 24)
              ),
              notes: 'Pregnancy overdue - check if calf was born or pregnancy failed'
            });
        }
      }
    } catch (error) {
      console.error("Error checking overdue pregnancies:", error);
    }
  };

  useEffect(() => {
    fetchCurrentState();
  }, [animalId]);

  useEffect(() => {
    // Check for overdue pregnancies on load
    if (pregnancyHistory.length > 0) {
      checkOverduePregnancies();
    }
  }, [pregnancyHistory]);

  return {
    currentState,
    pregnancyHistory,
    loading,
    refresh: fetchCurrentState,
    registerService,
    processPregnancyDetection,
    registerCalving,
    updateReproductiveState,
    checkOverduePregnancies
  };
}