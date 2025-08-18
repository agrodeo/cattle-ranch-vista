import { supabase } from "@/integrations/supabase/client";

/**
 * Removes inactive animals (dead or sold) from all corrals
 * @param cabañaId - The cabaña ID to clean up
 * @returns Promise with the number of animals removed
 */
export async function cleanupInactiveAnimalsFromCorrals(cabañaId: string): Promise<number> {
  try {
    // Update animals with inactive status to remove them from corrals
    const { data, error } = await supabase
      .from("animals")
      .update({ corral_id: null })
      .eq("cabaña_id", cabañaId)
      .in("status", ["vendido", "muerto", "Vendido", "Muerto"])
      .select("id");

    if (error) {
      console.error("Error cleaning up inactive animals from corrals:", error);
      throw error;
    }

    const removedCount = data?.length || 0;
    console.log(`🧹 Cleaned up ${removedCount} inactive animals from corrals`);
    
    return removedCount;
  } catch (error) {
    console.error("Failed to cleanup inactive animals:", error);
    throw error;
  }
}

/**
 * Validates if an animal is active (not dead or sold)
 * @param status - The animal's status
 * @returns boolean indicating if the animal is active
 */
export function isAnimalActive(status: string | null | undefined): boolean {
  if (!status) return true; // Assume active if no status
  
  const inactiveStatuses = ["vendido", "muerto", "Vendido", "Muerto"];
  return !inactiveStatuses.includes(status);
}

/**
 * Filter function to exclude inactive animals from arrays
 * @param animals - Array of animals to filter
 * @returns Array of only active animals
 */
export function filterActiveAnimals<T extends { status?: string | null }>(animals: T[]): T[] {
  return animals.filter(animal => isAnimalActive(animal.status));
}