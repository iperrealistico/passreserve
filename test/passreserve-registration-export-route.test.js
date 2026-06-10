import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("passreserve registrations export route", () => {
  it("excludes cancelled registrations from the operational participant PDF", async () => {
    const buildRegistrationParticipantsPdf = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));

    vi.doMock("../lib/passreserve-auth.js", () => ({
      getValidatedOrganizerAdminSessionUser: vi.fn().mockResolvedValue({
        id: "admin-1"
      })
    }));
    vi.doMock("../lib/passreserve-admin-service.js", () => ({
      getOrganizerRegistrationsAdmin: vi.fn().mockResolvedValue({
        organizer: {
          name: "Sillico"
        },
        occurrences: [
          {
            id: "occ-1",
            label: "03 Jul 2026"
          }
        ],
        registrations: [
          {
            id: "reg-live",
            occurrenceId: "occ-1",
            occurrenceTime: "20:30 to 23:59",
            eventSlug: "divini-sapori",
            eventTitle: "Divini & Sapori",
            source: "PUBLIC",
            origin: "",
            operationallyActive: true
          },
          {
            id: "reg-cancelled",
            occurrenceId: "occ-1",
            occurrenceTime: "20:30 to 23:59",
            eventSlug: "divini-sapori",
            eventTitle: "Divini & Sapori",
            source: "PUBLIC",
            origin: "",
            operationallyActive: false
          }
        ]
      })
    }));
    vi.doMock("../lib/passreserve-registration-pdf.js", () => ({
      buildRegistrationParticipantsPdf
    }));

    const { GET } = await import("../app/[slug]/admin/registrations/export/route.js");
    const response = await GET(
      new Request(
        "http://localhost/sillico/admin/registrations/export?event=divini-sapori&occurrence=occ-1&variant=operational"
      ),
      {
        params: Promise.resolve({
          slug: "sillico"
        })
      }
    );

    expect(response.status).toBe(200);
    expect(buildRegistrationParticipantsPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        registrations: [expect.objectContaining({ id: "reg-live" })],
        variant: "operational"
      })
    );
  });

  it("keeps cancelled registrations available in the full participant PDF", async () => {
    const buildRegistrationParticipantsPdf = vi.fn().mockResolvedValue(new Uint8Array([4, 5, 6]));

    vi.doMock("../lib/passreserve-auth.js", () => ({
      getValidatedOrganizerAdminSessionUser: vi.fn().mockResolvedValue({
        id: "admin-1"
      })
    }));
    vi.doMock("../lib/passreserve-admin-service.js", () => ({
      getOrganizerRegistrationsAdmin: vi.fn().mockResolvedValue({
        organizer: {
          name: "Sillico"
        },
        occurrences: [
          {
            id: "occ-1",
            label: "03 Jul 2026"
          }
        ],
        registrations: [
          {
            id: "reg-live",
            occurrenceId: "occ-1",
            occurrenceTime: "20:30 to 23:59",
            eventSlug: "divini-sapori",
            eventTitle: "Divini & Sapori",
            source: "PUBLIC",
            origin: "",
            operationallyActive: true
          },
          {
            id: "reg-cancelled",
            occurrenceId: "occ-1",
            occurrenceTime: "20:30 to 23:59",
            eventSlug: "divini-sapori",
            eventTitle: "Divini & Sapori",
            source: "PUBLIC",
            origin: "",
            operationallyActive: false
          }
        ]
      })
    }));
    vi.doMock("../lib/passreserve-registration-pdf.js", () => ({
      buildRegistrationParticipantsPdf
    }));

    const { GET } = await import("../app/[slug]/admin/registrations/export/route.js");
    const response = await GET(
      new Request(
        "http://localhost/sillico/admin/registrations/export?event=divini-sapori&occurrence=occ-1&variant=full"
      ),
      {
        params: Promise.resolve({
          slug: "sillico"
        })
      }
    );

    expect(response.status).toBe(200);
    expect(buildRegistrationParticipantsPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        registrations: [
          expect.objectContaining({ id: "reg-live" }),
          expect.objectContaining({ id: "reg-cancelled" })
        ],
        variant: "full"
      })
    );
  });
});
