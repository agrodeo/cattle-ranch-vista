import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  token: string;
  newPassword: string;
}

function createSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function response(msg: string, ok = true) {
  return new Response(JSON.stringify({ message: msg }), {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, newPassword }: RequestBody = await req.json();
    if (!token || !newPassword || newPassword.length < 6) {
      return response("Invalid request", false);
    }

    const supabase = createSupabaseAdmin();

    // Validate token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from("password_reset_tokens")
      .select("id, user_id, expires_at, used_at")
      .eq("token", token)
      .limit(1)
      .maybeSingle();

    if (tokenErr || !tokenRow || tokenRow.used_at || new Date(tokenRow.expires_at) <= new Date()) {
      return response("Token inválido o expirado", false);
    }

    const userId = tokenRow.user_id as string;

    // Update/Insert password
    const { data: existingPw } = await supabase
      .from("user_passwords")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (existingPw?.id) {
      const { error: updErr } = await supabase
        .from("user_passwords")
        .update({ password_text: newPassword, updated_at: new Date().toISOString() })
        .eq("id", existingPw.id);
      if (updErr) return response("No se pudo actualizar la contraseña", false);
    } else {
      const { error: insErr } = await supabase
        .from("user_passwords")
        .insert({ user_id: userId, password_text: newPassword });
      if (insErr) return response("No se pudo registrar la contraseña", false);
    }

    // Mark token as used and invalidate others
    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("used_at", null);

    return response("Contraseña actualizada correctamente");
  } catch (e) {
    console.error(e);
    return response("Error procesando la solicitud", false);
  }
}, { onListen: () => console.log("confirm-password-reset function ready") });
