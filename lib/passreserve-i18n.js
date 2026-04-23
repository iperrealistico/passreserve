import { cookies, headers } from "next/headers";

import { getDietaryFlagLabel as resolveDietaryFlagLabel } from "./passreserve-dietary.js";
import {
  DEFAULT_LOCALE,
  PASSRESERVE_LOCALE_COOKIE,
  SUPPORTED_LOCALES
} from "./passreserve-locales.js";

const dictionaries = {
  en: {
    languageLabel: "Language",
    locales: {
      en: "English",
      it: "Italiano"
    },
    meta: {
      title: "Passreserve.com",
      description:
        "Minimal event registration software for organizers. Publish clear event pages, manage dates, collect registrations, and keep the guest journey free from marketplace clutter."
    },
    nav: {
      discover: "Discover",
      events: "Events",
      about: "About",
      organizerAccess: "Organizer access",
      admin: "Admin",
      hostPage: "Organizer page",
      faq: "FAQ"
    },
    home: {
      eyebrow: "Passreserve",
      title: "Minimal registration flows for real-world events.",
      summary:
        "Browse public events on the left. Manage dates, payments, and registrations on the right with a calmer admin experience.",
      attendeeLabel: "For attendees",
      attendeeTitle: "Find an event that feels easy to trust.",
      attendeeSummary:
        "Search by city, organizer, or format and land on a clean event page with dates, pricing, and venue details already in view.",
      attendeeCta: "Browse events",
      organizerLabel: "For organizers",
      organizerTitle: "Operate events with Airbnb-level clarity.",
      organizerSummary:
        "Launch a page, manage dates, payments, attendees, and health checks from one responsive console built for real teams.",
      organizerCta: "Open organizer access",
      requestCta: "Request access",
      storyLink: "What is Passreserve?",
      supportTitle: "What Passreserve improves",
      supportItems: [
        "Cleaner event pages with less template noise.",
        "Registration windows that respect operational constraints.",
        "Attendee data, restrictions, and payment status in one queue."
      ]
    },
    about: {
      title: "A calmer way to publish and operate events.",
      summary:
        "Passreserve is built for organizers who want public pages and admin tools to feel clear, lightweight, and trustworthy.",
      sections: {
        attendees: "For attendees",
        organizers: "For organizers",
        compare: "Why it feels different",
        faq: "FAQ"
      },
      finalCta: "Browse live events"
    },
    events: {
      eyebrow: "Event discovery",
      title: "Search by city, organizer, or format.",
      summary:
        "Open any event to review dates, availability, venue details, and payment rules before registration starts.",
      inputLabel: "Search events",
      inputPlaceholder: "Try Bologna, retreat, tasting, family, studio…",
      resultsLabel: "results",
      openEvent: "Open event",
      openOrganizer: "Open organizer",
      emptyTitle: "No events match that search yet.",
      emptySummary: "Try a city, an organizer name, or a format like workshop, dinner, retreat, or family."
    },
    organizer: {
      events: "Events",
      dates: "Dates",
      venue: "Venue",
      contact: "Contact",
      agenda: "Upcoming dates",
      faq: "FAQ",
      cta: "Register now",
      emailOrganizer: "Email organizer"
    },
    event: {
      details: "Event details",
      dates: "Choose a date",
      pricing: "Pricing",
      included: "Included",
      policies: "Policies",
      register: "Register",
      hostPage: "Organizer page",
      audience: "Best for",
      soldOut: "Sold out",
      noDates: "No public dates yet"
    },
    registration: {
      eyebrow: "Registration",
      title: "Complete the required attendee questionnaire.",
      summary:
        "Select the date, confirm the ticket, and complete the required participant details before the hold is created.",
      steps: {
        occurrence: "Date",
        ticket: "Ticket",
        attendees: "Participants",
        review: "Review"
      },
      leadAttendee: "Lead attendee",
      participant: "Participant",
      firstName: "First name",
      lastName: "Last name",
      address: "Address",
      phone: "Phone",
      email: "Email",
      dietary: "Dietary restrictions",
      dietaryOther: "Other dietary notes",
      dietaryPlaceholder: "Optional notes about allergies, intolerances, or menu requests",
      continue: "Continue",
      back: "Back",
      createHold: "Create registration hold",
      summaryCard: "Registration summary",
      quantity: "Quantity",
      blocked: "Registration is not available for this date.",
      missingParticipants: "Complete all participant details before continuing."
    },
    admin: {
      platformTitle: "Platform team",
      organizerTitle: "Organizer admin",
      overview: "Overview",
      today: "Today",
      calendar: "Calendar",
      events: "Events",
      dates: "Dates",
      registrations: "Registrations",
      billing: "Billing",
      settings: "Settings",
      organizers: "Organizers",
      about: "About",
      emails: "Emails",
      logs: "Logs",
      health: "Health",
      signOut: "Sign out",
      publicPage: "Public page",
      localeHint: "Interface language"
    },
    email: {
      deliveryLogs: "Delivery Logs",
      inbox: "Inbox",
      templateEditor: "Template Editor",
      outboundOnly:
        "Outbound email is supported. Inbound mailbox handling is not implemented in this release."
    },
    health: {
      title: "Operational readiness",
      storage: "Storage mode",
      stripe: "Stripe readiness",
      email: "Email readiness",
      inbound: "Inbound email",
      outboundOnly: "Outbound only"
    }
  },
  it: {
    languageLabel: "Lingua",
    locales: {
      en: "English",
      it: "Italiano"
    },
    meta: {
      title: "Passreserve.com",
      description:
        "Software minimale per registrazioni eventi. Pubblica pagine evento chiare, gestisci date, registrazioni e operatività senza il rumore di un marketplace."
    },
    nav: {
      discover: "Scopri",
      events: "Eventi",
      about: "Chi siamo",
      organizerAccess: "Accesso organizer",
      admin: "Admin",
      hostPage: "Pagina organizer",
      faq: "FAQ"
    },
    home: {
      eyebrow: "Passreserve",
      title: "Flussi di registrazione minimali per eventi reali.",
      summary:
        "A sinistra esplori gli eventi pubblici. A destra gestisci operatività, date, pagamenti e registrazioni con un'area admin molto più calma.",
      attendeeLabel: "Per chi partecipa",
      attendeeTitle: "Trova un evento che ispiri fiducia al primo sguardo.",
      attendeeSummary:
        "Cerca per città, organizer o formato e atterra su una pagina evento pulita con date, prezzi e dettagli venue già chiari.",
      attendeeCta: "Esplora eventi",
      organizerLabel: "Per organizer",
      organizerTitle: "Gestisci eventi con chiarezza da livello Airbnb.",
      organizerSummary:
        "Pubblica una pagina, gestisci date, pagamenti, partecipanti e controlli di salute da una console responsive pensata per team reali.",
      organizerCta: "Apri accesso organizer",
      requestCta: "Richiedi accesso",
      storyLink: "Cos'e Passreserve?",
      supportTitle: "Cosa migliora Passreserve",
      supportItems: [
        "Pagine evento più pulite e senza immagini template intrusive.",
        "Finestre di vendita coerenti con i vincoli operativi.",
        "Dati partecipanti, restrizioni e stato pagamenti nella stessa coda."
      ]
    },
    about: {
      title: "Un modo più calmo per pubblicare e gestire eventi.",
      summary:
        "Passreserve è pensato per organizer che vogliono pagine pubbliche e strumenti operativi chiari, leggeri e credibili.",
      sections: {
        attendees: "Per chi partecipa",
        organizers: "Per organizer",
        compare: "Perché è diverso",
        faq: "FAQ"
      },
      finalCta: "Esplora gli eventi"
    },
    events: {
      eyebrow: "Scoperta eventi",
      title: "Cerca per città, organizer o formato.",
      summary:
        "Apri un evento per vedere date, disponibilità, venue e regole di pagamento prima di iniziare la registrazione.",
      inputLabel: "Cerca eventi",
      inputPlaceholder: "Prova Bologna, retreat, tasting, family, studio…",
      resultsLabel: "risultati",
      openEvent: "Apri evento",
      openOrganizer: "Apri organizer",
      emptyTitle: "Nessun evento corrisponde ancora a questa ricerca.",
      emptySummary:
        "Prova con una città, il nome di un organizer o un formato come workshop, cena, retreat o family."
    },
    organizer: {
      events: "Eventi",
      dates: "Date",
      venue: "Venue",
      contact: "Contatti",
      agenda: "Date in arrivo",
      faq: "FAQ",
      cta: "Registrati ora",
      emailOrganizer: "Scrivi all'organizer"
    },
    event: {
      details: "Dettagli evento",
      dates: "Scegli una data",
      pricing: "Prezzi",
      included: "Incluso",
      policies: "Policy",
      register: "Registrati",
      hostPage: "Pagina organizer",
      audience: "Ideale per",
      soldOut: "Sold out",
      noDates: "Nessuna data pubblica"
    },
    registration: {
      eyebrow: "Registrazione",
      title: "Completa il questionario obbligatorio dei partecipanti.",
      summary:
        "Seleziona la data, conferma il ticket e compila i dati richiesti per ogni partecipante prima di creare la hold.",
      steps: {
        occurrence: "Data",
        ticket: "Ticket",
        attendees: "Partecipanti",
        review: "Riepilogo"
      },
      leadAttendee: "Partecipante principale",
      participant: "Partecipante",
      firstName: "Nome",
      lastName: "Cognome",
      address: "Indirizzo",
      phone: "Telefono",
      email: "Email",
      dietary: "Restrizioni alimentari",
      dietaryOther: "Altre note alimentari",
      dietaryPlaceholder: "Note opzionali su allergie, intolleranze o richieste menu",
      continue: "Continua",
      back: "Indietro",
      createHold: "Crea hold registrazione",
      summaryCard: "Riepilogo registrazione",
      quantity: "Quantità",
      blocked: "La registrazione non è disponibile per questa data.",
      missingParticipants: "Completa i dati di tutti i partecipanti prima di continuare."
    },
    admin: {
      platformTitle: "Team piattaforma",
      organizerTitle: "Admin organizer",
      overview: "Panoramica",
      today: "Oggi",
      calendar: "Calendario",
      events: "Eventi",
      dates: "Date",
      registrations: "Registrazioni",
      billing: "Billing",
      settings: "Impostazioni",
      organizers: "Organizer",
      about: "Chi siamo",
      emails: "Email",
      logs: "Log",
      health: "Health",
      signOut: "Esci",
      publicPage: "Pagina pubblica",
      localeHint: "Lingua interfaccia"
    },
    email: {
      deliveryLogs: "Log invii",
      inbox: "Inbox",
      templateEditor: "Editor template",
      outboundOnly:
        "L'invio email in uscita è supportato. La ricezione email in ingresso non è implementata in questa release."
    },
    health: {
      title: "Stato operativo",
      storage: "Modalità storage",
      stripe: "Prontezza Stripe",
      email: "Prontezza email",
      inbound: "Email in ingresso",
      outboundOnly: "Solo uscita"
    }
  }
};

export function normalizeLocale(locale) {
  if (!locale) {
    return DEFAULT_LOCALE;
  }

  const normalized = String(locale).trim().toLowerCase().slice(0, 2);
  return SUPPORTED_LOCALES.includes(normalized) ? normalized : DEFAULT_LOCALE;
}

function resolveAcceptLanguage(headerValue) {
  if (!headerValue) {
    return DEFAULT_LOCALE;
  }

  const preferred = String(headerValue)
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim())
    .map(normalizeLocale)
    .find((locale) => SUPPORTED_LOCALES.includes(locale));

  return preferred || DEFAULT_LOCALE;
}

export async function getRequestLocale() {
  const cookieStore = await cookies();
  const cookieLocale = normalizeLocale(cookieStore.get(PASSRESERVE_LOCALE_COOKIE)?.value);

  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale;
  }

  const headerStore = await headers();
  return resolveAcceptLanguage(headerStore.get("accept-language"));
}

export function getDictionary(locale = DEFAULT_LOCALE) {
  return dictionaries[normalizeLocale(locale)];
}

export async function getTranslations() {
  const locale = await getRequestLocale();
  return {
    locale,
    dictionary: getDictionary(locale)
  };
}

export function getDietaryFlagLabel(flagId, locale = DEFAULT_LOCALE) {
  return resolveDietaryFlagLabel(flagId, normalizeLocale(locale));
}

export function getLocalizedSiteMetadata(locale = DEFAULT_LOCALE) {
  const dictionary = getDictionary(locale);

  return {
    metadataBase: new URL("https://passreserve.com"),
    title: {
      default: dictionary.meta.title,
      template: `%s | ${dictionary.meta.title}`
    },
    description: dictionary.meta.description,
    applicationName: dictionary.meta.title,
    openGraph: {
      title: dictionary.meta.title,
      description: dictionary.meta.description,
      siteName: dictionary.meta.title,
      type: "website",
      locale: normalizeLocale(locale) === "it" ? "it_IT" : "en_US"
    },
    twitter: {
      card: "summary_large_image",
      title: dictionary.meta.title,
      description: dictionary.meta.description
    },
    manifest: "/site.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
        { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
        { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
        { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" }
      ],
      shortcut: ["/favicon.ico"],
      apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }]
    }
  };
}
