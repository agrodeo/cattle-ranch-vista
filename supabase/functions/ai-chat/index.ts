import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    console.log("AI Chat function called with messages:", messages?.length || 0);
    console.log("Include context:", includeContext);
    console.log("LOVABLE_API_KEY configured:", !!LOVABLE_API_KEY);
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
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
    if (req.headers.get('Authorization')) {
      try {
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (!authError && userData.user) {
          user = userData.user;
        }
      } catch (error) {
        console.log('Auth error (non-critical):', error);
      }
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

    console.log("Calling Lovable AI with system prompt length:", systemPrompt.length);
    console.log("Total messages to send:", messages.length + 1);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });
    
    console.log("Lovable AI response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
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