export const ORGANIZER_ADMIN_TOUR_EVENT = "passreserve:organizer-admin-tour:start";
export const ORGANIZER_ADMIN_TOUR_STORAGE_KEY = "passreserve.organizer-admin-tour";
export const ORGANIZER_ADMIN_TOUR_VERSION = "2026-04-27-organizer-admin-tour-v2";
export const ORGANIZER_ADMIN_TOUR_MODES = {
  SHOWCASE: "showcase",
  SETUP: "setup"
};

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

function buildQueryValueCondition(key, value) {
  return {
    type: "query-value",
    key,
    value
  };
}

function buildDefinition(labels, steps) {
  return {
    labels,
    localeOptions: buildLocaleOptions(),
    steps
  };
}

function buildItalianLabels() {
  return {
    next: "Avanti",
    previous: "Indietro",
    done: "Fine",
    skip: "Salta tour",
    replay: "Rivedi tour",
    language: "Lingua tour"
  };
}

function buildEnglishLabels() {
  return {
    next: "Next",
    previous: "Previous",
    done: "Finish",
    skip: "Skip tour",
    replay: "Replay tour",
    language: "Tour language"
  };
}

function buildItalianShowcaseSteps(slug) {
  return [
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
  ];
}

function buildEnglishShowcaseSteps(slug) {
  return [
    {
      id: "dashboard-overview",
      route: buildRoute(slug, "/dashboard"),
      target: '[data-organizer-tour="dashboard-overview"]',
      title: "This is your organizer console",
      description:
        "This is the single operational home for the organizer: today's priorities, quick actions, and the live state of the business.",
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
  ];
}

function buildItalianSetupSteps(slug) {
  return [
    {
      id: "setup-intro",
      route: buildRoute(slug, "/dashboard"),
      target: '[data-organizer-tour="dashboard-overview"]',
      title: "Questo e un setup guidato, non solo un tour",
      description:
        "Ti accompagna mentre lavori davvero. Compila i campi evidenziati, salva quando richiesto e Passreserve riprendera dal punto giusto anche dopo redirect e cambi pagina.",
      side: "bottom",
      align: "start"
    },
    {
      id: "setup-open-settings",
      route: buildRoute(slug, "/dashboard"),
      target: '[data-organizer-tour="nav-settings"]',
      title: "Apri Impostazioni per iniziare",
      description:
        "Usa questo tab per passare al setup organizer reale. Il tutorial continuera da li appena la pagina cambia.",
      side: "bottom",
      align: "center",
      advanceOn: "target-click"
    },
    {
      id: "setup-organization",
      route: buildRoute(slug, "/settings"),
      target: "#organization",
      title: "Compila profilo pubblico e location",
      description:
        "Inserisci nome organizer, tagline, copy bilingua, citta, contatti pubblici e venue primaria. Puoi scrivere nei campi mentre il focus resta attivo, poi premi Avanti quando questa sezione ti sembra pronta.",
      side: "right",
      align: "start"
    },
    {
      id: "setup-notifications",
      route: buildRoute(slug, "/settings"),
      target: "#notifications",
      title: "Definisci le regole operative di prenotazione",
      description:
        "Configura anticipo minimo, anticipo massimo e reminder. Questa sezione rende subito piu realistico il comportamento delle registrazioni future.",
      side: "top",
      align: "start"
    },
    {
      id: "setup-account",
      route: buildRoute(slug, "/settings"),
      target: "#account",
      title: "Allinea il contatto admin principale",
      description:
        "Aggiorna qui il nome e l'email della persona che usera davvero la console organizer. Quando hai finito, passa al salvataggio.",
      side: "top",
      align: "start"
    },
    {
      id: "setup-save-settings",
      route: buildRoute(slug, "/settings"),
      target: '[data-organizer-tour="settings-save"]',
      title: "Salva davvero queste impostazioni",
      description:
        "Usa questo pulsante per salvare il profilo organizer. Dopo il redirect, il setup riprendera automaticamente dal passo successivo.",
      side: "top",
      align: "end",
      advanceOn: "form-submit",
      advanceSelector: '[data-organizer-tour="settings-form"]',
      resumeWhen: buildQueryValueCondition("message", "saved")
    },
    {
      id: "setup-open-billing",
      route: buildRoute(slug, "/settings"),
      target: '[data-organizer-tour="settings-open-billing"]',
      title: "Apri Billing quando il profilo e pronto",
      description:
        "Questo bottone ti porta alla configurazione pagamenti. Il setup seguira il cambio pagina e continuera li.",
      side: "bottom",
      align: "start",
      advanceOn: "target-click"
    },
    {
      id: "setup-billing",
      route: buildRoute(slug, "/billing"),
      target: '[data-organizer-tour="billing-setup"]',
      title: "Collega Stripe adesso o annota il passaggio",
      description:
        "Se sei pronto puoi collegare Stripe da qui. Se preferisci finire prima il primo evento, vai pure avanti: il setup pagamenti resta facilmente raggiungibile dopo.",
      side: "bottom",
      align: "start"
    },
    {
      id: "setup-open-events",
      route: buildRoute(slug, "/billing"),
      target: '[data-organizer-tour="nav-events"]',
      title: "Passa ora alla creazione del primo evento",
      description:
        "Apri il tab Eventi. Appena la pagina si aggiorna, il setup ti portera dentro il form giusto.",
      side: "bottom",
      align: "center",
      advanceOn: "target-click"
    },
    {
      id: "setup-event-form",
      route: buildRoute(slug, "/events"),
      target: "#event-form",
      title: "Questo e il workspace del tuo primo evento",
      description:
        "Qui imposti l'evento una volta sola: struttura, ticket, contenuti e asset di pubblicazione. Scorreremo blocco per blocco con il focus sul form reale.",
      side: "top",
      align: "start"
    },
    {
      id: "setup-event-core",
      route: buildRoute(slug, "/events"),
      target: "#event-core",
      title: "Compila il core dell'evento",
      description:
        "Scrivi slug, categoria, visibilita, durata e regole vendita. Questa e la base che definisce il contenitore del primo evento.",
      side: "right",
      align: "start"
    },
    {
      id: "setup-event-tickets",
      route: buildRoute(slug, "/events"),
      target: "#event-tickets",
      title: "Configura almeno un ticket reale",
      description:
        "Crea il ticket o i ticket che vuoi vendere. Quantita, prezzi e logica del catalogo possono essere inseriti direttamente qui mentre il setup resta aperto.",
      side: "top",
      align: "start"
    },
    {
      id: "setup-event-copy",
      route: buildRoute(slug, "/events"),
      target: "#event-copy",
      title: "Scrivi il contenuto pubblico che andra live",
      description:
        "Titolo, summary, descrizione, audience, inclusioni e policy vivono qui. Compila le lingue che vuoi davvero pubblicare per il primo evento.",
      side: "top",
      align: "start"
    },
    {
      id: "setup-event-publish",
      route: buildRoute(slug, "/events"),
      target: "#event-publish",
      title: "Chiudi gli asset di pubblicazione",
      description:
        "Aggiungi mappa, note organizer e gallery reale. Questo e l'ultimo blocco prima del salvataggio finale dell'evento.",
      side: "top",
      align: "start"
    },
    {
      id: "setup-save-event",
      route: buildRoute(slug, "/events"),
      target: '[data-organizer-tour="event-save"]',
      title: "Crea davvero il primo evento",
      description:
        "Quando i blocchi sopra ti sembrano pronti, salva l'evento da qui. Il setup aspettera il redirect e poi ti confermera che l'evento e stato creato.",
      side: "top",
      align: "end",
      advanceOn: "form-submit",
      advanceSelector: '[data-organizer-tour="event-edit-form"]',
      resumeWhen: buildQueryValueCondition("message", "saved")
    },
    {
      id: "setup-event-created",
      route: buildRoute(slug, "/events"),
      target: '[data-organizer-tour="event-created-state"]',
      title: "Primo evento creato",
      description:
        "Perfetto. Ora hai un evento salvato dentro la console organizer. Da qui puoi aprire Programma per creare le date live oppure lanciare il tour panoramico se vuoi rivedere l'intero workspace.",
      side: "bottom",
      align: "start"
    }
  ];
}

function buildEnglishSetupSteps(slug) {
  return [
    {
      id: "setup-intro",
      route: buildRoute(slug, "/dashboard"),
      target: '[data-organizer-tour="dashboard-overview"]',
      title: "This is a guided setup, not just a walkthrough",
      description:
        "You can work for real while it stays on screen. Fill the highlighted fields, save when prompted, and Passreserve will resume from the right step after redirects and page changes.",
      side: "bottom",
      align: "start"
    },
    {
      id: "setup-open-settings",
      route: buildRoute(slug, "/dashboard"),
      target: '[data-organizer-tour="nav-settings"]',
      title: "Open Settings to begin",
      description:
        "Use this tab to move into the real organizer setup. The guided setup will continue there as soon as the page changes.",
      side: "bottom",
      align: "center",
      advanceOn: "target-click"
    },
    {
      id: "setup-organization",
      route: buildRoute(slug, "/settings"),
      target: "#organization",
      title: "Fill the public profile and location",
      description:
        "Enter the organizer name, tagline, bilingual copy, city, public contacts, and main venue. You can type directly into the form while the setup remains active, then press Next when this section feels ready.",
      side: "right",
      align: "start"
    },
    {
      id: "setup-notifications",
      route: buildRoute(slug, "/settings"),
      target: "#notifications",
      title: "Set the operational booking rules",
      description:
        "Configure the minimum notice, maximum notice, and reminder behavior. This gives future registrations a much more realistic default setup.",
      side: "top",
      align: "start"
    },
    {
      id: "setup-account",
      route: buildRoute(slug, "/settings"),
      target: "#account",
      title: "Align the main admin contact",
      description:
        "Update the name and email for the real person who will use the organizer console. Once that looks good, move into saving the page.",
      side: "top",
      align: "start"
    },
    {
      id: "setup-save-settings",
      route: buildRoute(slug, "/settings"),
      target: '[data-organizer-tour="settings-save"]',
      title: "Save these settings for real",
      description:
        "Use this button to save the organizer profile. After the redirect, the guided setup will resume automatically from the next step.",
      side: "top",
      align: "end",
      advanceOn: "form-submit",
      advanceSelector: '[data-organizer-tour="settings-form"]',
      resumeWhen: buildQueryValueCondition("message", "saved")
    },
    {
      id: "setup-open-billing",
      route: buildRoute(slug, "/settings"),
      target: '[data-organizer-tour="settings-open-billing"]',
      title: "Open Billing once the profile is ready",
      description:
        "This button takes you into payment setup. The guided flow will follow the page change and continue there.",
      side: "bottom",
      align: "start",
      advanceOn: "target-click"
    },
    {
      id: "setup-billing",
      route: buildRoute(slug, "/billing"),
      target: '[data-organizer-tour="billing-setup"]',
      title: "Connect Stripe now or note it for later",
      description:
        "If you are ready, you can connect Stripe here. If you would rather finish the first event first, continue anyway and come back to billing right after.",
      side: "bottom",
      align: "start"
    },
    {
      id: "setup-open-events",
      route: buildRoute(slug, "/billing"),
      target: '[data-organizer-tour="nav-events"]',
      title: "Move into first-event creation",
      description:
        "Open the Events tab. As soon as the page updates, the setup will continue inside the correct form.",
      side: "bottom",
      align: "center",
      advanceOn: "target-click"
    },
    {
      id: "setup-event-form",
      route: buildRoute(slug, "/events"),
      target: "#event-form",
      title: "This is the workspace for your first event",
      description:
        "This form is where the event is defined once: structure, tickets, public content, and publishing assets. We will move through it block by block on the real page.",
      side: "top",
      align: "start"
    },
    {
      id: "setup-event-core",
      route: buildRoute(slug, "/events"),
      target: "#event-core",
      title: "Complete the event core",
      description:
        "Fill in the slug, category, visibility, duration, and sales rules. This is the foundation for the first event container.",
      side: "right",
      align: "start"
    },
    {
      id: "setup-event-tickets",
      route: buildRoute(slug, "/events"),
      target: "#event-tickets",
      title: "Configure at least one real ticket",
      description:
        "Create the ticket or tickets you want to sell. Quantities, prices, and catalog logic can all be entered directly here while the setup stays active.",
      side: "top",
      align: "start"
    },
    {
      id: "setup-event-copy",
      route: buildRoute(slug, "/events"),
      target: "#event-copy",
      title: "Write the public content that will go live",
      description:
        "Titles, summaries, descriptions, audience notes, included items, and policies all live here. Fill the languages you actually want to publish for the first event.",
      side: "top",
      align: "start"
    },
    {
      id: "setup-event-publish",
      route: buildRoute(slug, "/events"),
      target: "#event-publish",
      title: "Finish the publishing assets",
      description:
        "Add the map, organizer notes, and real gallery. This is the last block before the final event save.",
      side: "top",
      align: "start"
    },
    {
      id: "setup-save-event",
      route: buildRoute(slug, "/events"),
      target: '[data-organizer-tour="event-save"]',
      title: "Create the first event for real",
      description:
        "When the sections above feel ready, save the event here. The guided setup will wait through the redirect and then confirm that the event was created.",
      side: "top",
      align: "end",
      advanceOn: "form-submit",
      advanceSelector: '[data-organizer-tour="event-edit-form"]',
      resumeWhen: buildQueryValueCondition("message", "saved")
    },
    {
      id: "setup-event-created",
      route: buildRoute(slug, "/events"),
      target: '[data-organizer-tour="event-created-state"]',
      title: "First event created",
      description:
        "Great. You now have a saved event inside the organizer console. From here you can open Schedule to create the live dates, or run the showcase mode if you want the broader product tour.",
      side: "bottom",
      align: "start"
    }
  ];
}

function getItalianDefinitions(slug) {
  const labels = buildItalianLabels();

  return {
    [ORGANIZER_ADMIN_TOUR_MODES.SHOWCASE]: buildDefinition(
      labels,
      buildItalianShowcaseSteps(slug)
    ),
    [ORGANIZER_ADMIN_TOUR_MODES.SETUP]: buildDefinition(labels, buildItalianSetupSteps(slug))
  };
}

function getEnglishDefinitions(slug) {
  const labels = buildEnglishLabels();

  return {
    [ORGANIZER_ADMIN_TOUR_MODES.SHOWCASE]: buildDefinition(
      labels,
      buildEnglishShowcaseSteps(slug)
    ),
    [ORGANIZER_ADMIN_TOUR_MODES.SETUP]: buildDefinition(labels, buildEnglishSetupSteps(slug))
  };
}

export function getOrganizerAdminTourDefinition({
  slug,
  locale,
  mode = ORGANIZER_ADMIN_TOUR_MODES.SHOWCASE
}) {
  const definitions = locale === "it" ? getItalianDefinitions(slug) : getEnglishDefinitions(slug);

  return definitions[mode] || definitions[ORGANIZER_ADMIN_TOUR_MODES.SHOWCASE];
}
