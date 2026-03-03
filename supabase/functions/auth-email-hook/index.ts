import { Webhook } from "@lovable.dev/webhooks-js";
import { sendEmail } from "@lovable.dev/email-js";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

import SignupEmail from "../_shared/email-templates/signup.tsx";
import RecoveryEmail from "../_shared/email-templates/recovery.tsx";
import MagicLinkEmail from "../_shared/email-templates/magic-link.tsx";
import InviteEmail from "../_shared/email-templates/invite.tsx";
import EmailChangeEmail from "../_shared/email-templates/email-change.tsx";
import ReauthenticationEmail from "../_shared/email-templates/reauthentication.tsx";

const SITE_NAME = "agrodeo";

interface AuthEmailPayload {
  type: string;
  email: string;
  new_email?: string;
  confirmation_url?: string;
  token?: string;
  token_hash?: string;
  redirect_to?: string;
  callback_url: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("LOVABLE_API_KEY not set");
    return new Response("Server configuration error", { status: 500 });
  }

  try {
    const rawBody = await req.text();

    // Verify webhook signature
    const wh = new Webhook(apiKey);
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => (headers[k] = v));
    const payload = wh.verify(rawBody, headers) as AuthEmailPayload;

    const { type, email, new_email, confirmation_url, token, callback_url } = payload;

    let subject: string;
    let html: string;

    switch (type) {
      case "signup": {
        subject = `Confirmá tu cuenta en ${SITE_NAME}`;
        html = renderToStaticMarkup(
          createElement(SignupEmail, {
            confirmationUrl: confirmation_url || "",
            siteName: SITE_NAME,
          })
        );
        break;
      }
      case "recovery": {
        subject = `Restablecé tu contraseña en ${SITE_NAME}`;
        html = renderToStaticMarkup(
          createElement(RecoveryEmail, {
            confirmationUrl: confirmation_url || "",
            siteName: SITE_NAME,
          })
        );
        break;
      }
      case "magiclink": {
        subject = `Tu enlace de acceso a ${SITE_NAME}`;
        html = renderToStaticMarkup(
          createElement(MagicLinkEmail, {
            confirmationUrl: confirmation_url || "",
            siteName: SITE_NAME,
          })
        );
        break;
      }
      case "invite": {
        subject = `Te invitaron a ${SITE_NAME}`;
        html = renderToStaticMarkup(
          createElement(InviteEmail, {
            confirmationUrl: confirmation_url || "",
            siteName: SITE_NAME,
          })
        );
        break;
      }
      case "email_change": {
        subject = `Confirmá el cambio de email en ${SITE_NAME}`;
        html = renderToStaticMarkup(
          createElement(EmailChangeEmail, {
            confirmationUrl: confirmation_url || "",
            siteName: SITE_NAME,
            newEmail: new_email,
          })
        );
        break;
      }
      case "reauthentication": {
        subject = `Tu código de verificación de ${SITE_NAME}`;
        html = renderToStaticMarkup(
          createElement(ReauthenticationEmail, {
            token: token || "",
            siteName: SITE_NAME,
          })
        );
        break;
      }
      default: {
        console.warn(`Unknown email type: ${type}`);
        return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Send the email via Lovable's email API
    await sendEmail(
      {
        to: email,
        subject,
        html: `<!DOCTYPE html>${html}`,
      },
      {
        callbackUrl: callback_url,
        apiKey,
      }
    );

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
