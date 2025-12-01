import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ObjectiveType = 'consanguinity' | 'fertility' | 'weight';
type LanguageType = 'es' | 'en' | 'pt';

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
  peso_actual_kg: number | null;
  ganancia_diaria_kg: number | null;
  peso_destete: number | null;
}

interface Corral {
  id: string;
  name: string;
  capacity: number | null;
  hectareas: number | null;
  animal_count: number;
}

interface SuggestedMove {
  animal_id: string;
  animal_name: string;
  from_corral_id: string | null;
  from_corral_name: string | null;
  to_corral_id: string;
  to_corral_name: string;
  reason: string;
  issue_type: string;
  expectedBenefit?: string;
}

const translations = {
  es: {
    reuniteWithMother: "Reunir con madre",
    avoidConsanguinity: "Evitar consanguinidad",
    reduceOvercrowding: "Reducir sobrecarga",
    spaceAvailable: "Espacio disponible",
    improveBreeding: "Mejorar potencial reproductivo",
    optimizeWeight: "Optimizar genética de peso",
    groupFertileFemales: "Agrupar hembras fértiles",
    groupHighWeightAnimals: "Agrupar animales con buena genética de peso",
    separateLowPerformers: "Separar bajo rendimiento reproductivo",
    fertilityScore: "fertilidad",
    weightScore: "puntos",
    months: "meses",
    parentChild: "padre-hijo",
    fullSiblings: "hermanos completos",
    halfSiblingsPaternal: "medio hermanos (padre)",
    halfSiblingsMaternal: "medio hermanos (madre)",
    expectedImprovementConsanguinity: "Se reducirán {{count}} riesgos de consanguinidad",
    expectedImprovementFertility: "Se mejorará el potencial reproductivo en ~{{percent}}%",
    expectedImprovementWeight: "Se optimizará la genética de peso en {{count}} animales",
  },
  en: {
    reuniteWithMother: "Reunite with mother",
    avoidConsanguinity: "Avoid consanguinity",
    reduceOvercrowding: "Reduce overcrowding",
    spaceAvailable: "Space available",
    improveBreeding: "Improve reproductive potential",
    optimizeWeight: "Optimize weight genetics",
    groupFertileFemales: "Group fertile females",
    groupHighWeightAnimals: "Group animals with good weight genetics",
    separateLowPerformers: "Separate low reproductive performance",
    fertilityScore: "fertility",
    weightScore: "points",
    months: "months",
    parentChild: "parent-child",
    fullSiblings: "full siblings",
    halfSiblingsPaternal: "half siblings (father)",
    halfSiblingsMaternal: "half siblings (mother)",
    expectedImprovementConsanguinity: "{{count}} consanguinity risks will be reduced",
    expectedImprovementFertility: "Reproductive potential will improve by ~{{percent}}%",
    expectedImprovementWeight: "Weight genetics will be optimized in {{count}} animals",
  },
  pt: {
    reuniteWithMother: "Reunir com mãe",
    avoidConsanguinity: "Evitar consanguinidade",
    reduceOvercrowding: "Reduzir superlotação",
    spaceAvailable: "Espaço disponível",
    improveBreeding: "Melhorar potencial reprodutivo",
    optimizeWeight: "Otimizar genética de peso",
    groupFertileFemales: "Agrupar fêmeas férteis",
    groupHighWeightAnimals: "Agrupar animais com boa genética de peso",
    separateLowPerformers: "Separar baixo desempenho reprodutivo",
    fertilityScore: "fertilidade",
    weightScore: "pontos",
    months: "meses",
    parentChild: "pai-filho",
    fullSiblings: "irmãos completos",
    halfSiblingsPaternal: "meio irmãos (pai)",
    halfSiblingsMaternal: "meio irmãos (mãe)",
    expectedImprovementConsanguinity: "{{count}} riscos de consanguinidade serão reduzidos",
    expectedImprovementFertility: "O potencial reprodutivo melhorará em ~{{percent}}%",
    expectedImprovementWeight: "A genética de peso será otimizada em {{count}} animais",
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      cabanaId, 
      language = 'es', 
      objective = 'consanguinity',
      sourceCorrals = [],
      destinationCorrals = [],
    } = await req.json();

    if (!cabanaId) {
      return new Response(JSON.stringify({ error: 'cabanaId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Source corrals: ${sourceCorrals.length}, Destination corrals: ${destinationCorrals.length}`);

    const t = translations[language as LanguageType] || translations.es;

    console.log(`Optimizing corrals for cabana: ${cabanaId}, objective: ${objective}, language: ${language}`);

    // Fetch animals with additional data for fertility and weight analysis
    const { data: animals, error: animalsError } = await supabase
      .from('animals')
      .select('id, name, id_tag, sex, birth_date, corral_id, father_id, mother_id, status, peso_actual_kg, ganancia_diaria_kg, peso_destete')
      .eq('cabaña_id', cabanaId)
      .eq('status', 'activo');

    if (animalsError) throw animalsError;

    // Fetch corrals
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

    // Count animals per corral
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

    // Filter animals based on source corrals
    const animalsToOptimize = sourceCorrals.length > 0
      ? animals.filter((a: Animal) => a.corral_id && sourceCorrals.includes(a.corral_id))
      : animals;

    console.log(`Total animals: ${animals.length}, Animals to optimize: ${animalsToOptimize.length}`);

    // Initialize issues and moves
    const consanguinityRisks: any[] = [];
    const capacityIssues: any[] = [];
    const separationIssues: any[] = [];
    const suggestedMoves: SuggestedMove[] = [];
    const movedAnimals = new Set<string>();

    // Helper function to find safe destination without creating new consanguinity risks
    const findBestDestination = (animal: Animal, exclude: string[] = [], checkConsanguinity: boolean = true): { corral: Corral; reason: string } | null => {
      const MAX_AGE_MONTHS = 15;
      const animalAge = animal.birth_date ? calculateAgeInMonths(animal.birth_date) : 999;
      const isReproductiveAge = animalAge >= MAX_AGE_MONTHS;

      let availableCorrals = corralsWithCounts.filter(c => {
        if (exclude.includes(c.id)) return false;
        const capacity = c.capacity || (c.hectareas ? Math.round(c.hectareas * 2) : 999);
        if (c.animal_count >= capacity) return false;

        // If consanguinity check is enabled and animal is of reproductive age
        if (checkConsanguinity && isReproductiveAge && objective === 'consanguinity') {
          const animalsInTarget = corralAnimals[c.id] || [];
          
          // Check if moving this animal would create new consanguinity risks
          const wouldCreateRisk = animalsInTarget.some(targetAnimal => {
            // Only check opposite sex combinations (M-F or F-M)
            if (animal.sex === targetAnimal.sex) return false;
            
            // Only check with reproductive age animals
            const targetAge = targetAnimal.birth_date ? calculateAgeInMonths(targetAnimal.birth_date) : 999;
            if (targetAge < MAX_AGE_MONTHS) return false;
            
            // Check if there's a familial relationship
            return checkRelationship(animal, targetAnimal) !== null;
          });
          
          if (wouldCreateRisk) {
            console.log(`Corral ${c.name} excluded - would create new consanguinity risk with animal ${animal.name || animal.id_tag}`);
            return false;
          }
        }

        return true;
      });

      // Filter by destination corrals if specified
      if (destinationCorrals.length > 0) {
        availableCorrals = availableCorrals.filter(c => destinationCorrals.includes(c.id));
      }

      if (availableCorrals.length === 0) {
        console.log(`No safe destination found for animal ${animal.name || animal.id_tag}`);
        return null;
      }

      availableCorrals.sort((a, b) => {
        const aCapacity = a.capacity || (a.hectareas ? Math.round(a.hectareas * 2) : 999);
        const bCapacity = b.capacity || (b.hectareas ? Math.round(b.hectareas * 2) : 999);
        const aSpace = aCapacity - a.animal_count;
        const bSpace = bCapacity - b.animal_count;
        return bSpace - aSpace;
      });

      return { corral: availableCorrals[0], reason: t.spaceAvailable };
    };

    // Always detect separation issues (Priority 1)
    const MAX_CALF_AGE_MONTHS = 8;
    for (const animal of animalsToOptimize) {
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

            if (!movedAnimals.has(animal.id)) {
              const motherCorral = corralsWithCounts.find(c => c.id === mother.corral_id);
              if (motherCorral) {
                const capacity = motherCorral.capacity || (motherCorral.hectareas ? Math.round(motherCorral.hectareas * 2) : 999);
                if (motherCorral.animal_count < capacity) {
                  suggestedMoves.push({
                    animal_id: animal.id,
                    animal_name: animal.name || animal.id_tag || 'Sin nombre',
                    from_corral_id: animal.corral_id,
                    from_corral_name: corralsWithCounts.find(c => c.id === animal.corral_id)?.name || null,
                    to_corral_id: motherCorral.id,
                    to_corral_name: motherCorral.name,
                    reason: `${t.reuniteWithMother} (${ageMonths} ${t.months})`,
                    issue_type: 'separation',
                  });
                  movedAnimals.add(animal.id);
                  motherCorral.animal_count++;
                }
              }
            }
          }
        }
      }
    }

    // Objective-specific optimization
    if (objective === 'consanguinity') {
      // Detect consanguinity risks
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

              if (!movedAnimals.has(male.id) && !movedAnimals.has(female.id)) {
                const animalToMove = male;
                const destination = findBestDestination(animalToMove, [corral.id], true);
                if (destination) {
                  const relationshipText = getRelationshipText(relationship.type, t);
                  suggestedMoves.push({
                    animal_id: animalToMove.id,
                    animal_name: male.name || male.id_tag || 'Sin nombre',
                    from_corral_id: corral.id,
                    from_corral_name: corral.name,
                    to_corral_id: destination.corral.id,
                    to_corral_name: destination.corral.name,
                    reason: `${t.avoidConsanguinity}: ${relationshipText}`,
                    issue_type: 'consanguinity',
                  });
                  movedAnimals.add(animalToMove.id);
                  destination.corral.animal_count++;
                  corral.animal_count--;
                }
              }
            }
          }
        }
      }
    } else if (objective === 'fertility') {
      // Fetch insemination data for fertility analysis
      const { data: inseminationsData } = await supabase
        .from('artificial_inseminations')
        .select('female_id, is_pregnant')
        .eq('cabaña_id', cabanaId);

      // Calculate fertility scores
      const fertilityScores: Record<string, number> = {};
      const inseminationsByFemale: Record<string, any[]> = {};
      
      (inseminationsData || []).forEach((ins: any) => {
        if (!inseminationsByFemale[ins.female_id]) {
          inseminationsByFemale[ins.female_id] = [];
        }
        inseminationsByFemale[ins.female_id].push(ins);
      });

      Object.entries(inseminationsByFemale).forEach(([femaleId, inseminations]) => {
        const totalInseminations = inseminations.length;
        const successfulPregnancies = inseminations.filter(i => i.is_pregnant).length;
        fertilityScores[femaleId] = totalInseminations > 0 
          ? Math.round((successfulPregnancies / totalInseminations) * 100)
          : 50; // Default
      });

      // Group high fertility females together
      const highFertilityFemales = animalsToOptimize.filter(a =>
        a.sex === 'Hembra' && 
        (fertilityScores[a.id] || 50) >= 70 &&
        !movedAnimals.has(a.id)
      );

      // Find best corral with space for high fertility females
      const targetCorral = corralsWithCounts
        .filter(c => {
          const capacity = c.capacity || (c.hectareas ? Math.round(c.hectareas * 2) : 999);
          return c.animal_count < capacity - highFertilityFemales.length;
        })
        .sort((a, b) => b.animal_count - a.animal_count)[0];

      if (targetCorral) {
        for (const female of highFertilityFemales.slice(0, 5)) { // Max 5 moves
          if (female.corral_id !== targetCorral.id) {
            const score = fertilityScores[female.id] || 50;
            suggestedMoves.push({
              animal_id: female.id,
              animal_name: female.name || female.id_tag || 'Sin nombre',
              from_corral_id: female.corral_id,
              from_corral_name: corralsWithCounts.find(c => c.id === female.corral_id)?.name || null,
              to_corral_id: targetCorral.id,
              to_corral_name: targetCorral.name,
              reason: `${t.groupFertileFemales} (>${score}% ${t.fertilityScore})`,
              issue_type: 'fertility',
              expectedBenefit: `${score}% ${t.fertilityScore}`,
            });
            movedAnimals.add(female.id);
            targetCorral.animal_count++;
          }
        }
      }
    } else if (objective === 'weight') {
      // Calculate weight genetics scores
      const weightScores: Record<string, number> = {};
      
      animalsToOptimize.forEach((animal: Animal) => {
        let score = 0;
        if (animal.peso_actual_kg) score += animal.peso_actual_kg * 0.3;
        if (animal.ganancia_diaria_kg) score += animal.ganancia_diaria_kg * 100;
        if (animal.peso_destete) score += animal.peso_destete * 0.2;
        weightScores[animal.id] = Math.round(score);
      });

      // Group high weight genetics animals
      const highWeightAnimals = animalsToOptimize.filter(a =>
        (weightScores[a.id] || 0) >= 100 &&
        !movedAnimals.has(a.id)
      );

      // Find best corral
      const targetCorral = corralsWithCounts
        .filter(c => {
          const capacity = c.capacity || (c.hectareas ? Math.round(c.hectareas * 2) : 999);
          return c.animal_count < capacity - highWeightAnimals.length;
        })
        .sort((a, b) => b.animal_count - a.animal_count)[0];

      if (targetCorral) {
        for (const animal of highWeightAnimals.slice(0, 5)) {
          if (animal.corral_id !== targetCorral.id) {
            const score = weightScores[animal.id];
            suggestedMoves.push({
              animal_id: animal.id,
              animal_name: animal.name || animal.id_tag || 'Sin nombre',
              from_corral_id: animal.corral_id,
              from_corral_name: corralsWithCounts.find(c => c.id === animal.corral_id)?.name || null,
              to_corral_id: targetCorral.id,
              to_corral_name: targetCorral.name,
              reason: `${t.optimizeWeight} (${score} ${t.weightScore})`,
              issue_type: 'weight',
              expectedBenefit: `${score} ${t.weightScore}`,
            });
            movedAnimals.add(animal.id);
            targetCorral.animal_count++;
          }
        }
      }
    }

    // Handle capacity issues (always)
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

        const animalsInOvercrowded = corralAnimals[corral.id] || [];
        let movedCount = 0;

        for (const animal of animalsInOvercrowded) {
          if (movedAnimals.has(animal.id)) continue;
          if (movedCount >= (corral.animal_count - capacity)) break;

          const destination = findBestDestination(animal, [corral.id], false);
          if (destination) {
            suggestedMoves.push({
              animal_id: animal.id,
              animal_name: animal.name || animal.id_tag || 'Sin nombre',
              from_corral_id: corral.id,
              from_corral_name: corral.name,
              to_corral_id: destination.corral.id,
              to_corral_name: destination.corral.name,
              reason: `${t.reduceOvercrowding} (${corral.animal_count}/${capacity})`,
              issue_type: 'capacity',
            });
            movedAnimals.add(animal.id);
            destination.corral.animal_count++;
            corral.animal_count--;
            movedCount++;
          }
        }
      }
    }

    // Generate expected improvement message
    let expectedImprovement = '';
    if (objective === 'consanguinity') {
      expectedImprovement = t.expectedImprovementConsanguinity.replace('{{count}}', consanguinityRisks.length.toString());
    } else if (objective === 'fertility') {
      const avgImprovement = 15; // Estimate
      expectedImprovement = t.expectedImprovementFertility.replace('{{percent}}', avgImprovement.toString());
    } else if (objective === 'weight') {
      const count = suggestedMoves.filter(m => m.issue_type === 'weight').length;
      expectedImprovement = t.expectedImprovementWeight.replace('{{count}}', count.toString());
    }

    // Generate preview data (before and after states)
    const beforeState = corralsWithCounts.map(corral => ({
      corral_id: corral.id,
      corral_name: corral.name,
      count: corral.animal_count,
      capacity: corral.capacity,
      animals: (corralAnimals[corral.id] || []).map(a => a.name || a.id_tag || 'Sin nombre').slice(0, 10),
    }));

    // Calculate after state by applying suggested moves
    const afterCounts: Record<string, number> = {};
    corralsWithCounts.forEach(c => {
      afterCounts[c.id] = c.animal_count;
    });

    suggestedMoves.forEach(move => {
      if (move.from_corral_id && afterCounts[move.from_corral_id] !== undefined) {
        afterCounts[move.from_corral_id]--;
      }
      if (afterCounts[move.to_corral_id] !== undefined) {
        afterCounts[move.to_corral_id]++;
      }
    });

    const afterState = corralsWithCounts.map(corral => ({
      corral_id: corral.id,
      corral_name: corral.name,
      count: afterCounts[corral.id] || 0,
      capacity: corral.capacity,
      animals: [],
    }));

    const affectedCorrals = new Set<string>();
    suggestedMoves.forEach(move => {
      if (move.from_corral_id) affectedCorrals.add(move.from_corral_id);
      affectedCorrals.add(move.to_corral_id);
    });

    return new Response(
      JSON.stringify({
        objective,
        issues: {
          consanguinity: consanguinityRisks,
          capacity: capacityIssues,
          separation: separationIssues,
        },
        suggestedMoves,
        summary: {
          totalMoves: suggestedMoves.length,
          expectedImprovement,
          affectedCorrals: affectedCorrals.size,
        },
        preview: {
          before: beforeState,
          after: afterState,
        },
        totalIssues: consanguinityRisks.length + capacityIssues.length + separationIssues.length,
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
  if (animal1.id === animal2.father_id || animal1.id === animal2.mother_id) {
    return { type: 'parent-child', severity: 'severe' };
  }
  if (animal2.id === animal1.father_id || animal2.id === animal1.mother_id) {
    return { type: 'parent-child', severity: 'severe' };
  }

  if (animal1.father_id && animal1.mother_id && animal2.father_id && animal2.mother_id) {
    if (animal1.father_id === animal2.father_id && animal1.mother_id === animal2.mother_id) {
      return { type: 'full-siblings', severity: 'severe' };
    }
  }

  if (animal1.father_id && animal2.father_id && animal1.father_id === animal2.father_id) {
    return { type: 'half-siblings-paternal', severity: 'medium' };
  }
  if (animal1.mother_id && animal2.mother_id && animal1.mother_id === animal2.mother_id) {
    return { type: 'half-siblings-maternal', severity: 'medium' };
  }

  return null;
}

function getRelationshipText(type: string, t: any): string {
  switch (type) {
    case 'parent-child': return t.parentChild;
    case 'full-siblings': return t.fullSiblings;
    case 'half-siblings-paternal': return t.halfSiblingsPaternal;
    case 'half-siblings-maternal': return t.halfSiblingsMaternal;
    default: return type;
  }
}