import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, includeContext = true } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    console.log("AI Chat function called with messages:", messages?.length || 0);
    console.log("Include context:", includeContext);
    console.log("OPENAI_API_KEY configured:", !!OPENAI_API_KEY);
    
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Get current user and their cabaña (only required for context)
    let user = null;
    let shouldIncludeContext = includeContext;
    
    // Only try to get user if auth header is present
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        // Use direct API call instead of Supabase client to avoid browser API issues
        const token = authHeader.replace('Bearer ', '');
        const profileResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/profiles?select=user_id,full_name`, {
          headers: {
            'Authorization': authHeader,
            'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Prefer': 'return=representation'
          }
        });
        
        if (profileResponse.ok) {
          const profiles = await profileResponse.json();
          console.log('Profile response:', profiles);
          if (profiles && profiles.length > 0) {
            user = { id: profiles[0].user_id, name: profiles[0].full_name };
            console.log('Authenticated user found:', profiles[0].user_id);
          } else {
            console.log('No profile found in response');
          }
        } else {
          const errorText = await profileResponse.text();
          console.log('Profile fetch failed:', profileResponse.status, errorText);
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

    let systemPrompt = `Eres un asistente experto en ganadería especializado en analizar datos de cabañas bovinas. Tu función es responder de forma CONCISA y ESPECÍFICA usando ÚNICAMENTE los datos reales de la cabaña del usuario.

REGLAS IMPORTANTES:
- Respuestas CORTAS (máximo 3-4 líneas)
- Usa SOLO los datos específicos de la cabaña proporcionados
- NO des consejos genéricos
- Analiza y responde basándote en los números reales
- Si no tienes datos suficientes, di "necesito más información sobre [tema específico]"
- Sé directo y conversacional, como en un chat

Analiza los datos de la cabaña y responde de forma específica a cada pregunta.`;

    // Add cabaña context if requested and user is authenticated
    if (shouldIncludeContext && user) {
      try {
        console.log('Attempting to get cabaña context for user:', user.id);
        const cabanaContext = await getCabanaContext(authHeader);
        if (cabanaContext) {
          console.log('Cabaña context retrieved:', cabanaContext.substring(0, 100) + '...');
          systemPrompt += `\n\nDATOS ACTUALES DE LA CABAÑA:\n${cabanaContext}\n\nIMPORTANTE: Usa ÚNICAMENTE estos datos para responder. Analiza los números específicos y responde de forma concisa basándote solo en esta información.`;
        } else {
          console.log('No cabaña context retrieved');
          systemPrompt += `\n\nNo hay datos disponibles de la cabaña. Indica que necesitas acceso a los datos para poder ayudar.`;
        }
      } catch (error) {
        console.log('Error getting cabaña context:', error);
        // Continue without context rather than failing
      }
    } else {
      console.log('Not including context. shouldIncludeContext:', shouldIncludeContext, 'user exists:', !!user);
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
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: 300, // Limitar tokens para respuestas más cortas
      }),
    });
    
    console.log("OpenAI response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);
      console.error("OpenAI API key configured:", !!OPENAI_API_KEY);
      console.error("Request URL:", "https://api.openai.com/v1/chat/completions");
      return new Response(JSON.stringify({ 
        error: "OpenAI error", 
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

async function getCabanaContext(authHeader: string | null): Promise<string> {
  if (!authHeader) return '';

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  
  try {
    // Get profile to find cabaña_id
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?select=cabaña_id`, {
      headers: {
        'Authorization': authHeader,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!profileResponse.ok) return '';
    const profiles = await profileResponse.json();
    if (!profiles || profiles.length === 0 || !profiles[0].cabaña_id) return '';
    
    const cabanaId = profiles[0].cabaña_id;
    
    // Get basic cabaña info
    const cabanaResponse = await fetch(`${supabaseUrl}/rest/v1/cabañas?select=name,location&id=eq.${cabanaId}`, {
      headers: {
        'Authorization': authHeader,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });

    // Get animal statistics
    const animalsResponse = await fetch(`${supabaseUrl}/rest/v1/animals?select=sex,status,esta_preñada,birth_date,fecha_muerte&cabaña_id=eq.${cabanaId}`, {
      headers: {
        'Authorization': authHeader,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });

    // Get corrales
    const corralesResponse = await fetch(`${supabaseUrl}/rest/v1/corrales?select=name,hectareas&cabaña_id=eq.${cabanaId}`, {
      headers: {
        'Authorization': authHeader,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });

    // Get mortality data specifically
    const mortalityResponse = await fetch(`${supabaseUrl}/rest/v1/animals?select=id,id_tag,name,sex,birth_date,fecha_muerte,status&cabaña_id=eq.${cabanaId}&status=eq.muerto`, {
      headers: {
        'Authorization': authHeader,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('Data fetch results:', {
      cabaña: cabanaResponse.status,
      animals: animalsResponse.status, 
      corrales: corralesResponse.status,
      mortality: mortalityResponse.status
    });
    
    const cabana = cabanaResponse.ok ? (await cabanaResponse.json())[0] : null;
    const animals = animalsResponse.ok ? await animalsResponse.json() : [];
    const corrales = corralesResponse.ok ? await corralesResponse.json() : [];
    const deadAnimals = mortalityResponse.ok ? await mortalityResponse.json() : [];
    
    console.log('Parsed data:', {
      cabana: !!cabana,
      animalsCount: animals.length,
      corralesCount: corrales.length,
      deadAnimalsCount: deadAnimals.length
    });

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

    // Add mortality context
    if (deadAnimals && deadAnimals.length > 0) {
      const totalDeaths = deadAnimals.length;
      const recentDeaths = deadAnimals.filter((a: any) => {
        if (!a.fecha_muerte) return false;
        const deathDate = new Date(a.fecha_muerte);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return deathDate >= sixMonthsAgo;
      }).length;
      
      const totalRecords = animals.length + deadAnimals.length;
      const mortalityRate = totalRecords > 0 ? ((totalDeaths / totalRecords) * 100).toFixed(1) : '0.0';
      
      context += `\nMORTALIDADES:\n`;
      context += `- Total de muertes registradas: ${totalDeaths}\n`;
      context += `- Muertes en últimos 6 meses: ${recentDeaths}\n`;
      context += `- Tasa de mortalidad histórica: ${mortalityRate}%\n`;
      
      // Add causes if available (this would need to be expanded based on your data structure)
      const withDeathDate = deadAnimals.filter((a: any) => a.fecha_muerte).length;
      if (withDeathDate > 0) {
        context += `- Animales con fecha de muerte registrada: ${withDeathDate}\n`;
      }
    } else {
      context += `\nMORTALIDADES:\n`;
      context += `- No se han registrado mortalidades en el sistema\n`;
    }

    return context;
  } catch (error) {
    console.log('Error fetching cabaña context:', error);
    return '';
  }
}