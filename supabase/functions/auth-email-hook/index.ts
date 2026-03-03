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

interface SupabaseAuthHookPayload {
  user: {
    id: string;
    email: string;
    new_email?: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

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

function buildConfirmationUrl(
  siteUrl: string,
  tokenHash: string,
  type: string,
  redirectTo?: string
): string {
  const base = siteUrl || SITE_URL;
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type,
  });
  if (redirectTo) {
    params.set("next", redirectTo);
  }
  return `${base}/auth/confirm?${params.toString()}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verify using the hook secret
  const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  if (hookSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${hookSecret}`) {
      console.error("Unauthorized: invalid hook secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  try {
    const payload: SupabaseAuthHookPayload = await req.json();
    const { user, email_data } = payload;
    const { email_action_type, token, token_hash, redirect_to, site_url } = email_data;
    const email = user.email;

    console.log(`Processing auth email: type=${email_action_type}, to=${email}`);

    const confirmationUrl = buildConfirmationUrl(
      site_url,
      token_hash,
      email_action_type,
      redirect_to
    );

    let subject: string;
    let html: string;

    switch (email_action_type) {
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
            newEmail: user.new_email,
          })
        );
        break;
      }
      case "reauthentication": {
        subject = `Tu código de verificación de ${SITE_NAME}`;
        html = renderToStaticMarkup(
          createElement(ReauthenticationEmail, { token, siteName: SITE_NAME })
        );
        break;
      }
      default: {
        console.warn(`Unknown email type: ${email_action_type}`);
        return new Response(
          JSON.stringify({ error: `Unknown type: ${email_action_type}` }),
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
