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
  replyTo,
  replacements
}) {
  const resolvedHtml = renderTemplate(html, replacements);

  if (!hasResend()) {
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

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      html: resolvedHtml,
      ...(replyTo
        ? {
            reply_to: replyTo
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
}
