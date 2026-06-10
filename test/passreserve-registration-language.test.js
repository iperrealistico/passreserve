import { describe, expect, it } from "vitest";

import {
  getRegistrationLanguageOptions,
  normalizeRegistrationLocale,
  REGISTRATION_LANGUAGE,
  resolveRegistrationLanguagePromptEnabled
} from "../lib/passreserve-registration-language.js";

describe("passreserve registration language", () => {
  it("normalizes registration locales to the supported it/en set", () => {
    expect(normalizeRegistrationLocale("it-IT")).toBe(REGISTRATION_LANGUAGE.IT);
    expect(normalizeRegistrationLocale("EN_us")).toBe(REGISTRATION_LANGUAGE.EN);
    expect(normalizeRegistrationLocale("fr")).toBe(REGISTRATION_LANGUAGE.EN);
    expect(normalizeRegistrationLocale("", REGISTRATION_LANGUAGE.IT)).toBe(
      REGISTRATION_LANGUAGE.IT
    );
  });

  it("lets an event override the organizer default prompt behavior", () => {
    expect(
      resolveRegistrationLanguagePromptEnabled(
        {
          registrationLanguagePromptEnabled: true
        },
        {
          registrationLanguagePromptEnabled: false
        }
      )
    ).toBe(false);

    expect(
      resolveRegistrationLanguagePromptEnabled(
        {
          registrationLanguagePromptEnabled: false
        },
        {
          registrationLanguagePromptEnabled: null
        }
      )
    ).toBe(false);
  });

  it("keeps the public language options limited to italian and english", () => {
    expect(getRegistrationLanguageOptions("it")).toEqual([
      {
        value: "it",
        label: "Italiano"
      },
      {
        value: "en",
        label: "English"
      }
    ]);
  });
});
