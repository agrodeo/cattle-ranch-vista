import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  identifier: string; // email or employee_code
  origin?: string; // e.g., https://app.example.com
}

function safeGenericResponse() {
  return new Response(
    JSON.stringify({ message: "If the account exists, an email was sent." }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

function createSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

async function sendEmail(to: string, resetLink: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.log("RESEND_API_KEY not set; skipping email send. Link:", resetLink);
    return { skipped: true };
  }
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: "AgroDeo <no-reply@resend.dev>",
    to: [to],
    subject: "Restablece tu contraseña",
    html: `<p>Para restablecer tu contraseña, haz clic en el siguiente enlace:</p>
           <p><a href="${resetLink}">${resetLink}</a></p>
           <p>Este enlace expira en 1 hora.</p>`,
  });
  if (error) throw error;
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { identifier, origin }: RequestBody = await req.json();
    if (!identifier || typeof identifier !== "string") return safeGenericResponse();

    const supabase = createSupabaseAdmin();

    // Find user by email or employee_code
    const { data: users } = await supabase
      .from("users")
      .select("id,email,full_name")
      .eq("is_active", true)
      .eq("is_internal_profile", true)
      .or(`email.eq.${identifier},employee_code.eq.${identifier}`)
      .limit(1);

    const user = users && users.length > 0 ? users[0] : null;

    // Always return generic success to avoid enumeration
    if (!user) return safeGenericResponse();

    // Invalidate previous tokens
    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("used_at", null);

    // Create new token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({ user_id: user.id, token, expires_at: expiresAt });

    if (insertError) {
      console.error("Error creating token:", insertError);
      return safeGenericResponse();
    }

    const appOrigin = origin && /^https?:\/\//.test(origin) ? origin : "";
    const linkBase = appOrigin || "";
    const resetLink = linkBase ? `${linkBase}/reset-password?token=${token}` : `http://localhost:5173/reset-password?token=${token}`;

    // Try to send email (silently skip if no API key)
    try {
      await sendEmail(user.email ?? "", resetLink);
    } catch (e) {
      console.log("Email send error (not fatal):", e);
    }

    return safeGenericResponse();
  } catch (e) {
    console.error(e);
    return safeGenericResponse();
  }
}, { onListen: () => console.log("request-password-reset function ready") });
