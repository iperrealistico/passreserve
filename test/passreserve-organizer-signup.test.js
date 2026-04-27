import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock("../lib/passreserve-antispam.js");
  vi.doUnmock("../lib/passreserve-auth-security.js");
  delete process.env.RESEND_API_KEY;
  delete process.env.FROM_EMAIL;
  process.env.PASSRESERVE_STATE_FILE = path.join(
    os.tmpdir(),
    `passreserve-organizer-signup-${Date.now()}-${Math.random()}.json`
  );

  await fs.rm(process.env.PASSRESERVE_STATE_FILE, {
    force: true
  });
  await fs.rm(`${process.env.PASSRESERVE_STATE_FILE}.auth-rate-limits.json`, {
    force: true
  });
});

function buildOrganizerRequestFormData(overrides = {}) {
  const formData = new FormData();
  const now = Date.now();
  const entries = {
    contactName: "Alex Host",
    contactEmail: "alex@example.com",
    contactPhone: "+39 333 111 2222",
    organizerName: "Alex Field School",
    city: "Bologna",
    launchWindow: "May 2026",
    paymentModel: "Deposit online",
    eventFocus: "Outdoor workshops and tastings",
    note: "Please onboard us quickly.",
    altcha: "signed-altcha-payload",
    companyWebsite: "",
    formStartedAt: String(now - 10_000),
    ...overrides
  };

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
}

describe("organizer signup provisioning", () => {
  it("accepts a valid CAPTCHA-protected signup, provisions the organizer, and logs onboarding emails", async () => {
    vi.doMock("../lib/passreserve-antispam.js", () => ({
      ORGANIZER_REQUEST_ALTCHA_WINDOW_SECONDS: 30 * 60,
      ORGANIZER_REQUEST_MIN_SUBMIT_SECONDS: 2,
      verifyOrganizerRequestAltchaPayload: vi.fn().mockResolvedValue({
        ok: true,
        challengeId: "challenge-1"
      })
    }));
    vi.doMock("../lib/passreserve-auth-security.js", () => ({
      consumeOrganizerRequestCaptchaToken: vi.fn().mockResolvedValue({
        success: true
      }),
      consumeOrganizerRequestEmailRateLimit: vi.fn().mockResolvedValue({
        success: true
      }),
      consumeOrganizerRequestRateLimit: vi.fn().mockResolvedValue({
        success: true
      })
    }));

    const { submitOrganizerRequestAction } = await import("../app/actions.js");
    const { loadPersistentState } = await import("../lib/passreserve-state.js");

    const result = await submitOrganizerRequestAction({}, buildOrganizerRequestFormData());
    const state = await loadPersistentState();
    const organizer = state.organizers.find((entry) => entry.name === "Alex Field School");
    const application = state.joinRequests.find(
      (entry) => entry.contactEmail === "alex@example.com"
    );

    expect(result.status).toBe("success");
    expect(organizer).toMatchObject({
      publicationState: "PRIVATE",
      publicSlug: "alex-field-school"
    });
    expect(application).toMatchObject({
      provisioningStatus: "PROVISIONED"
    });
    expect(
      state.organizerAdmins.some((entry) => entry.email === "alex@example.com")
    ).toBe(true);
    expect(
      state.emailDeliveries.some(
        (entry) =>
          entry.templateSlug === "organizer_access_invitation" &&
          entry.recipientEmail === "alex@example.com"
      )
    ).toBe(true);
    expect(
      state.emailDeliveries.some(
        (entry) => entry.templateSlug === "organizer_application_alert"
      )
    ).toBe(true);
  });

  it("blocks signup when CAPTCHA verification is missing or invalid", async () => {
    vi.doMock("../lib/passreserve-antispam.js", () => ({
      ORGANIZER_REQUEST_ALTCHA_WINDOW_SECONDS: 30 * 60,
      ORGANIZER_REQUEST_MIN_SUBMIT_SECONDS: 2,
      verifyOrganizerRequestAltchaPayload: vi.fn().mockResolvedValue({
        ok: false,
        message: "Complete the CAPTCHA before submitting."
      })
    }));
    vi.doMock("../lib/passreserve-auth-security.js", () => ({
      consumeOrganizerRequestCaptchaToken: vi.fn().mockResolvedValue({
        success: true
      }),
      consumeOrganizerRequestEmailRateLimit: vi.fn().mockResolvedValue({
        success: true
      }),
      consumeOrganizerRequestRateLimit: vi.fn().mockResolvedValue({
        success: true
      })
    }));

    const { submitOrganizerRequestAction } = await import("../app/actions.js");
    const { loadPersistentState } = await import("../lib/passreserve-state.js");

    const result = await submitOrganizerRequestAction(
      {},
      buildOrganizerRequestFormData({
        altcha: ""
      })
    );
    const state = await loadPersistentState();

    expect(result.status).toBe("error");
    expect(result.message).toContain("CAPTCHA");
    expect(state.joinRequests).toHaveLength(0);
    expect(state.organizers.some((entry) => entry.name === "Alex Field School")).toBe(false);
  });

  it("stores duplicate-email applications without creating a second organizer admin", async () => {
    const { submitOrganizerApplication } = await import(
      "../lib/passreserve-organizer-applications.js"
    );
    const { loadPersistentState } = await import("../lib/passreserve-state.js");

    await submitOrganizerApplication({
      contactName: "Alex Host",
      contactEmail: "alex@example.com",
      contactPhone: "+39 333 111 2222",
      organizerName: "Alex Field School",
      city: "Bologna",
      launchWindow: "May 2026",
      paymentModel: "Deposit online",
      eventFocus: "Outdoor workshops",
      note: "First request"
    });

    const duplicate = await submitOrganizerApplication({
      contactName: "Alex Host",
      contactEmail: "alex@example.com",
      contactPhone: "+39 333 111 2222",
      organizerName: "Alex Field School Two",
      city: "Bologna",
      launchWindow: "June 2026",
      paymentModel: "Pay at venue",
      eventFocus: "Duplicate request",
      note: "Second request"
    });

    const state = await loadPersistentState();

    expect(duplicate.duplicate).toBe(true);
    expect(
      state.organizerAdmins.filter((entry) => entry.email === "alex@example.com")
    ).toHaveLength(1);
    expect(
      state.joinRequests.filter((entry) => entry.contactEmail === "alex@example.com")
    ).toHaveLength(2);
    expect(state.joinRequests[0].provisioningStatus).toBe("DUPLICATE");
  });

  it("records onboarding email failures while keeping the provisioned organizer private", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.FROM_EMAIL = "contact@example.com";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "boom"
      })
    );

    const { submitOrganizerApplication } = await import(
      "../lib/passreserve-organizer-applications.js"
    );
    const { loadPersistentState } = await import("../lib/passreserve-state.js");

    await submitOrganizerApplication({
      contactName: "Mia Host",
      contactEmail: "mia@example.com",
      contactPhone: "+39 333 111 2222",
      organizerName: "Mia Studio",
      city: "Modena",
      launchWindow: "June 2026",
      paymentModel: "Deposit online",
      eventFocus: "Cooking and movement sessions",
      note: "Needs quick onboarding"
    });

    const state = await loadPersistentState();
    const organizer = state.organizers.find((entry) => entry.name === "Mia Studio");
    const application = state.joinRequests.find((entry) => entry.contactEmail === "mia@example.com");

    expect(organizer).toMatchObject({
      publicationState: "PRIVATE"
    });
    expect(application).toMatchObject({
      provisioningStatus: "EMAIL_FAILED"
    });
    expect(application.accessEmailLastError).toContain("Resend");
  });

  it("keeps new organizers private until publish and then resolves them on the public slug", async () => {
    const { createOrganizerAccountFromPlatform } = await import(
      "../lib/passreserve-organizer-applications.js"
    );
    const { publishOrganizerProfile } = await import("../lib/passreserve-admin-service.js");
    const { getOrganizerPage } = await import("../lib/passreserve-service.js");

    const result = await createOrganizerAccountFromPlatform({
      name: "Private Studio",
      publicSlug: "private-studio",
      city: "Parma",
      region: "Italy",
      publicEmail: "hello@privatestudio.com",
      publicPhone: "+39 333 222 4444",
      adminEmail: "owner@privatestudio.com",
      adminName: "Owner Name",
      description: "Small events"
    });

    expect(await getOrganizerPage("private-studio")).toBeNull();

    const publishResult = await publishOrganizerProfile(result.organizer.slug);
    const publicPage = await getOrganizerPage("private-studio");

    expect(publishResult.ok).toBe(true);
    expect(publicPage).toMatchObject({
      name: "Private Studio",
      publicSlug: "private-studio"
    });
  });
});
