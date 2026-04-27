import { NextResponse } from "next/server";

import { ingestSharedMailboxEmail } from "../../../../lib/passreserve-mailbox.js";
import { verifyResendWebhookPayload } from "../../../../lib/passreserve-resend.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const payload = await request.text();

  try {
    const verified = await verifyResendWebhookPayload(payload, request.headers);
    const event = typeof verified === "string" ? JSON.parse(verified) : verified;
    const result = await ingestSharedMailboxEmail(event);

    return NextResponse.json({
      ok: true,
      received: true,
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Invalid Resend webhook payload."
      },
      {
        status: 401
      }
    );
  }
}
