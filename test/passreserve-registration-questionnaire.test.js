import { describe, expect, it } from "vitest";

import {
  buildDefaultRegistrationQuestionnaireConfig,
  normalizeRegistrationQuestionnaireConfig,
  resolveRegistrationQuestionnaireConfig,
  shouldCollectDietaryFromQuestionnaire,
  validateRegistrationQuestionnaireAttendees
} from "../lib/passreserve-registration-questionnaire.js";

describe("passreserve registration questionnaire", () => {
  it("keeps lead email required and prevents hidden first/last names", () => {
    const config = normalizeRegistrationQuestionnaireConfig({
      lead: {
        email: "hidden",
        firstName: "hidden",
        lastName: "hidden"
      }
    });

    expect(config.lead.email).toBe("required");
    expect(config.lead.firstName).toBe("optional");
    expect(config.lead.lastName).toBe("optional");
  });

  it("inherits organizer defaults while still honoring the legacy event dietary toggle", () => {
    const organizer = {
      registrationQuestionnaireConfig: {
        participant: {
          address: "hidden",
          phone: "hidden",
          email: "hidden"
        }
      }
    };
    const event = {
      collectDietaryInfo: false
    };
    const resolved = resolveRegistrationQuestionnaireConfig(organizer, event);

    expect(resolved.participant.address).toBe("hidden");
    expect(resolved.participant.phone).toBe("hidden");
    expect(resolved.participant.email).toBe("hidden");
    expect(resolved.lead.dietaryFlags).toBe("hidden");
    expect(resolved.participant.dietaryOther).toBe("hidden");
    expect(shouldCollectDietaryFromQuestionnaire(resolved)).toBe(false);
  });

  it("validates attendees against the lead-versus-participant matrix", () => {
    const config = normalizeRegistrationQuestionnaireConfig({
      participant: {
        address: "hidden",
        phone: "hidden",
        email: "hidden",
        dietaryFlags: "hidden",
        dietaryOther: "hidden"
      }
    });

    const valid = validateRegistrationQuestionnaireAttendees(
      [
        {
          ticketCategoryId: "general",
          firstName: "Ada",
          lastName: "Lovelace",
          address: "Via Test 1",
          phone: "+39 333 555 1010",
          email: "ada@example.com",
          dietaryFlags: [],
          dietaryOther: ""
        },
        {
          ticketCategoryId: "general",
          firstName: "Grace",
          lastName: "Hopper",
          address: "",
          phone: "",
          email: "",
          dietaryFlags: [],
          dietaryOther: ""
        }
      ],
      config
    );

    const invalidLead = validateRegistrationQuestionnaireAttendees(
      [
        {
          ticketCategoryId: "general",
          firstName: "Ada",
          lastName: "Lovelace",
          address: "Via Test 1",
          phone: "+39 333 555 1010",
          email: "",
          dietaryFlags: [],
          dietaryOther: ""
        }
      ],
      buildDefaultRegistrationQuestionnaireConfig()
    );

    expect(valid.ok).toBe(true);
    expect(invalidLead.ok).toBe(false);
    expect(invalidLead.missingByIndex[0].fields).toContain("Email");
  });
});
