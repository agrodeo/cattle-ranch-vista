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
      objectives = ['consanguinity'],
      targetWeights = {},
      max_bulls_per_corral = 1,
      max_age_months_with_mother = 8,
      density_per_hectare = 1.5,
      calf_space_factor = 0.6
    } = requestBody;
    
    console.log('Optimization objectives:', objectives);
    console.log('Target weights:', targetWeights);

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

    // Get custom benchmarks for this cabaña if objectives include benchmarks
    let customBenchmarks = null;
    let herdSettings = null;
    let usingDefaultBenchmarks = false;
    
    if (objectives.includes('benchmarks')) {
      console.log('Fetching custom benchmarks and herd settings...');
      
      const benchmarksResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/custom_benchmarks?cabaña_id=eq.${cabanaId}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      
      if (benchmarksResponse.ok) {
        customBenchmarks = await benchmarksResponse.json();
        console.log(`Found ${customBenchmarks?.length || 0} custom benchmarks`);
        
        // If no custom benchmarks, use default values
        if (!customBenchmarks || customBenchmarks.length === 0) {
          usingDefaultBenchmarks = true;
          customBenchmarks = [{
            breed: null,
            birth_weight_excellent: 35,
            birth_weight_good: 30,
            birth_weight_poor: 28,
            weaning_weight_excellent: 200,
            weaning_weight_good: 180,
            weaning_weight_poor: 160,
            daily_gain_excellent: 0.8,
            daily_gain_good: 0.7,
            daily_gain_poor: 0.6,
          }];
          console.log('Using default benchmarks');
        }
      }

      const settingsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/herd_settings?cabaña_id=eq.${cabanaId}&select=*&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json();
        herdSettings = settings[0] || null;
        console.log('Herd settings:', herdSettings ? 'found' : 'not found');
      }
    }

    // Usar AI para generar recomendaciones inteligentes
    const optimizationPlan = await generateAIOptimization(
      animals,
      corrals,
      objectives,
      targetWeights,
      customBenchmarks,
      herdSettings,
      usingDefaultBenchmarks,
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
  customBenchmarks: any,
  herdSettings: any,
  usingDefaultBenchmarks: boolean,
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
    targetWeights,
    customBenchmarks,
    herdSettings
  );

  console.log('Llamando a OpenAI API con structured output...');
  
  try {
    // Use tool calling for structured output
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
            content: 'Eres un experto en manejo ganadero especializado en optimización de corrales. Analizas situaciones y generas movimientos específicos y accionables para redistribuir animales.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_animal_moves',
              description: 'Genera movimientos específicos de animales entre corrales',
              parameters: {
                type: 'object',
                properties: {
                  moves: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        animal_id: { type: 'string', description: 'ID del animal a mover' },
                        animal_name: { type: 'string', description: 'Nombre o tag del animal' },
                        from_corral_id: { type: 'string', description: 'ID del corral origen' },
                        to_corral_id: { type: 'string', description: 'ID del corral destino' },
                        reason: { type: 'string', description: 'Razón del movimiento' },
                        priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                      },
                      required: ['animal_id', 'animal_name', 'from_corral_id', 'to_corral_id', 'reason', 'priority']
                    }
                  },
                  summary: { type: 'string', description: 'Resumen de la estrategia' }
                },
                required: ['moves', 'summary']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_animal_moves' } },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Respuesta OpenAI:', JSON.stringify(data, null, 2));
    
    const toolCall = data.choices[0].message.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No se recibió structured output de OpenAI');
    }

    const structuredMoves = JSON.parse(toolCall.function.arguments);
    console.log('Movimientos estructurados:', structuredMoves.moves.length);

    // Build corral plan with moves
    const corralPlanMap = new Map();
    corralsSummary.forEach(corral => {
      corralPlanMap.set(corral.id, {
        corral_id: corral.id,
        corral_name: corral.name,
        current_animals: corral.animals,
        total_capacity: corral.hectareas ? Math.round(corral.hectareas * 1.5) : 20,
        adult_count: analyzedAnimals.filter(a => a.corral_id === corral.id && a.age_months >= 18).length,
        calf_count: analyzedAnimals.filter(a => a.corral_id === corral.id && a.age_months < 18).length,
        current_risks: consanguinityRisks.filter(risk => 
          analyzedAnimals.find(a => 
            (a.id === risk.animal1_id || a.id === risk.animal2_id) && a.corral_id === corral.id
          )
        ),
        moves_suggested: [],
        risk_reduction_score: 0,
        capacity_ok: true,
        suggestion: ''
      });
    });

    // Map moves to corrals
    structuredMoves.moves.forEach((move: any) => {
      const fromCorral = corralPlanMap.get(move.from_corral_id);
      if (fromCorral) {
        fromCorral.moves_suggested.push({
          animal_id: move.animal_id,
          animal_name: move.animal_name,
          from_corral: move.from_corral_id,
          to_corral: move.to_corral_id,
          reason: move.reason,
          type: 'consanguinity'
        });
      }
    });

    // Calculate risk reduction
    const movesCount = structuredMoves.moves.length;
    const risksResolved = Math.min(movesCount, consanguinityRisks.length);
    const risksAfter = Math.max(0, consanguinityRisks.length - risksResolved);
    const reductionPct = consanguinityRisks.length > 0 
      ? Math.round((risksResolved / consanguinityRisks.length) * 100)
      : 0;

    // Update risk reduction scores
    corralPlanMap.forEach(corral => {
      if (corral.moves_suggested.length > 0 && corral.current_risks.length > 0) {
        corral.risk_reduction_score = Math.min(100, (corral.moves_suggested.length / corral.current_risks.length) * 100);
      }
      corral.suggestion = corral.moves_suggested.length > 0
        ? `Se sugieren ${corral.moves_suggested.length} movimientos para mejorar la distribución`
        : 'Sin cambios necesarios en este corral';
    });

    return {
      corral_plan: Array.from(corralPlanMap.values()),
      summary: {
        total_risks_before: consanguinityRisks.length,
        total_risks_after: risksAfter,
        risk_reduction_percentage: reductionPct,
        total_moves_suggested: movesCount,
        calves_moved_with_mothers: 0,
      },
      ai_analysis: structuredMoves.summary,
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
  targetWeights: any,
  customBenchmarks: any,
  herdSettings: any,
  usingDefaultBenchmarks: boolean
): string {
  // Build animals summary with corral info
  const animalsSummary = animals.map(a => ({
    id: a.id,
    name: a.name || a.id_tag,
    sex: a.sex === 'M' ? 'Macho' : 'Hembra',
    age: a.age_months,
    corral: a.corral_id,
    father: a.father_id,
    mother: a.mother_id
  }));

  const corralsInfo = corrals.map(c => {
    const corralAnimals = animalsSummary.filter(a => a.corral === c.id);
    return `${c.name} (ID: ${c.id}): ${corralAnimals.length} animales, ${c.hectareas || 0} ha`;
  }).join('\n');

  let prompt = `# Optimización de Corrales - Genera Movimientos Específicos

## Situación Actual
- Total animales: ${animals.length}
- Corrales: ${corrals.length}
- Riesgos consanguinidad: ${risks.length}

## Corrales Disponibles
${corralsInfo}

## Objetivos
${objectives.map(obj => {
    switch(obj) {
      case 'consanguinity': return '✓ CRÍTICO: Reducir consanguinidad';
      case 'reproduction': return '✓ Mejorar eficiencia reproductiva';
      case 'production': return '✓ Optimizar producción/peso';
      case 'benchmarks': return '✓ Seguir estándares de la cabaña';
      default: return `✓ ${obj}`;
    }
  }).join('\n')}

${customBenchmarks && customBenchmarks.length > 0 ? `
## Estándares de la Cabaña ${usingDefaultBenchmarks ? '(Por Defecto - Recomendamos configurar estándares personalizados)' : '(Personalizados)'}
${usingDefaultBenchmarks ? 'NOTA: Estos son valores por defecto del sistema. El usuario debería configurar estándares personalizados en Configuración > Benchmarks para obtener mejores recomendaciones.' : 'Usa estos estándares específicos configurados por el usuario:'}
${customBenchmarks.map((b: any) => `- ${b.breed || 'Todas las razas'}: 
  * Peso al nacer: Excelente ${b.birth_weight_excellent}kg / Bueno ${b.birth_weight_good}kg / Mínimo ${b.birth_weight_poor}kg
  * Peso al destete: Excelente ${b.weaning_weight_excellent}kg / Bueno ${b.weaning_weight_good}kg / Mínimo ${b.weaning_weight_poor}kg
  * Ganancia diaria: Excelente ${b.daily_gain_excellent}kg/día / Buena ${b.daily_gain_good}kg/día / Mínima ${b.daily_gain_poor}kg/día`).join('\n')}
` : ''}

${herdSettings ? `
## Configuración del Rodeo
- País: ${herdSettings.country || 'N/A'}
- Región: ${herdSettings.region || 'N/A'}
- Raza principal: ${herdSettings.primary_breed || 'N/A'}
- Sistema productivo: ${herdSettings.production_system || 'N/A'}
` : ''}

${targetWeights.birth || targetWeights.weaning || targetWeights.final ? `
## Objetivos de Peso
${targetWeights.birth ? `- Peso al nacer: ${targetWeights.birth} kg` : ''}
${targetWeights.weaning ? `- Peso al destete: ${targetWeights.weaning} kg` : ''}
${targetWeights.final ? `- Peso final: ${targetWeights.final} kg` : ''}
` : ''}

${risks.length > 0 ? `
## Riesgos Críticos Detectados (Top 20)
${risks.slice(0, 20).map(r => 
  `- ${r.description} | Corral actual: ${animalsSummary.find(a => a.id === r.animal1_id)?.corral || 'desconocido'}`
).join('\n')}
${risks.length > 20 ? `\n... y ${risks.length - 20} riesgos más` : ''}
` : ''}

## INSTRUCCIONES CRÍTICAS
Genera entre 5-15 movimientos ESPECÍFICOS y EJECUTABLES:

1. Para CADA movimiento, especifica:
   - animal_id: ID exacto del animal (del listado arriba)
   - animal_name: Nombre/tag del animal
   - from_corral_id: ID del corral origen
   - to_corral_id: ID del corral destino (diferente al origen)
   - reason: Razón concreta (ej: "Separar hermanos completos para evitar endogamia")
   - priority: high/medium/low

2. PRIORIZA movimientos que resuelvan los riesgos detectados
3. Asegura que los corrales destino tengan capacidad
4. Considera mantener grupos sociales estables
5. NO muevas más del 30% de animales de un corral

IMPORTANTE: Usa los IDs exactos de corrales que te proporcioné arriba.`;

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