import { useState, useEffect, useCallback } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Animal } from "@/types/animal";
import { normalizeAnimalStatus } from "@/lib/statusUtils";
import { categorizeAnimal } from "@/lib/animalCategories";
import { cleanupInactiveAnimalsFromCorrals } from "@/lib/animalCleanup";
import { db } from "@/services/db";
import { useConnectivity } from "@/services/connectivity";
import type { CachedAnimal } from "@/services/offlineTypes";
import { useTranslation } from "react-i18next";

interface ParentAnimal {
  id: string;
  name?: string;
  id_tag: string;
  sex: string;
}

interface Cabaña {
  id: string;
  name: string;
  location: string;
}

export function useAnimalsData() {
  const { currentUser } = useSupabaseAuth();
  const { t } = useTranslation(['animals', 'common']);
  const { isOnline } = useConnectivity();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [cabañas, setCabañas] = useState<Cabaña[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCabaña, setUserCabaña] = useState<string>("");
  const [parentAnimals, setParentAnimals] = useState<ParentAnimal[]>([]);

  useEffect(() => {
    fetchCabañas();
    fetchUserCabaña();
  }, [currentUser]);

  useEffect(() => {
    if (userCabaña) {
      fetchAnimals();
      fetchParentAnimals();
    }
  }, [userCabaña]);

  const fetchUserCabaña = async () => {
    if (!currentUser?.id) return;
    try {
      const { data, error } = await supabase.rpc("get_user_cabana_info", {
        user_uuid: currentUser.id,
      });
      if (error) throw error;
      if (!data) {
        toast({ title: t('animals:errors.configRequired'), description: t('animals:errors.contactAdmin'), variant: "destructive" });
        return;
      }
      setUserCabaña(data[0]?.cabana_id || "");
    } catch (error) {
      console.error("Error fetching user cabaña:", error);
      toast({ title: t('common:errors.generic'), description: t('animals:errors.loadUserInfo'), variant: "destructive" });
    }
  };

  const fetchParentAnimals = async () => {
    if (!userCabaña) return;
    try {
      const { data, error } = await supabase
        .from("animals")
        .select("id, name, id_tag, sex")
        .eq("cabaña_id", userCabaña)
        .eq("status", "Activo")
        .order("name");
      if (error) throw error;
      setParentAnimals(data || []);
    } catch (error) {
      console.error("Error fetching parent animals:", error);
    }
  };

  const loadFromCache = useCallback(async () => {
    if (!userCabaña) return;
    try {
      const cached = await db.animals_cache
        .where('cabaña_id')
        .equals(userCabaña)
        .toArray();
      if (cached.length > 0) {
        cached.sort((a, b) => {
          if (!a.birth_date && !b.birth_date) return 0;
          if (!a.birth_date) return 1;
          if (!b.birth_date) return -1;
          return new Date(b.birth_date).getTime() - new Date(a.birth_date).getTime();
        });
        setAnimals(cached as unknown as Animal[]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading from cache:', err);
    }
  }, [userCabaña]);

  const syncFromServer = useCallback(async () => {
    if (!userCabaña || !isOnline) return;
    try {
      const { data, error } = await supabase
        .from("animals")
        .select("*, is_castrated")
        .eq("cabaña_id", userCabaña)
        .order("birth_date", { ascending: false, nullsFirst: false });
      if (error) throw error;

      const pendingIds = (await db.animals_cache
        .where('sync_status')
        .equals('pending')
        .toArray()
      ).map(a => a.id);

      for (const animal of data || []) {
        if (pendingIds.includes(animal.id)) continue;
        await db.animals_cache.put({
          ...animal,
          cabaña_id: animal.cabaña_id || userCabaña,
          sex: animal.sex as 'Macho' | 'Hembra',
          status: (animal.status || 'activo') as 'activo' | 'vendido' | 'muerto',
          updated_at: new Date().toISOString(),
          sync_status: 'synced'
        } as CachedAnimal);
      }
      setAnimals(data || []);
    } catch (error) {
      console.error("Error syncing animals:", error);
      if (animals.length === 0) {
        toast({ title: t('common:errors.generic'), description: t('animals:errors.loadAnimals'), variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [userCabaña, isOnline, animals.length, t]);

  const fetchAnimals = useCallback(async () => {
    if (!userCabaña) {
      setLoading(false);
      return;
    }
    await loadFromCache();
    await syncFromServer();
  }, [userCabaña, loadFromCache, syncFromServer]);

  const fetchCabañas = async () => {
    try {
      const { data, error } = await supabase.from("cabañas").select("*").order("name");
      if (error) throw error;
      setCabañas(data || []);
    } catch (error) {
      console.error("Error fetching cabañas:", error);
    }
  };

  const deleteAnimal = async (animalId: string) => {
    if (!confirm(t('animals:messages.confirmDelete'))) return;
    try {
      await supabase.from("animal_vaccines").delete().eq("animal_id", animalId);
      await supabase.from("activities").delete().eq("animal_id", animalId);
      await supabase.from("reproductive_events").delete().eq("animal_id", animalId);
      await supabase.from("preñeces").delete().eq("animal_id", animalId);
      await supabase.from("reproductive_current_state").delete().eq("animal_id", animalId);
      await supabase.from("verification_tasks").delete().eq("animal_id", animalId);
      await supabase.from("reproductive_alerts").delete().eq("animal_id", animalId);
      await supabase.from("vaccination_alerts").delete().eq("animal_id", animalId);
      await supabase.from("finances_animal_sales").delete().eq("animal_id", animalId);
      await supabase.from("animal_weight_history").delete().eq("animal_id", animalId);
      await supabase.from("individual_reproductive_kpis").delete().eq("animal_id", animalId);
      await supabase.from("reproductive_active_years").delete().eq("animal_id", animalId);
      await supabase.from("reproductive_activities").delete().eq("animal_id", animalId);
      const { error } = await supabase.from("animals").delete().eq("id", animalId);
      if (error) throw error;
      toast({ title: t('common:status.success'), description: t('animals:messages.deleted') });
      fetchAnimals();
    } catch (error) {
      console.error("Error deleting animal:", error);
      toast({ title: t('common:status.error'), description: t('animals:errors.deleteFailed'), variant: "destructive" });
    }
  };

  const cleanupAfterStatusChange = async (animalCabañaId: string) => {
    await cleanupInactiveAnimalsFromCorrals(animalCabañaId);
  };

  // Computed values
  const activeAnimalsList = animals.filter(a => normalizeAnimalStatus(a.status) === "active");
  const metrics = {
    activeAnimals: activeAnimalsList.length,
    activeFemales: activeAnimalsList.filter(a => a.sex === "Hembra").length,
    activeMales: activeAnimalsList.filter(a => a.sex === "Macho").length,
    soldAnimals: animals.filter(a => normalizeAnimalStatus(a.status) === "sold").length,
    deadAnimals: animals.filter(a => normalizeAnimalStatus(a.status) === "dead").length,
    totalAnimals: animals.length,
  };

  const availableBreeds = Array.from(new Set(animals.map(a => a.breed))).filter(Boolean);

  return {
    animals,
    cabañas,
    loading,
    userCabaña,
    parentAnimals,
    metrics,
    availableBreeds,
    fetchAnimals,
    deleteAnimal,
    cleanupAfterStatusChange,
    isOnline,
  };
}
