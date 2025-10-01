import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Animal {
  id: string;
  sex: string;
  birth_date: string;
  status: string;
  breed: string;
  father_id?: string;
  mother_id?: string;
  corral_id?: string;
  name?: string;
  id_tag?: string;
  cabaña_id: string;
  age_months?: number;
  is_calf?: boolean;
  is_reproductive_age?: boolean;
}

interface Corral {
  id: string;
  name: string;
  hectareas?: number;
  capacity?: number;
  cabaña_id: string;
}

interface ConsanguinityRisk {
  animal1_id: string;
  animal2_id: string;
  relationship: string;
  severity: 'severe' | 'medium' | 'low';
  description: string;
  inbreeding_coefficient: number;
}

interface CorralOptimizationPlan {
  corral_plan: Array<{
    corral_id: string;
    corral_name: string;
    current_animals: number;
    total_capacity: number;
    adult_count: number;
    calf_count: number;
    current_risks: ConsanguinityRisk[];
    moves_suggested: Array<{
      animal_id: string;
      animal_name: string;
      from_corral: string;
      to_corral: string;
      reason: string;
      type: 'consanguinity' | 'mother_calf';
      associated_animals?: string[];
    }>;
    risk_reduction_score: number;
    capacity_ok: boolean;
    suggestion: string;
  }>;
  summary: {
    total_risks_before: number;
    total_risks_after: number;
    risk_reduction_percentage: number;
    total_moves_suggested: number;
    calves_moved_with_mothers: number;
  };
  warnings: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no configurada');
    }

    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody));

    const {
      cabanaId,
      objectives = ['consanguinity'], // Por defecto solo consanguinidad
      targetWeights = {},
      max_bulls_per_corral = 1,
      max_age_months_with_mother = 8,
      density_per_hectare = 1.5,
      calf_space_factor = 0.6
    } = requestBody;

    if (!cabanaId) {
      console.error('Missing cabanaId');
      return new Response(JSON.stringify({ error: 'cabanaId es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Analyzing corral distribution for cabana ${cabanaId}`);
    console.log(`Objectives:`, objectives);

    // Get animals using fetch
    const animalsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/animals?cabaña_id=eq.${cabanaId}&status=not.in.(vendido,muerto)&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    
    if (!animalsResponse.ok) {
      const error = await animalsResponse.text();
      console.error('Error fetching animals:', error);
      return new Response(JSON.stringify({ error: 'Error al obtener animales' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const animals = await animalsResponse.json();

    // Get corrals using fetch
    const corralsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/corrales?cabaña_id=eq.${cabanaId}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    
    if (!corralsResponse.ok) {
      const error = await corralsResponse.text();
      console.error('Error fetching corrals:', error);
      return new Response(JSON.stringify({ error: 'Error al obtener corrales' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const corrals = await corralsResponse.json();

    if (!corrals || corrals.length === 0) {
      console.log('No corrals found');
      return new Response(JSON.stringify({ 
        error: 'No hay corrales configurados. Crea al menos un corral primero.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${animals.length} total animals and ${corrals.length} corrals`);

    // Usar ChatGPT para generar recomendaciones inteligentes
    const optimizationPlan = await generateAIOptimization(
      animals,
      corrals,
      objectives,
      targetWeights,
      OPENAI_API_KEY
    );

    return new Response(JSON.stringify(optimizationPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-corral-distribution:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateAIOptimization(
  animals: any[],
  corrals: any[],
  objectives: string[],
  targetWeights: any,
  apiKey: string
): Promise<any> {
  console.log('Generando optimización con ChatGPT...');
  
  // Analizar datos actuales
  const currentDate = new Date();
  const analyzedAnimals = animals.map(animal => {
    const birthDate = animal.birth_date ? new Date(animal.birth_date) : null;
    const ageMonths = birthDate ? 
      Math.floor((currentDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)) : 0;
    
    return {
      id: animal.id,
      id_tag: animal.id_tag,
      name: animal.name,
      sex: animal.sex,
      age_months: ageMonths,
      corral_id: animal.corral_id,
      father_id: animal.father_id,
      mother_id: animal.mother_id,
      peso_actual: animal.peso_actual_kg,
      peso_nacimiento: animal.peso_nacimiento,
    };
  });

  const corralsSummary = corrals.map(c => ({
    id: c.id,
    name: c.name,
    hectareas: c.hectareas,
    animals: analyzedAnimals.filter(a => a.corral_id === c.id).length,
  }));

  // Detectar riesgos de consanguinidad
  const consanguinityRisks = detectConsanguinityRisks(analyzedAnimals);

  // Construir prompt para ChatGPT
  const prompt = buildOptimizationPrompt(
    analyzedAnimals,
    corralsSummary,
    consanguinityRisks,
    objectives,
    targetWeights
  );

  console.log('Llamando a OpenAI API...');
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en manejo ganadero especializado en optimización de corrales. Respondes en español con recomendaciones prácticas y accionables.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiRecommendation = data.choices[0].message.content;

    console.log('Recomendación recibida de ChatGPT');

    // Parsear la recomendación y estructurarla
    return {
      corral_plan: corralsSummary.map(corral => ({
        corral_id: corral.id,
        corral_name: corral.name,
        current_animals: corral.animals,
        total_capacity: corral.hectareas ? Math.round(corral.hectareas * 1.5) : 20,
        current_risks: consanguinityRisks.filter(risk => 
          analyzedAnimals.find(a => 
            (a.id === risk.animal1_id || a.id === risk.animal2_id) && a.corral_id === corral.id
          )
        ),
        moves_suggested: [],
        ai_suggestion: aiRecommendation.substring(0, 200) + '...',
        capacity_ok: true,
      })),
      summary: {
        total_risks_before: consanguinityRisks.length,
        total_risks_after: 0,
        risk_reduction_percentage: 0,
        total_moves_suggested: 0,
        calves_moved_with_mothers: 0,
      },
      ai_analysis: aiRecommendation,
      objectives: objectives,
      warnings: consanguinityRisks.length > 0 ? 
        [`Se detectaron ${consanguinityRisks.length} riesgos de consanguinidad`] : []
    };
  } catch (error) {
    console.error('Error en generación AI:', error);
    throw error;
  }
}

function detectConsanguinityRisks(animals: any[]): any[] {
  const risks: any[] = [];
  
  // Agrupar por corral
  const animalsByCorral = new Map<string, any[]>();
  animals.forEach(animal => {
    if (!animal.corral_id) return;
    if (!animalsByCorral.has(animal.corral_id)) {
      animalsByCorral.set(animal.corral_id, []);
    }
    animalsByCorral.get(animal.corral_id)!.push(animal);
  });

  // Detectar riesgos en cada corral
  animalsByCorral.forEach((corralAnimals, corralId) => {
    for (let i = 0; i < corralAnimals.length; i++) {
      for (let j = i + 1; j < corralAnimals.length; j++) {
        const animal1 = corralAnimals[i];
        const animal2 = corralAnimals[j];

        // Solo revisar parejas macho-hembra de edad reproductiva
        if (animal1.sex === animal2.sex) continue;
        if (animal1.age_months < 15 || animal2.age_months < 15) continue;

        // Detectar relaciones familiares
        const risk = detectRelationship(animal1, animal2);
        if (risk) {
          risks.push(risk);
        }
      }
    }
  });

  return risks;
}

function detectRelationship(animal1: any, animal2: any): any | null {
  // Padre-hijo
  if (animal1.father_id === animal2.id || animal1.mother_id === animal2.id ||
      animal2.father_id === animal1.id || animal2.mother_id === animal1.id) {
    return {
      animal1_id: animal1.id,
      animal2_id: animal2.id,
      relationship: 'padre-hijo',
      severity: 'severe',
      description: `${animal1.name || animal1.id_tag} y ${animal2.name || animal2.id_tag} son padre/madre e hijo/a`
    };
  }

  // Hermanos completos
  if (animal1.father_id && animal1.mother_id &&
      animal1.father_id === animal2.father_id &&
      animal1.mother_id === animal2.mother_id) {
    return {
      animal1_id: animal1.id,
      animal2_id: animal2.id,
      relationship: 'hermanos',
      severity: 'severe',
      description: `${animal1.name || animal1.id_tag} y ${animal2.name || animal2.id_tag} son hermanos completos`
    };
  }

  // Medio hermanos
  if ((animal1.father_id && animal1.father_id === animal2.father_id) ||
      (animal1.mother_id && animal1.mother_id === animal2.mother_id)) {
    return {
      animal1_id: animal1.id,
      animal2_id: animal2.id,
      relationship: 'medio-hermanos',
      severity: 'medium',
      description: `${animal1.name || animal1.id_tag} y ${animal2.name || animal2.id_tag} son medio hermanos`
    };
  }

  return null;
}

function buildOptimizationPrompt(
  animals: any[],
  corrals: any[],
  risks: any[],
  objectives: string[],
  targetWeights: any
): string {
  let prompt = `# Análisis de Distribución de Corrales

## Situación Actual
- Total de animales: ${animals.length}
- Corrales disponibles: ${corrals.length}
- Riesgos de consanguinidad detectados: ${risks.length}

## Distribución por Corral
${corrals.map(c => `- ${c.name}: ${c.animals} animales, ${c.hectareas || 0} hectáreas`).join('\n')}

## Objetivos de Optimización
${objectives.map(obj => {
    switch(obj) {
      case 'consanguinity':
        return '✓ Reducir riesgos de consanguinidad';
      case 'weight_birth':
        return `✓ Optimizar peso al nacer (objetivo: ${targetWeights.birth || 'no especificado'} kg)`;
      case 'weight_weaning':
        return `✓ Optimizar peso al destete (objetivo: ${targetWeights.weaning || 'no especificado'} kg)`;
      case 'weight_final':
        return `✓ Optimizar peso final (objetivo: ${targetWeights.final || 'no especificado'} kg)`;
      case 'reproduction':
        return '✓ Mejorar eficiencia reproductiva';
      default:
        return `✓ ${obj}`;
    }
  }).join('\n')}

${risks.length > 0 ? `
## Riesgos Detectados
${risks.slice(0, 10).map(r => `- ${r.description} (${r.severity})`).join('\n')}
${risks.length > 10 ? `... y ${risks.length - 10} riesgos más` : ''}
` : ''}

## Instrucciones
Proporciona recomendaciones específicas para:
1. Movimientos de animales sugeridos (especifica qué animales mover y a qué corrales)
2. Estrategia para alcanzar los objetivos mencionados
3. Consideraciones sobre capacidad y bienestar animal
4. Métricas a monitorear después de implementar los cambios

Sé específico y práctico. Enfócate en acciones concretas que el productor pueda tomar.`;

  return prompt;
}

// Mantener funciones auxiliares anteriores para compatibilidad
function calculateAgeMonths(birthDate: string, currentDate: Date): number {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return 0;
  const diffTime = currentDate.getTime() - birth.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 30.44);
}

// Funciones eliminadas - ahora se usa generateAIOptimization con ChatGPT