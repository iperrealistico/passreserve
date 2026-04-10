import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { findForbiddenUiCopy } from "./ui-copy-policy.mjs";

const sourceFiles = [
  "app/layout.js",
  "app/home-experience.js",
  "app/about/page.js",
  "app/not-found.js",
  "app/[slug]/page.js",
  "app/[slug]/events/[eventSlug]/page.js",
  "app/[slug]/events/[eventSlug]/register/page.js",
  "app/[slug]/events/[eventSlug]/register/confirm/[holdToken]/page.js",
  "app/[slug]/events/[eventSlug]/register/confirmed/[confirmationToken]/page.js",
  "app/[slug]/events/[eventSlug]/register/payment/preview/[paymentToken]/page.js",
  "app/[slug]/events/[eventSlug]/register/payment/cancel/[paymentToken]/page.js",
  "app/[slug]/events/[eventSlug]/register/payment/success/[paymentToken]/page.js",
  "app/admin/login/page.js",
  "app/admin/(platform)/layout.js",
  "app/admin/(platform)/page.js",
  "app/admin/(platform)/about/page.js",
  "app/admin/(platform)/health/page.js",
  "app/admin/(platform)/settings/page.js",
  "app/admin/(platform)/emails/page.js",
  "app/admin/(platform)/organizers/page.js",
  "app/admin/(platform)/organizers/[slug]/page.js",
  "app/[slug]/admin/layout.js",
  "app/[slug]/admin/dashboard/page.js",
  "app/[slug]/admin/calendar/page.js",
  "app/[slug]/admin/payments/page.js",
  "app/[slug]/admin/registrations/page.js",
  "app/[slug]/admin/dashboard/operations-dashboard-experience.js",
  "app/[slug]/admin/calendar/operations-calendar-experience.js",
  "app/[slug]/admin/registrations/registration-operations-experience.js",
  "app/[slug]/admin/payments/payment-operations-experience.js",
  "lib/passreserve-platform.js",
  "lib/passreserve-operations.js",
  "lib/passreserve-admin.js",
  "lib/passreserve-organizer-requests.js"
];

function sanitizeSource(text) {
  return text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("import "))
    .join("\n");
}

async function main() {
  const failures = [];

  for (const relativePath of sourceFiles) {
    const absolutePath = path.join(process.cwd(), relativePath);
    const text = sanitizeSource(await fs.readFile(absolutePath, "utf8"));
    const match = findForbiddenUiCopy(text, "sourcePattern");

    if (match) {
      failures.push(`${relativePath}: found forbidden UI copy "${match.label}"`);
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
}

await main();
