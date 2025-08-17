import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useHybridAuth } from "@/hooks/useHybridAuth";

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
  const { currentUser } = useHybridAuth();

  const fetchStats = async () => {
    try {
      console.log("📊 fetchStats called, currentUser:", currentUser);
      setIsLoading(true);
      
      // Check if user is authenticated and has cabaña_id
      if (!currentUser?.cabañaId) {
        console.log("❌ fetchStats: No currentUser or cabañaId");
        return;
      }

      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

      // Get event statistics
      const { data: events } = await supabase
        .from("eventos")
        .select("tipo, fecha")
        .eq("cabaña_id", currentUser.cabañaId);

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
        .eq("cabaña_id", currentUser.cabañaId)
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
      console.log("🔍 getEligibleAnimals called with activityType:", activityType);
      console.log("👤 currentUser:", currentUser);
      console.log("🏠 cabañaId:", currentUser?.cabañaId);
      
      // Check if user is authenticated and has cabaña_id
      if (!currentUser?.cabañaId) {
        console.log("❌ No currentUser or cabañaId, returning empty array");
        return [];
      }

      console.log("🔍 Building query for cabaña_id:", currentUser.cabañaId);
      
      let query = supabase
        .from("animals")
        .select("*")
        .eq("cabaña_id", currentUser.cabañaId)
        .neq("status", "Vendido")
        .neq("status", "Muerto");

      // Apply specific filters based on activity type
      if (activityType === 'IA') {
        console.log("🚺 Applying IA filters: females, not pregnant");
        // Only females >= 15 months, not pregnant
        query = query
          .eq("sex", "Hembra")
          .eq("esta_preñada", false);
      } else if (activityType === 'TACTO') {
        console.log("🚺 Applying TACTO filters: females only");
        // Only females >= 15 months
        query = query.eq("sex", "Hembra");
      } else {
        console.log("🐄 No sex filters for:", activityType);
      }

      console.log("📡 Executing query...");
      const { data: animals, error } = await query;

      console.log("📊 Query results:", { animals, error });
      console.log("📈 Animals count:", animals?.length || 0);

      if (error) throw error;

      // Filter by age (>= 15 months for reproductive activities)
      console.log("🎂 Applying age filters for reproductive activities...");
      const eligibleAnimals = animals?.filter(animal => {
        if (['IA', 'TACTO'].includes(activityType) && animal.birth_date) {
          const ageInMonths = Math.floor(
            (new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
          );
          console.log(`🐄 Animal ${animal.name} (${animal.id_tag}): ${ageInMonths} months old`);
          return ageInMonths >= 15;
        }
        return true;
      }) || [];

      console.log("✅ Final eligible animals:", eligibleAnimals.length);
      console.log("📋 Eligible animals list:", eligibleAnimals.map(a => ({ name: a.name, id_tag: a.id_tag, sex: a.sex })));
      
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
      // Check if user is authenticated and has cabaña_id
      if (!currentUser?.cabañaId || !currentUser?.id) throw new Error("Usuario no autenticado");

      const { data: event, error } = await supabase
        .from("eventos")
        .insert({
          cabaña_id: currentUser.cabañaId,
          tipo,
          fecha: fecha.toISOString().split('T')[0],
          creado_por: currentUser.id,
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