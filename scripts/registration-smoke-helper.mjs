import process from "node:process";

import {
  confirmRegistrationHold,
  createRegistrationHold
} from "../lib/passreserve-registrations.js";

console.info = () => {};

function getLastPathSegment(urlLike) {
  const pathname = new URL(urlLike, "http://127.0.0.1").pathname;
  const segments = pathname.split("/").filter(Boolean);

  return segments[segments.length - 1] ?? "";
}

async function main() {
  const baseUrl = process.argv[2];

  if (!baseUrl) {
    throw new Error("Base URL is required.");
  }

  const holdResult = createRegistrationHold({
    slug: "alpine-trail-lab",
    eventSlug: "sunrise-ridge-session",
    occurrenceId: "atl-sunrise-2026-04-18",
    ticketCategoryId: "general",
    quantity: 1,
    attendeeName: "Smoke Test Guest",
    attendeeEmail: "smoke-guest@example.com",
    attendeePhone: "+39 340 111 1111"
  });

  if (!holdResult.ok) {
    throw new Error(holdResult.message || "Could not create registration hold.");
  }

  const holdToken = getLastPathSegment(holdResult.redirectHref);
  const confirmResult = await confirmRegistrationHold({
    slug: "alpine-trail-lab",
    eventSlug: "sunrise-ridge-session",
    holdToken,
    termsAccepted: "yes",
    responsibilityAccepted: "yes",
    baseUrl
  });

  if (!confirmResult.ok) {
    throw new Error(confirmResult.message || "Could not confirm registration hold.");
  }

  process.stdout.write(
    JSON.stringify({
      holdRedirectHref: holdResult.redirectHref,
      confirmRedirectHref: confirmResult.redirectHref
    })
  );
}

await main();
