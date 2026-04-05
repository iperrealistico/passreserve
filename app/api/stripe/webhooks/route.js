import { NextResponse } from "next/server";

import {
  constructStripeWebhookEvent,
  summarizeStripeWebhookEvent
} from "../../../../lib/passreserve-payments";

export const runtime = "nodejs";

export async function POST(request) {
  const result = await constructStripeWebhookEvent(request);

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: result.message
      },
      {
        status: result.status
      }
    );
  }

  const summary = summarizeStripeWebhookEvent(result.event);

  console.info(
    JSON.stringify({
      source: "passreserve-phase-09-webhook",
      level: "info",
      timestamp: new Date().toISOString(),
      ...summary
    })
  );

  return NextResponse.json({
    ok: true,
    received: true
  });
}
