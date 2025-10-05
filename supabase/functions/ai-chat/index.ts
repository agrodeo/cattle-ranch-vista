import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Lista blanca de modelos permitidos para controlar costos
const ALLOWED = new Set([
  "gpt-4o-mini",          // modelo económico por defecto
  "gpt-4.1-mini"          // modelo alternativo económico
  // agregar otros modelos aprobados según necesidad
]);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, includeContext = true, model: clientModel } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    // Validar y seleccionar modelo
    const requestedModel = clientModel ?? "gpt-4o-mini";
    const selectedModel = ALLOWED.has(requestedModel) ? requestedModel : "gpt-4o-mini";
    
    console.log("AI Chat function called with messages:", messages?.length || 0);
    console.log("Include context:", includeContext);
    console.log("Requested model:", requestedModel);
    console.log("Selected model:", selectedModel);
    console.log("OPENAI_API_KEY configured:", !!OPENAI_API_KEY);
    
    // Log si se rechazó un modelo no permitido
    if (!ALLOWED.has(requestedModel)) {
      console.log(`Modelo no permitido solicitado: ${requestedModel}, usando por defecto: ${selectedModel}`);
    }
    
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

    let systemPrompt = `You are Agrodeo Chat IA, an expert ranch advisor for cattle operations (and other species if the user specifies).

Your job on every request is to understand the user's question and respond naturally, like a chat, using all available ranch data and your domain knowledge. Do not use headings, markdown decorations, asterisks, or boilerplate sections—just clear prose (you may use short lists only when they truly help readability).

Data you can and should use:
- Ranch context (country/region, location, weather/season), infrastructure (agua/sombra/corrales)
- Inventory and categories (vacas, vaquillonas, terneros por tramos de edad, toros, encierre/feedlot)
- Health & management: vacunaciones, tratamientos, antiparasitarios, hallazgos, bajas/mortalidad (fechas, causas), movimientos
- Reproduction: servicio, preñez, parición, pérdidas, estacionalidad
- Performance: BCS, ganancias de peso, consumo/ración cuando exista
- Any uploaded images (analyze visually when relevant to the question)

How to reason (invisibly):
- Parse the intent (e.g., "¿cómo están mis mortalidades?" → foco en mortalidad por período, categoría, causas y tendencia)
- Gather all relevant data without fixed windows: choose time spans that fit the question (e.g., últimos 7/30/90 días, 12 meses, campaña actual, histórico completo) and compare with prior periods if useful
- Segment cuando sume valor (neonatos 0–30d, 31–90d, recría, vacas, toros, lotes/corrales, zonas, épocas)
- Highlight insights accionables: picos, estacionalidad, categorías problema, correlaciones plausibles (clima, cambios de manejo)
- Propose acciones concretas y prioridades cuando corresponda (operativas, monitoreo, registro de datos, manejo de corrales, agua/sombra, bioseguridad, reproducción, nutrición)
- If images are provided and relevant, add a screening line and a triage: URGENTE | Prioritario | Observar (no diagnósticos legales)
- Ask only essential follow-ups when critical data is missing, otherwise proceed with the best guidance you can

Keep the tone professional, directo y útil; length is flexible: be as short or as detailed as needed to add value—no artificial limits.

Safety / guardrails (must follow):
- Provide orientation/triage, not legal medical diagnosis. Use "sospecha de…"
- Do not prescribe restricted drugs or exact dosages que requieran receta; for care steps, suggest safe basics (higiene de heridas, hidratación, aislamiento, mediciones, manejo del corral) and recommend consulting a veterinarian when appropriate
- If the question is about regulated diseases, keep language cautious and recommend contacting a local veterinarian/authority as needed
- Respect user language and regional seasonality

Output style:
- Plain chat text (no headings, no "Human summary", no fixed number of steps)
- Include numbers only when you have them; never invent data. If a metric is missing, say it briefly and continue with what you can infer or suggest how to record it
- When useful, you may include a short, compact list (2–5 líneas) but avoid heavy formatting`;

    // Add cabaña context if requested and user is authenticated
    if (shouldIncludeContext && user) {
      try {
        console.log('Attempting to get cabaña context for user:', user.id);
        const cabanaContext = await getCabanaContext(authHeader);
        if (cabanaContext) {
          console.log('Cabaña context retrieved:', cabanaContext.substring(0, 100) + '...');
          systemPrompt += `\n\n## DATOS ACTUALES DE LA CABAÑA:\n${cabanaContext}\n\nIMPORTANTE: Usa ÚNICAMENTE estos datos para responder. Analiza los números específicos y responde basándote solo en esta información real de la cabaña.`;
        } else {
          console.log('No cabaña context retrieved');
          systemPrompt += `\n\nNo hay datos disponibles de la cabaña. Indica que necesitas acceso a los datos para poder ayudar con recomendaciones específicas.`;
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
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: 2000, // Permitir respuestas más extensas con todo el contexto
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
    
    // Fetch ALL data in parallel
    const [
      cabanaRes,
      animalsRes,
      corralesRes,
      pregnanciesRes,
      eventsRes,
      iaRes,
      vaccinesRes,
      financesRes,
      tactoRes
    ] = await Promise.all([
      // Basic cabaña info
      fetch(`${supabaseUrl}/rest/v1/cabañas?select=*&id=eq.${cabanaId}`, {
        headers: { 'Authorization': authHeader, 'apikey': supabaseKey, 'Content-Type': 'application/json' }
      }),
      // All animals with full details
      fetch(`${supabaseUrl}/rest/v1/animals?select=*&cabaña_id=eq.${cabanaId}`, {
        headers: { 'Authorization': authHeader, 'apikey': supabaseKey, 'Content-Type': 'application/json' }
      }),
      // All corrales
      fetch(`${supabaseUrl}/rest/v1/corrales?select=*&cabaña_id=eq.${cabanaId}`, {
        headers: { 'Authorization': authHeader, 'apikey': supabaseKey, 'Content-Type': 'application/json' }
      }),
      // All pregnancies
      fetch(`${supabaseUrl}/rest/v1/preñeces?select=*&cabaña_id=eq.${cabanaId}`, {
        headers: { 'Authorization': authHeader, 'apikey': supabaseKey, 'Content-Type': 'application/json' }
      }),
      // All events
      fetch(`${supabaseUrl}/rest/v1/eventos?select=*&cabaña_id=eq.${cabanaId}`, {
        headers: { 'Authorization': authHeader, 'apikey': supabaseKey, 'Content-Type': 'application/json' }
      }),
      // All IA records
      fetch(`${supabaseUrl}/rest/v1/ia?select=*`, {
        headers: { 'Authorization': authHeader, 'apikey': supabaseKey, 'Content-Type': 'application/json' }
      }),
      // All animal vaccines
      fetch(`${supabaseUrl}/rest/v1/animal_vaccines?select=*&cabaña_id=eq.${cabanaId}`, {
        headers: { 'Authorization': authHeader, 'apikey': supabaseKey, 'Content-Type': 'application/json' }
      }),
      // All finances
      fetch(`${supabaseUrl}/rest/v1/finances?select=*&cabaña_id=eq.${cabanaId}`, {
        headers: { 'Authorization': authHeader, 'apikey': supabaseKey, 'Content-Type': 'application/json' }
      }),
      // All tactos
      fetch(`${supabaseUrl}/rest/v1/tactos?select=*`, {
        headers: { 'Authorization': authHeader, 'apikey': supabaseKey, 'Content-Type': 'application/json' }
      })
    ]);

    const cabana = cabanaRes.ok ? (await cabanaRes.json())[0] : null;
    const animals = animalsRes.ok ? await animalsRes.json() : [];
    const corrales = corralesRes.ok ? await corralesRes.json() : [];
    const pregnancies = pregnanciesRes.ok ? await pregnanciesRes.json() : [];
    const events = eventsRes.ok ? await eventsRes.json() : [];
    const iaRecords = iaRes.ok ? await iaRes.json() : [];
    const vaccines = vaccinesRes.ok ? await vaccinesRes.json() : [];
    const finances = financesRes.ok ? await financesRes.json() : [];
    const tactos = tactoRes.ok ? await tactoRes.json() : [];

    let context = '';
    
    // === CABAÑA INFO ===
    if (cabana) {
      context += `=== INFORMACIÓN DE LA CABAÑA ===\n`;
      context += `Nombre: ${cabana.name}\n`;
      if (cabana.location) context += `Ubicación: ${cabana.location}\n`;
      if (cabana.country_code) context += `País: ${cabana.country_code}\n`;
      if (cabana.province_code) context += `Provincia: ${cabana.province_code}\n`;
      context += '\n';
    }

    // === ANIMALES COMPLETOS ===
    if (animals && animals.length > 0) {
      context += `=== INVENTARIO COMPLETO DE ANIMALES (${animals.length} registros) ===\n`;
      
      // Statistics
      const active = animals.filter((a: any) => a.status !== 'vendido' && a.status !== 'muerto');
      const sold = animals.filter((a: any) => a.status === 'vendido');
      const dead = animals.filter((a: any) => a.status === 'muerto');
      const females = active.filter((a: any) => a.sex === 'Hembra');
      const males = active.filter((a: any) => a.sex === 'Macho');
      const pregnant = animals.filter((a: any) => a.esta_preñada);
      
      context += `\nESTADÍSTICAS GENERALES:\n`;
      context += `- Activos: ${active.length} (${females.length} hembras, ${males.length} machos)\n`;
      context += `- Vendidos: ${sold.length}\n`;
      context += `- Muertos: ${dead.length}\n`;
      context += `- Hembras preñadas: ${pregnant.length}\n`;
      
      // Age categories
      const now = new Date();
      const calves = active.filter((a: any) => {
        if (!a.birth_date) return false;
        const months = (now.getTime() - new Date(a.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
        return months < 8;
      });
      const yearlings = active.filter((a: any) => {
        if (!a.birth_date) return false;
        const months = (now.getTime() - new Date(a.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
        return months >= 8 && months < 24;
      });
      const adults = active.filter((a: any) => {
        if (!a.birth_date) return false;
        const months = (now.getTime() - new Date(a.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
        return months >= 24;
      });
      
      context += `\nCATEGORÍAS POR EDAD:\n`;
      context += `- Terneros (0-8 meses): ${calves.length}\n`;
      context += `- Recría (8-24 meses): ${yearlings.length}\n`;
      context += `- Adultos (>24 meses): ${adults.length}\n`;
      
      // Detailed animal list (limit to key info to avoid token overflow)
      context += `\nDETALLE DE ANIMALES ACTIVOS:\n`;
      active.slice(0, 50).forEach((a: any) => {
        const age = a.birth_date ? Math.floor((now.getTime() - new Date(a.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 'N/A';
        context += `- ${a.id_tag}${a.name ? ` (${a.name})` : ''}: ${a.sex}, ${age} meses`;
        if (a.breed) context += `, ${a.breed}`;
        if (a.esta_preñada) context += `, PREÑADA`;
        if (a.peso_actual_kg) context += `, ${a.peso_actual_kg}kg`;
        if (a.corral_id) {
          const corral = corrales.find((c: any) => c.id === a.corral_id);
          if (corral) context += `, corral: ${corral.name}`;
        }
        context += `\n`;
      });
      if (active.length > 50) {
        context += `... y ${active.length - 50} animales más\n`;
      }
      
      // Mortality details
      if (dead.length > 0) {
        context += `\nMORTALIDADES DETALLADAS (${dead.length}):\n`;
        dead.forEach((a: any) => {
          context += `- ${a.id_tag}${a.name ? ` (${a.name})` : ''}: ${a.sex}`;
          if (a.fecha_muerte) context += `, murió: ${a.fecha_muerte}`;
          if (a.causa_muerte) context += `, causa: ${a.causa_muerte}`;
          context += `\n`;
        });
      }
      context += '\n';
    }

    // === CORRALES ===
    if (corrales && corrales.length > 0) {
      context += `=== CORRALES (${corrales.length}) ===\n`;
      corrales.forEach((c: any) => {
        const animalsInCorral = animals.filter((a: any) => a.corral_id === c.id && a.status !== 'vendido' && a.status !== 'muerto');
        context += `- ${c.name}: ${c.hectareas || 0} ha, ${animalsInCorral.length} animales\n`;
      });
      context += '\n';
    }

    // === PREÑECES ===
    if (pregnancies && pregnancies.length > 0) {
      context += `=== HISTORIAL DE PREÑECES (${pregnancies.length}) ===\n`;
      const active = pregnancies.filter((p: any) => p.estado_final === 'activa');
      const successful = pregnancies.filter((p: any) => p.estado_final === 'exitosa');
      const failed = pregnancies.filter((p: any) => p.estado_final === 'fallida');
      
      context += `- Activas: ${active.length}\n`;
      context += `- Exitosas: ${successful.length}\n`;
      context += `- Fallidas: ${failed.length}\n`;
      
      if (active.length > 0) {
        context += `\nPREÑECES ACTIVAS:\n`;
        active.forEach((p: any) => {
          const animal = animals.find((a: any) => a.id === p.animal_id);
          context += `- Animal ${animal?.id_tag || p.animal_id}`;
          if (p.fecha_inicio) context += `, inicio: ${p.fecha_inicio}`;
          if (p.fecha_estimada_parto) context += `, parto estimado: ${p.fecha_estimada_parto}`;
          if (p.origen) context += `, origen: ${p.origen}`;
          context += `\n`;
        });
      }
      context += '\n';
    }

    // === EVENTOS ===
    if (events && events.length > 0) {
      context += `=== EVENTOS REGISTRADOS (${events.length}) ===\n`;
      const byType: any = {};
      events.forEach((e: any) => {
        byType[e.tipo] = (byType[e.tipo] || 0) + 1;
      });
      Object.entries(byType).forEach(([tipo, count]) => {
        context += `- ${tipo}: ${count}\n`;
      });
      
      // Recent events
      const recent = events
        .filter((e: any) => e.fecha)
        .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .slice(0, 20);
      
      if (recent.length > 0) {
        context += `\nÚLTIMOS 20 EVENTOS:\n`;
        recent.forEach((e: any) => {
          context += `- ${e.fecha}: ${e.tipo}`;
          if (e.notas) context += ` - ${e.notas}`;
          context += `\n`;
        });
      }
      context += '\n';
    }

    // === INSEMINACIONES ===
    if (iaRecords && iaRecords.length > 0) {
      context += `=== INSEMINACIONES ARTIFICIALES (${iaRecords.length}) ===\n`;
      iaRecords.slice(0, 20).forEach((ia: any) => {
        const event = events.find((e: any) => e.id === ia.evento_id);
        context += `- Evento: ${event?.fecha || 'N/A'}`;
        if (ia.animales_ids) context += `, ${ia.animales_ids.length} hembras`;
        if (ia.toro_id) {
          const bull = animals.find((a: any) => a.id === ia.toro_id);
          context += `, toro: ${bull?.id_tag || ia.toro_id}`;
        }
        context += `\n`;
      });
      context += '\n';
    }

    // === VACUNACIONES ===
    if (vaccines && vaccines.length > 0) {
      context += `=== VACUNACIONES (${vaccines.length} registros) ===\n`;
      const byVaccine: any = {};
      vaccines.forEach((v: any) => {
        byVaccine[v.vaccine_code] = (byVaccine[v.vaccine_code] || 0) + 1;
      });
      Object.entries(byVaccine).forEach(([vaccine, count]) => {
        context += `- ${vaccine}: ${count} aplicaciones\n`;
      });
      
      // Recent vaccinations
      const recent = vaccines
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15);
      context += `\nÚLTIMAS 15 VACUNACIONES:\n`;
      recent.forEach((v: any) => {
        const animal = animals.find((a: any) => a.id === v.animal_id);
        context += `- ${v.date}: ${animal?.id_tag || v.animal_id}, ${v.vaccine_code}\n`;
      });
      context += '\n';
    }

    // === FINANZAS ===
    if (finances && finances.length > 0) {
      context += `=== MOVIMIENTOS FINANCIEROS (${finances.length}) ===\n`;
      const income = finances.filter((f: any) => f.type === 'ingreso');
      const expense = finances.filter((f: any) => f.type === 'egreso');
      const totalIncome = income.reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
      const totalExpense = expense.reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
      
      context += `- Ingresos: ${income.length} movimientos, total: $${totalIncome.toFixed(2)}\n`;
      context += `- Egresos: ${expense.length} movimientos, total: $${totalExpense.toFixed(2)}\n`;
      context += `- Balance: $${(totalIncome - totalExpense).toFixed(2)}\n`;
      context += '\n';
    }

    // === TACTOS ===
    if (tactos && tactos.length > 0) {
      context += `=== TACTOS REALIZADOS (${tactos.length}) ===\n`;
      tactos.slice(0, 10).forEach((t: any) => {
        const event = events.find((e: any) => e.id === t.evento_id);
        context += `- Fecha: ${event?.fecha || 'N/A'}`;
        if (t.resultados) {
          const results = Array.isArray(t.resultados) ? t.resultados : [];
          const pregnant = results.filter((r: any) => r.resultado === 'preñada').length;
          const empty = results.filter((r: any) => r.resultado === 'vacia').length;
          context += `, ${results.length} hembras (${pregnant} preñadas, ${empty} vacías)`;
        }
        context += `\n`;
      });
      context += '\n';
    }

    console.log('Generated comprehensive context length:', context.length);
    return context;
  } catch (error) {
    console.log('Error fetching cabaña context:', error);
    return '';
  }
}