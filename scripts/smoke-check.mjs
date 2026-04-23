import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

import { findForbiddenUiCopy } from "./ui-copy-policy.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNoInternalCopy(text, routeLabel) {
  const match = findForbiddenUiCopy(text);

  assert(
    !match,
    `${routeLabel} should not include internal wording like "${match?.label}".`
  );
}

function getLastPathSegment(urlLike) {
  const pathname = new URL(urlLike, "http://127.0.0.1").pathname;
  const segments = pathname.split("/").filter(Boolean);

  return segments[segments.length - 1] ?? "";
}

async function findOpenPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not determine an open local port.")));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
  });
}

async function waitForServer(url, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // The server is still booting.
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${url} to respond.`);
}

async function fetchHtml(baseUrl, pathname, init) {
  const response = await fetch(`${baseUrl}${pathname}`, init);
  const text = await response.text();

  return {
    response,
    text
  };
}

async function main() {
  assert(
    existsSync(".next/BUILD_ID"),
    "Smoke checks require an existing production build. Run `npm run build` first."
  );

  const port = await findOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const organizerRequestsFile = path.join(
    await fs.mkdtemp(path.join(os.tmpdir(), "passreserve-smoke-")),
    "organizer-requests.json"
  );
  const passreserveStateFile = path.join(
    await fs.mkdtemp(path.join(os.tmpdir(), "passreserve-state-")),
    "state.json"
  );
  process.env.ORGANIZER_REQUESTS_FILE = organizerRequestsFile;
  process.env.PASSRESERVE_STATE_FILE = passreserveStateFile;
  const nextBin = new URL("../node_modules/next/dist/bin/next", import.meta.url);
  const child = spawn(process.execPath, [nextBin.pathname, "start", "--port", String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      ORGANIZER_REQUESTS_FILE: organizerRequestsFile,
      PASSRESERVE_STATE_FILE: passreserveStateFile
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let serverLogs = "";

  const appendLogs = (chunk) => {
    serverLogs += chunk.toString();

    if (serverLogs.length > 8000) {
      serverLogs = serverLogs.slice(-8000);
    }
  };

  child.stdout.on("data", appendLogs);
  child.stderr.on("data", appendLogs);

  const cleanup = () => {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  };

  process.on("exit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  try {
    await waitForServer(`${baseUrl}/`);

    const homepage = await fetchHtml(baseUrl, "/");
    assert(homepage.response.status === 200, "Homepage should return 200.");
    assert(
      homepage.text.includes("Find an event that feels easy to trust.") &&
        homepage.text.includes("Operate events with Airbnb-level clarity.") &&
        homepage.text.includes("What is Passreserve?"),
      "Homepage should render the split attendee/organizer landing page."
    );
    assertNoInternalCopy(homepage.text, "Homepage");

    const eventsPage = await fetchHtml(baseUrl, "/events");
    assert(eventsPage.response.status === 200, "Events search page should return 200.");
    assert(
      eventsPage.text.includes("Search by city, organizer, or format.") &&
        eventsPage.text.includes("Alpine Switchback Clinic"),
      "Events search page should render the dedicated discovery experience."
    );
    assertNoInternalCopy(eventsPage.text, "Events search page");

    const aboutPage = await fetchHtml(baseUrl, "/about");
    assert(aboutPage.response.status === 200, "About page should return 200.");
    assert(
      aboutPage.text.includes("A calmer way to publish and operate events.") ||
        aboutPage.text.includes("A calmer way to publish and operate events"),
      "About page should render the new long-form about experience."
    );

    const organizerPage = await fetchHtml(baseUrl, "/alpine-trail-lab");
    assert(organizerPage.response.status === 200, "Organizer page should return 200.");
    assert(
      organizerPage.text.includes("View calendar") &&
        organizerPage.text.includes("Published dates"),
      "Organizer page should render the minimal organizer calendar view."
    );
    assertNoInternalCopy(organizerPage.text, "Organizer page");

    const eventPage = await fetchHtml(
      baseUrl,
      "/alpine-trail-lab/events/sunrise-ridge-session"
    );
    assert(eventPage.response.status === 200, "Event detail page should return 200.");
    assert(
      eventPage.text.includes("Choose date") &&
        eventPage.text.includes("Available dates"),
      "Event detail page should render the minimal date-first event flow."
    );
    assertNoInternalCopy(eventPage.text, "Event page");

    const registerPage = await fetchHtml(
      baseUrl,
      "/alpine-trail-lab/events/sunrise-ridge-session/register?occurrence=atl-sunrise-2026-04-18"
    );
    assert(registerPage.response.status === 200, "Registration route should return 200.");
    assert(
      registerPage.text.includes("Complete the required attendee questionnaire."),
      "Registration route should render the attendee registration flow heading."
    );
    assertNoInternalCopy(registerPage.text, "Registration page");

    const {
      confirmRegistrationHold,
      createRegistrationHold,
      getRegistrationExperienceBySlugs
    } = await import("../lib/passreserve-service.js");
    const registrationExperience = await getRegistrationExperienceBySlugs(
      "alpine-trail-lab",
      "sunrise-ridge-session"
    );
    const holdResult = await createRegistrationHold({
      slug: "alpine-trail-lab",
      eventSlug: "sunrise-ridge-session",
      occurrenceId: registrationExperience.selectedOccurrence.id,
      ticketCategoryId: registrationExperience.selectedTicketCategory.id,
      quantity: 1,
      registrationLocale: "en",
      attendees: [
        {
          firstName: "Smoke",
          lastName: "Guest",
          address: "Via Test 1, Bologna",
          phone: "+39 340 111 1111",
          email: "smoke-guest@example.com",
          dietaryFlags: ["gluten_free"],
          dietaryOther: "Needs a gluten-free menu."
        }
      ]
    });
    assert(holdResult.ok, "Registration helper should create a hold successfully.");

    const pendingPage = await fetchHtml(baseUrl, holdResult.redirectHref);
    assert(pendingPage.response.status === 200, "Pending-confirmation route should return 200.");
    assert(
      pendingPage.text.includes("Open the email we just sent you."),
      "Pending-confirmation route should render the check-email heading."
    );
    assertNoInternalCopy(pendingPage.text, "Registration pending page");

    const holdPage = await fetchHtml(baseUrl, holdResult.confirmationHref);
    assert(holdPage.response.status === 200, "Confirmation route should return 200.");
    assert(
      holdPage.text.includes("Review your details and confirm your place."),
      "Confirmation route should render the hold review heading."
    );
    assertNoInternalCopy(holdPage.text, "Registration confirmation page");

    const holdToken = getLastPathSegment(holdResult.confirmationHref);
    const confirmationResult = await confirmRegistrationHold({
      slug: "alpine-trail-lab",
      eventSlug: "sunrise-ridge-session",
      holdToken,
      termsAccepted: "yes",
      responsibilityAccepted: "yes",
      baseUrl
    });
    assert(confirmationResult.ok, "Registration helper should confirm the hold successfully.");

    const paymentPreviewUrl = new URL(confirmationResult.redirectHref, baseUrl);
    const paymentPreviewPage = await fetchHtml(
      baseUrl,
      `${paymentPreviewUrl.pathname}${paymentPreviewUrl.search}`
    );
    assert(paymentPreviewPage.response.status === 200, "Payment preview route should return 200.");
    assert(
      paymentPreviewPage.text.includes("Review this registration before checkout opens."),
      "Payment preview route should render the payment review heading."
    );
    assertNoInternalCopy(paymentPreviewPage.text, "Payment preview page");

    const paymentToken = getLastPathSegment(paymentPreviewUrl.pathname);
    const paymentCancelPage = await fetchHtml(
      baseUrl,
      `/alpine-trail-lab/events/sunrise-ridge-session/register/payment/cancel/${paymentToken}`
    );
    assert(paymentCancelPage.response.status === 200, "Payment cancel route should return 200.");
    assert(
      paymentCancelPage.text.includes("The registration is confirmed, but the online amount is still open."),
      "Payment cancel route should render the pending-payment heading."
    );
    assertNoInternalCopy(paymentCancelPage.text, "Payment cancel page");

    const paymentSuccessResponse = await fetch(
      `${baseUrl}/alpine-trail-lab/events/sunrise-ridge-session/register/payment/success/${paymentToken}?preview=1`
    );
    const paymentSuccessText = await paymentSuccessResponse.text();
    assert(
      paymentSuccessResponse.status === 200,
      "Payment success route should return the confirmed-registration experience."
    );
    assert(
      paymentSuccessText.includes("You're in") ||
        paymentSuccessText.includes("Payment received and registration confirmed") ||
        paymentSuccessText.includes("Deposit received, registration confirmed") ||
        paymentSuccessText.includes("Registration confirmed") ||
        paymentSuccessText.includes("Your registration details"),
      "Payment success route should land on the confirmed-registration experience."
    );
    assertNoInternalCopy(paymentSuccessText, "Confirmed registration page");

    const adminRedirect = await fetch(`${baseUrl}/alpine-trail-lab/admin`, {
      redirect: "manual"
    });
    assert(
      adminRedirect.status === 307 || adminRedirect.status === 308,
      "Organizer admin entry route should redirect to the dashboard."
    );
    assert(
      adminRedirect.headers.get("location") === "/alpine-trail-lab/admin/dashboard",
      "Organizer admin redirect should point to the dashboard route."
    );

    const dashboardPage = await fetchHtml(baseUrl, "/alpine-trail-lab/admin/dashboard");
    assert(dashboardPage.response.status === 200, "Organizer dashboard should return 200.");
    assert(
      dashboardPage.text.includes("Organizer admin sign in"),
      "Organizer dashboard should redirect unauthenticated users into organizer sign-in."
    );
    assertNoInternalCopy(dashboardPage.text, "Organizer dashboard");

    const platformLogin = await fetchHtml(baseUrl, "/admin/login");
    assert(platformLogin.response.status === 200, "Team login should return 200.");
    assert(
      platformLogin.text.includes("Sign in to manage organizers, content, and operational checks."),
      "Team login should render the protected platform sign-in copy."
    );
    assertNoInternalCopy(platformLogin.text, "Team login page");

    const notFoundPage = await fetchHtml(baseUrl, "/this-page-does-not-exist");
    assert(notFoundPage.response.status === 404, "Not-found route should return 404.");
    assert(
      notFoundPage.text.includes("We couldn") ||
        notFoundPage.text.includes("This page is not available.") ||
        notFoundPage.text.includes("Error 404"),
      "Not-found route should render the updated empty state."
    );
    assertNoInternalCopy(notFoundPage.text, "Not-found page");

    const platformOverview = await fetchHtml(baseUrl, "/admin");
    assert(platformOverview.response.status === 200, "Team dashboard should return 200.");
    assert(
      platformOverview.text.includes("Sign in to manage organizers, content, and operational checks."),
      "Protected platform routes should redirect unauthenticated visitors to sign-in."
    );
    assertNoInternalCopy(platformOverview.text, "Team dashboard");

    const platformOrganizerDetail = await fetchHtml(baseUrl, "/admin/organizers/alpine-trail-lab");
    assert(platformOrganizerDetail.response.status === 200, "Host detail page should return 200.");
    assert(
      platformOrganizerDetail.text.includes("Sign in to manage organizers, content, and operational checks."),
      "Protected organizer detail routes should redirect unauthenticated visitors to sign-in."
    );
    assertNoInternalCopy(platformOrganizerDetail.text, "Host detail page");

    const { listOrganizerRequests, submitOrganizerRequest } = await import(
      "../lib/passreserve-service.js"
    );
    const requestResult = await submitOrganizerRequest({
      contactName: "Smoke Test Host",
      contactEmail: "smoke-host@example.com",
      contactPhone: "+39 340 000 0000",
      organizerName: "Smoke Test Studio",
      city: "Rome",
      launchWindow: "within-30-days",
      paymentModel: "deposit",
      eventFocus: "Evening workshops and small community events",
      note: "Created by smoke verification."
    });
    assert(requestResult.ok, "Organizer request should be stored successfully.");

    const storedRequests = await listOrganizerRequests();
    assert(
      storedRequests.some((request) => request.organizerName === "Smoke Test Studio"),
      "Organizer request should persist in storage."
    );

    const emailsPage = await fetchHtml(baseUrl, "/admin/emails");
    assert(emailsPage.response.status === 200, "Platform emails page should return 200.");
    assert(
      emailsPage.text.includes("Sign in to manage organizers, content, and operational checks."),
      "Protected platform email routes should redirect unauthenticated visitors to sign-in."
    );
    assertNoInternalCopy(emailsPage.text, "Emails page");

    const webhookResponse = await fetch(`${baseUrl}/api/stripe/webhooks`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ probe: true })
    });
    const webhookJson = await webhookResponse.json();
    const hasSecretKey = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
    const hasWebhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());

    if (!hasSecretKey) {
      assert(webhookResponse.status === 503, "Webhook route should report preview-mode unavailability without Stripe keys.");
      assert(
        webhookJson.message === "Stripe Checkout is not configured in this environment.",
        "Webhook route should explain when Stripe is not configured."
      );
    } else if (!hasWebhookSecret) {
      assert(webhookResponse.status === 503, "Webhook route should require a webhook secret when Stripe is live-enabled.");
      assert(
        webhookJson.message === "STRIPE_WEBHOOK_SECRET is required before webhook verification can run.",
        "Webhook route should explain when the webhook secret is missing."
      );
    } else {
      assert(webhookResponse.status === 400, "Webhook route should reject unsigned requests.");
      assert(
        webhookJson.message === "Missing Stripe signature header.",
        "Webhook route should require the Stripe signature header."
      );
    }
  } catch (error) {
    const message = `${error instanceof Error ? error.message : "Smoke verification failed."}\n\nRecent next start logs:\n${serverLogs || "(no logs captured)"}`;

    throw new Error(message, {
      cause: error
    });
  } finally {
    cleanup();
    await fs.rm(path.dirname(organizerRequestsFile), {
      recursive: true,
      force: true
    });
    await fs.rm(path.dirname(passreserveStateFile), {
      recursive: true,
      force: true
    });
  }
}

await main();
