import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Animal {
  id: string;
  name: string | null;
  id_tag: string | null;
  sex: string;
  birth_date: string | null;
  corral_id: string | null;
  father_id: string | null;
  mother_id: string | null;
  status: string;
}

interface Corral {
  id: string;
  name: string;
  capacity: number | null;
  hectareas: number | null;
  animal_count: number;
}

interface ConsanguinityRisk {
  animal1_id: string;
  animal1_name: string;
  animal2_id: string;
  animal2_name: string;
  relationship: string;
  severity: 'severe' | 'medium' | 'low';
  corral_id: string;
  corral_name: string;
}

interface CapacityIssue {
  corral_id: string;
  corral_name: string;
  current_count: number;
  capacity: number;
  overflow: number;
}

interface SeparationIssue {
  calf_id: string;
  calf_name: string;
  mother_id: string;
  mother_name: string;
  calf_corral_id: string | null;
  mother_corral_id: string | null;
  age_months: number;
}

interface SuggestedMove {
  animal_id: string;
  animal_name: string;
  from_corral_id: string | null;
  from_corral_name: string | null;
  to_corral_id: string;
  to_corral_name: string;
  reason: string;
  issue_type: 'consanguinity' | 'capacity' | 'separation';
  paired_with?: string; // For mother-calf pairs
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { cabanaId, language = 'es' } = await req.json();

    if (!cabanaId) {
      return new Response(JSON.stringify({ error: 'cabanaId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Optimizing corrals for cabana:', cabanaId);

    // 1. Fetch all animals with genealogy
    const { data: animals, error: animalsError } = await supabase
      .from('animals')
      .select('id, name, id_tag, sex, birth_date, corral_id, father_id, mother_id, status')
      .eq('cabaña_id', cabanaId)
      .eq('status', 'activo');

    if (animalsError) throw animalsError;

    // 2. Fetch all corrals with capacity
    const { data: corrals, error: corralsError } = await supabase
      .from('corrales')
      .select('id, name, capacity, hectareas')
      .eq('cabaña_id', cabanaId);

    if (corralsError) throw corralsError;

    if (!corrals || corrals.length === 0) {
      const messages = {
        es: 'No hay corrales configurados. Crea al menos un corral primero.',
        en: 'No corrals configured. Create at least one corral first.',
        pt: 'Nenhum curral configurado. Crie pelo menos um curral primeiro.',
      };
      return new Response(JSON.stringify({ error: messages[language as keyof typeof messages] || messages.es }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Count animals per corral
    const corralAnimals: Record<string, Animal[]> = {};
    animals.forEach((animal: Animal) => {
      if (animal.corral_id) {
        if (!corralAnimals[animal.corral_id]) {
          corralAnimals[animal.corral_id] = [];
        }
        corralAnimals[animal.corral_id].push(animal);
      }
    });

    const corralsWithCounts: Corral[] = corrals.map((corral: any) => ({
      ...corral,
      animal_count: corralAnimals[corral.id]?.length || 0,
    }));

    // 4. Detect consanguinity risks
    const consanguinityRisks: ConsanguinityRisk[] = [];
    const MAX_AGE_MONTHS = 15;

    for (const corral of corralsWithCounts) {
      const animalsInCorral = corralAnimals[corral.id] || [];
      const reproductiveAgeMales = animalsInCorral.filter(a => {
        const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
        return a.sex === 'Macho' && ageMonths >= MAX_AGE_MONTHS;
      });
      const reproductiveAgeFemales = animalsInCorral.filter(a => {
        const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
        return a.sex === 'Hembra' && ageMonths >= MAX_AGE_MONTHS;
      });

      // Check all male-female pairs
      for (const male of reproductiveAgeMales) {
        for (const female of reproductiveAgeFemales) {
          const relationship = checkRelationship(male, female);
          if (relationship) {
            consanguinityRisks.push({
              animal1_id: male.id,
              animal1_name: male.name || male.id_tag || 'Sin nombre',
              animal2_id: female.id,
              animal2_name: female.name || female.id_tag || 'Sin nombre',
              relationship: relationship.type,
              severity: relationship.severity,
              corral_id: corral.id,
              corral_name: corral.name,
            });
          }
        }
      }
    }

    // 5. Detect capacity issues
    const capacityIssues: CapacityIssue[] = [];
    for (const corral of corralsWithCounts) {
      const capacity = corral.capacity || (corral.hectareas ? Math.round(corral.hectareas * 2) : null);
      if (capacity && corral.animal_count > capacity) {
        capacityIssues.push({
          corral_id: corral.id,
          corral_name: corral.name,
          current_count: corral.animal_count,
          capacity,
          overflow: corral.animal_count - capacity,
        });
      }
    }

    // 6. Detect mother-calf separations
    const separationIssues: SeparationIssue[] = [];
    const MAX_CALF_AGE_MONTHS = 8;

    for (const animal of animals) {
      if (animal.mother_id && animal.birth_date) {
        const ageMonths = calculateAgeInMonths(animal.birth_date);
        if (ageMonths < MAX_CALF_AGE_MONTHS) {
          const mother = animals.find((a: Animal) => a.id === animal.mother_id);
          if (mother && animal.corral_id !== mother.corral_id) {
            separationIssues.push({
              calf_id: animal.id,
              calf_name: animal.name || animal.id_tag || 'Sin nombre',
              mother_id: mother.id,
              mother_name: mother.name || mother.id_tag || 'Sin nombre',
              calf_corral_id: animal.corral_id,
              mother_corral_id: mother.corral_id,
              age_months: ageMonths,
            });
          }
        }
      }
    }

    // 7. Generate suggested moves
    const suggestedMoves: SuggestedMove[] = [];
    const movedAnimals = new Set<string>();

    // Helper to find best destination corral
    const findBestDestination = (animal: Animal, exclude: string[] = []): { corral: Corral; reason: string } | null => {
      const availableCorrals = corralsWithCounts.filter(c => {
        if (exclude.includes(c.id)) return false;
        const capacity = c.capacity || (c.hectareas ? Math.round(c.hectareas * 2) : 999);
        return c.animal_count < capacity;
      });

      if (availableCorrals.length === 0) return null;

      // Sort by most space available
      availableCorrals.sort((a, b) => {
        const aCapacity = a.capacity || (a.hectareas ? Math.round(a.hectareas * 2) : 999);
        const bCapacity = b.capacity || (b.hectareas ? Math.round(b.hectareas * 2) : 999);
        const aSpace = aCapacity - a.animal_count;
        const bSpace = bCapacity - b.animal_count;
        return bSpace - aSpace;
      });

      const bestCorral = availableCorrals[0];
      return { corral: bestCorral, reason: 'Espacio disponible' };
    };

    // Priority 1: Solve separation issues (mother-calf)
    for (const issue of separationIssues) {
      if (movedAnimals.has(issue.calf_id) || movedAnimals.has(issue.mother_id)) continue;

      // Move calf to mother's corral if possible
      const motherCorral = corralsWithCounts.find(c => c.id === issue.mother_corral_id);
      if (motherCorral) {
        const capacity = motherCorral.capacity || (motherCorral.hectareas ? Math.round(motherCorral.hectareas * 2) : 999);
        if (motherCorral.animal_count < capacity) {
          suggestedMoves.push({
            animal_id: issue.calf_id,
            animal_name: issue.calf_name,
            from_corral_id: issue.calf_corral_id,
            from_corral_name: corralsWithCounts.find(c => c.id === issue.calf_corral_id)?.name || null,
            to_corral_id: motherCorral.id,
            to_corral_name: motherCorral.name,
            reason: `Reunir con madre (${issue.age_months} meses)`,
            issue_type: 'separation',
          });
          movedAnimals.add(issue.calf_id);
          motherCorral.animal_count++;
        }
      }
    }

    // Priority 2: Solve consanguinity risks
    for (const risk of consanguinityRisks) {
      if (movedAnimals.has(risk.animal1_id) || movedAnimals.has(risk.animal2_id)) continue;

      // Move the animal that's easier to relocate (male first)
      const animalToMove = animals.find((a: Animal) => a.id === risk.animal1_id);
      if (!animalToMove) continue;

      const destination = findBestDestination(animalToMove, [risk.corral_id]);
      if (destination) {
        suggestedMoves.push({
          animal_id: animalToMove.id,
          animal_name: risk.animal1_name,
          from_corral_id: risk.corral_id,
          from_corral_name: risk.corral_name,
          to_corral_id: destination.corral.id,
          to_corral_name: destination.corral.name,
          reason: `Evitar consanguinidad: ${risk.relationship}`,
          issue_type: 'consanguinity',
        });
        movedAnimals.add(animalToMove.id);
        destination.corral.animal_count++;
        const fromCorral = corralsWithCounts.find(c => c.id === risk.corral_id);
        if (fromCorral) fromCorral.animal_count--;
      }
    }

    // Priority 3: Solve capacity issues
    for (const issue of capacityIssues) {
      const overcrowdedCorral = corralsWithCounts.find(c => c.id === issue.corral_id);
      if (!overcrowdedCorral) continue;

      const animalsInOvercrowded = corralAnimals[issue.corral_id] || [];
      let movedCount = 0;

      for (const animal of animalsInOvercrowded) {
        if (movedAnimals.has(animal.id)) continue;
        if (movedCount >= issue.overflow) break;

        const destination = findBestDestination(animal, [issue.corral_id]);
        if (destination) {
          suggestedMoves.push({
            animal_id: animal.id,
            animal_name: animal.name || animal.id_tag || 'Sin nombre',
            from_corral_id: issue.corral_id,
            from_corral_name: issue.corral_name,
            to_corral_id: destination.corral.id,
            to_corral_name: destination.corral.name,
            reason: `Reducir sobrecarga (${issue.current_count}/${issue.capacity})`,
            issue_type: 'capacity',
          });
          movedAnimals.add(animal.id);
          destination.corral.animal_count++;
          overcrowdedCorral.animal_count--;
          movedCount++;
        }
      }
    }

    // 8. Calculate before/after metrics
    const beforeCounts: Record<string, number> = {};
    const afterCounts: Record<string, number> = {};

    corralsWithCounts.forEach(corral => {
      beforeCounts[corral.id] = corralAnimals[corral.id]?.length || 0;
      afterCounts[corral.id] = corral.animal_count;
    });

    return new Response(
      JSON.stringify({
        issues: {
          consanguinity: consanguinityRisks,
          capacity: capacityIssues,
          separation: separationIssues,
        },
        suggestedMoves,
        corralSummary: {
          beforeCounts,
          afterCounts,
        },
        totalIssues: consanguinityRisks.length + capacityIssues.length + separationIssues.length,
        totalMoves: suggestedMoves.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error optimizing corrals:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateAgeInMonths(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  return months;
}

function checkRelationship(animal1: Animal, animal2: Animal): { type: string; severity: 'severe' | 'medium' | 'low' } | null {
  // Parent-child (severe)
  if (animal1.id === animal2.father_id || animal1.id === animal2.mother_id) {
    return { type: 'parent-child', severity: 'severe' };
  }
  if (animal2.id === animal1.father_id || animal2.id === animal1.mother_id) {
    return { type: 'parent-child', severity: 'severe' };
  }

  // Full siblings (severe)
  if (animal1.father_id && animal1.mother_id && animal2.father_id && animal2.mother_id) {
    if (animal1.father_id === animal2.father_id && animal1.mother_id === animal2.mother_id) {
      return { type: 'full-siblings', severity: 'severe' };
    }
  }

  // Half siblings (medium)
  if (animal1.father_id && animal2.father_id && animal1.father_id === animal2.father_id) {
    return { type: 'half-siblings-paternal', severity: 'medium' };
  }
  if (animal1.mother_id && animal2.mother_id && animal1.mother_id === animal2.mother_id) {
    return { type: 'half-siblings-maternal', severity: 'medium' };
  }

  return null;
}
