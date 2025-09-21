import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVaccinationRequirements } from "./useVaccinationRequirements";
import { useToast } from "@/hooks/use-toast";

export interface VaccinationCompliance {
  animalId: string;
  totalRequired: number;
  completed: number;
  percentage: number;
  missing: VaccinationRequirement[];
  overdue: VaccinationRequirement[];
  upcoming: VaccinationRequirement[];
}

export interface VaccinationRequirement {
  id: string;
  vaccine_name: string;
  vaccine_type: string;
  is_mandatory: boolean;
  doses_required?: number;
  interval_between_doses_days?: number;
  frequency_months?: number;
  sex_restriction?: string;
  min_age_months?: number;
  max_age_months?: number;
}

export interface NextDoseInfo {
  doseNumber: number;
  nextDueDate: Date | null;
  isBooster: boolean;
  daysSinceLastDose?: number;
}

export interface HerdCompliance {
  totalAnimals: number;
  fullyCompliant: number;
  partiallyCompliant: number;
  nonCompliant: number;
  overallPercentage: number;
  totalVaccinations: number;
  totalRequired: number;
}

export function useVaccinationLogic() {
  const { requirements } = useVaccinationRequirements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const calculateAnimalCompliance = async (animalId: string): Promise<VaccinationCompliance> => {
    try {
      // Get animal details
      const { data: animal, error: animalError } = await supabase
        .from('animals')
        .select('id, sex, birth_date')
        .eq('id', animalId)
        .single();

      if (animalError) throw animalError;

      const animalAge = animal.birth_date 
        ? Math.floor((new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
        : 0;

      // Filter applicable requirements
      const applicableRequirements = requirements.filter(req => {
        if (req.sex_restriction && req.sex_restriction !== animal.sex) return false;
        if (req.min_age_months && animalAge < req.min_age_months) return false;
        if (req.max_age_months && animalAge > req.max_age_months) return false;
        return true;
      });

      // Get vaccination history
      const { data: vaccinations, error: vacError } = await supabase
        .from('vacunas_historial')
        .select('*')
        .eq('animal_id', animalId)
        .order('fecha', { ascending: false });

      if (vacError) throw vacError;

      const missing: VaccinationRequirement[] = [];
      const overdue: VaccinationRequirement[] = [];
      const upcoming: VaccinationRequirement[] = [];
      let completed = 0;

      for (const requirement of applicableRequirements) {
        const relevantVaccinations = vaccinations?.filter(v => 
          v.vacuna.toLowerCase().includes(requirement.vaccine_name.toLowerCase()) ||
          v.vacuna.toLowerCase().includes(requirement.vaccine_type.toLowerCase())
        ) || [];

        const lastVaccination = relevantVaccinations[0];
        const dosesGiven = relevantVaccinations.length;
        const requiredDoses = requirement.doses_required || 1;

        if (dosesGiven === 0) {
          missing.push(requirement);
        } else if (dosesGiven < requiredDoses) {
          const daysSinceLastDose = lastVaccination 
            ? Math.floor((new Date().getTime() - new Date(lastVaccination.fecha).getTime()) / (1000 * 60 * 60 * 24))
            : 0;

          const intervalDays = requirement.interval_between_doses_days || 30;
          
          if (daysSinceLastDose >= intervalDays) {
            overdue.push(requirement);
          } else {
            upcoming.push(requirement);
          }
        } else {
          // Check if booster is needed
          if (requirement.frequency_months && lastVaccination) {
            const monthsSinceLastVaccination = Math.floor(
              (new Date().getTime() - new Date(lastVaccination.fecha).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
            );

            if (monthsSinceLastVaccination >= requirement.frequency_months) {
              overdue.push(requirement);
            } else {
              completed++;
            }
          } else {
            completed++;
          }
        }
      }

      const totalRequired = applicableRequirements.length;
      const percentage = totalRequired > 0 ? Math.round((completed / totalRequired) * 100) : 100;

      return {
        animalId,
        totalRequired,
        completed,
        percentage,
        missing,
        overdue,
        upcoming
      };
    } catch (error) {
      console.error('Error calculating animal compliance:', error);
      throw error;
    }
  };

  const calculateHerdCompliance = async (): Promise<HerdCompliance> => {
    try {
      setLoading(true);

      // Get all active animals
      const { data: animals, error: animalsError } = await supabase
        .from('animals')
        .select('id')
        .not('status', 'in', '(vendido,muerto)')
        .eq('cabaña_id', await getCurrentCabanaId());

      if (animalsError) throw animalsError;

      const compliancePromises = animals?.map(animal => 
        calculateAnimalCompliance(animal.id)
      ) || [];

      const complianceResults = await Promise.all(compliancePromises);

      const fullyCompliant = complianceResults.filter(c => c.percentage === 100).length;
      const partiallyCompliant = complianceResults.filter(c => c.percentage > 0 && c.percentage < 100).length;
      const nonCompliant = complianceResults.filter(c => c.percentage === 0).length;

      const totalVaccinations = complianceResults.reduce((sum, c) => sum + c.completed, 0);
      const totalRequired = complianceResults.reduce((sum, c) => sum + c.totalRequired, 0);
      const overallPercentage = totalRequired > 0 ? Math.round((totalVaccinations / totalRequired) * 100) : 100;

      return {
        totalAnimals: animals?.length || 0,
        fullyCompliant,
        partiallyCompliant,
        nonCompliant,
        overallPercentage,
        totalVaccinations,
        totalRequired
      };
    } catch (error) {
      console.error('Error calculating herd compliance:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getNextDoseInfo = async (animalId: string, requirementId: string): Promise<NextDoseInfo> => {
    try {
      const requirement = requirements.find(r => r.id === requirementId);
      if (!requirement) throw new Error('Requirement not found');

      // Get vaccination history for this specific vaccine
      const { data: vaccinations, error } = await supabase
        .from('vacunas_historial')
        .select('*')
        .eq('animal_id', animalId)
        .or(`vacuna.ilike.%${requirement.vaccine_name}%,vacuna.ilike.%${requirement.vaccine_type}%`)
        .order('fecha', { ascending: false });

      if (error) throw error;

      const dosesGiven = vaccinations?.length || 0;
      const requiredDoses = requirement.doses_required || 1;
      const lastVaccination = vaccinations?.[0];

      let nextDueDate: Date | null = null;
      let isBooster = false;
      let daysSinceLastDose: number | undefined;

      if (dosesGiven === 0) {
        // First dose
        nextDueDate = new Date();
      } else if (dosesGiven < requiredDoses) {
        // Additional dose in initial series
        if (lastVaccination && requirement.interval_between_doses_days) {
          nextDueDate = new Date(lastVaccination.fecha);
          nextDueDate.setDate(nextDueDate.getDate() + requirement.interval_between_doses_days);
          daysSinceLastDose = Math.floor(
            (new Date().getTime() - new Date(lastVaccination.fecha).getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      } else if (requirement.frequency_months && lastVaccination) {
        // Booster dose
        isBooster = true;
        nextDueDate = new Date(lastVaccination.fecha);
        nextDueDate.setMonth(nextDueDate.getMonth() + requirement.frequency_months);
        daysSinceLastDose = Math.floor(
          (new Date().getTime() - new Date(lastVaccination.fecha).getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      return {
        doseNumber: isBooster ? 1 : dosesGiven + 1, // Reset to 1 for boosters
        nextDueDate,
        isBooster,
        daysSinceLastDose
      };
    } catch (error) {
      console.error('Error getting next dose info:', error);
      throw error;
    }
  };

  const getEligibleVaccines = (selectedAnimals: string[]) => {
    // Return requirements as vaccine options, filtered by animal eligibility
    return requirements.map(req => ({
      id: req.id,
      code: req.vaccine_name,
      name: req.vaccine_name,
      type: req.vaccine_type,
      mandatory: req.is_mandatory,
      description: `${req.vaccine_type}${req.is_mandatory ? ' (Obligatoria)' : ''}`,
      category: 'requirement' as const,
      requirement: req
    }));
  };

  const recordVaccination = async (
    animalIds: string[],
    requirementId: string,
    date: string,
    lot?: string,
    dose?: string,
    route?: string
  ) => {
    try {
      const requirement = requirements.find(r => r.id === requirementId);
      if (!requirement) throw new Error('Requirement not found');

      // Get current user's cabaña
      const cabanaId = await getCurrentCabanaId();

      const promises = animalIds.map(async (animalId) => {
        // Get next dose info
        const nextDoseInfo = await getNextDoseInfo(animalId, requirementId);
        
        // Calculate next due date for this specific vaccination
        let nextDue: string | null = null;
        if (requirement.frequency_months) {
          const nextDueDate = new Date(date);
          nextDueDate.setMonth(nextDueDate.getMonth() + requirement.frequency_months);
          nextDue = nextDueDate.toISOString().split('T')[0];
        } else if (nextDoseInfo.doseNumber < (requirement.doses_required || 1) && requirement.interval_between_doses_days) {
          const nextDueDate = new Date(date);
          nextDueDate.setDate(nextDueDate.getDate() + requirement.interval_between_doses_days);
          nextDue = nextDueDate.toISOString().split('T')[0];
        }

        // Record in vaccination history
        const { error } = await supabase
          .from('vacunas_historial')
          .insert({
            animal_id: animalId,
            cabaña_id: cabanaId,
            fecha: date,
            vacuna: requirement.vaccine_name,
            lote: lot || null,
            dosis: dose || null,
            via: route || null,
            proxima_dosis: nextDue,
            dose_number: nextDoseInfo.doseNumber
          });

        if (error) throw error;
      });

      await Promise.all(promises);

      toast({
        title: "Vacunación registrada",
        description: `Se registró la vacunación para ${animalIds.length} animales`
      });

    } catch (error) {
      console.error('Error recording vaccination:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar la vacunación"
      });
      throw error;
    }
  };

  return {
    calculateAnimalCompliance,
    calculateHerdCompliance,
    getNextDoseInfo,
    getEligibleVaccines,
    recordVaccination,
    loading,
    requirements
  };
}

const getCurrentCabanaId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('cabaña_id')
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  if (!profile || !profile['cabaña_id']) throw new Error('No se pudo obtener la cabaña del usuario');
  
  return profile['cabaña_id'];
};