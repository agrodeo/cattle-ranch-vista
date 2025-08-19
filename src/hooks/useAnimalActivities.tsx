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

      // Fetch vaccination records (both old and new tables)
      const { data: vaccinationData } = await supabase
        .from("animal_vaccines")
        .select("*, vaccines(name)")
        .eq("animal_id", animalId)
        .order("date", { ascending: false });

      if (vaccinationData) {
        vaccinationData.forEach(record => {
          allActivities.push({
            id: record.id,
            date: record.date,
            type: "vaccination",
            description: `Vacunación - ${record.vaccines?.name || record.vaccine_code}`,
            details: {
              vacuna: record.vaccines?.name || record.vaccine_code,
              lote: record.lot || "N/A",
              dosis: record.dose || "N/A",
              via: record.route || "N/A"
            }
          });
        });
      }

      // Fetch old vaccination records for backward compatibility
      const { data: oldVaccinationData } = await supabase
        .from("vacunas_historial")
        .select("*")
        .eq("animal_id", animalId)
        .order("fecha", { ascending: false });

      if (oldVaccinationData) {
        oldVaccinationData.forEach(record => {
          allActivities.push({
            id: record.id,
            date: record.fecha,
            type: "vaccination",
            description: `Vacunación - ${record.vacuna}`,
            details: {
              vacuna: record.vacuna,
              lote: record.lote || "N/A",
              dosis: record.dosis || "N/A",
              via: record.via || "N/A"
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

      // Fetch general events
      const { data: eventData } = await supabase
        .from("eventos")
        .select(`
          *,
          pesajes(*),
          vacunaciones(*),
          tactos(*)
        `)
        .contains("payload", { animal_ids: [animalId] })
        .order("fecha", { ascending: false });

      if (eventData) {
        eventData.forEach(event => {
          const details: Record<string, string> = {};
          
          if (event.tipo === "PESAJE" && event.pesajes && event.pesajes.length > 0) {
            const mediciones = event.pesajes[0].mediciones as any;
            if (mediciones) {
              Object.entries(mediciones).forEach(([key, value]) => {
                details[key] = String(value);
              });
            }
          }

          allActivities.push({
            id: event.id,
            date: event.fecha,
            type: event.tipo.toLowerCase(),
            description: getEventDescription(event.tipo),
            details,
            notes: event.notas || undefined
          });
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

  const getEventDescription = (tipo: string): string => {
    const descriptions: { [key: string]: string } = {
      "PESAJE": "Pesaje",
      "VACUNACION": "Vacunación",
      "TACTO": "Detección de Preñez",
      "IA": "Inseminación Artificial"
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