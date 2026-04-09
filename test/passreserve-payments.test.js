import { afterEach, describe, expect, it } from "vitest";

import {
  formatCurrencyFromMinorUnits,
  getStripeEnvironmentState
} from "../lib/passreserve-payments";

const originalEnv = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_CURRENCY_DEFAULT: process.env.STRIPE_CURRENCY_DEFAULT,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  VERCEL_URL: process.env.VERCEL_URL
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("passreserve-payments", () => {
  it("formats minor units into the configured currency", () => {
    expect(formatCurrencyFromMinorUnits(9750, "eur")).toBe("€97.5");
  });

  it("stays in preview mode when Stripe env vars are missing", () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;

    expect(getStripeEnvironmentState()).toMatchObject({
      mode: "preview",
      liveCheckoutEnabled: false,
      webhookEnabled: false,
      baseUrl: "http://localhost:3000"
    });
  });

  it("uses explicit Passreserve env vars when live Stripe config exists", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_123";
    process.env.STRIPE_CURRENCY_DEFAULT = "usd";
    process.env.NEXT_PUBLIC_BASE_URL = "https://passreserve.example.com/";

    expect(getStripeEnvironmentState()).toMatchObject({
      mode: "live",
      liveCheckoutEnabled: true,
      webhookEnabled: true,
      defaultCurrency: "usd",
      baseUrl: "https://passreserve.example.com"
    });
  });
});
