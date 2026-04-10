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

function assertIncludesVisual(text, src, routeLabel) {
  const encoded = encodeURIComponent(src);

  assert(
    text.includes(src) || text.includes(encoded),
    `${routeLabel} should include the optimized visual "${src}".`
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

async function runRegistrationSmokeHelper(baseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "--experimental-specifier-resolution=node",
        new URL("./registration-smoke-helper.mjs", import.meta.url).pathname,
        baseUrl
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            stderr.trim() || stdout.trim() || "Registration smoke helper failed."
          )
        );
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(error);
      }
    });
  });
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
  const nextBin = new URL("../node_modules/next/dist/bin/next", import.meta.url);
  const child = spawn(process.execPath, [nextBin.pathname, "start", "--port", String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      ORGANIZER_REQUESTS_FILE: organizerRequestsFile
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
      homepage.text.includes("Find an event") &&
        homepage.text.includes("Host an event") &&
        homepage.text.includes("Search by host, city, or event style"),
      "Homepage should render the simplified two-path hero."
    );
    assert(!homepage.text.includes("All signals"), "Homepage should not render the removed discovery-mode pills.");
    assertIncludesVisual(homepage.text, "/images/passreserve/home-find-event.webp", "Homepage");
    assertIncludesVisual(homepage.text, "/images/passreserve/home-host-event.webp", "Homepage");
    assertNoInternalCopy(homepage.text, "Homepage");

    const aboutPage = await fetchHtml(baseUrl, "/about");
    assert(aboutPage.response.status === 200, "About page should return 200.");
    assert(
      aboutPage.text.includes("A calmer home for local events and the people who host them."),
      "About page should render the public Passreserve story."
    );
    assert(
      aboutPage.text.includes("Browse events or request host access."),
      "About page should keep the visitor-facing CTA visible."
    );
    assertIncludesVisual(aboutPage.text, "/images/passreserve/about-editorial.webp", "About page");
    assertIncludesVisual(aboutPage.text, "/images/passreserve/about-launch.webp", "About page");
    assertNoInternalCopy(aboutPage.text, "About page");

    const organizerPage = await fetchHtml(baseUrl, "/alpine-trail-lab");
    assert(organizerPage.response.status === 200, "Organizer page should return 200.");
    assert(
      organizerPage.text.includes("Choose the format that feels right for you."),
      "Organizer page should render the live host copy."
    );
    assertIncludesVisual(organizerPage.text, "/images/passreserve/organizer-hero-still.webp", "Organizer page");
    assertNoInternalCopy(organizerPage.text, "Organizer page");

    const eventPage = await fetchHtml(
      baseUrl,
      "/alpine-trail-lab/events/sunrise-ridge-session"
    );
    assert(eventPage.response.status === 200, "Event detail page should return 200.");
    assert(
      eventPage.text.includes("Pick the date that works for you."),
      "Event detail page should render the event-detail registration copy."
    );
    assertIncludesVisual(eventPage.text, "/images/passreserve/event-hero-still.webp", "Event page");
    assertNoInternalCopy(eventPage.text, "Event page");

    const registerPage = await fetchHtml(
      baseUrl,
      "/alpine-trail-lab/events/sunrise-ridge-session/register?occurrence=atl-sunrise-2026-04-18"
    );
    assert(registerPage.response.status === 200, "Registration route should return 200.");
    assert(
      registerPage.text.includes("Start your registration."),
      "Registration route should render the attendee registration flow heading."
    );
    assertIncludesVisual(registerPage.text, "/images/passreserve/registration-flow.webp", "Registration page");
    assertNoInternalCopy(registerPage.text, "Registration page");

    const registrationSmoke = await runRegistrationSmokeHelper(baseUrl);
    const holdPage = await fetchHtml(baseUrl, registrationSmoke.holdRedirectHref);
    assert(holdPage.response.status === 200, "Confirmation route should return 200.");
    assert(
      holdPage.text.includes("Review your details before you confirm your registration"),
      "Confirmation route should render the hold review heading."
    );
    assertIncludesVisual(
      holdPage.text,
      "/images/passreserve/registration-flow.webp",
      "Registration confirmation page"
    );
    assertNoInternalCopy(holdPage.text, "Registration confirmation page");

    const paymentPreviewUrl = new URL(registrationSmoke.confirmRedirectHref, baseUrl);
    const paymentPreviewPage = await fetchHtml(
      baseUrl,
      `${paymentPreviewUrl.pathname}${paymentPreviewUrl.search}`
    );
    assert(paymentPreviewPage.response.status === 200, "Payment preview route should return 200.");
    assert(
      paymentPreviewPage.text.includes("Review this registration before checkout opens."),
      "Payment preview route should render the payment review heading."
    );
    assertIncludesVisual(
      paymentPreviewPage.text,
      "/images/passreserve/payment-preview.webp",
      "Payment preview page"
    );
    assertNoInternalCopy(paymentPreviewPage.text, "Payment preview page");

    const paymentToken = getLastPathSegment(paymentPreviewUrl.pathname);
    const paymentCancelPage = await fetchHtml(
      baseUrl,
      `/alpine-trail-lab/events/sunrise-ridge-session/register/payment/cancel/${paymentToken}`
    );
    assert(paymentCancelPage.response.status === 200, "Payment cancel route should return 200.");
    assert(
      paymentCancelPage.text.includes(
        "The registration is confirmed, but the online amount still needs to be completed."
      ),
      "Payment cancel route should render the pending-payment heading."
    );
    assertIncludesVisual(
      paymentCancelPage.text,
      "/images/passreserve/payment-preview.webp",
      "Payment cancel page"
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
        paymentSuccessText.includes("Registration confirmed"),
      "Payment success route should land on the confirmed-registration experience."
    );
    assertIncludesVisual(
      paymentSuccessText,
      "/images/passreserve/registration-flow.webp",
      "Confirmed registration page"
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
      dashboardPage.text.includes("Open registrations"),
      "Organizer dashboard should render the host CTAs."
    );
    assertNoInternalCopy(dashboardPage.text, "Organizer dashboard");

    const platformLogin = await fetchHtml(baseUrl, "/admin/login");
    assert(platformLogin.response.status === 200, "Team login should return 200.");
    assert(
      platformLogin.text.includes("Staff access"),
      "Team login should render the promoted staff-access heading."
    );
    assertIncludesVisual(platformLogin.text, "/images/passreserve/staff-login.webp", "Team login page");
    assertNoInternalCopy(platformLogin.text, "Team login page");

    const notFoundPage = await fetchHtml(baseUrl, "/this-page-does-not-exist");
    assert(notFoundPage.response.status === 404, "Not-found route should return 404.");
    assert(
      notFoundPage.text.includes("We couldn't find that page."),
      "Not-found route should render the updated empty state."
    );
    assertIncludesVisual(notFoundPage.text, "/images/passreserve/not-found.webp", "Not-found page");
    assertNoInternalCopy(notFoundPage.text, "Not-found page");

    const platformOverview = await fetchHtml(baseUrl, "/admin");
    assert(platformOverview.response.status === 200, "Team dashboard should return 200.");
    assert(
      platformOverview.text.includes(
        "Manage hosts, public pages, email templates, and key admin checks."
      ),
      "Team dashboard should render the visitor-safe support overview copy."
    );
    assertNoInternalCopy(platformOverview.text, "Team dashboard");

    const platformOrganizerDetail = await fetchHtml(baseUrl, "/admin/organizers/alpine-trail-lab");
    assert(platformOrganizerDetail.response.status === 200, "Host detail page should return 200.");
    assert(
      platformOrganizerDetail.text.includes("The team can jump directly into the right host page."),
      "Host detail page should render the updated support copy."
    );
    assertNoInternalCopy(platformOrganizerDetail.text, "Host detail page");

    process.env.ORGANIZER_REQUESTS_FILE = organizerRequestsFile;
    const { listOrganizerRequests, submitOrganizerRequest } = await import(
      "../lib/passreserve-organizer-requests.js"
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
      emailsPage.text.includes("Smoke Test Studio"),
      "Organizer request should appear in the platform inbox."
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
  }
}

await main();
