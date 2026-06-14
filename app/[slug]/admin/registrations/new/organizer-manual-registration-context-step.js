"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";

import { createOrganizerRegistrationAction } from "../../actions.js";
import { dietaryFlags } from "../../../../../lib/passreserve-dietary.js";
import { calculatePaymentBreakdown } from "../../../../../lib/passreserve-domain.js";
import {
  getRegistrationQuestionnaireRole,
  getRegistrationQuestionnaireMissingFields,
  isRegistrationQuestionnaireAttendeeComplete,
  isRegistrationQuestionnaireFieldVisible
} from "../../../../../lib/passreserve-registration-questionnaire.js";

const STEP_INDEX = {
  context: 0,
  tickets: 1,
  payment: 2,
  review: 3
};

const initialActionState = {
  message: "",
  fieldErrors: {}
};

const ORGANIZER_MANUAL_REGISTRATION_MODE = {
  REQUEST_CONFIRMATION: "REQUEST_CONFIRMATION",
  CONFIRM_UNPAID: "CONFIRM_UNPAID",
  SEND_PAYMENT_LINK: "SEND_PAYMENT_LINK",
  MARK_DEPOSIT_PAID: "MARK_DEPOSIT_PAID",
  MARK_FULLY_PAID: "MARK_FULLY_PAID"
};

const localeOptions = [
  {
    value: "it",
    label: {
      en: "Italian",
      it: "Italiano"
    }
  },
  {
    value: "en",
    label: {
      en: "English",
      it: "English"
    }
  }
];

const originOptions = [
  {
    value: "walk-in",
    badge: {
      en: "Front desk",
      it: "Front desk"
    },
    label: {
      en: "Walk-in",
      it: "Walk-in"
    },
    detail: {
      en: "Use this when the attendee is already in front of staff and you need the fastest check-in flow.",
      it: "Usalo quando il partecipante è già davanti allo staff e ti serve il flusso più rapido da banco."
    }
  },
  {
    value: "phone",
    badge: {
      en: "Remote",
      it: "Da remoto"
    },
    label: {
      en: "Phone",
      it: "Telefono"
    },
    detail: {
      en: "Best for bookings collected over the phone that staff is transcribing into the platform.",
      it: "Ideale per le prenotazioni raccolte telefonicamente che lo staff sta trascrivendo in piattaforma."
    }
  },
  {
    value: "email",
    badge: {
      en: "Inbox",
      it: "Inbox"
    },
    label: {
      en: "Email",
      it: "Email"
    },
    detail: {
      en: "Use this when the request arrived by email and you are converting it into a real registration.",
      it: "Usalo quando la richiesta è arrivata per email e la stai convertendo in una registrazione reale."
    }
  },
  {
    value: "staff",
    badge: {
      en: "Internal",
      it: "Interno"
    },
    label: {
      en: "Staff",
      it: "Staff"
    },
    detail: {
      en: "Internal courtesy entry, team-managed allocation, or any booking created directly by the organizer.",
      it: "Inserimento di cortesia, allocazione interna o qualunque booking creato direttamente dall'organizer."
    }
  }
];

const originOptionValues = new Set(originOptions.map((option) => option.value));
const organizerModeValues = new Set(Object.values(ORGANIZER_MANUAL_REGISTRATION_MODE));

const modeOptions = [
  {
    value: ORGANIZER_MANUAL_REGISTRATION_MODE.REQUEST_CONFIRMATION,
    tone: "draft",
    label: {
      en: "Request confirmation",
      it: "Richiedi conferma"
    },
    detail: {
      en: "Create a hold and route the attendee into the existing confirmation flow.",
      it: "Crea un hold e manda il cliente nel flusso di conferma già esistente."
    }
  },
  {
    value: ORGANIZER_MANUAL_REGISTRATION_MODE.CONFIRM_UNPAID,
    tone: "capacity-watch",
    label: {
      en: "Confirm unpaid",
      it: "Conferma non pagata"
    },
    detail: {
      en: "Confirm now and move the whole balance into the event-day collection bucket.",
      it: "Conferma subito e sposta l'intero importo nel saldo da incassare sul posto."
    }
  },
  {
    value: ORGANIZER_MANUAL_REGISTRATION_MODE.SEND_PAYMENT_LINK,
    tone: "pending_payment",
    label: {
      en: "Send payment link",
      it: "Invia payment link"
    },
    detail: {
      en: "Confirm now and keep the online amount open through the existing payment-link flow.",
      it: "Conferma subito e lascia aperta la quota online tramite il flusso esistente di payment link."
    }
  },
  {
    value: ORGANIZER_MANUAL_REGISTRATION_MODE.MARK_DEPOSIT_PAID,
    tone: "public",
    label: {
      en: "Offline deposit paid",
      it: "Deposito offline incassato"
    },
    detail: {
      en: "Record the online amount as already collected offline, leaving any venue balance still open.",
      it: "Registra la quota online come già incassata offline, lasciando aperto l'eventuale saldo sul posto."
    }
  },
  {
    value: ORGANIZER_MANUAL_REGISTRATION_MODE.MARK_FULLY_PAID,
    tone: "confirmed_paid",
    label: {
      en: "Fully paid",
      it: "Tutto pagato"
    },
    detail: {
      en: "Record both the online amount and the venue balance as already settled.",
      it: "Registra come già saldate sia la quota online sia il saldo sul posto."
    }
  }
];

function normalizeRegistrationLocale(value, fallback = "en") {
  return localeOptions.some((option) => option.value === value) ? value : fallback;
}

function normalizeOrigin(value, fallback = "staff") {
  return originOptionValues.has(value) ? value : fallback;
}

function normalizeMode(
  value,
  fallback = ORGANIZER_MANUAL_REGISTRATION_MODE.REQUEST_CONFIRMATION
) {
  return organizerModeValues.has(value) ? value : fallback;
}

function normalizeStep(value) {
  if (value === "review") {
    return STEP_INDEX.review;
  }

  if (value === "payment") {
    return STEP_INDEX.payment;
  }

  if (value === "tickets") {
    return STEP_INDEX.tickets;
  }

  return STEP_INDEX.context;
}

function buildOccurrenceCollectionLabel(occurrence) {
  if (!occurrence?.usesOnlinePayments) {
    return "0% online";
  }

  const prepayPercentage = Number(occurrence.prepayPercentage || 0);

  if (prepayPercentage >= 100) {
    return "100% online";
  }

  return `${prepayPercentage}% online`;
}

function getVisibleOccurrences(occurrences, selectedEventSlug) {
  return occurrences
    .filter((occurrence) => !selectedEventSlug || occurrence.eventSlug === selectedEventSlug)
    .filter((occurrence) => occurrence.status !== "CANCELLED")
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

function getSelectedOccurrenceId(occurrences, occurrenceId) {
  return occurrences.some((occurrence) => occurrence.id === occurrenceId)
    ? occurrenceId
    : getPreferredOccurrence(occurrences)?.id || "";
}

function getEventBySlug(events, eventSlug) {
  return events.find((event) => event.slug === eventSlug) ?? events[0] ?? null;
}

function getActiveTicketCategories(event) {
  return Array.isArray(event?.ticketCategories)
    ? event.ticketCategories.filter((ticket) => ticket.isActive !== false)
    : [];
}

function getRemainingCapacityForOccurrence(occurrence) {
  return Math.max(0, Number(occurrence?.capacitySummary?.remaining || 0));
}

function buildContextHref(pathname, params = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) {
      searchParams.set(key, value);
    }
  }

  const serialized = searchParams.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

function getOriginMeta(value) {
  return originOptions.find((option) => option.value === value) ?? originOptions[0];
}

function getModeMeta(value) {
  return modeOptions.find((option) => option.value === value) ?? modeOptions[0];
}

function modeNeedsOnlineAmount(value) {
  return [
    ORGANIZER_MANUAL_REGISTRATION_MODE.SEND_PAYMENT_LINK,
    ORGANIZER_MANUAL_REGISTRATION_MODE.MARK_DEPOSIT_PAID
  ].includes(value);
}

function isModeAvailable(mode, quote) {
  if (modeNeedsOnlineAmount(mode)) {
    return Number(quote?.onlineAmount || 0) > 0;
  }

  return true;
}

function getModeAvailabilityMessage(mode, quote, isItalian) {
  if (!isModeAvailable(mode, quote)) {
    return isItalian
      ? "Questa occurrence non richiede nessuna quota online, quindi questa modalità non è disponibile."
      : "This occurrence does not require any online amount, so this mode is not available.";
  }

  return "";
}

function getModeOutcomeMeta(mode, quote, isItalian, currencyFormatter) {
  const subtotalLabel = currencyFormatter.format(Number(quote?.subtotal || 0));
  const onlineLabel = currencyFormatter.format(Number(quote?.onlineAmount || 0));
  const dueAtVenueLabel = currencyFormatter.format(Number(quote?.dueAtEvent || 0));

  switch (mode) {
    case ORGANIZER_MANUAL_REGISTRATION_MODE.CONFIRM_UNPAID:
      return {
        status: "CONFIRMED_UNPAID",
        tone: "capacity-watch",
        financialSummary: isItalian
          ? `Il totale viene spostato interamente sul posto: ${subtotalLabel} da incassare in venue.`
          : `The full balance moves to venue collection: ${subtotalLabel} remains due at the event.`,
        emailSummary: isItalian
          ? "Il cliente risulterà confermato senza checkout online."
          : "The attendee will be confirmed without an online checkout."
      };
    case ORGANIZER_MANUAL_REGISTRATION_MODE.SEND_PAYMENT_LINK:
      return {
        status: "PENDING_PAYMENT",
        tone: "pending_payment",
        financialSummary: isItalian
          ? `${onlineLabel} restano aperti online e ${dueAtVenueLabel} rimangono sul posto.`
          : `${onlineLabel} stays open online and ${dueAtVenueLabel} remains due at the venue.`,
        emailSummary: isItalian
          ? "La registrazione verrà confermata con payment link da completare."
          : "The registration will be confirmed with a payment link still to be completed."
      };
    case ORGANIZER_MANUAL_REGISTRATION_MODE.MARK_DEPOSIT_PAID:
      return {
        status: Number(quote?.dueAtEvent || 0) > 0 ? "CONFIRMED_PARTIALLY_PAID" : "CONFIRMED_PAID",
        tone: "public",
        financialSummary: Number(quote?.dueAtEvent || 0) > 0
          ? isItalian
            ? `${onlineLabel} risultano già incassati offline, con ${dueAtVenueLabel} ancora da raccogliere sul posto.`
            : `${onlineLabel} is recorded as already collected offline, with ${dueAtVenueLabel} still due at the venue.`
          : isItalian
            ? `${onlineLabel} risultano già incassati offline e non resta più nulla da raccogliere.`
            : `${onlineLabel} is recorded as already collected offline and nothing remains to be collected.`,
        emailSummary: isItalian
          ? "Il cliente risulterà già confermato con deposito registrato manualmente."
          : "The attendee will already be confirmed with the deposit registered manually."
      };
    case ORGANIZER_MANUAL_REGISTRATION_MODE.MARK_FULLY_PAID:
      return {
        status: "CONFIRMED_PAID",
        tone: "confirmed_paid",
        financialSummary: isItalian
          ? `${onlineLabel} online e ${dueAtVenueLabel} sul posto risultano già saldati.`
          : `${onlineLabel} online and ${dueAtVenueLabel} due at venue are both marked as settled.`,
        emailSummary: isItalian
          ? "Il cliente risulterà già interamente pagato."
          : "The attendee will already appear as fully paid."
      };
    case ORGANIZER_MANUAL_REGISTRATION_MODE.REQUEST_CONFIRMATION:
    default:
      return {
        status: "PENDING_CONFIRM",
        tone: "draft",
        financialSummary: isItalian
          ? `${onlineLabel} online e ${dueAtVenueLabel} sul posto restano solo previsti: non viene registrato nessun incasso in questa fase.`
          : `${onlineLabel} online and ${dueAtVenueLabel} due at venue stay as expected amounts only: no payment is recorded yet in this phase.`,
        emailSummary: isItalian
          ? "Il cliente entrerà nel flusso di conferma esistente."
          : "The attendee will enter the existing confirmation flow."
      };
  }
}

function getStepLabels(isItalian) {
  return [
    {
      title: isItalian ? "Contesto" : "Context",
      detail: isItalian ? "Evento, data, lingua, origine" : "Event, date, language, origin"
    },
    {
      title: isItalian ? "Ticket e partecipanti" : "Tickets and attendees",
      detail: isItalian ? "Mix, quantità, card pax" : "Mix, quantities, attendee cards"
    },
    {
      title: isItalian ? "Pagamento" : "Payment",
      detail: isItalian ? "Conferma e incasso" : "Confirmation and settlement"
    },
    {
      title: isItalian ? "Review" : "Review",
      detail: isItalian ? "Riepilogo finale" : "Final summary"
    }
  ];
}

function createBlankAttendee(ticketCategoryId = "") {
  return {
    ticketCategoryId,
    firstName: "",
    lastName: "",
    address: "",
    phone: "",
    email: "",
    dietaryFlags: [],
    dietaryOther: ""
  };
}

function sumCartQuantity(cartItems) {
  return cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function buildDefaultCart(ticketCategories, occurrence) {
  if (!ticketCategories.length || getRemainingCapacityForOccurrence(occurrence) <= 0) {
    return [];
  }

  const defaultCategory =
    ticketCategories.find((category) => category.isDefault) ?? ticketCategories[0] ?? null;

  return defaultCategory
    ? [
        {
          ticketCategoryId: defaultCategory.id,
          quantity: 1
        }
      ]
    : [];
}

function expandCartTicketIds(ticketCategories, cartItems) {
  const order = new Map(ticketCategories.map((category, index) => [category.id, index]));

  return [...cartItems]
    .sort(
      (left, right) =>
        (order.get(left.ticketCategoryId) ?? 999) - (order.get(right.ticketCategoryId) ?? 999)
    )
    .flatMap((item) =>
      Array.from(
        {
          length: Number(item.quantity || 0)
        },
        () => item.ticketCategoryId
      )
    );
}

function buildAttendeesFromCart(ticketCategories, cartItems) {
  return expandCartTicketIds(ticketCategories, cartItems).map((ticketCategoryId) =>
    createBlankAttendee(ticketCategoryId)
  );
}

function getCartItemsWithViewData(ticketCategories, occurrence, cartItems) {
  return cartItems
    .map((item) => {
      const category = ticketCategories.find((entry) => entry.id === item.ticketCategoryId);

      if (!category || item.quantity <= 0) {
        return null;
      }

      const payment = calculatePaymentBreakdown({
        unitPrice: Number(category.unitPriceCents || 0) / 100,
        quantity: item.quantity,
        prepayPercentage: occurrence?.prepayPercentage || 0
      });

      return {
        ...item,
        label: category.label,
        summary: category.summary,
        includedList: category.includedList || [],
        unitPriceLabel: category.unitPriceLabel,
        subtotalLabel: payment.subtotalLabel,
        onlineAmountLabel: payment.onlineAmountLabel,
        dueAtEventLabel: payment.dueAtEventLabel
      };
    })
    .filter(Boolean);
}

function buildCartQuote(ticketCategories, occurrence, cartItems) {
  return getCartItemsWithViewData(ticketCategories, occurrence, cartItems).reduce(
    (quote, item) => {
      const category = ticketCategories.find((entry) => entry.id === item.ticketCategoryId);
      const payment = calculatePaymentBreakdown({
        unitPrice: Number(category?.unitPriceCents || 0) / 100,
        quantity: item.quantity,
        prepayPercentage: occurrence?.prepayPercentage || 0
      });

      return {
        subtotal: quote.subtotal + payment.subtotal,
        onlineAmount: quote.onlineAmount + payment.onlineAmount,
        dueAtEvent: quote.dueAtEvent + payment.dueAtEvent
      };
    },
    {
      subtotal: 0,
      onlineAmount: 0,
      dueAtEvent: 0
    }
  );
}

function isAttendeeComplete(attendee, registrationQuestionnaireConfig, index) {
  return Boolean(
    attendee.ticketCategoryId &&
      isRegistrationQuestionnaireAttendeeComplete(
        attendee,
        registrationQuestionnaireConfig,
        index
      )
  );
}

function buildDietaryOptions(isItalian) {
  return dietaryFlags.map((flag) => ({
    id: flag.id,
    label: flag.label[isItalian ? "it" : "en"] || flag.id
  }));
}

function normalizeComparisonEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getDateMilliseconds(value) {
  const timestamp = value ? new Date(value).getTime() : Number.NaN;

  return Number.isFinite(timestamp) ? timestamp : null;
}

function isOccurrenceStillUsable(occurrence) {
  const now = Date.now();
  const occurrenceEndsAt = getDateMilliseconds(occurrence?.endsAt);
  const salesWindowStartsAt = getDateMilliseconds(occurrence?.salesWindowStartsAt);
  const salesWindowEndsAt = getDateMilliseconds(occurrence?.salesWindowEndsAt);

  if (occurrenceEndsAt && occurrenceEndsAt <= now) {
    return false;
  }

  if (salesWindowStartsAt && salesWindowStartsAt > now) {
    return false;
  }

  if (salesWindowEndsAt && salesWindowEndsAt < now) {
    return false;
  }

  return true;
}

function getPreferredOccurrence(occurrences) {
  return (
    occurrences.find((occurrence) => isOccurrenceStillUsable(occurrence)) ||
    occurrences.find((occurrence) => {
      const occurrenceEndsAt = getDateMilliseconds(occurrence?.endsAt);

      return !occurrenceEndsAt || occurrenceEndsAt > Date.now();
    }) ||
    occurrences[0] ||
    null
  );
}

function getOccurrenceWindowBoundaries(selectedOccurrence, selectedEvent) {
  return {
    startsAt: getDateMilliseconds(
      selectedOccurrence?.salesWindowStartsAt || selectedEvent?.salesWindowStartsAt || null
    ),
    endsAt: getDateMilliseconds(
      selectedOccurrence?.salesWindowEndsAt || selectedEvent?.salesWindowEndsAt || null
    )
  };
}

function getOccurrenceAvailabilityMessage({
  isItalian,
  selectedOccurrence,
  selectedTicketCategories,
  selectedEvent
}) {
  if (!selectedOccurrence) {
    return isItalian
      ? "Scegli una data reale per iniziare il builder."
      : "Choose a real occurrence before opening the builder.";
  }

  const now = Date.now();
  const occurrenceEndsAt = getDateMilliseconds(selectedOccurrence.endsAt);
  const salesWindow = getOccurrenceWindowBoundaries(selectedOccurrence, selectedEvent);

  if (occurrenceEndsAt && occurrenceEndsAt <= now) {
    return isItalian
      ? "Questa data è già terminata: crea la registrazione su una occurrence futura o ancora aperta."
      : "This occurrence has already ended: create the registration on a future or still-open date.";
  }

  if (salesWindow.startsAt && salesWindow.startsAt > now) {
    return isItalian
      ? "La finestra vendite per questa data non è ancora aperta, quindi il builder manuale resta bloccato."
      : "The sales window for this date is not open yet, so the manual builder stays blocked.";
  }

  if (salesWindow.endsAt && salesWindow.endsAt < now) {
    return isItalian
      ? "La finestra vendite per questa data è già chiusa, quindi il builder manuale resta bloccato."
      : "The sales window for this date has already closed, so the manual builder stays blocked.";
  }

  if (!selectedTicketCategories.length) {
    return isItalian
      ? "Questo evento non ha ticket attivi: aggiungi il catalogo prima di continuare."
      : "This event does not have active tickets yet: add the ticket catalog before continuing.";
  }

  if (getRemainingCapacityForOccurrence(selectedOccurrence) <= 0) {
    return isItalian
      ? "Questa data è esaurita: il builder manuale resta bloccato finché non torna capacità disponibile."
      : "This occurrence is sold out: the manual builder stays blocked until capacity is available again.";
  }

  return "";
}

function getAttendeeMissingFields(attendee, registrationQuestionnaireConfig, index, isItalian) {
  return getRegistrationQuestionnaireMissingFields(
    attendee,
    registrationQuestionnaireConfig,
    index,
    isItalian ? "it" : "en"
  ).map((field) => field.toLowerCase());
}

function buildContextSnapshot({
  pathname,
  selectedEvent,
  selectedOccurrence,
  selectedRegistrationLocale,
  selectedOrigin,
  selectedMode,
  stepIndex
}) {
  return buildContextHref(pathname, {
    event: selectedEvent?.slug || "",
    occurrence: selectedOccurrence?.id || "",
    registrationLocale: selectedRegistrationLocale,
    origin: selectedOrigin,
    mode: selectedMode,
    step:
      stepIndex === STEP_INDEX.review
        ? "review"
        : stepIndex === STEP_INDEX.payment
        ? "payment"
        : stepIndex === STEP_INDEX.tickets
          ? "tickets"
          : ""
  });
}

function getActionFieldLabel(fieldName, isItalian) {
  switch (fieldName) {
    case "eventTypeId":
      return isItalian ? "evento" : "event";
    case "occurrenceId":
      return isItalian ? "occurrence" : "occurrence";
    case "items":
      return isItalian ? "ticket" : "tickets";
    case "attendees":
      return isItalian ? "partecipanti" : "attendees";
    case "registrationLocale":
      return isItalian ? "lingua" : "language";
    case "origin":
      return isItalian ? "origine" : "origin";
    case "mode":
      return isItalian ? "modalità" : "mode";
    case "baseUrl":
      return isItalian ? "runtime URL" : "runtime URL";
    case "note":
      return isItalian ? "nota interna" : "internal note";
    default:
      return fieldName;
  }
}

export function OrganizerManualRegistrationContextStep({
  slug,
  events,
  occurrences,
  existingRegistrations = [],
  initialEventSlug,
  initialOccurrenceId,
  initialRegistrationLocale,
  initialOrigin,
  initialMode,
  initialStep,
  isItalian,
  registrationsHref
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isRouting, startTransition] = useTransition();
  const [actionState, formAction, isPending] = useActionState(
    createOrganizerRegistrationAction,
    initialActionState
  );
  const initialEvent = getEventBySlug(events, initialEventSlug);
  const initialVisibleOccurrences = getVisibleOccurrences(occurrences, initialEvent?.slug || "");
  const initialResolvedOccurrenceId = getSelectedOccurrenceId(
    initialVisibleOccurrences,
    initialOccurrenceId
  );
  const initialOccurrence =
    initialVisibleOccurrences.find((occurrence) => occurrence.id === initialResolvedOccurrenceId) ??
    initialVisibleOccurrences[0] ??
    null;
  const initialTicketCategories = getActiveTicketCategories(initialEvent);
  const initialCartItems = buildDefaultCart(initialTicketCategories, initialOccurrence);
  const initialAttendees = buildAttendeesFromCart(initialTicketCategories, initialCartItems);
  const [activeStep, setActiveStep] = useState(normalizeStep(initialStep));
  const [selectedEventSlug, setSelectedEventSlug] = useState(initialEvent?.slug || "");
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState(initialOccurrence?.id || "");
  const [selectedRegistrationLocale, setSelectedRegistrationLocale] = useState(
    normalizeRegistrationLocale(initialRegistrationLocale, isItalian ? "it" : "en")
  );
  const [selectedOrigin, setSelectedOrigin] = useState(normalizeOrigin(initialOrigin));
  const [selectedMode, setSelectedMode] = useState(normalizeMode(initialMode));
  const [organizerNote, setOrganizerNote] = useState("");
  const [cartItems, setCartItems] = useState(initialCartItems);
  const [attendees, setAttendees] = useState(initialAttendees);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const selectedEvent = useMemo(
    () => getEventBySlug(events, selectedEventSlug),
    [events, selectedEventSlug]
  );
  const visibleOccurrences = useMemo(
    () => getVisibleOccurrences(occurrences, selectedEvent?.slug || ""),
    [occurrences, selectedEvent]
  );
  const resolvedOccurrenceId = getSelectedOccurrenceId(visibleOccurrences, selectedOccurrenceId);
  const selectedOccurrence =
    visibleOccurrences.find((occurrence) => occurrence.id === resolvedOccurrenceId) ??
    visibleOccurrences[0] ??
    null;
  const selectedTicketCategories = useMemo(
    () => getActiveTicketCategories(selectedEvent),
    [selectedEvent]
  );
  const selectedOriginMeta = getOriginMeta(selectedOrigin);
  const stepLabels = getStepLabels(isItalian);
  const contextualRegistrationsHref = useMemo(
    () =>
      selectedEvent?.slug
        ? buildContextHref(`/${slug}/admin/registrations`, {
            event: selectedEvent.slug,
            occurrence: selectedOccurrence?.id || ""
          })
        : registrationsHref,
    [registrationsHref, selectedEvent, selectedOccurrence, slug]
  );
  const maxCartQuantity = Math.min(
    Math.max(0, getRemainingCapacityForOccurrence(selectedOccurrence)),
    8
  );
  const totalQuantity = sumCartQuantity(cartItems);
  const selectedQuestionnaireConfig =
    selectedEvent?.resolvedRegistrationQuestionnaireConfig ||
    selectedEvent?.registrationQuestionnaireConfig ||
    null;
  const dietaryOptions = useMemo(() => buildDietaryOptions(isItalian), [isItalian]);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(isItalian ? "it-IT" : "en-US", {
        style: "currency",
        currency: "EUR"
      }),
    [isItalian]
  );
  const cartDetails = useMemo(
    () => getCartItemsWithViewData(selectedTicketCategories, selectedOccurrence, cartItems),
    [cartItems, selectedOccurrence, selectedTicketCategories]
  );
  const quote = useMemo(
    () => buildCartQuote(selectedTicketCategories, selectedOccurrence, cartItems),
    [cartItems, selectedOccurrence, selectedTicketCategories]
  );
  const completedAttendees = attendees.filter((attendee, index) =>
    isAttendeeComplete(attendee, selectedQuestionnaireConfig, index)
  ).length;
  const attendeesComplete = attendees.length > 0 && completedAttendees === attendees.length;
  const dietaryRequestCount = attendees.filter(
    (attendee) =>
      Array.isArray(attendee.dietaryFlags) && attendee.dietaryFlags.length > 0
        ? true
        : Boolean(String(attendee.dietaryOther || "").trim())
  ).length;
  const contextBlockerMessage = getOccurrenceAvailabilityMessage({
    isItalian,
    selectedOccurrence,
    selectedTicketCategories,
    selectedEvent
  });
  const canContinueFromContext = Boolean(
    selectedOccurrence &&
      selectedTicketCategories.length &&
      maxCartQuantity > 0 &&
      !contextBlockerMessage
  );
  const canContinueFromTickets = canContinueFromContext && totalQuantity > 0 && attendeesComplete;
  const selectedModeMeta = getModeMeta(selectedMode);
  const selectedModeAvailabilityMessage = getModeAvailabilityMessage(
    selectedMode,
    quote,
    isItalian
  );
  const selectedModeOutcome = getModeOutcomeMeta(
    selectedMode,
    quote,
    isItalian,
    currencyFormatter
  );
  const activeFieldErrors = actionState?.fieldErrors || {};
  const actionFieldErrorEntries = Object.entries(activeFieldErrors);
  const leadAttendee = attendees[0] ?? null;
  const leadAttendeeMissingFields = useMemo(
    () =>
      leadAttendee
        ? getAttendeeMissingFields(leadAttendee, selectedQuestionnaireConfig, 0, isItalian)
        : [],
    [isItalian, leadAttendee, selectedQuestionnaireConfig]
  );
  const attendeeCompletionSummary = useMemo(
    () =>
      attendees.map((attendee, index) => ({
        index,
        missingFields: getAttendeeMissingFields(
          attendee,
          selectedQuestionnaireConfig,
          index,
          isItalian
        )
      })),
    [attendees, isItalian, selectedQuestionnaireConfig]
  );
  const duplicateRegistrations = useMemo(() => {
    const leadEmail = normalizeComparisonEmail(leadAttendee?.email);

    if (!leadEmail || !selectedEvent?.slug || !selectedOccurrence?.id) {
      return [];
    }

    return existingRegistrations
      .filter(
        (registration) =>
          registration.eventSlug === selectedEvent.slug &&
          registration.occurrenceId === selectedOccurrence.id &&
          normalizeComparisonEmail(registration.attendeeEmail) === leadEmail &&
          registration.status !== "CANCELLED"
      )
      .slice(0, 3);
  }, [existingRegistrations, leadAttendee?.email, selectedEvent, selectedOccurrence]);
  const hasLeadContactDetails = Boolean(
    leadAttendee &&
      (String(leadAttendee.address || "").trim() ||
        String(leadAttendee.phone || "").trim() ||
        String(leadAttendee.email || "").trim())
  );
  const isCapacityFullyAllocated = totalQuantity > 0 && totalQuantity >= maxCartQuantity;
  const itemsPayload = useMemo(
    () =>
      cartItems
        .filter((item) => Number(item.quantity || 0) > 0 && item.ticketCategoryId)
        .map((item) => ({
          ticketCategoryId: item.ticketCategoryId,
          quantity: Number(item.quantity || 0)
        })),
    [cartItems]
  );
  const attendeesPayload = useMemo(
    () =>
      attendees.map((attendee) => ({
        ticketCategoryId: attendee.ticketCategoryId,
        firstName: String(attendee.firstName || "").trim(),
        lastName: String(attendee.lastName || "").trim(),
        address: String(attendee.address || "").trim(),
        phone: String(attendee.phone || "").trim(),
        email: String(attendee.email || "").trim(),
        dietaryFlags:
          selectedEvent?.collectDietaryInfo === false
            ? []
            : Array.isArray(attendee.dietaryFlags)
              ? attendee.dietaryFlags
              : [],
        dietaryOther:
          selectedEvent?.collectDietaryInfo === false
            ? ""
            : String(attendee.dietaryOther || "").trim()
      })),
    [attendees, selectedEvent]
  );
  const canSubmitRegistration = Boolean(
    activeStep === STEP_INDEX.review &&
      canContinueFromTickets &&
      itemsPayload.length > 0 &&
      attendeesPayload.length > 0 &&
      !selectedModeAvailabilityMessage
  );
  const attendeeRouteHref =
    actionState?.redirectHref ||
    actionState?.paymentPreviewHref ||
    actionState?.confirmationHref ||
    actionState?.confirmedHref ||
    "";
  const createdRegistrationLabel =
    actionState?.registrationCode ||
    (actionState?.registrationStatus === "PENDING_CONFIRM"
      ? isItalian
        ? "Hold in attesa di conferma"
        : "Pending-confirmation hold"
      : isItalian
        ? "Registrazione creata"
        : "Created registration");
  const attendeeRouteLabel = actionState?.paymentPreviewHref
    ? isItalian
      ? "Apri payment preview"
      : "Open payment preview"
    : actionState?.confirmationHref
      ? isItalian
        ? "Apri link di conferma"
        : "Open confirmation link"
      : isItalian
        ? "Apri vista cliente"
        : "Open attendee view";
  const activeStepTitle =
    activeStep === STEP_INDEX.context
      ? isItalian
        ? "Step 1 · Contesto operativo"
        : "Step 1 · Operating context"
      : activeStep === STEP_INDEX.tickets
        ? isItalian
          ? "Step 2 · Ticket e partecipanti"
          : "Step 2 · Tickets and attendees"
        : activeStep === STEP_INDEX.payment
          ? isItalian
            ? "Step 3 · Pagamento e conferma"
            : "Step 3 · Payment and confirmation"
          : isItalian
            ? "Step 4 · Review finale"
            : "Step 4 · Final review";
  const activeStepLead =
    activeStep === STEP_INDEX.context
      ? isItalian
        ? "Qui blocchi il perimetro del wizard: evento, occurrence reale, lingua del flusso e origine operativa della richiesta."
        : "This is where the wizard locks its perimeter: event, live occurrence, flow language, and the operational source of the request."
      : activeStep === STEP_INDEX.tickets
        ? isItalian
          ? "Ora componi il mix ticket e riempi le card partecipante che diventeranno il payload reale della registrazione organizer."
          : "Now build the ticket mix and fill the attendee cards that will become the real organizer registration payload."
        : activeStep === STEP_INDEX.payment
          ? isItalian
            ? "Qui scegli lo stato finale della registrazione e il comportamento economico, senza duplicare logica fuori dal motore organizer già esistente."
            : "This is where you choose the final registration state and financial behavior without duplicating logic outside the organizer runtime we already wired."
          : isItalian
            ? "Qui fai l'ultimo controllo su importi, email, dati partecipanti e prossima azione prima di creare davvero la registrazione."
            : "This is the final check for amounts, emails, attendee data, and next action before the registration is actually created.";
  const activeStepTip = isRouting
    ? isItalian
      ? "Aggiornamento wizard in corso..."
      : "Updating wizard..."
    : activeStep === STEP_INDEX.context
      ? isItalian
        ? "Le scelte qui sopra aggiornano subito il deep link del wizard, cosi il builder ticket eredita gia il contesto corretto."
        : "Choices here immediately update the wizard deep link so the ticket builder inherits the right context."
      : activeStep === STEP_INDEX.tickets
        ? isItalian
          ? `Capacità residua nel builder: ${maxCartQuantity} posti. Ogni cambiamento del mix ticket rigenera e riallinea automaticamente le card partecipante.`
          : `Remaining builder capacity: ${maxCartQuantity} seats. Every ticket-mix change automatically regenerates and realigns the attendee cards.`
        : activeStep === STEP_INDEX.payment
          ? isItalian
            ? "Questo step traduce la stessa registrazione in cinque esiti operativi diversi: hold, unpaid, payment link, deposito offline o tutto pagato."
            : "This step maps the same registration into five distinct operational outcomes: hold, unpaid, payment link, offline deposit, or fully paid."
          : actionState?.ok
            ? isItalian
              ? "La registrazione è stata creata: da qui puoi aprire la vista cliente o tornare subito nella coda organizer."
              : "The registration is now created: from here you can open the attendee-facing route or jump back into the organizer queue."
            : isItalian
              ? "Il submit userà lo stesso service layer organizer già collegato a capacity, payment ledger, email e audit trail."
              : "Submitting will use the same organizer service layer already wired into capacity, payment ledger, emails, and audit trail.";
  const guardrailCards = useMemo(() => {
    const cards = [];

    if (selectedOccurrence && selectedOccurrence.published === false) {
      cards.push({
        tone: "warning",
        title: isItalian ? "Occurrence non pubblicata" : "Unpublished occurrence",
        detail: isItalian
          ? "Lo staff può preparare il builder, ma questa data non è ancora pubblica sul frontend."
          : "Staff can prepare the builder, but this date is not public on the frontend yet."
      });
    }

    if (duplicateRegistrations.length > 0) {
      cards.push({
        tone: "warning",
        title: isItalian ? "Possibile duplicato" : "Possible duplicate",
        detail: isItalian
          ? `Esiste già ${duplicateRegistrations.length === 1 ? "una registrazione" : `${duplicateRegistrations.length} registrazioni`} con la stessa email lead su questa data: ${duplicateRegistrations
              .map((registration) => `${registration.registrationCode} (${registration.status})`)
              .join(", ")}.`
          : `${duplicateRegistrations.length === 1 ? "One registration already exists" : `${duplicateRegistrations.length} registrations already exist`} with the same lead email on this date: ${duplicateRegistrations
              .map((registration) => `${registration.registrationCode} (${registration.status})`)
              .join(", ")}.`
      });
    }

    if (activeStep === STEP_INDEX.tickets && totalQuantity > 0 && !attendeesComplete) {
      cards.push({
        tone: "neutral",
        title: isItalian ? "Card partecipante incomplete" : "Incomplete attendee cards",
        detail: isItalian
          ? `${attendees.length - completedAttendees} card devono ancora chiudere i campi obbligatori prima del payment step.`
          : `${attendees.length - completedAttendees} cards still need their required fields before the payment step.`
      });
    }

    if (isCapacityFullyAllocated && selectedOccurrence) {
      cards.push({
        tone: "neutral",
        title: isItalian ? "Capacità quasi saturata" : "Capacity nearly saturated",
        detail: isItalian
          ? "Questo builder sta già usando tutta la capacità residua mostrata per la data selezionata."
          : "This builder is already using the full remaining capacity shown for the selected date."
      });
    }

    return cards;
  }, [
    activeStep,
    attendees.length,
    attendeesComplete,
    completedAttendees,
    duplicateRegistrations,
    isCapacityFullyAllocated,
    isItalian,
    selectedOccurrence
  ]);

  useEffect(() => {
    if (activeStep >= STEP_INDEX.tickets && !canContinueFromContext) {
      setActiveStep(STEP_INDEX.context);
    }
  }, [activeStep, canContinueFromContext]);

  useEffect(() => {
    if (activeStep >= STEP_INDEX.payment && !canContinueFromTickets) {
      setActiveStep(STEP_INDEX.tickets);
    }
  }, [activeStep, canContinueFromTickets]);

  useEffect(() => {
    if (!isModeAvailable(selectedMode, quote)) {
      const fallbackMode = ORGANIZER_MANUAL_REGISTRATION_MODE.REQUEST_CONFIRMATION;

      setSelectedMode(fallbackMode);
      syncUrl(
        activeStep >= STEP_INDEX.payment ? activeStep : STEP_INDEX.context,
        {
          selectedMode: fallbackMode
        }
      );
    }
  }, [activeStep, quote, selectedMode]);

  useEffect(() => {
    setAttendees((current) => {
      const requiredTicketIds = expandCartTicketIds(selectedTicketCategories, cartItems);
      const pools = new Map();

      for (const attendee of current) {
        const key = attendee.ticketCategoryId || "";

        if (!pools.has(key)) {
          pools.set(key, []);
        }

        pools.get(key).push(attendee);
      }

      return requiredTicketIds.map((ticketCategoryId) => {
        const pool = pools.get(ticketCategoryId) || [];
        const nextAttendee = pool.shift() || createBlankAttendee(ticketCategoryId);

        return {
          ...nextAttendee,
          ticketCategoryId
        };
      });
    });
  }, [cartItems, selectedTicketCategories]);

  function syncUrl(nextStepIndex, nextContext = {}) {
    const nextEvent = nextContext.selectedEvent ?? selectedEvent;
    const nextOccurrence = nextContext.selectedOccurrence ?? selectedOccurrence;
    const nextRegistrationLocale =
      nextContext.selectedRegistrationLocale ?? selectedRegistrationLocale;
    const nextOrigin = nextContext.selectedOrigin ?? selectedOrigin;
    const nextMode = nextContext.selectedMode ?? selectedMode;

    startTransition(() => {
      router.replace(
        buildContextSnapshot({
          pathname,
          selectedEvent: nextEvent,
          selectedOccurrence: nextOccurrence,
          selectedRegistrationLocale: nextRegistrationLocale,
          selectedOrigin: nextOrigin,
          selectedMode: nextMode,
          stepIndex: nextStepIndex
        }),
        {
          scroll: false
        }
      );
    });
  }

  function syncContext(nextPatch = {}) {
    const nextEventSlug = nextPatch.eventSlug ?? selectedEvent?.slug ?? "";
    const nextRegistrationLocale =
      nextPatch.registrationLocale ?? selectedRegistrationLocale;
    const nextOrigin = nextPatch.origin ?? selectedOrigin;
    const nextEvent = getEventBySlug(events, nextEventSlug);
    const nextVisibleOccurrences = getVisibleOccurrences(occurrences, nextEvent?.slug || "");
    const requestedOccurrenceId = nextPatch.occurrenceId ?? selectedOccurrence?.id ?? "";
    const nextOccurrenceId = getSelectedOccurrenceId(nextVisibleOccurrences, requestedOccurrenceId);
    const nextOccurrence =
      nextVisibleOccurrences.find((occurrence) => occurrence.id === nextOccurrenceId) ??
      nextVisibleOccurrences[0] ??
      null;
    const nextTicketCategories = getActiveTicketCategories(nextEvent);
    const nextCartItems = buildDefaultCart(nextTicketCategories, nextOccurrence);
    const nextQuote = buildCartQuote(nextTicketCategories, nextOccurrence, nextCartItems);
    const nextMode = isModeAvailable(selectedMode, nextQuote)
      ? normalizeMode(selectedMode)
      : ORGANIZER_MANUAL_REGISTRATION_MODE.REQUEST_CONFIRMATION;

    setSelectedEventSlug(nextEventSlug);
    setSelectedOccurrenceId(nextOccurrenceId);
    setSelectedRegistrationLocale(nextRegistrationLocale);
    setSelectedOrigin(nextOrigin);
    setSelectedMode(nextMode);
    setActiveStep(STEP_INDEX.context);
    setCartItems(nextCartItems);
    setAttendees(buildAttendeesFromCart(nextTicketCategories, nextCartItems));
    syncUrl(STEP_INDEX.context, {
      selectedEvent: nextEvent,
      selectedOccurrence: nextOccurrence,
      selectedRegistrationLocale: nextRegistrationLocale,
      selectedOrigin: nextOrigin,
      selectedMode: nextMode
    });
  }

  function syncStep(nextStepIndex) {
    if (nextStepIndex === STEP_INDEX.tickets && !canContinueFromContext) {
      return;
    }

    if (
      (nextStepIndex === STEP_INDEX.payment || nextStepIndex === STEP_INDEX.review) &&
      !canContinueFromTickets
    ) {
      return;
    }

    setActiveStep(nextStepIndex);
    syncUrl(nextStepIndex);
  }

  function syncMode(nextMode) {
    const normalizedMode = normalizeMode(nextMode, selectedMode);

    if (!isModeAvailable(normalizedMode, quote)) {
      return;
    }

    setSelectedMode(normalizedMode);
    syncUrl(STEP_INDEX.payment, {
      selectedMode: normalizedMode
    });
  }

  function updateCartQuantity(ticketCategoryId, nextQuantity) {
    const sanitizedQuantity = Math.max(0, Number(nextQuantity || 0));

    setCartItems((current) => {
      const currentWithoutTicket = current.filter(
        (item) => item.ticketCategoryId !== ticketCategoryId
      );
      const otherQuantity = sumCartQuantity(currentWithoutTicket);
      const cappedQuantity = Math.min(
        sanitizedQuantity,
        Math.max(0, maxCartQuantity - otherQuantity)
      );
      const next =
        cappedQuantity > 0
          ? [...currentWithoutTicket, { ticketCategoryId, quantity: cappedQuantity }]
          : currentWithoutTicket;
      const order = new Map(
        selectedTicketCategories.map((category, index) => [category.id, index])
      );

      return next.sort(
        (left, right) =>
          (order.get(left.ticketCategoryId) ?? 999) - (order.get(right.ticketCategoryId) ?? 999)
      );
    });
  }

  function updateAttendee(index, patch) {
    setAttendees((current) =>
      current.map((attendee, attendeeIndex) =>
        attendeeIndex === index ? { ...attendee, ...patch } : attendee
      )
    );
  }

  function toggleDietaryFlag(index, flagId) {
    setAttendees((current) =>
      current.map((attendee, attendeeIndex) => {
        if (attendeeIndex !== index) {
          return attendee;
        }

        const flags = new Set(attendee.dietaryFlags);

        if (flags.has(flagId)) {
          flags.delete(flagId);
        } else {
          flags.add(flagId);
        }

        return {
          ...attendee,
          dietaryFlags: Array.from(flags)
        };
      })
    );
  }

  function copyLeadContactToFollowers() {
    if (!leadAttendee) {
      return;
    }

    setAttendees((current) =>
      current.map((attendee, attendeeIndex) =>
        attendeeIndex === 0
          ? attendee
          : {
              ...attendee,
              address: leadAttendee.address,
              phone: leadAttendee.phone,
              email: leadAttendee.email
            }
      )
    );
  }

  return (
    <form action={formAction}>
      <input name="slug" type="hidden" value={slug} />
      <input name="eventTypeId" type="hidden" value={selectedEvent?.id || ""} />
      <input name="occurrenceId" type="hidden" value={selectedOccurrence?.id || ""} />
      <input name="registrationLocale" type="hidden" value={selectedRegistrationLocale} />
      <input name="origin" type="hidden" value={selectedOrigin} />
      <input name="mode" type="hidden" value={selectedMode} />
      <input name="note" type="hidden" value={organizerNote} />
      <input name="baseUrl" type="hidden" value={baseUrl} />
      <input name="itemsJson" type="hidden" value={JSON.stringify(itemsPayload)} />
      <input name="attendeesJson" type="hidden" value={JSON.stringify(attendeesPayload)} />

      <section className="registration-grid">
      <article className="panel section-card registration-flow-card admin-section">
        <div>
          <div className="section-kicker">{isItalian ? "Fase 10" : "Phase 10"}</div>
          <h3>{activeStepTitle}</h3>
          <p className="admin-page-lead">{activeStepLead}</p>
        </div>

        <div className="registration-stepper">
          {stepLabels.map((step, index) => {
            const isActive = activeStep === index;
            const isInteractive = index <= STEP_INDEX.review;
            const isDisabled =
              isPending ||
              (index === STEP_INDEX.tickets && !canContinueFromContext) ||
              ((index === STEP_INDEX.payment || index === STEP_INDEX.review) &&
                !canContinueFromTickets);

            if (!isInteractive) {
              return (
                <div className={`registration-step${isActive ? " registration-step-active" : ""}`} key={step.title}>
                  <span className="registration-step-index">{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <span>{step.detail}</span>
                  </div>
                </div>
              );
            }

            return (
              <button
                className={`registration-step${isActive ? " registration-step-active" : ""}`}
                disabled={isDisabled}
                key={step.title}
                onClick={() => syncStep(index)}
                type="button"
              >
                <span className="registration-step-index">{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <span>{step.detail}</span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="admin-page-tip">{activeStepTip}</p>

        <details className="registration-mobile-summary admin-disclosure">
          <summary className="admin-disclosure-summary">
            {isItalian ? "Apri il riepilogo rapido" : "Open quick summary"}
          </summary>
          <div className="timeline">
            <div className="timeline-step">
              <strong>{isItalian ? "Data attiva" : "Active date"}</strong>
              <span>{selectedOccurrence?.startsAtLabel || "—"}</span>
            </div>
            <div className="timeline-step">
              <strong>{isItalian ? "Origine" : "Origin"}</strong>
              <span>{selectedOriginMeta.label[isItalian ? "it" : "en"]}</span>
            </div>
            <div className="timeline-step">
              <strong>{isItalian ? "Ticket scelti" : "Selected tickets"}</strong>
              <span>{totalQuantity > 0 ? totalQuantity : "—"}</span>
            </div>
            <div className="timeline-step">
              <strong>{isItalian ? "Card complete" : "Completed cards"}</strong>
              <span>{attendees.length > 0 ? `${completedAttendees}/${attendees.length}` : "—"}</span>
            </div>
            <div className="timeline-step">
              <strong>{isItalian ? "Esito previsto" : "Expected outcome"}</strong>
              <span>{selectedModeOutcome.status}</span>
            </div>
          </div>
        </details>

        {guardrailCards.length ? (
          <div className="registration-feedback-grid">
            {guardrailCards.map((card) => (
              <div
                className={`registration-health-card registration-health-card-${card.tone}`}
                key={`${card.title}-${card.detail}`}
              >
                <span className="spotlight-label">{isItalian ? "Guardrail" : "Guardrail"}</span>
                <strong>{card.title}</strong>
                <p>{card.detail}</p>
              </div>
            ))}
          </div>
        ) : null}

        {activeStep === STEP_INDEX.context ? (
          <div className="registration-panel-stack">
            <label className="field">
              <span>{isItalian ? "Evento" : "Event"}</span>
              <select
                onChange={(event) => syncContext({ eventSlug: event.target.value })}
                value={selectedEvent?.slug || ""}
              >
                {events.map((event) => (
                  <option key={event.id} value={event.slug}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <div className="admin-filter-strip">
                <span className="admin-filter-label">
                  {isItalian ? "Scegli la data reale" : "Choose the live date"}
                </span>
              </div>

              {visibleOccurrences.length ? (
                <div className="registration-choice-grid sm:grid-cols-2">
                  {visibleOccurrences.map((occurrence) => {
                    const isSelected = occurrence.id === selectedOccurrence?.id;

                    return (
                      <button
                        className={`registration-choice${isSelected ? " registration-choice-active" : ""}`}
                        key={occurrence.id}
                        onClick={() => syncContext({ occurrenceId: occurrence.id })}
                        type="button"
                      >
                        <div className="registration-choice-head">
                          <div>
                            <strong>{occurrence.startsAtLabel}</strong>
                            <span>{occurrence.capacitySummary?.capacityLabel || "—"}</span>
                          </div>
                          <span className="route-label">
                            {buildOccurrenceCollectionLabel(occurrence)}
                          </span>
                        </div>
                        <span>{occurrence.capacitySummary?.statusLabel || "—"}</span>
                        <span>
                          {isItalian ? "Finestra vendite" : "Sales window"}:{" "}
                          {occurrence.salesWindowStartsAtLabel} → {occurrence.salesWindowEndsAtLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="admin-note-item">
                  <span className="spotlight-label">
                    {isItalian ? "Nessuna occurrence disponibile" : "No available occurrence"}
                  </span>
                  <strong>
                    {isItalian
                      ? "Questo evento non ha ancora una data usabile per la manual registration."
                      : "This event does not have a date that can be used for manual registration yet."}
                  </strong>
                  <p>
                    {isItalian
                      ? "Pubblica una data dal programma prima di continuare con il wizard."
                      : "Publish one date from the schedule before continuing with the wizard."}
                  </p>
                </div>
              )}
            </div>

            <div>
              <div className="admin-filter-strip">
                <span className="admin-filter-label">
                  {isItalian ? "Lingua della registrazione" : "Registration language"}
                </span>
                <div className="filter-row">
                  {localeOptions.map((option) => (
                    <button
                      className={`filter-pill ${
                        selectedRegistrationLocale === option.value ? "filter-pill-active" : ""
                      }`}
                      key={option.value}
                      onClick={() => syncContext({ registrationLocale: option.value })}
                      type="button"
                    >
                      {option.label[isItalian ? "it" : "en"]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="admin-filter-strip">
                <span className="admin-filter-label">
                  {isItalian ? "Origine operativa" : "Operational origin"}
                </span>
              </div>
              <div className="registration-choice-grid sm:grid-cols-2 xl:grid-cols-4">
                {originOptions.map((option) => {
                  const isSelected = option.value === selectedOrigin;

                  return (
                    <button
                      className={`registration-choice${isSelected ? " registration-choice-active" : ""}`}
                      key={option.value}
                      onClick={() => syncContext({ origin: option.value })}
                      type="button"
                    >
                      <div className="registration-choice-head">
                        <div>
                          <strong>{option.label[isItalian ? "it" : "en"]}</strong>
                          <span>{option.detail[isItalian ? "it" : "en"]}</span>
                        </div>
                        <span className="route-label">{option.badge[isItalian ? "it" : "en"]}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {contextBlockerMessage ? (
              <div className="registration-message-error">{contextBlockerMessage}</div>
            ) : null}

            <div className="hero-actions">
              <Link className="button button-secondary" href={contextualRegistrationsHref}>
                {isItalian ? "Torna alla coda" : "Back to queue"}
              </Link>
              {!visibleOccurrences.length ? (
                <Link className="button button-secondary" href={`/${slug}/admin/calendar`}>
                  {isItalian ? "Apri programma" : "Open schedule"}
                </Link>
              ) : null}
              <button
                className="button button-primary"
                disabled={!canContinueFromContext}
                onClick={() => syncStep(STEP_INDEX.tickets)}
                type="button"
              >
                {isItalian ? "Continua ai ticket" : "Continue to tickets"}
              </button>
            </div>
          </div>
        ) : activeStep === STEP_INDEX.tickets ? (
          <div className="registration-panel-stack">
            <div className="registration-choice-grid">
              {selectedTicketCategories.map((category) => {
                const item = cartItems.find((entry) => entry.ticketCategoryId === category.id);
                const quantity = item?.quantity || 0;
                const remainingForThisTicket = maxCartQuantity - (totalQuantity - quantity);
                const payment = calculatePaymentBreakdown({
                  unitPrice: Number(category.unitPriceCents || 0) / 100,
                  quantity: Math.max(1, quantity || 1),
                  prepayPercentage: selectedOccurrence?.prepayPercentage || 0
                });

                return (
                  <article className="registration-choice registration-choice-active" key={category.id}>
                    <div className="registration-ticket-head">
                      <div className="registration-ticket-copy">
                        <strong>{category.label}</strong>
                        <span>{category.summary || (isItalian ? "Ticket organizer" : "Organizer ticket")}</span>
                      </div>
                      <div className="registration-ticket-price">
                        <strong>{category.unitPriceLabel}</strong>
                        <span>
                          {payment.onlineAmountLabel} {isItalian ? "online" : "online"}
                        </span>
                      </div>
                    </div>

                    {category.includedList?.length ? (
                      <div className="registration-ticket-included">
                        <strong>{isItalian ? "Include" : "Includes"}</strong>
                        <ul className="registration-ticket-included-list">
                          {category.includedList.map((itemLabel) => (
                            <li key={`${category.id}-${itemLabel}`}>{itemLabel}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="payment-amounts">
                      <div className="payment-amount">
                        <span className="payment-label">{isItalian ? "Totale unità" : "Unit total"}</span>
                        <span className="payment-value">{payment.subtotalLabel}</span>
                      </div>
                      <div className="payment-amount">
                        <span className="payment-label">{isItalian ? "Online" : "Online"}</span>
                        <span className="payment-value">{payment.onlineAmountLabel}</span>
                      </div>
                      <div className="payment-amount">
                        <span className="payment-label">{isItalian ? "Sul posto" : "Due at venue"}</span>
                        <span className="payment-value">{payment.dueAtEventLabel}</span>
                      </div>
                    </div>

                    <div className="registration-ticket-quantity">
                      <button
                        className="button button-secondary"
                        onClick={() => updateCartQuantity(category.id, quantity - 1)}
                        type="button"
                      >
                        -
                      </button>
                      <span className="registration-ticket-quantity-value">{quantity}</span>
                      <button
                        className="button button-secondary"
                        disabled={remainingForThisTicket <= 0}
                        onClick={() => updateCartQuantity(category.id, quantity + 1)}
                        type="button"
                      >
                        +
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {totalQuantity <= 0 ? (
              <div className="registration-message-error">
                {isItalian
                  ? "Seleziona almeno un ticket prima di compilare i partecipanti."
                  : "Select at least one ticket before filling attendee cards."}
              </div>
            ) : attendeesComplete ? (
              <div className="registration-message registration-message-success">
                {isItalian
                  ? "Tutte le card partecipante richieste da questo mix ticket sono complete."
                  : "All attendee cards required by this ticket mix are complete."}
              </div>
            ) : (
              <p className="admin-page-tip">
                {isItalian
                  ? `Completate ${completedAttendees} card su ${attendees.length}. La fase successiva userà esattamente questi dati.`
                  : `${completedAttendees} attendee cards out of ${attendees.length} are complete. The next phase will use these exact details.`}
              </p>
            )}

            {attendees.length > 1 ? (
              <div className="registration-attendee-toolbar">
                <div className="admin-note-item">
                  <span className="spotlight-label">
                    {isItalian ? "Shortcut gruppo" : "Group shortcut"}
                  </span>
                  <strong>
                    {isItalian
                      ? "Usa i dati del capogruppo per indirizzo, telefono ed email."
                      : "Use the lead attendee details for address, phone, and email."}
                  </strong>
                  <p>
                    {isItalian
                      ? "Nomi, ticket e note dietary restano individuali."
                      : "Names, tickets, and dietary notes stay individual."}
                  </p>
                </div>
                <button
                  className="button button-secondary"
                  disabled={!hasLeadContactDetails}
                  onClick={copyLeadContactToFollowers}
                  type="button"
                >
                  {isItalian ? "Copia dati del capogruppo" : "Copy lead contact details"}
                </button>
              </div>
            ) : null}

            {attendees.length > 0 ? (
              <div className="registration-choice-grid">
                {attendees.map((attendee, index) => {
                  const ticketLabel =
                    selectedTicketCategories.find(
                      (category) => category.id === attendee.ticketCategoryId
                    )?.label || "Ticket";
                  const missingFields = attendeeCompletionSummary[index]?.missingFields || [];
                  const isComplete = missingFields.length === 0;
                  const attendeeRole = getRegistrationQuestionnaireRole(index);

                  return (
                    <article className="registration-choice registration-choice-active" key={`attendee-${index}`}>
                      <div className="registration-choice-head">
                        <div>
                          <strong>
                            {isItalian ? "Partecipante" : "Attendee"} {index + 1}
                          </strong>
                          <span>
                            {index === 0
                              ? isItalian
                                ? "Capogruppo / contatto principale"
                                : "Lead attendee / primary contact"
                              : ticketLabel}
                          </span>
                        </div>
                        <div className="admin-badge-row">
                          <span className="route-label">{ticketLabel}</span>
                          <span
                            className={`admin-badge admin-badge-${
                              isComplete ? "public" : "pending_confirm"
                            }`}
                          >
                            {isComplete
                              ? isItalian
                                ? "Completa"
                                : "Complete"
                              : isItalian
                                ? "Da chiudere"
                                : "Needs work"}
                          </span>
                        </div>
                      </div>

                      {!isComplete ? (
                        <div className="registration-message-warning">
                          {isItalian
                            ? `Campi ancora mancanti: ${missingFields.join(", ")}.`
                            : `Still missing: ${missingFields.join(", ")}.`}
                        </div>
                      ) : null}

                      <div className="registration-field-grid mt-4">
                        <div className="field field-span">
                          <span>{isItalian ? "Ticket assegnato" : "Assigned ticket"}</span>
                          <div
                            aria-label={isItalian ? "Ticket assegnato" : "Assigned ticket"}
                            className="field-static-value"
                            role="note"
                          >
                            <span className="field-static-value-label">{ticketLabel}</span>
                            <span className="field-static-value-hint">
                              {isItalian
                                ? "Selezionato nel passaggio ticket"
                                : "Selected in the ticket step"}
                            </span>
                          </div>
                        </div>
                        {isRegistrationQuestionnaireFieldVisible(
                          selectedQuestionnaireConfig,
                          attendeeRole,
                          "firstName"
                        ) ? (
                          <label className="field">
                            <span>{isItalian ? "Nome" : "First name"}</span>
                            <input
                              onChange={(event) => updateAttendee(index, { firstName: event.target.value })}
                              type="text"
                              value={attendee.firstName}
                            />
                          </label>
                        ) : null}
                        {isRegistrationQuestionnaireFieldVisible(
                          selectedQuestionnaireConfig,
                          attendeeRole,
                          "lastName"
                        ) ? (
                          <label className="field">
                            <span>{isItalian ? "Cognome" : "Last name"}</span>
                            <input
                              onChange={(event) => updateAttendee(index, { lastName: event.target.value })}
                              type="text"
                              value={attendee.lastName}
                            />
                          </label>
                        ) : null}
                        {isRegistrationQuestionnaireFieldVisible(
                          selectedQuestionnaireConfig,
                          attendeeRole,
                          "address"
                        ) ? (
                          <label className="field field-span">
                            <span>{isItalian ? "Indirizzo" : "Address"}</span>
                            <input
                              onChange={(event) => updateAttendee(index, { address: event.target.value })}
                              type="text"
                              value={attendee.address}
                            />
                          </label>
                        ) : null}
                        {isRegistrationQuestionnaireFieldVisible(
                          selectedQuestionnaireConfig,
                          attendeeRole,
                          "phone"
                        ) ? (
                          <label className="field">
                            <span>{isItalian ? "Telefono" : "Phone"}</span>
                            <input
                              onChange={(event) => updateAttendee(index, { phone: event.target.value })}
                              type="text"
                              value={attendee.phone}
                            />
                          </label>
                        ) : null}
                        {isRegistrationQuestionnaireFieldVisible(
                          selectedQuestionnaireConfig,
                          attendeeRole,
                          "email"
                        ) ? (
                          <label className="field">
                            <span>{isItalian ? "Email" : "Email"}</span>
                            <input
                              onChange={(event) => updateAttendee(index, { email: event.target.value })}
                              type="email"
                              value={attendee.email}
                            />
                          </label>
                        ) : null}

                        {selectedEvent?.collectDietaryInfo !== false &&
                        isRegistrationQuestionnaireFieldVisible(
                          selectedQuestionnaireConfig,
                          attendeeRole,
                          "dietaryFlags"
                        ) ? (
                          <>
                            <div className="field field-span">
                              <span>
                                {isItalian ? "Restrizioni / preferenze alimentari" : "Dietary restrictions / preferences"}
                              </span>
                              <div className="filter-row">
                                {dietaryOptions.map((option) => {
                                  const selected = attendee.dietaryFlags.includes(option.id);

                                  return (
                                    <button
                                      className={`filter-pill ${selected ? "filter-pill-active" : ""}`}
                                      key={option.id}
                                      onClick={() => toggleDietaryFlag(index, option.id)}
                                      type="button"
                                    >
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        ) : null}
                        {selectedEvent?.collectDietaryInfo !== false &&
                        isRegistrationQuestionnaireFieldVisible(
                          selectedQuestionnaireConfig,
                          attendeeRole,
                          "dietaryOther"
                        ) ? (
                          <>
                            <label className="field field-span">
                              <span>{isItalian ? "Nota libera" : "Free note"}</span>
                              <textarea
                                onChange={(event) =>
                                  updateAttendee(index, { dietaryOther: event.target.value })
                                }
                                placeholder={
                                  isItalian
                                    ? "Allergie, menu dedicato o nota di servizio."
                                    : "Allergies, dedicated menu, or service note."
                                }
                                rows="2"
                                value={attendee.dietaryOther}
                              />
                            </label>
                          </>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="admin-note-item">
                <span className="spotlight-label">
                  {isItalian ? "Nessun partecipante ancora" : "No attendees yet"}
                </span>
                <strong>
                  {isItalian
                    ? "Aumenta la quantità di almeno un ticket per generare le card partecipante."
                    : "Increase the quantity of at least one ticket to generate attendee cards."}
                </strong>
              </div>
            )}

            <div className="hero-actions">
              <button
                className="button button-secondary"
                onClick={() => syncStep(STEP_INDEX.context)}
                type="button"
              >
                {isItalian ? "Torna al contesto" : "Back to context"}
              </button>
              <button
                className="button button-primary"
                disabled={!canContinueFromTickets}
                onClick={() => syncStep(STEP_INDEX.payment)}
                type="button"
              >
                {isItalian ? "Continua al pagamento" : "Continue to payment"}
              </button>
            </div>
          </div>
        ) : activeStep === STEP_INDEX.payment ? (
          <div className="registration-panel-stack">
            <div className="registration-choice-grid">
              {modeOptions.map((option) => {
                const isSelected = option.value === selectedMode;
                const availabilityMessage = getModeAvailabilityMessage(
                  option.value,
                  quote,
                  isItalian
                );
                const outcome = getModeOutcomeMeta(
                  option.value,
                  quote,
                  isItalian,
                  currencyFormatter
                );

                return (
                  <button
                    className={`registration-choice${isSelected ? " registration-choice-active" : ""}`}
                    disabled={Boolean(availabilityMessage)}
                    key={option.value}
                    onClick={() => syncMode(option.value)}
                    type="button"
                  >
                    <div className="registration-choice-head">
                      <div>
                        <strong>{option.label[isItalian ? "it" : "en"]}</strong>
                        <span>{option.detail[isItalian ? "it" : "en"]}</span>
                      </div>
                      <span className={`admin-badge admin-badge-${outcome.tone}`}>
                        {outcome.status}
                      </span>
                    </div>
                    <span>{outcome.financialSummary}</span>
                    <span>{outcome.emailSummary}</span>
                    {availabilityMessage ? (
                      <span className="registration-message-error">{availabilityMessage}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="admin-note-list">
              <div className="admin-note-item">
                <span className="spotlight-label">{isItalian ? "Modalità selezionata" : "Selected mode"}</span>
                <strong>{selectedModeMeta.label[isItalian ? "it" : "en"]}</strong>
                <p>{selectedModeMeta.detail[isItalian ? "it" : "en"]}</p>
              </div>
              <div className="admin-note-item">
                <span className="spotlight-label">{isItalian ? "Stato finale previsto" : "Expected final status"}</span>
                <strong>{selectedModeOutcome.status}</strong>
                <p>{selectedModeOutcome.financialSummary}</p>
              </div>
              <div className="admin-note-item">
                <span className="spotlight-label">{isItalian ? "Percorso cliente" : "Attendee path"}</span>
                <strong>{selectedModeOutcome.emailSummary}</strong>
                <p>
                  {selectedModeAvailabilityMessage
                    ? selectedModeAvailabilityMessage
                    : isItalian
                      ? "Il prossimo step di review confermerà esattamente questo esito prima della creazione."
                      : "The next review step will confirm this exact outcome before creation."}
                </p>
              </div>
            </div>

            <label className="field">
              <span>{isItalian ? "Nota operativa interna" : "Internal operating note"}</span>
              <textarea
                onChange={(event) => setOrganizerNote(event.target.value)}
                placeholder={
                  isItalian
                    ? "Walk-in, richiesta telefonica, riferimento staff, eccezione di cassa o note utili per la review."
                    : "Walk-in, phone request, staff reference, cash exception, or anything useful for review."
                }
                rows="3"
                value={organizerNote}
              />
            </label>

            <div className="hero-actions">
              <button
                className="button button-secondary"
                disabled={isPending}
                onClick={() => syncStep(STEP_INDEX.tickets)}
                type="button"
              >
                {isItalian ? "Torna ai partecipanti" : "Back to attendees"}
              </button>
              <button
                className="button button-primary"
                disabled={Boolean(selectedModeAvailabilityMessage) || isPending}
                onClick={() => syncStep(STEP_INDEX.review)}
                type="button"
              >
                {isItalian ? "Continua alla review" : "Continue to review"}
              </button>
            </div>
          </div>
        ) : (
          <div className="registration-panel-stack">
            {actionState?.ok ? (
              <>
                <div className="registration-message registration-message-success">
                  {isItalian
                    ? `${createdRegistrationLabel} creato con successo.`
                    : `${createdRegistrationLabel} created successfully.`}
                </div>

                <div className="admin-note-list">
                  <div className="admin-note-item">
                    <span className="spotlight-label">
                      {isItalian ? "Registrazione creata" : "Registration created"}
                    </span>
                    <strong>
                      {createdRegistrationLabel} ·{" "}
                      {actionState.registrationStatus || selectedModeOutcome.status}
                    </strong>
                    <p>{selectedModeOutcome.emailSummary}</p>
                  </div>
                  <div className="admin-note-item">
                    <span className="spotlight-label">
                      {isItalian ? "Prossima azione" : "Next action"}
                    </span>
                    <strong>
                      {actionState.paymentPreviewHref
                        ? isItalian
                          ? "Payment preview già pronto"
                          : "Payment preview is ready"
                        : actionState.confirmationHref
                          ? isItalian
                            ? "Link di conferma già pronto"
                            : "Confirmation link is ready"
                          : isItalian
                            ? "Registrazione già visibile nel runtime"
                            : "Registration is already visible in the runtime"}
                    </strong>
                    <p>
                      {isItalian
                        ? "Puoi aprire il percorso cliente direttamente dal runtime oppure tornare in coda per continuare le operazioni organizer."
                        : "You can open the attendee-facing route directly in the runtime or jump back into the queue for ongoing organizer operations."}
                    </p>
                  </div>
                  {organizerNote.trim() ? (
                    <div className="admin-note-item">
                      <span className="spotlight-label">
                        {isItalian ? "Nota salvata" : "Saved note"}
                      </span>
                      <strong>{organizerNote.trim()}</strong>
                    </div>
                  ) : null}
                </div>

                <div className="hero-actions">
                  {attendeeRouteHref ? (
                    <Link className="button button-primary" href={attendeeRouteHref}>
                      {attendeeRouteLabel}
                    </Link>
                  ) : null}
                  <Link className="button button-secondary" href={contextualRegistrationsHref}>
                    {isItalian ? "Torna alla coda" : "Back to queue"}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="admin-note-list">
                  <div className="admin-note-item">
                    <span className="spotlight-label">
                      {isItalian ? "Contesto finale" : "Final context"}
                    </span>
                    <strong>
                      {selectedEvent?.title || "—"} · {selectedOccurrence?.startsAtLabel || "—"}
                    </strong>
                    <p>
                      {selectedOriginMeta.label[isItalian ? "it" : "en"]} ·{" "}
                      {selectedRegistrationLocale.toUpperCase()}
                    </p>
                  </div>
                  <div className="admin-note-item">
                    <span className="spotlight-label">
                      {isItalian ? "Esito e cassa" : "Outcome and settlement"}
                    </span>
                    <strong>{selectedModeOutcome.status}</strong>
                    <p>{selectedModeOutcome.financialSummary}</p>
                  </div>
                  <div className="admin-note-item">
                    <span className="spotlight-label">
                      {isItalian ? "Email previste" : "Expected emails"}
                    </span>
                    <strong>{selectedModeOutcome.emailSummary}</strong>
                    <p>
                      {isItalian
                        ? "Il submit userà i template già collegati al runtime organizer/manual entry."
                        : "Submitting will use the templates already wired into the organizer/manual-entry runtime."}
                    </p>
                  </div>
                  {organizerNote.trim() ? (
                    <div className="admin-note-item">
                      <span className="spotlight-label">
                        {isItalian ? "Nota operativa" : "Operating note"}
                      </span>
                      <strong>{organizerNote.trim()}</strong>
                    </div>
                  ) : null}
                </div>

                <details className="admin-disclosure" open>
                  <summary className="admin-disclosure-summary">
                    {isItalian ? "Riepilogo ticket e importi" : "Ticket and totals review"}
                  </summary>
                  <div className="timeline">
                    {cartDetails.map((item) => (
                      <div className="timeline-step" key={`review-${item.ticketCategoryId}`}>
                        <strong>
                          {item.label} x{item.quantity}
                        </strong>
                        <span>{item.subtotalLabel}</span>
                        <span>
                          {item.onlineAmountLabel} {isItalian ? "online" : "online"} ·{" "}
                          {item.dueAtEventLabel} {isItalian ? "sul posto" : "due at venue"}
                        </span>
                      </div>
                    ))}
                    <div className="timeline-step">
                      <strong>{isItalian ? "Totale finale" : "Final total"}</strong>
                      <span>{currencyFormatter.format(quote.subtotal)}</span>
                    </div>
                    <div className="timeline-step">
                      <strong>{isItalian ? "Online" : "Online"}</strong>
                      <span>{currencyFormatter.format(quote.onlineAmount)}</span>
                    </div>
                    <div className="timeline-step">
                      <strong>{isItalian ? "Saldo sul posto" : "Due at venue"}</strong>
                      <span>{currencyFormatter.format(quote.dueAtEvent)}</span>
                    </div>
                  </div>
                </details>

                <details className="admin-disclosure">
                  <summary className="admin-disclosure-summary">
                    {isItalian ? "Controllo partecipanti" : "Attendee check"}
                  </summary>
                  <div className="timeline">
                    {attendees.map((attendee, index) => {
                      const ticketLabel =
                        selectedTicketCategories.find(
                          (category) => category.id === attendee.ticketCategoryId
                        )?.label || "Ticket";
                      const missingFields = attendeeCompletionSummary[index]?.missingFields || [];

                      return (
                        <div className="timeline-step" key={`review-attendee-${index}`}>
                          <strong>
                            {[attendee.firstName, attendee.lastName].filter(Boolean).join(" ") ||
                              `${isItalian ? "Partecipante" : "Attendee"} ${index + 1}`}
                          </strong>
                          <span>{ticketLabel}</span>
                          <span>
                            {missingFields.length === 0
                              ? attendee.email
                              : isItalian
                                ? `Campi mancanti: ${missingFields.join(", ")}`
                                : `Missing fields: ${missingFields.join(", ")}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </details>

                {actionState.message ? (
                  <div className="registration-message-error">{actionState.message}</div>
                ) : null}

                {actionFieldErrorEntries.length ? (
                  <div className="registration-message-error">
                    <strong>{isItalian ? "Controlla questi punti:" : "Check these details:"}</strong>
                    <ul className="mt-3 list-disc pl-5">
                      {actionFieldErrorEntries.map(([fieldName, errorMessage]) => (
                        <li key={`${fieldName}-${errorMessage}`}>
                          {getActionFieldLabel(fieldName, isItalian)}: {errorMessage}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="hero-actions">
                  <button
                    className="button button-secondary"
                    disabled={isPending}
                    onClick={() => syncStep(STEP_INDEX.payment)}
                    type="button"
                  >
                    {isItalian ? "Torna al pagamento" : "Back to payment"}
                  </button>
                  <button
                    className="button button-primary"
                    disabled={!canSubmitRegistration || isPending}
                    type="submit"
                  >
                    {isPending
                      ? isItalian
                        ? "Creazione registrazione..."
                        : "Creating registration..."
                      : isItalian
                        ? "Crea registrazione"
                        : "Create registration"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </article>

      <aside className="panel section-card registration-summary-card">
        <div className="section-kicker">{isItalian ? "Contesto + builder" : "Context + builder"}</div>
        <h3>{selectedEvent?.title || (isItalian ? "Nessun evento" : "No event selected")}</h3>

        <div className="timeline mt-6">
          <div className="timeline-step">
            <strong>{isItalian ? "Occurrence attiva" : "Live occurrence"}</strong>
            <span>{selectedOccurrence?.startsAtLabel || "—"}</span>
          </div>
          <div className="timeline-step">
            <strong>{isItalian ? "Origine operativa" : "Operational origin"}</strong>
            <span>{selectedOriginMeta.label[isItalian ? "it" : "en"]}</span>
          </div>
          <div className="timeline-step">
            <strong>{isItalian ? "Lingua scelta" : "Selected language"}</strong>
            <span>{selectedRegistrationLocale.toUpperCase()}</span>
          </div>
          <div className="timeline-step">
            <strong>{isItalian ? "Capacità residua" : "Remaining capacity"}</strong>
            <span>{selectedOccurrence?.capacitySummary?.capacityLabel || "—"}</span>
          </div>
          <div className="timeline-step">
            <strong>{isItalian ? "Ticket scelti" : "Selected tickets"}</strong>
            <span>
              {totalQuantity > 0
                ? `${totalQuantity} ${isItalian ? "posti" : "seats"}`
                : isItalian
                  ? "Da comporre"
                  : "To be composed"}
            </span>
          </div>
          <div className="timeline-step">
            <strong>{isItalian ? "Partecipanti completi" : "Completed attendees"}</strong>
            <span>
              {attendees.length > 0
                ? `${completedAttendees}/${attendees.length}`
                : isItalian
                  ? "In attesa"
                  : "Pending"}
            </span>
          </div>
          <div className="timeline-step">
            <strong>{isItalian ? "Modalità pagamento" : "Payment mode"}</strong>
            <span>{selectedModeMeta.label[isItalian ? "it" : "en"]}</span>
          </div>
          <div className="timeline-step">
            <strong>{isItalian ? "Esito previsto" : "Expected outcome"}</strong>
            <span>{selectedModeOutcome.status}</span>
          </div>
        </div>

        <div className="admin-note-list">
          {actionState?.ok ? (
            <div className="admin-note-item">
              <span className="spotlight-label">{isItalian ? "Creata ora" : "Just created"}</span>
              <strong>
                {createdRegistrationLabel} · {actionState.registrationStatus || selectedModeOutcome.status}
              </strong>
              <p>
                {isItalian
                  ? "La registrazione è entrata nella stessa coda organizer delle registrazioni pubbliche."
                  : "The registration is now inside the same organizer queue as public registrations."}
              </p>
            </div>
          ) : null}
          {duplicateRegistrations.length ? (
            <div className="admin-note-item">
              <span className="spotlight-label">{isItalian ? "Rischio duplicato" : "Duplicate risk"}</span>
              <strong>
                {duplicateRegistrations.length === 1
                  ? isItalian
                    ? "Esiste già una registrazione simile"
                    : "A similar registration already exists"
                  : isItalian
                    ? `Esistono già ${duplicateRegistrations.length} registrazioni simili`
                    : `${duplicateRegistrations.length} similar registrations already exist`}
              </strong>
              <p>
                {duplicateRegistrations
                  .map((registration) => `${registration.registrationCode} (${registration.status})`)
                  .join(", ")}
              </p>
            </div>
          ) : null}
          <div className="admin-note-item">
            <span className="spotlight-label">{isItalian ? "Incasso online" : "Online collection"}</span>
            <strong>{buildOccurrenceCollectionLabel(selectedOccurrence)}</strong>
            <p>
              {isItalian
                ? "Il payment step separerà online e saldo sul posto partendo da questo schema."
                : "The payment step will split online and due-at-venue totals from this exact scheme."}
            </p>
          </div>
          <div className="admin-note-item">
            <span className="spotlight-label">{isItalian ? "Questionario alimentare" : "Dietary questionnaire"}</span>
            <strong>
              {selectedEvent?.collectDietaryInfo === false
                ? isItalian
                  ? "Disattivo"
                  : "Disabled"
                : isItalian
                  ? "Attivo"
                  : "Enabled"}
            </strong>
            <p>
              {selectedEvent?.collectDietaryInfo === false
                ? isItalian
                  ? "Le card partecipante restano snelle e senza campi dietary."
                  : "Attendee cards stay lean and skip dietary fields."
                : isItalian
                  ? `${dietaryRequestCount} partecipanti con note o flag alimentari selezionati.`
                  : `${dietaryRequestCount} attendees currently carry dietary flags or notes.`}
            </p>
          </div>
          <div className="admin-note-item">
            <span className="spotlight-label">{isItalian ? "Conferma e incasso" : "Confirmation and settlement"}</span>
            <strong>{selectedModeMeta.label[isItalian ? "it" : "en"]}</strong>
            <p>{selectedModeOutcome.financialSummary}</p>
          </div>
          {leadAttendeeMissingFields.length ? (
            <div className="admin-note-item">
              <span className="spotlight-label">{isItalian ? "Lead contact" : "Lead contact"}</span>
              <strong>{isItalian ? "Il capogruppo non è ancora completo" : "The lead attendee is not complete yet"}</strong>
              <p>
                {isItalian
                  ? `Campi ancora aperti: ${leadAttendeeMissingFields.join(", ")}.`
                  : `Still open: ${leadAttendeeMissingFields.join(", ")}.`}
              </p>
            </div>
          ) : null}
        </div>

        <details className="admin-disclosure" open>
          <summary className="admin-disclosure-summary">
            {isItalian ? "Riepilogo ticket" : "Ticket summary"}
          </summary>
          <div className="timeline">
            {cartDetails.length ? (
              cartDetails.map((item) => (
                <div className="timeline-step" key={item.ticketCategoryId}>
                  <strong>
                    {item.label} x{item.quantity}
                  </strong>
                  <span>{item.subtotalLabel}</span>
                  <span>
                    {item.onlineAmountLabel} {isItalian ? "online" : "online"} ·{" "}
                    {item.dueAtEventLabel} {isItalian ? "sul posto" : "due at venue"}
                  </span>
                </div>
              ))
            ) : (
              <div className="timeline-step">
                <strong>{isItalian ? "Nessun ticket selezionato" : "No ticket selected"}</strong>
                <span>{isItalian ? "Builder in attesa" : "Builder pending"}</span>
              </div>
            )}
            <div className="timeline-step">
              <strong>{isItalian ? "Subtotal" : "Subtotal"}</strong>
              <span>{cartDetails.length ? currencyFormatter.format(quote.subtotal) : "—"}</span>
            </div>
            <div className="timeline-step">
              <strong>{isItalian ? "Online" : "Online"}</strong>
              <span>{cartDetails.length ? currencyFormatter.format(quote.onlineAmount) : "—"}</span>
            </div>
            <div className="timeline-step">
              <strong>{isItalian ? "Saldo sul posto" : "Due at venue"}</strong>
              <span>{cartDetails.length ? currencyFormatter.format(quote.dueAtEvent) : "—"}</span>
            </div>
          </div>
        </details>

        {attendees.length ? (
          <details className="admin-disclosure">
            <summary className="admin-disclosure-summary">
              {isItalian ? "Anteprima partecipanti" : "Attendee preview"}
            </summary>
            <div className="timeline">
              {attendees.map((attendee, index) => {
                const ticketLabel =
                  selectedTicketCategories.find(
                    (category) => category.id === attendee.ticketCategoryId
                  )?.label || "Ticket";

                return (
                  <div className="timeline-step" key={`${attendee.ticketCategoryId}-${index}`}>
                    <strong>
                      {[attendee.firstName, attendee.lastName].filter(Boolean).join(" ") ||
                        `${isItalian ? "Partecipante" : "Attendee"} ${index + 1}`}
                    </strong>
                    <span>{ticketLabel}</span>
                    <span>{attendee.email || (isItalian ? "Email in attesa" : "Email pending")}</span>
                  </div>
                );
              })}
            </div>
          </details>
        ) : null}

        {organizerNote.trim() ? (
          <details className="admin-disclosure">
            <summary className="admin-disclosure-summary">
              {isItalian ? "Nota operativa" : "Operating note"}
            </summary>
            <div className="admin-note-list">
              <div className="admin-note-item">
                <span className="spotlight-label">{isItalian ? "Nota interna" : "Internal note"}</span>
                <strong>{organizerNote.trim()}</strong>
              </div>
            </div>
          </details>
        ) : null}

        <div className="hero-actions">
          <Link className="button button-secondary" href={contextualRegistrationsHref}>
            {isItalian ? "Torna alla coda" : "Back to queue"}
          </Link>
        </div>
      </aside>
      </section>
    </form>
  );
}
