import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ALLOWED = new Set([
  "gpt-4o-mini",
  "gpt-4.1-mini",
  "gpt-4o",
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

    const requestedModel = clientModel ?? "gpt-4o-mini";
    const selectedModel = ALLOWED.has(requestedModel) ? requestedModel : "gpt-4o-mini";

    console.log("AI Chat called, msgs:", messages?.length || 0, "model:", selectedModel, "context:", includeContext);

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    let user = null;
    let shouldIncludeContext = includeContext;

    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
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
          if (profiles?.length > 0) {
            user = { id: profiles[0].user_id, name: profiles[0].full_name };
          }
        }
      } catch (error) {
        console.log('Auth error (non-critical):', error);
      }
    }

    if (!user && shouldIncludeContext) {
      shouldIncludeContext = false;
    }

    let systemPrompt = `You are Agrodeo Chat IA, an expert ranch advisor for cattle operations (and other species if the user specifies).

CRITICAL LANGUAGE RULE: Always detect the language the user writes in and respond in that SAME language. If the user writes in Portuguese, respond in Portuguese. If they write in English, respond in English. If they write in Spanish, respond in Spanish. Never default to Spanish unless the user writes in Spanish.

Your job on every request is to understand the user's question and respond naturally, like a chat, using all available ranch data and your domain knowledge.

Data you can and should use:
- Ranch context (country/region, location, weather/season), infrastructure
- Inventory and categories (cows, heifers, calves by age, bulls, feedlot)
- Health & management: vaccinations, treatments, antiparasitics, findings, deaths/mortality (dates, causes), movements
- Reproduction: service, pregnancy, calving, losses, seasonality
- Performance: BCS, weight gains, feed/ration when available
- Weight TRENDS: You have pre-computed trend analysis per animal. Use this to detect declining animals, potential disease, nutritional issues.
- Reproductive TIMELINES: You have per-female reproductive history. Correlate weight loss with pregnancy/calving stress.
- Mortality PATTERNS: You have pre-computed monthly mortality data. Identify seasonal spikes.
- Any uploaded images (analyze visually when relevant to the question)

How to reason (invisibly):
- Parse the intent
- Gather all relevant data without fixed windows: choose time spans that fit the question
- Segment when it adds value (neonates 0-30d, 31-90d, growing, cows, bulls, pens/zones, seasons)
- PROACTIVELY flag concerning trends: animals losing weight over 3+ months, high mortality in specific categories, reproductive failures
- Highlight actionable insights: peaks, seasonality, problem categories, plausible correlations
- Propose concrete actions and priorities when appropriate
- If images are provided, add a screening line and triage: URGENT | Priority | Observe
- Ask only essential follow-ups when critical data is missing

Keep the tone professional, direct and useful; length is flexible.

Safety / guardrails:
- Provide orientation/triage, not legal medical diagnosis. Use "suspected..."
- Do not prescribe restricted drugs or exact dosages; suggest safe basics and recommend consulting a veterinarian
- Respect user language and regional seasonality

Output style:
- Use markdown formatting: **bold** for emphasis, - for lists, ## for sections when helpful
- Include numbers only when you have them; never invent data
- Be concise but thorough when the data warrants it`;

    if (shouldIncludeContext && user) {
      try {
        const cabanaContext = await getCabanaContext(authHeader);
        if (cabanaContext) {
          systemPrompt += `\n\n## CURRENT RANCH DATA:\n${cabanaContext}\n\nIMPORTANT: Use ONLY this data to answer. Analyze the specific numbers and respond based solely on this real ranch information. Remember: ALWAYS respond in the same language the user writes in.`;
        } else {
          systemPrompt += `\n\nNo ranch data is currently available. Indicate that you need access to the data to provide specific recommendations. Remember: ALWAYS respond in the same language the user writes in.`;
        }
      } catch (error) {
        console.log('Error getting cabaña context:', error);
      }
    }

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
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);

      // Forward rate limit and payment errors
      if (response.status === 429 || response.status === 402) {
        return new Response(JSON.stringify({
          error: response.status === 429 ? "rate_limit" : "payment_required",
          details: errorText,
          status: response.status
        }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

function getAgeMonths(animal: any): number {
  if (!animal.birth_date) return 0;
  const now = new Date();
  const birth = new Date(animal.birth_date);
  return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30));
}

async function getCabanaContext(authHeader: string | null): Promise<string> {
  if (!authHeader) return '';

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const headers = { 'Authorization': authHeader, 'apikey': supabaseKey, 'Content-Type': 'application/json' };

  try {
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?select=cabaña_id`, { headers });
    if (!profileResponse.ok) return '';
    const profiles = await profileResponse.json();
    if (!profiles?.length || !profiles[0].cabaña_id) return '';

    const cabanaId = profiles[0].cabaña_id;

    // Fetch ALL data in parallel
    const [
      cabanaRes, animalsRes, corralesRes, pregnanciesRes, eventsRes,
      iaRes, vaccinesRes, financesRes, tactoRes, vaccinationReqRes,
      weightHistoryRes, bullsRes, defuncionesRes, corralMovementsRes,
      catalogoCausasRes, customBenchmarksRes
    ] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/cabañas?select=*&id=eq.${cabanaId}`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/animals?select=*&cabaña_id=eq.${cabanaId}`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/corrales?select=*&cabaña_id=eq.${cabanaId}`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/preñeces?select=*&cabaña_id=eq.${cabanaId}`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/eventos?select=*&cabaña_id=eq.${cabanaId}`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/ia?select=*,eventos!inner(cabaña_id)&eventos.cabaña_id=eq.${cabanaId}`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/animal_vaccines?select=*&cabaña_id=eq.${cabanaId}`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/finances?select=*&cabaña_id=eq.${cabanaId}`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/tactos?select=*,eventos!inner(cabaña_id)&eventos.cabaña_id=eq.${cabanaId}`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/cabaña_vaccination_requirements?select=*&cabaña_id=eq.${cabanaId}&is_active=eq.true`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/animal_weight_history?select=*&cabaña_id=eq.${cabanaId}&order=fecha.desc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/bulls?select=*&cabaña_id=eq.${cabanaId}`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/defunciones?select=*&cabaña_id=eq.${cabanaId}`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/corral_movements?select=*&cabaña_id=eq.${cabanaId}&order=fecha_movimiento.desc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/catalogo_causas?select=*&cabaña_id=eq.${cabanaId}&activo=eq.true`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/custom_benchmarks?select=*&cabaña_id=eq.${cabanaId}`, { headers })
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
    const vaccinationRequirements = vaccinationReqRes.ok ? await vaccinationReqRes.json() : [];
    const weightHistory = weightHistoryRes.ok ? await weightHistoryRes.json() : [];
    const bulls = bullsRes.ok ? await bullsRes.json() : [];
    const defunciones = defuncionesRes.ok ? await defuncionesRes.json() : [];
    const corralMovements = corralMovementsRes.ok ? await corralMovementsRes.json() : [];
    const catalogoCausas = catalogoCausasRes.ok ? await catalogoCausasRes.json() : [];
    const customBenchmarks = customBenchmarksRes.ok ? await customBenchmarksRes.json() : [];

    const now = new Date();
    const active = animals.filter((a: any) => a.status !== 'vendido' && a.status !== 'muerto');
    let context = '';

    // === CABAÑA INFO ===
    if (cabana) {
      context += `=== INFORMACIÓN DE LA CABAÑA ===\n`;
      context += `Nombre: ${cabana.name}`;
      if (cabana.location) context += `, Ubicación: ${cabana.location}`;
      if (cabana.country_code) context += `, País: ${cabana.country_code}`;
      if (cabana.province_code) context += `, Provincia: ${cabana.province_code}`;
      context += '\n\n';
    }

    // === INVENTARIO RESUMEN ===
    if (animals.length > 0) {
      const sold = animals.filter((a: any) => a.status === 'vendido');
      const dead = animals.filter((a: any) => a.status === 'muerto');
      const females = active.filter((a: any) => a.sex === 'Hembra');
      const males = active.filter((a: any) => a.sex === 'Macho');
      const pregnant = active.filter((a: any) => a.esta_preñada);

      context += `=== INVENTARIO (${animals.length} total, ${active.length} activos) ===\n`;
      context += `Hembras: ${females.length}, Machos: ${males.length}, Vendidos: ${sold.length}, Muertos: ${dead.length}, Preñadas: ${pregnant.length}\n`;

      // Age categories
      const calves = active.filter((a: any) => a.birth_date && getAgeMonths(a) < 8);
      const yearlings = active.filter((a: any) => a.birth_date && getAgeMonths(a) >= 8 && getAgeMonths(a) < 24);
      const adults = active.filter((a: any) => a.birth_date && getAgeMonths(a) >= 24);
      context += `Terneros(<8m): ${calves.length}, Recría(8-24m): ${yearlings.length}, Adultos(>24m): ${adults.length}\n`;

      // Breed breakdown
      const breeds: Record<string, number> = {};
      active.forEach((a: any) => { if (a.breed) breeds[a.breed] = (breeds[a.breed] || 0) + 1; });
      if (Object.keys(breeds).length > 0) {
        context += `Razas: ${Object.entries(breeds).map(([b, c]) => `${b}(${c})`).join(', ')}\n`;
      }

      // Detailed animal list
      context += `\nDETALLE DE ANIMALES ACTIVOS:\n`;
      active.forEach((a: any) => {
        const age = a.birth_date ? getAgeMonths(a) : null;
        context += `- ${a.id_tag}${a.name ? ` (${a.name})` : ''}: ${a.sex}`;
        if (age !== null) context += `, ${age}m`;
        if (a.breed) context += `, ${a.breed}`;
        if (a.esta_preñada) context += `, PREÑADA`;
        if (a.fecha_probable_parto) context += `, parto est: ${a.fecha_probable_parto}`;
        if (a.peso_actual_kg) context += `, ${a.peso_actual_kg}kg`;
        if (a.ganancia_diaria_kg) context += `, GDP: ${a.ganancia_diaria_kg}kg/d`;
        if (a.condicion_corporal) context += `, CC: ${a.condicion_corporal}`;
        if (a.is_castrated) context += `, CASTRADO`;
        if (a.corral_id) {
          const corral = corrales.find((c: any) => c.id === a.corral_id);
          if (corral) context += `, corral: ${corral.name}`;
        }
        context += `\n`;
      });
      context += '\n';
    }

    // === WEIGHT TREND ANALYSIS (ALL animals) ===
    if (weightHistory.length > 0) {
      const weightsByAnimal: Record<string, any[]> = {};
      weightHistory.forEach((w: any) => {
        if (!weightsByAnimal[w.animal_id]) weightsByAnimal[w.animal_id] = [];
        weightsByAnimal[w.animal_id].push(w);
      });

      const alerts: string[] = [];
      const trends: string[] = [];

      Object.entries(weightsByAnimal).forEach(([animalId, weights]) => {
        const animal = animals.find((a: any) => a.id === animalId);
        if (!animal || animal.status === 'vendido' || animal.status === 'muerto') return;

        const sorted = weights.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        const last3 = sorted.slice(0, 3);
        const latest = last3[0];
        const age = animal.birth_date ? getAgeMonths(animal) : null;

        // Determine trend direction
        let direction = 'ESTABLE';
        let isAlert = false;

        if (last3.length >= 2) {
          const newest = last3[0].peso_kg;
          const oldest = last3[last3.length - 1].peso_kg;
          const daySpan = (new Date(last3[0].fecha).getTime() - new Date(last3[last3.length - 1].fecha).getTime()) / (1000 * 60 * 60 * 24);

          if (daySpan > 0) {
            const dailyChange = (newest - oldest) / daySpan;
            if (dailyChange < -0.05) {
              direction = 'DECLINANDO';
              // Alert if declining over 90+ days
              if (daySpan >= 90) {
                isAlert = true;
              }
            } else if (dailyChange > 0.05) {
              direction = 'GANANDO';
            }
          }
        }

        // Compute GDP last 90 days
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const recent90 = sorted.filter((w: any) => new Date(w.fecha) >= ninetyDaysAgo);
        let gdp90 = '';
        if (recent90.length >= 2) {
          const first = recent90[recent90.length - 1];
          const last = recent90[0];
          const days = (new Date(last.fecha).getTime() - new Date(first.fecha).getTime()) / (1000 * 60 * 60 * 24);
          if (days > 0) {
            const gain = (last.peso_kg - first.peso_kg) / days;
            gdp90 = ` GDP90d: ${gain >= 0 ? '+' : ''}${gain.toFixed(3)}kg/d`;
          }
        }

        const weightsStr = last3.map((w: any) => `${w.peso_kg}kg(${w.fecha})`).join(' → ');
        const line = `- ${animal.id_tag}${age !== null ? ` (${age}m)` : ''}: ${weightsStr} | ${direction}${gdp90}${isAlert ? ' | ⚠️ ALERTA: pérdida sostenida 3+ meses' : ''}`;

        if (isAlert) {
          alerts.push(line);
        }
        trends.push(line);
      });

      context += `=== TENDENCIAS DE PESO (${Object.keys(weightsByAnimal).length} animales con historial) ===\n`;

      if (alerts.length > 0) {
        context += `\n⚠️ ANIMALES CON PÉRDIDA DE PESO SOSTENIDA (requieren atención):\n`;
        alerts.forEach(a => context += a + '\n');
      }

      context += `\nTODOS LOS ANIMALES CON HISTORIAL:\n`;
      trends.forEach(t => context += t + '\n');
      context += '\n';
    }

    // === OFFSPRING / CALVINGS MAP (madre -> crías) ===
    const offspringByMother: Record<string, any[]> = {};
    animals.forEach((a: any) => {
      if (a.mother_id) {
        if (!offspringByMother[a.mother_id]) offspringByMother[a.mother_id] = [];
        offspringByMother[a.mother_id].push(a);
      }
    });
    Object.values(offspringByMother).forEach((list: any[]) =>
      list.sort((x: any, y: any) => new Date(y.birth_date || 0).getTime() - new Date(x.birth_date || 0).getTime())
    );

    // === PARICIONES (PARTOS) ===
    {
      const partoEvents = events.filter((e: any) => (e.tipo || '').toUpperCase() === 'PARTO');
      const allOffspring = animals
        .filter((a: any) => a.mother_id && a.birth_date)
        .sort((x: any, y: any) => new Date(y.birth_date).getTime() - new Date(x.birth_date).getTime());

      if (partoEvents.length > 0 || allOffspring.length > 0) {
        context += `=== PARICIONES / PARTOS (${allOffspring.length} crías registradas, ${partoEvents.length} eventos de parto) ===\n`;
        const recentOffspring = allOffspring.slice(0, 30);
        recentOffspring.forEach((c: any) => {
          const mother = animals.find((a: any) => a.id === c.mother_id);
          const father = c.father_id ? animals.find((a: any) => a.id === c.father_id) : null;
          context += `- ${c.birth_date}: madre ${mother?.id_tag || '?'}${mother?.name ? ` (${mother.name})` : ''} parió cría ${c.id_tag}${c.name ? ` (${c.name})` : ''}, ${c.sex || 'sexo N/E'}`;
          if (c.peso_nacimiento) context += `, ${c.peso_nacimiento}kg al nacer`;
          if (father) context += `, padre: ${father.id_tag}`;
          if (c.status && c.status !== 'Activo') context += `, estado: ${c.status}`;
          context += '\n';
        });
        if (allOffspring.length > recentOffspring.length) {
          context += `(${allOffspring.length - recentOffspring.length} pariciones más antiguas no listadas)\n`;
        }
        context += '\n';
      }
    }

    // === REPRODUCTIVE TIMELINE PER FEMALE ===
    {
      const females = active.filter((a: any) => a.sex === 'Hembra');
      if (females.length > 0 && (iaRecords.length > 0 || pregnancies.length > 0 || Object.keys(offspringByMother).length > 0)) {
        context += `=== HISTORIAL REPRODUCTIVO POR HEMBRA ===\n`;

        females.forEach((f: any) => {
          const animalPregnancies = pregnancies.filter((p: any) => p.animal_id === f.id);
          const activePreg = animalPregnancies.find((p: any) => p.estado_final === 'activa');
          const failedCount = animalPregnancies.filter((p: any) => p.estado_final === 'fallida').length;
          const successCount = animalPregnancies.filter((p: any) => p.estado_final === 'exitosa').length;

          // Find last IA for this female
          const femaleIAs = iaRecords.filter((ia: any) => ia.animales_ids?.includes(f.id));
          let lastIA = null;
          if (femaleIAs.length > 0) {
            const iaWithDates = femaleIAs.map((ia: any) => {
              const evt = events.find((e: any) => e.id === ia.evento_id);
              return { ...ia, fecha: evt?.fecha };
            }).filter((ia: any) => ia.fecha).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            lastIA = iaWithDates[0];
          }

          // Find last tacto for this female
          let lastTacto = null;
          if (tactos.length > 0) {
            for (const t of tactos) {
              if (t.resultados && Array.isArray(t.resultados)) {
                const result = t.resultados.find((r: any) => r.animal_id === f.id);
                if (result) {
                  const evt = events.find((e: any) => e.id === t.evento_id);
                  if (evt) {
                    lastTacto = { resultado: result.resultado, fecha: evt.fecha };
                    break;
                  }
                }
              }
            }
          }

          let line = `- ${f.id_tag}${f.name ? ` (${f.name})` : ''}`;
          const age = f.birth_date ? getAgeMonths(f) : null;
          if (age !== null) line += `, ${age}m`;

          if (lastIA) line += ` | última IA: ${lastIA.fecha} (toro: ${lastIA.toro_nombre})`;
          if (lastTacto) line += ` | tacto: ${lastTacto.resultado} (${lastTacto.fecha})`;

          if (activePreg) {
            line += ` | PREÑADA`;
            if (activePreg.fecha_estimada_parto) line += `, parto est: ${activePreg.fecha_estimada_parto}`;
            // Days to calving
            if (activePreg.fecha_estimada_parto) {
              const daysToCalving = Math.floor((new Date(activePreg.fecha_estimada_parto).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (daysToCalving > 0) line += ` (${daysToCalving}d)`;
            }
          } else {
            line += ` | sin preñez activa`;
          }

          line += ` | historial: ${successCount} exitosas, ${failedCount} pérdidas, ${femaleIAs.length} IAs`;
          if (failedCount >= 2) line += ` ⚠️`;

          context += line + '\n';
        });
        context += '\n';
      }
    }

    // === MORTALITY PATTERN ANALYSIS ===
    if (defunciones.length > 0) {
      context += `=== ANÁLISIS DE MORTALIDAD (${defunciones.length} total) ===\n`;

      // By month
      const byMonth: Record<string, number> = {};
      const byCause: Record<string, number> = {};
      defunciones.forEach((d: any) => {
        const month = d.fecha_defuncion?.substring(0, 7) || 'N/A';
        byMonth[month] = (byMonth[month] || 0) + 1;

        const causa = catalogoCausas?.find((c: any) => c.id === d.causa_id);
        const causeName = causa?.nombre || d.causa_texto || 'No especificada';
        byCause[causeName] = (byCause[causeName] || 0) + 1;
      });

      context += `Por mes: ${Object.entries(byMonth).sort().map(([m, c]) => `${m}(${c})`).join(', ')}\n`;
      context += `Por causa: ${Object.entries(byCause).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}(${n})`).join(', ')}\n`;

      // By age category
      const byAge: Record<string, number> = {};
      defunciones.forEach((d: any) => {
        const animal = animals.find((a: any) => a.id === d.animal_id);
        let cat = 'Desconocido';
        if (d.edad_meses !== null && d.edad_meses !== undefined) {
          if (d.edad_meses < 1) cat = 'Neonato (<1m)';
          else if (d.edad_meses < 3) cat = 'Ternero (1-3m)';
          else if (d.edad_meses < 12) cat = 'Recría (3-12m)';
          else if (d.edad_meses < 24) cat = 'Joven (12-24m)';
          else cat = 'Adulto (>24m)';
        }
        byAge[cat] = (byAge[cat] || 0) + 1;
      });
      context += `Por categoría etaria: ${Object.entries(byAge).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}(${n})`).join(', ')}\n`;

      // Recent deaths detail
      const recentDeaths = defunciones.sort((a: any, b: any) => new Date(b.fecha_defuncion).getTime() - new Date(a.fecha_defuncion).getTime()).slice(0, 15);
      context += `\nÚltimas ${recentDeaths.length} defunciones:\n`;
      recentDeaths.forEach((d: any) => {
        const animal = animals.find((a: any) => a.id === d.animal_id);
        const causa = catalogoCausas?.find((c: any) => c.id === d.causa_id);
        context += `- ${d.fecha_defuncion}: ${animal?.id_tag || '?'}`;
        if (d.edad_meses) context += `, ${d.edad_meses}m`;
        context += `, causa: ${causa?.nombre || d.causa_texto || 'N/E'}`;
        if (d.notas) context += ` - ${d.notas}`;
        context += '\n';
      });
      context += '\n';
    }

    // === CORRALES ===
    if (corrales.length > 0) {
      context += `=== CORRALES (${corrales.length}) ===\n`;
      corrales.forEach((c: any) => {
        const animalsInCorral = active.filter((a: any) => a.corral_id === c.id);
        context += `- ${c.name}: ${c.hectareas || 0}ha, ${animalsInCorral.length} animales`;
        if (c.capacity) context += `, cap: ${c.capacity}`;
        context += '\n';
      });
      context += '\n';
    }

    // === VACCINATION STATUS ===
    if (vaccinationRequirements.length > 0) {
      context += `=== REQUISITOS DE VACUNACIÓN (${vaccinationRequirements.length}) ===\n`;
      vaccinationRequirements.forEach((req: any) => {
        context += `- ${req.vaccine_name} (${req.vaccine_code}): ${req.is_mandatory ? 'OBLIGATORIA' : 'Opcional'}`;
        if (req.min_age_months) context += `, desde ${req.min_age_months}m`;
        if (req.max_age_months) context += `, hasta ${req.max_age_months}m`;
        if (req.sex_restriction) context += `, solo ${req.sex_restriction}`;
        if (req.frequency_months) context += `, c/${req.frequency_months}m`;
        context += '\n';
      });

      // Quick compliance summary
      if (active.length > 0) {
        context += `\nCumplimiento vacunal:\n`;
        vaccinationRequirements.forEach((req: any) => {
          const applicable = active.filter((a: any) => {
            const age = getAgeMonths(a);
            if (req.min_age_months && age < req.min_age_months) return false;
            if (req.max_age_months && age > req.max_age_months) return false;
            if (req.sex_restriction && a.sex !== req.sex_restriction) return false;
            return true;
          });
          if (applicable.length === 0) return;
          const vaccinated = applicable.filter((a: any) =>
            vaccines.some((v: any) => v.animal_id === a.id && v.vaccine_code === req.vaccine_code && v.is_complete)
          );
          const pct = applicable.length > 0 ? Math.round(vaccinated.length / applicable.length * 100) : 0;
          context += `- ${req.vaccine_name}: ${vaccinated.length}/${applicable.length} (${pct}%)`;
          if (pct < 80) context += ' ⚠️';
          context += '\n';
        });
      }
      context += '\n';
    }

    // === PREGNANCIES SUMMARY ===
    if (pregnancies.length > 0) {
      const activeP = pregnancies.filter((p: any) => p.estado_final === 'activa');
      const successful = pregnancies.filter((p: any) => p.estado_final === 'exitosa');
      const failed = pregnancies.filter((p: any) => p.estado_final === 'fallida');

      context += `=== PREÑECES (${pregnancies.length} total) ===\n`;
      context += `Activas: ${activeP.length}, Exitosas: ${successful.length}, Fallidas: ${failed.length}\n`;

      if (activeP.length > 0) {
        context += `Preñeces activas:\n`;
        activeP.forEach((p: any) => {
          const animal = animals.find((a: any) => a.id === p.animal_id);
          context += `- ${animal?.id_tag || '?'}`;
          if (p.fecha_inicio) context += `, inicio: ${p.fecha_inicio}`;
          if (p.fecha_estimada_parto) {
            context += `, parto est: ${p.fecha_estimada_parto}`;
            const days = Math.floor((new Date(p.fecha_estimada_parto).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (days > 0) context += ` (${days}d)`;
          }
          context += '\n';
        });
      }
      context += '\n';
    }

    // === INSEMINATIONS ===
    if (iaRecords.length > 0) {
      context += `=== INSEMINACIONES (${iaRecords.length}) ===\n`;
      const recentIAs = iaRecords.slice(0, 15);
      recentIAs.forEach((ia: any) => {
        const event = events.find((e: any) => e.id === ia.evento_id);
        context += `- ${event?.fecha || 'N/A'}: ${ia.animales_ids?.length || 0} hembras, toro: ${ia.toro_nombre}`;
        if (ia.raza_toro) context += ` (${ia.raza_toro})`;
        context += '\n';
      });
      context += '\n';
    }

    // === BULLS ===
    if (bulls.length > 0) {
      context += `=== TOROS IA (${bulls.length}) ===\n`;
      bulls.forEach((b: any) => {
        context += `- ${b.name}`;
        if (b.breed) context += `, ${b.breed}`;
        if (b.registration_level) context += `, ${b.registration_level}`;
        if (b.scrotal_circumference) context += `, CE: ${b.scrotal_circumference}cm`;
        context += '\n';
      });
      context += '\n';
    }

    // === EVENTS SUMMARY ===
    if (events.length > 0) {
      const byType: Record<string, number> = {};
      events.forEach((e: any) => { byType[e.tipo] = (byType[e.tipo] || 0) + 1; });
      context += `=== EVENTOS (${events.length}) ===\n`;
      context += Object.entries(byType).map(([t, c]) => `${t}: ${c}`).join(', ') + '\n';

      const recent = events.filter((e: any) => e.fecha).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 10);
      if (recent.length > 0) {
        context += `Últimos 10: ${recent.map((e: any) => `${e.fecha}:${e.tipo}`).join(' | ')}\n`;
      }
      context += '\n';
    }

    // === FINANCES SUMMARY ===
    if (finances.length > 0) {
      const income = finances.filter((f: any) => f.type === 'ingreso');
      const expense = finances.filter((f: any) => f.type === 'egreso');
      const totalIncome = income.reduce((s: number, f: any) => s + (f.amount || 0), 0);
      const totalExpense = expense.reduce((s: number, f: any) => s + (f.amount || 0), 0);
      context += `=== FINANZAS (${finances.length} movimientos) ===\n`;
      context += `Ingresos: ${income.length} ($${totalIncome.toFixed(0)}), Egresos: ${expense.length} ($${totalExpense.toFixed(0)}), Balance: $${(totalIncome - totalExpense).toFixed(0)}\n\n`;
    }

    // === BENCHMARKS ===
    if (customBenchmarks.length > 0) {
      context += `=== BENCHMARKS ===\n`;
      customBenchmarks.forEach((b: any) => {
        context += `${b.breed || 'General'}: nacim E>${b.birth_weight_excellent}kg B>${b.birth_weight_good}kg, destete E>${b.weaning_weight_excellent}kg, GDP E>${b.daily_gain_excellent}kg/d\n`;
      });
      context += '\n';
    }

    // === CORRAL MOVEMENTS ===
    if (corralMovements.length > 0) {
      const recent = corralMovements.slice(0, 15);
      context += `=== MOVIMIENTOS CORRALES (últimos ${recent.length} de ${corralMovements.length}) ===\n`;
      recent.forEach((m: any) => {
        const animal = animals.find((a: any) => a.id === m.animal_id);
        const from = corrales.find((c: any) => c.id === m.corral_anterior_id);
        const to = corrales.find((c: any) => c.id === m.corral_nuevo_id);
        context += `- ${m.fecha_movimiento}: ${animal?.id_tag || '?'} ${from?.name || '-'} → ${to?.name || '-'}`;
        if (m.motivo) context += ` (${m.motivo})`;
        context += '\n';
      });
      context += '\n';
    }

    console.log('Context length:', context.length);
    return context;
  } catch (error) {
    console.log('Error fetching cabaña context:', error);
    return '';
  }
}
