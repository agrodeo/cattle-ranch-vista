import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, includeContext = false } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    console.log("AI Chat function called with messages:", messages?.length || 0);
    console.log("Include context:", includeContext);
    console.log("OPENAI_API_KEY configured:", !!OPENAI_API_KEY);
    
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Initialize Supabase client for context gathering
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get current user and their cabaña (only required for context)
    let user = null;
    let shouldIncludeContext = includeContext;
    
    // Only try to get user if auth header is present
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const { data: userData, error: authError } = await supabase.auth.getUser();
        console.log('Auth check:', { hasAuthHeader: true, authError: !!authError, hasUser: !!userData?.user });
        if (!authError && userData.user) {
          user = userData.user;
          console.log('Authenticated user found:', userData.user.id);
        } else {
          console.log('Auth error or no user:', authError);
        }
      } catch (error) {
        console.log('Auth error (non-critical):', error);
      }
    } else {
      console.log('No authorization header found');
    }
    
    // If context is requested but no user found, proceed without context instead of failing
    if (!user && shouldIncludeContext) {
      console.log('Context requested but no authenticated user found, proceeding without context');
      shouldIncludeContext = false;
    }

    let systemPrompt = `Eres un asistente experto en ganadería y manejo de haciendas. Tienes conocimiento profundo sobre:
- Manejo de ganado bovino
- Programas de vacunación y salud animal
- Reproducción y mejoramiento genético
- Nutrición y alimentación
- Manejo de corrales y pasturas
- Aspectos financieros y económicos de la ganadería
- Registros y trazabilidad
- Análisis de imágenes relacionadas con ganadería (animales, instalaciones, documentos)

Puedes analizar imágenes que los usuarios suban para identificar:
- Animales y sus características
- Estado de salud o condición corporal
- Instalaciones ganaderas
- Documentos o registros
- Pasturas y alimentación

Responde de manera clara, práctica y siempre considerando las mejores prácticas en ganadería. Usa un tono profesional pero amigable.`;

    // Add cabaña context if requested and user is authenticated
    if (shouldIncludeContext && user) {
      try {
        const cabanaContext = await getCabanaContext(supabase);
        if (cabanaContext) {
          systemPrompt += `\n\nCONTEXTO DE LA CABAÑA DEL USUARIO:\n${cabanaContext}`;
        }
      } catch (error) {
        console.log('Error getting cabaña context:', error);
        // Continue without context rather than failing
      }
    }

    console.log("Calling OpenAI with system prompt length:", systemPrompt.length);
    console.log("Total messages to send:", messages.length + 1);
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // This model supports vision
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: 1000,
      }),
    });
    
    console.log("OpenAI response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      console.error("OpenAI API key configured:", !!OPENAI_API_KEY);
      console.error("Request URL:", "https://api.openai.com/v1/chat/completions");
      return new Response(JSON.stringify({ 
        error: "OpenAI API error", 
        details: errorText,
        status: response.status 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getCabanaContext(supabase: any): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('cabaña_id')
    .single();

  if (!profile?.cabaña_id) return '';

  // Get basic cabaña info
  const { data: cabana } = await supabase
    .from('cabañas')
    .select('name, location')
    .eq('id', profile.cabaña_id)
    .single();

  // Get animal statistics
  const { data: animals } = await supabase
    .from('animals')
    .select('sex, status, esta_preñada, birth_date')
    .eq('cabaña_id', profile.cabaña_id);

  // Get recent alerts
  const { data: alerts } = await supabase
    .from('reproductive_alerts')
    .select('alert_type, days_overdue')
    .eq('cabaña_id', profile.cabaña_id)
    .eq('status', 'pending')
    .limit(5);

  // Get corrales
  const { data: corrales } = await supabase
    .from('corrales')
    .select('name, hectareas')
    .eq('cabaña_id', profile.cabaña_id);

  let context = '';
  
  if (cabana) {
    context += `Cabaña: ${cabana.name}`;
    if (cabana.location) context += ` - Ubicación: ${cabana.location}`;
    context += '\n';
  }

  if (animals && animals.length > 0) {
    const totalAnimals = animals.length;
    const activeAnimals = animals.filter((a: any) => a.status !== 'vendido' && a.status !== 'muerto').length;
    const femaleAnimals = animals.filter((a: any) => a.sex === 'Hembra' && a.status !== 'vendido' && a.status !== 'muerto').length;
    const pregnantAnimals = animals.filter((a: any) => a.esta_preñada).length;
    
    context += `GANADO:\n`;
    context += `- Total de animales: ${totalAnimals}\n`;
    context += `- Animales activos: ${activeAnimals}\n`;
    context += `- Hembras activas: ${femaleAnimals}\n`;
    context += `- Hembras preñadas: ${pregnantAnimals}\n`;
  }

  if (corrales && corrales.length > 0) {
    const totalHectares = corrales.reduce((sum: number, c: any) => sum + (c.hectareas || 0), 0);
    context += `\nCORRALES:\n`;
    context += `- Número de corrales: ${corrales.length}\n`;
    context += `- Total hectáreas: ${totalHectares.toFixed(1)}\n`;
  }

  if (alerts && alerts.length > 0) {
    context += `\nALERTAS PENDIENTES:\n`;
    alerts.forEach((alert: any) => {
      context += `- ${alert.alert_type}`;
      if (alert.days_overdue > 0) context += ` (${alert.days_overdue} días de retraso)`;
      context += '\n';
    });
  }

  return context;
}