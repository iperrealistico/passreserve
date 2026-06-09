import { describe, expect, it } from "vitest";

import {
  normalizeRegistrationConfirmationMode,
  REGISTRATION_CONFIRMATION_MODE,
  resolveRegistrationConfirmationMode
} from "../lib/passreserve-registration-confirmation.js";

describe("passreserve registration confirmation", () => {
  it("defaults to email-link confirmation when values are missing or invalid", () => {
    expect(normalizeRegistrationConfirmationMode("")).toBe(
      REGISTRATION_CONFIRMATION_MODE.EMAIL_LINK_REQUIRED
    );
    expect(normalizeRegistrationConfirmationMode("unknown")).toBe(
      REGISTRATION_CONFIRMATION_MODE.EMAIL_LINK_REQUIRED
    );
  });

  it("lets an event override the organizer default", () => {
    expect(
      resolveRegistrationConfirmationMode(
        {
          registrationConfirmationMode: REGISTRATION_CONFIRMATION_MODE.DIRECT_CONFIRM
        },
        {
          registrationConfirmationMode: REGISTRATION_CONFIRMATION_MODE.EMAIL_LINK_REQUIRED
        }
      )
    ).toBe(REGISTRATION_CONFIRMATION_MODE.EMAIL_LINK_REQUIRED);
  });
});
