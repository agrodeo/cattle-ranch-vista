import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to get their identity
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Admin client for deletion operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get user's cabaña_id
    const { data: profile } = await adminClient
      .from("profiles")
      .select("cabaña_id")
      .eq("user_id", userId)
      .single();

    const cabañaId = (profile as Record<string, unknown> | null)?.['cabaña_id'] as string | undefined;

    if (cabañaId) {
      // Check if user is the owner of the cabaña
      const { data: cabaña } = await adminClient
        .from("cabañas")
        .select("owner_id")
        .eq("id", cabañaId)
        .single();

      const isOwner = cabaña?.owner_id === userId;

      if (isOwner) {
        // Delete all cabaña data in dependency order
        // 1. AI chat messages (via conversations)
        const { data: conversations } = await adminClient
          .from("ai_chat_conversations")
          .select("id")
          .eq("cabaña_id", cabañaId);

        if (conversations && conversations.length > 0) {
          const convIds = conversations.map((c: any) => c.id);
          await adminClient
            .from("ai_chat_messages")
            .delete()
            .in("conversation_id", convIds);
        }

        await adminClient
          .from("ai_chat_conversations")
          .delete()
          .eq("cabaña_id", cabañaId);

        // 2. Animal-related tables
        await adminClient.from("animal_vaccines").delete().eq("cabaña_id", cabañaId);
        await adminClient.from("animal_weight_history").delete().eq("cabaña_id", cabañaId);
        await adminClient.from("animal_documents").delete().eq("cabaña_id", cabañaId);
        await adminClient.from("reproductive_activities").delete().eq("cabaña_id", cabañaId);
        await adminClient.from("reproductive_alerts").delete().eq("cabaña_id", cabañaId);

        // 3. Pregnancy records
        const { data: animals } = await adminClient
          .from("animals")
          .select("id")
          .eq("cabaña_id", cabañaId);

        if (animals && animals.length > 0) {
          const animalIds = animals.map((a: any) => a.id);
          await adminClient.from("preñeces").delete().eq("cabaña_id", cabañaId);
          await adminClient.from("individual_reproductive_kpis").delete().eq("cabaña_id", cabañaId);
          await adminClient.from("reproductive_annual_metrics").delete().eq("cabaña_id", cabañaId);
          await adminClient.from("reproductive_active_years").delete().in("animal_id", animalIds);

          // Activities
          await adminClient.from("activities").delete().in("animal_id", animalIds);

          // Finance animal sales
          const { data: finances } = await adminClient
            .from("finances")
            .select("id")
            .eq("cabaña_id", cabañaId);
          if (finances && finances.length > 0) {
            const financeIds = finances.map((f: any) => f.id);
            await adminClient.from("finances_animal_sales").delete().in("finance_id", financeIds);
          }

          // Artificial inseminations
          await adminClient.from("artificial_inseminations").delete().eq("cabaña_id", cabañaId);
        }

        // 4. Defunciones
        await adminClient.from("defunciones").delete().eq("cabaña_id", cabañaId);

        // 5. Events-related (ia, pesajes depend on eventos)
        const { data: eventos } = await adminClient
          .from("eventos")
          .select("id")
          .eq("cabaña_id", cabañaId);

        if (eventos && eventos.length > 0) {
          const eventoIds = eventos.map((e: any) => e.id);
          await adminClient.from("ia").delete().in("evento_id", eventoIds);
          await adminClient.from("pesajes").delete().in("evento_id", eventoIds);
        }
        await adminClient.from("eventos").delete().eq("cabaña_id", cabañaId);

        // 6. Animals (after all dependencies removed)
        await adminClient.from("animals").delete().eq("cabaña_id", cabañaId);

        // 7. Corrals
        await adminClient.from("corral_movements").delete().eq("cabaña_id", cabañaId);
        await adminClient.from("corrales").delete().eq("cabaña_id", cabañaId);

        // 8. Finance
        await adminClient.from("finance_recurring").delete().eq("cabaña_id", cabañaId);
        await adminClient.from("finances").delete().eq("cabaña_id", cabañaId);
        await adminClient.from("finance_categories").delete().eq("cabaña_id", cabañaId);

        // 9. Settings & config
        await adminClient.from("custom_benchmarks").delete().eq("cabaña_id", cabañaId);
        await adminClient.from("cabaña_vaccination_requirements").delete().eq("cabaña_id", cabañaId);
        await adminClient.from("herd_settings").delete().eq("cabaña_id", cabañaId);
        await adminClient.from("catalogo_causas").delete().eq("cabaña_id", cabañaId);
        await adminClient.from("bulls").delete().eq("cabaña_id", cabañaId);

        // 10. Billing
        await adminClient.from("billing_subscriptions").delete().eq("cabana_id", cabañaId);
        await adminClient.from("billing_payments").delete().eq("cabana_id", cabañaId);
        await adminClient.from("billing_customers").delete().eq("cabana_id", cabañaId);
      }

      // 11. Delete user roles
      await adminClient.from("user_roles").delete().eq("user_id", userId);

      // 12. Delete profiles (other profiles linked to same cabaña if owner)
      await adminClient.from("profiles").delete().eq("user_id", userId);

      // 13. Delete cabaña if owner
      if (isOwner) {
        // Delete other profiles linked to this cabaña first
        await adminClient.from("profiles").delete().eq("cabaña_id", cabañaId);
        await adminClient.from("cabañas").delete().eq("id", cabañaId);
      }
    } else {
      // No cabaña, just clean up user data
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      await adminClient.from("profiles").delete().eq("user_id", userId);
    }

    // 14. Delete auth user
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error("Error deleting auth user:", deleteAuthError);
      return new Response(
        JSON.stringify({ error: "Failed to delete auth account", details: deleteAuthError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Account deletion error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
