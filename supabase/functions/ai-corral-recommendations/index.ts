import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { 
      corralesData, 
      objectives, 
      currentRisks,
      productionGoals,
      requestType = 'optimization' // 'optimization', 'chat', 'prediction'
    } = await req.json();

    console.log('AI Corral Recommendations request:', { requestType, objectives });

    let systemPrompt = `Eres un experto en manejo ganadero y distribución de corrales. 
Tu objetivo es ayudar a los ganaderos a optimizar la distribución de sus animales considerando:
- Consanguinidad y genética
- Objetivos productivos (engorde, reproducción, etc.)
- Capacidad y recursos de cada corral
- Bienestar animal y manejo eficiente
- Estacionalidad y calendarios reproductivos

Responde en español de forma clara, práctica y accionable.`;

    let userPrompt = '';

    if (requestType === 'optimization') {
      userPrompt = `Analiza esta situación de corrales y proporciona recomendaciones estratégicas:

**Corrales disponibles:**
${JSON.stringify(corralesData, null, 2)}

**Riesgos detectados:**
${currentRisks?.length || 0} riesgos de consanguinidad identificados

**Objetivos del productor:**
${objectives || 'Optimizar distribución general'}

**Metas productivas:**
${productionGoals || 'Mejorar eficiencia y reducir riesgos'}

Proporciona:
1. Análisis de la situación actual
2. Recomendaciones prioritarias (top 3)
3. Estrategias a corto plazo (1-3 meses)
4. Consideraciones a largo plazo
5. Métricas a monitorear

Formato: JSON con estructura:
{
  "analysis": "...",
  "priorities": ["...", "...", "..."],
  "shortTermActions": ["...", "..."],
  "longTermConsiderations": ["...", "..."],
  "metricsToTrack": ["...", "..."]
}`;
    } else if (requestType === 'chat') {
      const { message, context } = await req.json();
      userPrompt = `Contexto actual: ${JSON.stringify(context)}

Pregunta del usuario: ${message}

Responde de forma directa y útil.`;
    } else if (requestType === 'prediction') {
      userPrompt = `Predice los resultados potenciales de esta estrategia de distribución:

${JSON.stringify(corralesData, null, 2)}

Considera:
- Impacto en producción (ganancia de peso, reproducción)
- Riesgos genéticos futuros
- Eficiencia operativa
- Costos y beneficios

Proporciona predicciones cuantitativas y cualitativas.`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Límite de solicitudes excedido. Intenta nuevamente en unos momentos.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Créditos insuficientes. Contacta soporte.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI response received');

    // Try to parse as JSON if it looks like JSON
    let parsedResponse = aiResponse;
    if (aiResponse.trim().startsWith('{')) {
      try {
        parsedResponse = JSON.parse(aiResponse);
      } catch {
        // Keep as string if parsing fails
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      recommendation: parsedResponse,
      requestType 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-corral-recommendations:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

