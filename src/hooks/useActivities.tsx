import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ActivityStats {
  totalActivities: number;
  monthlyActivities: number;
  inseminations: number;
  pregnancies: number;
  vaccinations: number;
  weighings: number;
}

interface EligibleAnimal {
  id: string;
  name: string;
  id_tag: string;
  sex: string;
  birth_date: string;
  breed: string;
  corral_id: string;
  esta_preñada?: boolean;
  peso_actual_kg?: number;
}

export function useActivities() {
  const [stats, setStats] = useState<ActivityStats>({
    totalActivities: 0,
    monthlyActivities: 0,
    inseminations: 0,
    pregnancies: 0,
    vaccinations: 0,
    weighings: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!userData?.cabaña_id) return;

      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

      // Get event statistics
      const { data: events } = await supabase
        .from("eventos")
        .select("tipo, fecha")
        .eq("cabaña_id", userData.cabaña_id);

      const totalActivities = events?.length || 0;
      const monthlyActivities = events?.filter(e => 
        e.fecha?.startsWith(currentMonth)
      ).length || 0;

      // Count by type
      const inseminations = events?.filter(e => e.tipo === 'IA').length || 0;
      const vaccinations = events?.filter(e => e.tipo === 'VACUNACION').length || 0;
      const weighings = events?.filter(e => e.tipo === 'PESAJE').length || 0;

      // Get confirmed pregnancies
      const { data: pregnancies } = await supabase
        .from("preñeces")
        .select("id")
        .eq("cabaña_id", userData.cabaña_id)
        .eq("estado", "confirmada");

      setStats({
        totalActivities,
        monthlyActivities,
        inseminations,
        pregnancies: pregnancies?.length || 0,
        vaccinations,
        weighings,
      });
    } catch (error) {
      console.error("Error fetching activity stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEligibleAnimals = async (activityType: 'IA' | 'TACTO' | 'PESAJE' | 'VACUNACION') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!userData?.cabaña_id) return [];

      console.log(`Fetching animals for activity: ${activityType}`);

      let query = supabase
        .from("animals")
        .select("*")
        .eq("cabaña_id", userData.cabaña_id)
        .neq("status", "Vendido")
        .neq("status", "Muerto");

      // Apply specific filters based on activity type
      if (activityType === 'IA') {
        // Only females >= 15 months, not pregnant
        query = query
          .eq("sex", "Hembra")
          .eq("esta_preñada", false);
      } else if (activityType === 'TACTO') {
        // Only females >= 15 months
        query = query.eq("sex", "Hembra");
      }

      const { data: animals, error } = await query;

      if (error) throw error;

      console.log(`Initial query returned ${animals?.length || 0} animals for ${activityType}`, animals);

      // Filter by age (>= 15 months for reproductive activities)
      const eligibleAnimals = animals?.filter(animal => {
        if (['IA', 'TACTO'].includes(activityType) && animal.birth_date) {
          const ageInMonths = Math.floor(
            (new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
          );
          console.log(`Animal ${animal.name || animal.id_tag}: age ${ageInMonths} months`);
          return ageInMonths >= 15;
        }
        return true;
      }) || [];

      console.log(`Final eligible animals for ${activityType}: ${eligibleAnimals.length}`, eligibleAnimals);

      return eligibleAnimals as EligibleAnimal[];
    } catch (error) {
      console.error("Error fetching eligible animals:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los animales elegibles",
      });
      return [];
    }
  };

  const createEvent = async (
    tipo: 'IA' | 'TACTO' | 'VACUNACION' | 'PESAJE' | 'GENERAL',
    fecha: Date,
    notas?: string,
    payload?: any
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!userData?.cabaña_id) throw new Error("Usuario sin cabaña");

      const { data: event, error } = await supabase
        .from("eventos")
        .insert({
          cabaña_id: userData.cabaña_id,
          tipo,
          fecha: fecha.toISOString().split('T')[0],
          creado_por: user.id,
          notas,
          payload,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh stats after creating event
      fetchStats();
      
      return event;
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    isLoading,
    fetchStats,
    getEligibleAnimals,
    createEvent,
  };
}