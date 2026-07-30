import {
  buildCapacityRegistrationWhere
} from "./passreserve-capacity.js";

const organizerSelect = {
  id: true,
  slug: true,
  publicSlug: true,
  name: true,
  contentI18n: true,
  status: true,
  publicationState: true,
  description: true,
  tagline: true,
  city: true,
  region: true,
  timeZone: true,
  publicEmail: true,
  publicPhone: true,
  venueTitle: true,
  venueDetail: true,
  venueMapHref: true,
  venues: true,
  interestEmail: true,
  themeTags: true,
  policies: true,
  faq: true,
  photoStory: true,
  imageUrl: true,
  minAdvanceHours: true,
  maxAdvanceDays: true,
  registrationQuestionnaireConfig: true,
  registrationLanguagePromptEnabled: true,
  registrationConfirmationMode: true,
  stripeAccountId: true,
  stripeConnectionStatus: true,
  stripeDetailsSubmitted: true,
  stripeChargesEnabled: true,
  stripePayoutsEnabled: true,
  stripeConnectedAt: true,
  stripeLastSyncedAt: true,
  onlinePaymentsMonthlyFeeCents: true,
  onlinePaymentsBillingStatus: true,
  onlinePaymentsBillingActivatedAt: true
};

const eventSelect = {
  id: true,
  organizerId: true,
  slug: true,
  title: true,
  contentI18n: true,
  category: true,
  visibility: true,
  summary: true,
  description: true,
  audience: true,
  durationMinutes: true,
  venueTitle: true,
  venueDetail: true,
  mapHref: true,
  basePriceCents: true,
  prepayPercentage: true,
  attendeeInstructions: true,
  organizerNotes: true,
  cancellationPolicy: true,
  refundPolicyType: true,
  collectDietaryInfo: true,
  registrationQuestionnaireConfig: true,
  registrationLanguagePromptEnabled: true,
  registrationConfirmationMode: true,
  salesWindowStartsAt: true,
  salesWindowEndsAt: true,
  highlights: true,
  included: true,
  policies: true,
  faq: true,
  gallery: true,
  imageUrl: true
};

const ticketCategorySelect = {
  id: true,
  eventTypeId: true,
  slug: true,
  name: true,
  description: true,
  contentI18n: true,
  included: true,
  unitPriceCents: true,
  isDefault: true,
  isActive: true,
  sortOrder: true
};

const occurrenceSelect = {
  id: true,
  eventTypeId: true,
  status: true,
  startsAt: true,
  endsAt: true,
  capacity: true,
  priceCents: true,
  prepayPercentage: true,
  venueTitle: true,
  contentI18n: true,
  note: true,
  salesWindowStartsAt: true,
  salesWindowEndsAt: true,
  published: true,
  imageUrl: true
};

function serializeDatabaseValue(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeDatabaseValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        serializeDatabaseValue(entry)
      ])
    );
  }

  return value;
}

export async function readPrismaPublicOrganizerContentV2(
  prisma,
  slug,
  nowInput = new Date()
) {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const organizer = await prisma.organizer.findFirst({
    where: {
      publicSlug: slug,
      status: "ACTIVE",
      publicationState: "PUBLISHED"
    },
    select: organizerSelect
  });

  if (!organizer) {
    return null;
  }

  const publicEventRelation = {
    organizerId: organizer.id,
    visibility: "PUBLIC"
  };
  const futureOccurrenceRelation = {
    published: true,
    startsAt: {
      gt: now
    },
    eventType: publicEventRelation
  };
  const [events, ticketCategories, occurrences] = await Promise.all([
    prisma.eventType.findMany({
      where: publicEventRelation,
      orderBy: {
        title: "asc"
      },
      select: eventSelect
    }),
    prisma.ticketCategory.findMany({
      where: {
        isActive: true,
        eventType: publicEventRelation
      },
      orderBy: {
        sortOrder: "asc"
      },
      select: ticketCategorySelect
    }),
    prisma.eventOccurrence.findMany({
      where: futureOccurrenceRelation,
      orderBy: {
        startsAt: "asc"
      },
      select: occurrenceSelect
    })
  ]);

  return serializeDatabaseValue({
    organizers: [organizer],
    events,
    ticketCategories,
    occurrences,
    registrations: [],
    payments: []
  });
}

export async function readPrismaPublicOrganizerCapacityV2(
  prisma,
  organizerId,
  occurrenceIds,
  nowInput = new Date()
) {
  const normalizedOccurrenceIds = Array.from(
    new Set(
      (Array.isArray(occurrenceIds) ? occurrenceIds : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );

  if (!organizerId || !normalizedOccurrenceIds.length) {
    return [];
  }

  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const registrations = await prisma.registration.findMany({
    where: {
      organizerId,
      occurrenceId: {
        in: normalizedOccurrenceIds
      },
      ...buildCapacityRegistrationWhere(now)
    },
    select: {
      id: true,
      occurrenceId: true,
      status: true,
      quantity: true,
      expiresAt: true
    }
  });

  return serializeDatabaseValue(registrations);
}

export async function readPrismaPublicOrganizerStateV2(
  prisma,
  slug,
  nowInput = new Date()
) {
  const content = await readPrismaPublicOrganizerContentV2(
    prisma,
    slug,
    nowInput
  );

  if (!content) {
    return null;
  }

  const organizer = content.organizers[0];
  const registrations = await readPrismaPublicOrganizerCapacityV2(
    prisma,
    organizer?.id,
    content.occurrences.map((occurrence) => occurrence.id),
    nowInput
  );

  return {
    ...content,
    registrations
  };
}
