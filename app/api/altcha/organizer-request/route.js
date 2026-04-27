import { NextResponse } from "next/server";

import { createOrganizerRequestAltchaChallenge } from "../../../../lib/passreserve-antispam.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const challenge = await createOrganizerRequestAltchaChallenge();

  return NextResponse.json(challenge, {
    headers: {
      "cache-control": "no-store, max-age=0"
    }
  });
}
