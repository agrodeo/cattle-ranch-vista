import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

interface ActivityItem {
  id: string;
  date: string;
  type: string;
  description: string;
  details: Record<string, string>;
  responsable?: string;
  notes?: string;
}

export function useAnimalActivities(animalId: string) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useSupabaseAuth();

  const fetchActivities = async () => {
    if (!animalId) return;
    
    try {
      setIsLoading(true);
      const allActivities: ActivityItem[] = [];

      // Run all independent queries in parallel
      const [aiResult, vacResult, reproResult, eventResult, weightResult] = await Promise.all([
        // AI records
        supabase
          .from("artificial_inseminations")
          .select("*")
          .eq("female_id", animalId)
          .order("insemination_date", { ascending: false }),
        // Vaccination records
        supabase
          .from("animal_vaccines")
          .select("*")
          .eq("animal_id", animalId)
          .order("date", { ascending: false }),
        // Reproductive events
        supabase
          .from("reproductive_events")
          .select("*")
          .eq("animal_id", animalId)
          .order("year", { ascending: false }),
        // General events (no invalid joins - just payload data)
        supabase
          .from("eventos")
          .select("id, tipo, fecha, notas, payload, creado_por")
          .order("fecha", { ascending: false }),
        // Weight history
        supabase
          .from("animal_weight_history")
          .select("id, fecha, peso_kg, ganancia_diaria, tipo_pesaje, notas, evento_id")
          .eq("animal_id", animalId)
          .order("fecha", { ascending: false }),
      ]);

      // Process AI
      if (aiResult.data) {
        aiResult.data.forEach(record => {
          allActivities.push({
            id: record.id,
            date: record.insemination_date,
            type: "insemination",
            description: `Inseminación Artificial - ${record.bull_name}`,
            details: {
              toro: record.bull_name,
              estado: record.is_pregnant === null ? "Pendiente" : 
                     record.is_pregnant ? "Preñada" : "No preñada"
            },
            notes: record.notes || undefined
          });
        });
      }

      // Process vaccinations
      if (vacResult.data) {
        const requirementIds = [...new Set(vacResult.data.map(v => v.requirement_id).filter(Boolean))];
        let requirementMap = new Map<string, string>();
        
        if (requirementIds.length > 0) {
          const { data: requirements } = await supabase
            .from('cabaña_vaccination_requirements')
            .select('id, vaccine_name')
            .in('id', requirementIds);
          if (requirements) {
            requirementMap = new Map(requirements.map(r => [r.id, r.vaccine_name]));
          }
        }

        vacResult.data.forEach(record => {
          const vaccineName = (record.requirement_id && requirementMap.get(record.requirement_id)) || record.vaccine_code;
          allActivities.push({
            id: record.id,
            date: record.date,
            type: "vaccination",
            description: `Vacunación - ${vaccineName}`,
            details: {
              vacuna: vaccineName,
              lote: record.lot || "N/A",
              dosis: record.dose || "N/A",
              via: record.route || "N/A"
            }
          });
        });
      }

      // Process reproductive events
      if (reproResult.data) {
        reproResult.data.forEach(record => {
          allActivities.push({
            id: record.id,
            date: record.calving_date || `${record.year}-01-01`,
            type: "reproductive",
            description: "Evento Reproductivo",
            details: {
              año: record.year.toString(),
              estado: record.pregnancy_status || "N/A",
              resultado: record.pregnancy_outcome || "N/A",
              parto: record.calving_date ? new Date(record.calving_date).toLocaleDateString() : "N/A"
            },
            notes: record.notes || undefined
          });
        });
      }

      // Process weight history
      const weightEventIds = new Set<string>();
      if (weightResult.data) {
        weightResult.data.forEach(record => {
          if (record.evento_id) weightEventIds.add(record.evento_id);
          allActivities.push({
            id: record.id,
            date: record.fecha,
            type: "pesaje",
            description: "Pesaje",
            details: {
              Peso: `${record.peso_kg} kg`,
              ...(record.ganancia_diaria ? { 'Ganancia diaria': `${record.ganancia_diaria} kg/día` } : {}),
              ...(record.tipo_pesaje ? { Tipo: record.tipo_pesaje } : {}),
            },
            notes: record.notas || undefined
          });
        });
      }

      // Process eventos (general, tacto, etc.)
      if (eventResult.data) {
        eventResult.data.forEach(event => {
          const details: Record<string, string> = {};
          let shouldInclude = false;
          
          if (event.payload) {
            const payload = event.payload as any;
            
            // Check animales_ids array
            if (payload.animales_ids && Array.isArray(payload.animales_ids)) {
              shouldInclude = payload.animales_ids.includes(animalId);
            }

            if (shouldInclude) {
              // Skip PESAJE events if we already have them from weight_history
              if (event.tipo === "PESAJE" && weightEventIds.has(event.id)) {
                return; // Already covered by weight history
              }

              if (event.tipo === "GENERAL") {
                if (payload.tipo_actividad) {
                  details['Tipo de Actividad'] = getManagementActivityLabel(payload.tipo_actividad);
                }
                if (payload.responsable) {
                  details['Responsable'] = payload.responsable;
                }
                if (payload.detalles) {
                  Object.entries(payload.detalles).forEach(([key, value]) => {
                    details[formatDetailKey(key)] = String(value);
                  });
                }
              } else if (event.tipo === "TACTO") {
                // Extract tacto results from payload
                if (payload.resultados && Array.isArray(payload.resultados)) {
                  const resultado = payload.resultados.find((r: any) => r.animal_id === animalId);
                  if (resultado) {
                    details['Resultado'] = resultado.resultado === 'preñada' ? 'Preñada' : 'Vacía';
                  }
                }
              } else if (event.tipo === "PESAJE") {
                // Extract weight from payload if not in weight_history
                if (payload.mediciones && Array.isArray(payload.mediciones)) {
                  const medicion = payload.mediciones.find((m: any) => m.animal_id === animalId);
                  if (medicion?.peso_kg) {
                    details['Peso'] = `${medicion.peso_kg} kg`;
                  }
                }
              }
            }
          }

          if (shouldInclude) {
            allActivities.push({
              id: event.id,
              date: event.fecha,
              type: event.tipo === "GENERAL" ? (event.payload as any)?.tipo_actividad || 'general' : event.tipo.toLowerCase(),
              description: getEventDescription(event.tipo, (event.payload as any)?.tipo_actividad),
              details,
              responsable: (event.payload as any)?.responsable,
              notes: event.notas || undefined
            });
          }
        });
      }

      // Sort all activities by date (most recent first)
      allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setActivities(allActivities);
    } catch (error) {
      console.error("Error fetching animal activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getManagementActivityLabel = (tipo: string): string => {
    const labels: { [key: string]: string } = {
      "destete": "Destete",
      "marcacion": "Marcación",
      "castracion": "Castración",
      "descorne": "Descorne",
      "tratamiento": "Tratamiento",
      "apareamiento": "Apareamiento Natural",
      "parto": "Parto"
    };
    return labels[tipo] || tipo.charAt(0).toUpperCase() + tipo.slice(1);
  };

  const formatDetailKey = (key: string): string => {
    const keyMap: { [key: string]: string } = {
      "peso_destete": "Peso al Destete",
      "edad_destete": "Edad al Destete",
      "metodo": "Método",
      "ubicacion_marca": "Ubicación Marca",
      "tipo_hierro": "Tipo de Hierro",
      "numero_marca": "Número de Marca",
      "metodo_castracion": "Método",
      "anestesia": "Anestesia",
      "antibiotico": "Antibiótico",
      "metodo_descorne": "Método",
      "edad_animal": "Edad",
      "cicatrizante": "Cicatrizante",
      "medicamento": "Medicamento",
      "dosis": "Dosis",
      "via_administracion": "Vía",
      "diagnostico": "Diagnóstico",
      "temperatura": "Temperatura",
      "frecuencia_cardiaca": "Frec. Cardíaca",
      "estado_general": "Estado",
      "hallazgos": "Hallazgos",
      "toro_id": "ID Toro",
      "toro_nombre": "Toro",
      "metodo_monta": "Método Monta",
      "tipo_parto": "Tipo Parto",
      "dificultad": "Dificultad",
      "peso_cria": "Peso Cría",
      "sexo_cria": "Sexo Cría",
      "vitalidad": "Vitalidad"
    };
    return keyMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
  };

  const getEventDescription = (tipo: string, tipoActividad?: string): string => {
    if (tipo === "GENERAL" && tipoActividad) {
      return getManagementActivityLabel(tipoActividad);
    }
    const descriptions: { [key: string]: string } = {
      "PESAJE": "Pesaje",
      "VACUNACION": "Vacunación",
      "TACTO": "Detección de Preñez",
      "IA": "Inseminación Artificial",
      "GENERAL": "Actividad de Manejo"
    };
    return descriptions[tipo] || tipo;
  };

  useEffect(() => {
    fetchActivities();
  }, [animalId]);

  return {
    activities,
    isLoading,
    refresh: fetchActivities,
  };
}
