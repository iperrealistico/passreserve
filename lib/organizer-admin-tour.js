export const ORGANIZER_ADMIN_TOUR_EVENT = "passreserve:organizer-admin-tour:start";
export const ORGANIZER_ADMIN_TOUR_STORAGE_KEY = "passreserve.organizer-admin-tour";
export const ORGANIZER_ADMIN_TOUR_VERSION = "2026-04-27-organizer-admin-tour-v1";

function buildRoute(slug, suffix) {
  return `/${slug}/admin${suffix}`;
}

function buildLocaleOptions() {
  return [
    {
      value: "it",
      label: "Italiano",
      shortLabel: "IT"
    },
    {
      value: "en",
      label: "English",
      shortLabel: "EN"
    }
  ];
}

function getItalianCopy(slug) {
  return {
    labels: {
      next: "Avanti",
      previous: "Indietro",
      done: "Fine",
      skip: "Salta tour",
      replay: "Rivedi tour",
      language: "Lingua tour"
    },
    localeOptions: buildLocaleOptions(),
    steps: [
      {
        id: "dashboard-overview",
        route: buildRoute(slug, "/dashboard"),
        target: '[data-organizer-tour="dashboard-overview"]',
        title: "Questa e la tua console organizer",
        description:
          "Qui hai il punto operativo unico: priorita del giorno, scorciatoie verso date, registrazioni e stato generale dell'organizer.",
        side: "bottom",
        align: "start"
      },
      {
        id: "dashboard-priorities",
        route: buildRoute(slug, "/dashboard"),
        target: '[data-organizer-tour="dashboard-priorities"]',
        title: "Apri subito cio che richiede attenzione",
        description:
          "Queste card ti portano direttamente alle aree piu urgenti: calendario, pagamenti e partecipanti con note operative.",
        side: "bottom",
        align: "center"
      },
      {
        id: "settings-navigation",
        route: buildRoute(slug, "/settings"),
        target: '[data-organizer-tour="settings-navigation"]',
        title: "Parti da Impostazioni",
        description:
          "Il setup iniziale vive qui: profilo pubblico, regole di prenotazione, contatto admin e collegamento al billing.",
        side: "bottom",
        align: "start"
      },
      {
        id: "settings-organization",
        route: buildRoute(slug, "/settings"),
        target: "#organization",
        title: "Completa il profilo pubblico",
        description:
          "Aggiorna nome, tagline, location e contenuti bilingua. Italiano e English sono indipendenti: puoi pubblicare una lingua sola e lasciare il fallback all'altra.",
        side: "right",
        align: "start"
      },
      {
        id: "settings-account",
        route: buildRoute(slug, "/settings"),
        target: "#account",
        title: "Tieni allineato il contatto admin",
        description:
          "Qui aggiorni la persona di riferimento organizer e il recapito operativo che il supporto e i flussi admin useranno davvero.",
        side: "top",
        align: "start"
      },
      {
        id: "billing-setup",
        route: buildRoute(slug, "/billing"),
        target: '[data-organizer-tour="billing-setup"]',
        title: "Attiva i pagamenti online quando sei pronto",
        description:
          "Collega Stripe da questa scheda, controlla charges e payouts, poi usa il refresh per verificare lo stato. Finche non e pronto puoi continuare con eventi gratuiti o pay-at-event.",
        side: "bottom",
        align: "start"
      },
      {
        id: "event-core",
        route: buildRoute(slug, "/events"),
        target: "#event-core",
        title: "Crea l'ossatura dell'evento",
        description:
          "Qui definisci slug, visibilita, regole di vendita e pricing di base. Questo e il contenitore stabile dell'evento, non ancora la singola data prenotabile.",
        side: "right",
        align: "start"
      },
      {
        id: "event-tickets",
        route: buildRoute(slug, "/events"),
        target: "#event-tickets",
        title: "Configura il catalogo ticket",
        description:
          "Definisci il mix di ticket, quantita e logica di prezzo una volta sola, cosi le date future ereditano subito un catalogo coerente.",
        side: "top",
        align: "start"
      },
      {
        id: "event-copy",
        route: buildRoute(slug, "/events"),
        target: "#event-copy",
        title: "Scrivi i contenuti in italiano e inglese",
        description:
          "Titolo, summary, descrizione, audience e policy vivono qui. Compila solo le lingue che vuoi davvero pubblicare.",
        side: "top",
        align: "start"
      },
      {
        id: "event-publish",
        route: buildRoute(slug, "/events"),
        target: "#event-publish",
        title: "Rendi l'evento pronto alla pubblicazione",
        description:
          "Mappa, note organizer e gallery reale completano la scheda. Quando il contenitore evento e pronto, passi nel Programma per creare le date live.",
        side: "top",
        align: "start"
      },
      {
        id: "date-form",
        route: buildRoute(slug, "/calendar"),
        target: "#date-form",
        title: "Crea la singola data prenotabile",
        description:
          "Nel Programma trasformi l'evento in sessioni vere: orario, capienza, finestra di vendita e stato pubblicato della data.",
        side: "left",
        align: "start"
      },
      {
        id: "schedule-views",
        route: buildRoute(slug, "/calendar"),
        target: '[data-organizer-tour="schedule-views"]',
        title: "Controlla cosa e live nel calendario",
        description:
          "Usa viste e filtri per vedere bozze, date pubblicate e capienze a rischio. Da qui torni rapidamente a modificare una sessione.",
        side: "top",
        align: "start"
      },
      {
        id: "registrations-queue",
        route: buildRoute(slug, "/registrations"),
        target: '[data-organizer-tour="registrations-queue"]',
        title: "Gestisci partecipanti e follow-up",
        description:
          "Questa e la coda operativa: filtri per focus, cambi vista, controlli pagamenti e arrivi alla modalita evento per il check-in dal vivo.",
        side: "bottom",
        align: "start"
      },
      {
        id: "tour-replay",
        route: buildRoute(slug, "/dashboard"),
        target: '[data-organizer-tour="dashboard-tour-replay"]',
        title: "Puoi riaprire il tour quando vuoi",
        description:
          "Se salti qualcosa o vuoi rinfrescarti il flusso, usa questo pulsante dalla dashboard organizer per ripartire da capo.",
        side: "bottom",
        align: "end"
      }
    ]
  };
}

function getEnglishCopy(slug) {
  return {
    labels: {
      next: "Next",
      previous: "Previous",
      done: "Finish",
      skip: "Skip tour",
      replay: "Replay tour",
      language: "Tour language"
    },
    localeOptions: buildLocaleOptions(),
    steps: [
      {
        id: "dashboard-overview",
        route: buildRoute(slug, "/dashboard"),
        target: '[data-organizer-tour="dashboard-overview"]',
        title: "This is your organizer console",
        description:
          "This is the single operational home for the organizer: today’s priorities, quick actions, and the live state of the business.",
        side: "bottom",
        align: "start"
      },
      {
        id: "dashboard-priorities",
        route: buildRoute(slug, "/dashboard"),
        target: '[data-organizer-tour="dashboard-priorities"]',
        title: "Jump straight into what needs attention",
        description:
          "These cards take you directly to the areas that usually matter first: schedule, payment follow-up, and participants with operational notes.",
        side: "bottom",
        align: "center"
      },
      {
        id: "settings-navigation",
        route: buildRoute(slug, "/settings"),
        target: '[data-organizer-tour="settings-navigation"]',
        title: "Start from Settings",
        description:
          "Initial setup lives here: public profile, booking rules, admin contact, and the bridge into billing.",
        side: "bottom",
        align: "start"
      },
      {
        id: "settings-organization",
        route: buildRoute(slug, "/settings"),
        target: "#organization",
        title: "Complete the public organizer profile",
        description:
          "Update name, tagline, location, and bilingual public content here. Italian and English stay independent, so one language can safely fall back to the other.",
        side: "right",
        align: "start"
      },
      {
        id: "settings-account",
        route: buildRoute(slug, "/settings"),
        target: "#account",
        title: "Keep the primary admin contact current",
        description:
          "This is where you maintain the real organizer contact that support and admin-side workflows should rely on.",
        side: "top",
        align: "start"
      },
      {
        id: "billing-setup",
        route: buildRoute(slug, "/billing"),
        target: '[data-organizer-tour="billing-setup"]',
        title: "Turn on online payments when you are ready",
        description:
          "Connect Stripe here, check charges and payouts, and refresh status once onboarding is complete. Until then, you can still run free or pay-at-event dates.",
        side: "bottom",
        align: "start"
      },
      {
        id: "event-core",
        route: buildRoute(slug, "/events"),
        target: "#event-core",
        title: "Create the core event container",
        description:
          "Define the slug, visibility, sales rules, and baseline pricing here. This is the reusable event definition, not the individual bookable date yet.",
        side: "right",
        align: "start"
      },
      {
        id: "event-tickets",
        route: buildRoute(slug, "/events"),
        target: "#event-tickets",
        title: "Build the ticket catalog once",
        description:
          "Set up the ticket mix and pricing logic here so future dates inherit a consistent offer from the start.",
        side: "top",
        align: "start"
      },
      {
        id: "event-copy",
        route: buildRoute(slug, "/events"),
        target: "#event-copy",
        title: "Write the event in Italian and English",
        description:
          "Titles, summaries, descriptions, audience notes, and policies live here. Fill only the languages you actually want to publish.",
        side: "top",
        align: "start"
      },
      {
        id: "event-publish",
        route: buildRoute(slug, "/events"),
        target: "#event-publish",
        title: "Make the event publication-ready",
        description:
          "Map links, organizer notes, and the real gallery complete the event. Once the event container is ready, move into Schedule to create the live dates.",
        side: "top",
        align: "start"
      },
      {
        id: "date-form",
        route: buildRoute(slug, "/calendar"),
        target: "#date-form",
        title: "Create the bookable date",
        description:
          "Schedule is where an event becomes real inventory: start time, capacity, sales window, and whether the date is published or still draft-only.",
        side: "left",
        align: "start"
      },
      {
        id: "schedule-views",
        route: buildRoute(slug, "/calendar"),
        target: '[data-organizer-tour="schedule-views"]',
        title: "Check what is live on the calendar",
        description:
          "Use views and filters to scan draft dates, published dates, and capacity risk, then jump back into editing any occurrence.",
        side: "top",
        align: "start"
      },
      {
        id: "registrations-queue",
        route: buildRoute(slug, "/registrations"),
        target: '[data-organizer-tour="registrations-queue"]',
        title: "Run participant operations from here",
        description:
          "This queue is where you work registrations day to day: filter by focus, change the view, follow up on payments, and switch into event-day mode for live check-in.",
        side: "bottom",
        align: "start"
      },
      {
        id: "tour-replay",
        route: buildRoute(slug, "/dashboard"),
        target: '[data-organizer-tour="dashboard-tour-replay"]',
        title: "You can reopen the tour any time",
        description:
          "If you skip it now or want a refresher later, use this button from the organizer dashboard to replay the full flow.",
        side: "bottom",
        align: "end"
      }
    ]
  };
}

export function getOrganizerAdminTourDefinition({ slug, locale }) {
  return locale === "it" ? getItalianCopy(slug) : getEnglishCopy(slug);
}
