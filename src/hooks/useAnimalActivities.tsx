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

      // Fetch AI records
      const { data: aiData } = await supabase
        .from("artificial_inseminations")
        .select("*")
        .eq("female_id", animalId)
        .order("insemination_date", { ascending: false });

      if (aiData) {
        aiData.forEach(record => {
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

      // Fetch vaccination records from animal_vaccines
      const { data: vaccinationData } = await supabase
        .from("animal_vaccines")
        .select("*")
        .eq("animal_id", animalId)
        .order("date", { ascending: false });

      if (vaccinationData) {
        // Get requirement names
        const requirementIds = [...new Set(vaccinationData.map(v => v.requirement_id).filter(Boolean))];
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

        vaccinationData.forEach(record => {
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

      // Fetch reproductive events
      const { data: reproductiveData } = await supabase
        .from("reproductive_events")
        .select("*")
        .eq("animal_id", animalId)
        .order("year", { ascending: false });

      if (reproductiveData) {
        reproductiveData.forEach(record => {
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

      // Fetch general events - fetch all and filter in code
      const { data: eventData } = await supabase
        .from("eventos")
        .select(`
          *,
          pesajes(*),
          vacunaciones(*),
          tactos(*)
        `)
        .order("fecha", { ascending: false });

      if (eventData) {
        eventData.forEach(event => {
          const details: Record<string, string> = {};
          let shouldInclude = false;
          
          // Check if animal is in the event
          if (event.payload) {
            const payload = event.payload as any;
            
            // Check animales_ids array
            if (payload.animales_ids && Array.isArray(payload.animales_ids)) {
              shouldInclude = payload.animales_ids.includes(animalId);
            }
            
            // Process event details based on type
            if (shouldInclude && event.tipo === "GENERAL") {
              // General management activities
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
            } else if (event.tipo === "PESAJE" && event.pesajes && event.pesajes.length > 0) {
              const pesaje = event.pesajes[0];
              if (pesaje.mediciones) {
                const mediciones = Array.isArray(pesaje.mediciones) ? pesaje.mediciones : [pesaje.mediciones];
                const medicion = mediciones.find((m: any) => m.animal_id === animalId);
                if (medicion && typeof medicion === 'object') {
                  shouldInclude = true;
                  const pesoKg = (medicion as any).peso_kg;
                  if (pesoKg) {
                    details['Peso'] = `${pesoKg} kg`;
                  }
                }
              }
            } else if (event.tipo === "TACTO" && event.tactos && event.tactos.length > 0) {
              const tacto = event.tactos[0];
              if (tacto.resultados) {
                const resultados = Array.isArray(tacto.resultados) ? tacto.resultados : [tacto.resultados];
                const resultado = resultados.find((r: any) => r.animal_id === animalId);
                if (resultado && typeof resultado === 'object') {
                  shouldInclude = true;
                  const res = (resultado as any).resultado;
                  if (res) {
                    details['Resultado'] = res === 'preñada' ? 'Preñada' : 'Vacía';
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