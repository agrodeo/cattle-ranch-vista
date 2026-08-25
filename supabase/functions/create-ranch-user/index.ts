import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

const CreateRanchUserSchema = z.object({
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().min(1).max(120),
  password: z.string().min(6).max(128),
  role: z.enum(["manager", "worker", "vet", "read_only"]),
  position: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "No authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseClient.auth.getUser();

    if (callerError || !caller) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: canManage, error: canManageError } = await supabaseClient.rpc("can_manage_users", {
      _user_id: caller.id,
    });

    if (canManageError || !canManage) {
      return json({ error: "No tienes permisos para crear usuarios" }, 403);
    }

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("cabaña_id,is_active")
      .eq("user_id", caller.id)
      .single();

    const callerRow = callerProfile as Record<string, unknown> | null;
    if (profileError || !callerRow?.['cabaña_id'] || callerRow['is_active'] === false) {
      return json({ error: "No se encontró una cabaña activa para tu usuario" }, 400);
    }

    const cabañaId = callerRow['cabaña_id'] as string;

    const parsed = CreateRanchUserSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, 400);
    }

    const { email, fullName, password, role, position, phone } = parsed.data;

    const { data: callerRole } = await supabaseClient.rpc("get_user_role", { _user_id: caller.id });
    if (role === "manager" && callerRole !== "owner" && callerRole !== "admin") {
      return json({ error: "Solo el propietario puede crear gerentes" }, 403);
    }

    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("max_users")
      .eq("cabaña_id", cabañaId)
      .maybeSingle();

    const { count: currentUserCount } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("cabaña_id", cabañaId)
      .eq("is_active", true);

    if (subscription?.max_users && currentUserCount !== null && currentUserCount >= subscription.max_users) {
      return json(
        { error: `Límite de usuarios alcanzado (${subscription.max_users}). Mejora tu plan para agregar más usuarios.` },
        400,
      );
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError || !newUser.user) {
      if (createError?.message?.toLowerCase().includes("already")) {
        return json({ error: "Ya existe un usuario con ese email" }, 400);
      }
      throw createError ?? new Error("No se pudo crear el usuario");
    }

    const { error: insertProfileError } = await supabaseAdmin.from("profiles").insert({
      user_id: newUser.user.id,
      email,
      full_name: fullName,
      cabaña_id: cabañaId,
      position: position || null,
      phone: phone || null,
      is_active: true,
      is_internal_profile: false,
    });

    if (insertProfileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw insertProfileError;
    }

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role,
      created_by: caller.id,
    });

    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw roleError;
    }

    return json({
      success: true,
      user: {
        id: newUser.user.id,
        email,
        fullName,
        role,
      },
    });
  } catch (error) {
    console.error("Error creating ranch user:", error);
    return json({ error: error instanceof Error ? error.message : "Error interno del servidor" }, 500);
  }
});
