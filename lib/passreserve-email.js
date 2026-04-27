import { hasResend } from "./passreserve-config.js";

function renderTemplate(html, replacements = {}) {
  return Object.entries(replacements).reduce((output, [key, value]) => {
    return output.replaceAll(key, String(value ?? ""));
  }, html);
}

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
  from,
  cc,
  replyTo,
  headers,
  replacements
}) {
  const resolvedHtml = renderTemplate(html, replacements);
  const resolvedText =
    typeof text === "string" ? renderTemplate(text, replacements) : undefined;
  const resolvedFrom = from || process.env.FROM_EMAIL;

  if (!hasResend() || !resolvedFrom) {
    console.info("[passreserve-email]", {
      mode: "log",
      to,
      subject
    });

    return {
      ok: true,
      mode: "log",
      id: null,
      html: resolvedHtml
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: resolvedFrom,
        to,
        subject,
        html: resolvedHtml,
        ...(typeof resolvedText === "string"
          ? {
              text: resolvedText
            }
          : {}),
        ...(cc
          ? {
              cc
            }
          : {}),
        ...(replyTo
          ? {
              reply_to: replyTo
            }
          : {}),
        ...(headers && Object.keys(headers).length
          ? {
              headers
            }
          : {})
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend request failed (${response.status}): ${body}`);
    }

    const payload = await response.json();

    return {
      ok: true,
      mode: "email",
      id: payload.id ?? null,
      html: resolvedHtml
    };
  } catch (error) {
    console.error("[passreserve-email]", {
      mode: "fallback-log",
      to,
      subject,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      ok: false,
      mode: "fallback-log",
      id: null,
      html: resolvedHtml
    };
  }
}
