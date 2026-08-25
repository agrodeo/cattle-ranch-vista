import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { isOnline } from "@/services/connectivity";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";

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
  corral_name?: string;
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
  const { currentUser } = useSupabaseAuth();

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      
      // Check if user is authenticated and has cabaña_id
      if (!currentUser?.cabañaId) {
        return;
      }

      // Skip network calls when offline
      if (!isOnline()) {
        setIsLoading(false);
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
      if (!currentUser?.cabañaId) return [];

      let rawAnimals: any[] = [];

      if (!isOnline()) {
        // ── OFFLINE: load from IndexedDB cache ──
        try {
          const { db } = await import('@/services/db');
          const cached = await db.animals_cache
            .where('cabaña_id')
            .equals(currentUser.cabañaId)
            .toArray();
          rawAnimals = cached.filter(a => {
            const s = (a.status || '').toLowerCase();
            return s !== 'vendido' && s !== 'muerto';
          });
          // Resolve corral names from cache
          const corrales = await db.corrales_cache
            .where('cabaña_id')
            .equals(currentUser.cabañaId)
            .toArray();
          const corralMap = new Map(corrales.map(c => [c.id, c.name]));
          rawAnimals = rawAnimals.map(a => ({
            ...a,
            corral_name: a.corral_id ? corralMap.get(a.corral_id) || null : null,
          }));
        } catch (e) {
          console.warn('Failed to load animals from offline cache:', e);
          return [];
        }
      } else {
        // ── ONLINE: load from Supabase ──
        let query = supabase
          .from("animals")
          .select(`*, corrales:corral_id(name)`)
          .eq("cabaña_id", currentUser.cabañaId)
          .not('status', 'ilike', 'vendido')
          .not('status', 'ilike', 'muerto');

        if (activityType === 'IA' || activityType === 'TACTO') {
          query = query.eq("sex", "Hembra").eq("esta_preñada", false);
        }

        const { data, error } = await query;
        if (error) throw error;

        rawAnimals = (data || []).map(animal => ({
          ...animal,
          corral_name: animal.corrales?.name || null,
        }));
      }

      // Apply activity-specific filters (also needed for offline data)
      let eligible = rawAnimals;
      if (activityType === 'IA' || activityType === 'TACTO') {
        eligible = eligible.filter(a => {
          if (a.sex !== 'Hembra') return false;
          if (a.esta_preñada) return false;
          if (a.birth_date) {
            const ageMonths = Math.floor(
              (Date.now() - new Date(a.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
            );
            return ageMonths >= 15;
          }
          return true;
        });
      }

      return eligible as EligibleAnimal[];
    } catch (error) {
      console.error("Error fetching eligible animals:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los animales elegibles" });
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

      // Process general activities with their specific logic
      if (tipo === 'GENERAL' && event) {
        try {
          await invokeEdgeFunction('process-general-activity', {
            body: { evento_id: event.id }
          });
        } catch (processError) {
          console.error('Error processing general activity:', processError);
          // Don't throw - activity was created, just processing failed
        }
      }

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
  }, [currentUser]);

  return {
    stats,
    isLoading,
    fetchStats,
    getEligibleAnimals,
    createEvent,
  };
}