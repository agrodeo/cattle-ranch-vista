import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

import SignupEmail from "../_shared/email-templates/signup.tsx";
import RecoveryEmail from "../_shared/email-templates/recovery.tsx";
import MagicLinkEmail from "../_shared/email-templates/magic-link.tsx";
import InviteEmail from "../_shared/email-templates/invite.tsx";
import EmailChangeEmail from "../_shared/email-templates/email-change.tsx";
import ReauthenticationEmail from "../_shared/email-templates/reauthentication.tsx";

const SITE_NAME = "agrodeo";
const SITE_URL = "https://agrodeo.farm";
const FROM_EMAIL = `${SITE_NAME} <contact@agrodeo.farm>`;

async function sendViaResend(to: string, subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html: `<!DOCTYPE html>${html}`,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Resend API error:", data);
    throw new Error(`Resend error: ${JSON.stringify(data)}`);
  }
  console.log("Email sent successfully via Resend:", data.id);
  return data;
}

function isEphemeralPreviewOrigin(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (
      host.includes("sandbox.lovable.dev") ||
      host.includes("lovableproject.com") ||
      host.includes("id-preview--")
    );
  } catch {
    return false;
  }
}

function buildConfirmationUrl(
  tokenHash: string | undefined,
  type: string,
  redirectTo?: string,
  token?: string
): string {
  // Prefer redirect_to when it's a stable host; avoid ephemeral preview/sandbox hosts.
  let baseUrl = SITE_URL;
  if (redirectTo && !isEphemeralPreviewOrigin(redirectTo)) {
    try {
      const parsed = new URL(redirectTo);
      baseUrl = parsed.origin;
    } catch {
      // keep SITE_URL fallback
    }
  }

  const params = new URLSearchParams({ type });
  if (tokenHash) params.set("token_hash", tokenHash);
  if (token) params.set("token", token);

  console.log(
    `Generated confirmation URL: base=${baseUrl}, type=${type}, token_hash=${Boolean(tokenHash)}, token=${Boolean(token)}`
  );

  return `${baseUrl}/auth/confirm?${params.toString()}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const rawBody = await req.text();
    console.log("Received auth hook payload:", rawBody);

    const body = JSON.parse(rawBody);

    // Supabase Auth Hook can send different payload shapes.
    // Try to extract email info from known formats.
    let emailActionType: string | undefined;
    let email: string | undefined;
    let newEmail: string | undefined;
    let token: string | undefined;
    let tokenHash: string | undefined;
    let redirectTo: string | undefined;
    let siteUrl: string | undefined;

    if (body.email_data) {
      // Standard Supabase HTTPS Send Email Hook format
      emailActionType = body.email_data.email_action_type;
      token = body.email_data.token;
      tokenHash = body.email_data.token_hash;
      redirectTo = body.email_data.redirect_to;
      siteUrl = body.email_data.site_url;
      email = body.user?.email;
      newEmail = body.user?.new_email;
    } else if (body.type) {
      // Alternative format: flat payload
      emailActionType = body.type;
      email = body.email;
      newEmail = body.new_email;
      token = body.token;
      tokenHash = body.token_hash;
      redirectTo = body.redirect_to;
      siteUrl = body.site_url;
    } else if (body.record) {
      // Database webhook format
      emailActionType = body.record.type || body.record.email_action_type;
      email = body.record.email;
      token = body.record.token;
      tokenHash = body.record.token_hash;
    } else {
      // Last resort: try top-level fields
      emailActionType = body.email_action_type;
      email = body.email || body.user?.email;
      token = body.token;
      tokenHash = body.token_hash;
      redirectTo = body.redirect_to;
    }

    if (!emailActionType || !email) {
      console.error("Could not extract email type or address from payload:", JSON.stringify(body));
      return new Response(
        JSON.stringify({ error: "Invalid payload: missing email_action_type or email" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing auth email: type=${emailActionType}, to=${email}`);

    const confirmationUrl = (tokenHash || token)
      ? buildConfirmationUrl(tokenHash, emailActionType, redirectTo, token)
      : (body.email_data?.confirmation_url || body.confirmation_url || siteUrl || SITE_URL);

    let subject: string;
    let html: string;

    switch (emailActionType) {
      case "signup": {
        subject = `Confirmá tu cuenta en ${SITE_NAME}`;
        html = renderToStaticMarkup(
          createElement(SignupEmail, { confirmationUrl, siteName: SITE_NAME })
        );
        break;
      }
      case "recovery": {
        subject = `Restablecé tu contraseña en ${SITE_NAME}`;
        html = renderToStaticMarkup(
          createElement(RecoveryEmail, { confirmationUrl, siteName: SITE_NAME })
        );
        break;
      }
      case "magiclink": {
        subject = `Tu enlace de acceso a ${SITE_NAME}`;
        html = renderToStaticMarkup(
          createElement(MagicLinkEmail, { confirmationUrl, siteName: SITE_NAME })
        );
        break;
      }
      case "invite": {
        subject = `Te invitaron a ${SITE_NAME}`;
        html = renderToStaticMarkup(
          createElement(InviteEmail, { confirmationUrl, siteName: SITE_NAME })
        );
        break;
      }
      case "email_change": {
        subject = `Confirmá el cambio de email en ${SITE_NAME}`;
        html = renderToStaticMarkup(
          createElement(EmailChangeEmail, {
            confirmationUrl,
            siteName: SITE_NAME,
            newEmail,
          })
        );
        break;
      }
      case "reauthentication": {
        subject = `Tu código de verificación de ${SITE_NAME}`;
        html = renderToStaticMarkup(
          createElement(ReauthenticationEmail, { token: token || "", siteName: SITE_NAME })
        );
        break;
      }
      default: {
        console.warn(`Unknown email type: ${emailActionType}`);
        return new Response(
          JSON.stringify({ error: `Unknown type: ${emailActionType}` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    await sendViaResend(email, subject, html);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing auth email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
