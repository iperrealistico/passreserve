import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Globe2,
  LayoutDashboard,
  MailCheck,
  MapPin,
  Settings2,
  ShieldCheck,
  Ticket,
  Users
} from "lucide-react";

import { PublicFooter } from "../public-footer.js";
import { getTranslations } from "../../lib/passreserve-i18n.js";

export const dynamic = "force-dynamic";

function getAboutContent(isItalian) {
  if (isItalian) {
    return {
      metaTitle: "About Passreserve.com",
      metaDescription:
        "Passreserve è un sistema di registrazione eventi più calmo, pensato per organizer locali che vogliono pagine pubbliche chiare e operatività semplice.",
      backLabel: "Torna a Passreserve",
      hero: {
        title: "Il sistema di registrazione eventi costruito per organizer locali.",
        subtitle: "Pensato per eventi reali. Non per marketplace rumorosi.",
        description:
          "Passreserve mette in ordine ciò che conta: pagina organizer, pagina evento, calendario date, questionario partecipanti, pagamenti e operatività. Meno vetrina, più chiarezza.",
        attendeeCta: "Vai alla home",
        organizerCta: "Apri accesso organizer",
        image: "/images/about/passreserve-hero.png"
      },
      whatIs: {
        title: "Cos'è Passreserve?",
        paragraphs: [
          "Passreserve è una piattaforma di registrazione per eventi locali costruita attorno a organizer, date pubblicate e flussi di iscrizione essenziali. Invece di trasformare tutto in una parete di card, rende chiari luogo, calendario, disponibilità e prossimi passi.",
          "Che tu stia gestendo workshop, cene, esperienze family, retreat o piccoli formati culturali, Passreserve ti aiuta a pubblicare una pagina diretta, raccogliere i dati giusti e seguire registrazioni e pagamenti senza rumore inutile."
        ],
        whyBuiltTitle: "Perché lo abbiamo costruito",
        whyBuiltParagraph:
          "Molti strumenti per eventi sono o troppo generici o troppo orientati al marketing. Passreserve nasce per dare agli organizer locali una pagina pubblica leggibile e un backend operativo che faccia emergere date, restrizioni e stato delle registrazioni al primo sguardo.",
        whoUsesTitle: "Per chi funziona meglio",
        whoUsesList: [
          "Organizer indipendenti con date ricorrenti o piccoli calendari stagionali",
          "Venue che vogliono una pagina evento molto più diretta del solito",
          "Team che devono vedere subito partecipanti, restrizioni e stato dei pagamenti",
          "Format con posti limitati e chiusure vendita legate a una finestra temporale",
          "Esperienze locali che hanno bisogno di chiarezza, non di un feed social",
          "Organizzazioni che vogliono usare sia italiano sia inglese nello stesso sistema"
        ],
        image: "/images/about/passreserve-discovery.png"
      },
      attendees: {
        title: "Come si registra un partecipante con Passreserve",
        intro:
          "Il flow pubblico resta corto e molto leggibile. Nessun rumore, nessuna immagine template invasiva, nessun dubbio su dove andare dopo.",
        steps: [
          {
            title: "Scegli organizer o evento",
            description:
              "Si parte da una pagina pubblica molto netta, dove calendario, luogo e formati pubblicati sono immediatamente visibili."
          },
          {
            title: "Seleziona la data giusta",
            description:
              "Le date disponibili mostrano prezzo, capienza, note operative e blocchi di vendita se la finestra è chiusa."
          },
          {
            title: "Compila il questionario obbligatorio",
            description:
              "Per ogni partecipante vengono raccolti nome, cognome, indirizzo, telefono, email e eventuali intolleranze o richieste alimentari."
          },
          {
            title: "Conferma e paga se previsto",
            description:
              "Il sistema invia la conferma email e, se l'evento la richiede, apre il passaggio di pagamento senza spezzare il flusso."
          }
        ],
        image: "/images/about/passreserve-questionnaire.png"
      },
      confirmation: {
        title: "Conferma registrazione con verifica email",
        intro:
          "Per tenere pulite le registrazioni e ridurre errori o richieste incomplete, Passreserve usa una conferma esplicita prima di chiudere il posto.",
        steps: [
          "La richiesta crea un hold temporaneo sul posto",
          "Arriva una email di conferma con link dedicato",
          "L'utente rivede i dati e conferma",
          "La registrazione entra in stato confermato o passa al pagamento"
        ],
        codeTitle: "Codice registrazione",
        codeDescription:
          "Ogni conferma può essere tracciata con un codice univoco utile al team che gestisce l'evento e alle verifiche in venue.",
        image: "/images/about/passreserve-confirmation.png"
      },
      organizers: {
        title: "Backend operativo per organizer e team",
        intro:
          "Il backend segue lo stesso principio delle pagine pubbliche: meno superfetazioni, più segnali utili. Date, registrazioni, pagamenti e restrizioni alimentari sono leggibili subito.",
        features: [
          {
            title: "Today dashboard",
            description:
              "Una panoramica operativa immediata con registrazioni attive, stati di pagamento, partecipanti con restrizioni e richieste da seguire.",
            bullets: [
              "conteggio registrazioni e check essenziali",
              "persone con allergie o intolleranze visibili subito",
              "azioni rapide per team piccoli"
            ],
            image: "/images/about/passreserve-dashboard.png"
          },
          {
            title: "Calendar e date",
            description:
              "Ogni evento ha un calendario chiaro, override per singola data e finestre di vendita che impediscono registrazioni fuori tempo.",
            bullets: [
              "date pubblicate e capienza in ordine cronologico",
              "finestre vendita per evento o singola data",
              "messaggi chiari quando una data non è più acquistabile"
            ],
            image: "/images/about/passreserve-calendar.png"
          },
          {
            title: "Registrazioni e dati partecipanti",
            description:
              "Le registrazioni non sono solo un nome e una mail. Il team vede i partecipanti, i contatti, le restrizioni e lo stato economico nello stesso flusso.",
            bullets: [
              "dati completi per ogni partecipante",
              "allergie standard e note libere separate",
              "pagamenti e promemoria accanto alla registrazione"
            ],
            image: "/images/about/passreserve-operations.png"
          }
        ],
        settingsTitle: "Impostazioni che restano leggibili",
        settingsIntro:
          "Le impostazioni sono state pensate per essere usate davvero da un organizer, non solo configurate una volta.",
        settings: [
          {
            title: "Vendita e disponibilità",
            description: "Finestre di vendita, anticipo minimo e regole per bloccare la registrazione oltre una certa data."
          },
          {
            title: "Pagamenti",
            description: "Nessun prepay, acconto o pagamento completo online, con copy pubblico coerente su ogni evento."
          },
          {
            title: "Email",
            description: "Log di delivery, template e stato operativo visibile senza fingere una inbox inbound che non esiste."
          },
          {
            title: "Lingua interfaccia",
            description: "Italiano e inglese su frontend e backend, con rilevamento automatico e persistenza della preferenza."
          }
        ]
      },
      comparison: {
        title: "Passreserve vs strumenti eventi generici",
        intro:
          "L'obiettivo non è fare più feature di tutti. È far emergere le informazioni giuste nel momento giusto, per chi organizza e per chi si registra.",
        headers: ["Sistema", "Esperienza pubblica", "Operatività", "Dati partecipanti", "Fit"],
        rows: [
          ["Marketplace ticketing", "Molto promozionale", "Sparsa tra moduli", "Spesso minima", "Eventi di massa"],
          ["CMS + form + fogli", "Personalizzabile ma fragile", "Molto manuale", "Dipende dal setup", "Piccoli team adattivi"],
          ["Passreserve", "Diretta e calendario-first", "Un solo flusso", "Strutturati per partecipante", "Organizer locali"]
        ],
        problemsTitle: "Dove gli strumenti generici si rompono",
        problems: [
          {
            title: "Pagine troppo social",
            description: "Spesso l'evento sembra un post promozionale, non una pagina operativa con date e regole leggibili."
          },
          {
            title: "Backend senza priorità visive",
            description: "Tab e impostazioni non segnalano cosa è attivo, cosa è urgente o cosa richiede un follow-up immediato."
          },
          {
            title: "Questionari deboli",
            description: "Dati partecipanti, allergie e note alimentari restano fuori dal sistema o finiscono in campi troppo generici."
          }
        ],
        image: "/images/about/passreserve-discovery.png"
      },
      different: {
        title: "Perché Passreserve si sente diverso",
        noCatchTitle: "Niente template rumorosi",
        noCatchParagraphs: [
          "La pagina pubblica deve aiutare a decidere, non a distrarre.",
          "Per questo Passreserve privilegia titolo, calendario, venue, prezzo e passaggi successivi."
        ],
        howWeTitle: "Cosa rimane intenzionale",
        howWeParagraphs: [
          "Ogni superficie pubblica e admin viene ridotta finché non resta quasi solo ciò che serve per compiere un'azione.",
          "Questo porta a meno scrolling inutile, meno ambiguità e una lettura più vicina a un sistema di prenotazione che a un mini social network."
        ],
        bulletsTitle: "Elementi che mettiamo in evidenza",
        bullets: [
          "date disponibili e date chiuse",
          "stato pagamento e registrazione",
          "venue e istruzioni essenziali",
          "partecipanti e restrizioni alimentari",
          "azioni operative in una sola colonna logica"
        ],
        image: "/images/about/passreserve-dashboard.png"
      },
      setup: {
        title: "Lancio operativo in 4 step",
        intro:
          "L'attivazione è semplice: si imposta l'organizer, si pubblicano gli eventi, si aprono le date e si condivide il link.",
        steps: [
          {
            duration: "1 min",
            title: "Richiedi accesso",
            description: "Il team apre l'account e prepara la base del tuo spazio organizer."
          },
          {
            duration: "2 min",
            title: "Aggiungi eventi",
            description: "Definisci titolo, riepilogo, venue, prezzi e tipo di pagamento."
          },
          {
            duration: "2 min",
            title: "Pubblica date",
            description: "Aggiungi calendario, capienza, note e finestra di vendita per ciascuna data."
          },
          {
            duration: "30 sec",
            title: "Condividi il link",
            description: "La pagina organizer è pronta per sito, Google Business Profile, email o QR in venue."
          }
        ],
        image: "/images/about/passreserve-calendar.png"
      },
      availability: {
        title: "Disponibilità e finestre vendita senza ambiguità",
        intro:
          "Passreserve combina capienza, pubblicazione e finestra di vendita per mostrare solo ciò che è davvero registrabile.",
        formula: "Posti visibili = capienza - registrazioni confermate",
        features: [
          {
            title: "Chiusura automatica",
            description: "Una data può chiudersi in automatico quando la finestra vendita finisce."
          },
          {
            title: "Override per singola data",
            description: "Ogni occurrence può avere regole diverse rispetto all'evento principale."
          },
          {
            title: "Messaggi chiari",
            description: "L'utente capisce subito se una data è sold out, chiusa o non ancora aperta."
          }
        ],
        image: "/images/about/passreserve-calendar.png"
      },
      niche: {
        title: "Pensato per format locali e calendari reali",
        intro:
          "Passreserve lavora bene quando il calendario conta più del feed e quando il team deve operare con poche persone ma con informazioni affidabili.",
        sections: [
          {
            title: "Ottimo per",
            bullets: [
              "workshop, tasting e cene con posti limitati",
              "retreat e format con raccolta dati per partecipante",
              "famiglie di eventi ricorrenti su venue locali"
            ]
          },
          {
            title: "Mantiene visibile",
            bullets: [
              "luogo e note venue",
              "calendario pubblicato",
              "stato economico e restrizioni"
            ]
          }
        ],
        image: "/images/about/passreserve-operations.png"
      },
      faq: {
        title: "FAQ",
        attendeesTitle: "Per chi partecipa",
        organizersTitle: "Per organizer",
        items: {
          attendees: [
            {
              question: "Devo scegliere una data specifica prima di registrarmi?",
              answer: "Sì. La registrazione parte sempre da una data concreta, così prezzo, disponibilità e note restano chiare."
            },
            {
              question: "Posso vedere subito se ci sono restrizioni o blocchi?",
              answer: "Sì. Se la vendita è chiusa o la data non è più acquistabile, il messaggio è esplicito nella pagina evento."
            },
            {
              question: "Perché vengono chiesti i dati di tutti i partecipanti?",
              answer: "Perché l'organizer possa gestire correttamente l'evento, i contatti e le eventuali esigenze alimentari."
            }
          ],
          organizers: [
            {
              question: "Posso usare sia italiano sia inglese?",
              answer: "Sì. Frontend, backend ed email possono seguire la lingua rilevata o quella scelta dall'utente."
            },
            {
              question: "Posso chiudere le vendite prima dell'evento?",
              answer: "Sì. Puoi impostare una finestra vendita a livello evento e fare override per una singola data."
            },
            {
              question: "Le allergie dei partecipanti restano visibili nel backend?",
              answer: "Sì. Sono aggregate nella dashboard e mostrate anche nel dettaglio delle registrazioni."
            }
          ]
        }
      },
      cta: {
        title: "Provalo dalla parte giusta",
        attendeeTitle: "Vuoi vedere come funziona lato pubblico?",
        attendeeDescription:
          "Apri la home e prova il flow minimale: organizer, pagina evento, date disponibili e registrazione.",
        attendeeCta: "Vai alla home",
        organizerTitle: "Vuoi usare Passreserve per i tuoi eventi?",
        organizerDescription:
          "Richiedi accesso e configura un backend più chiaro per date, partecipanti, pagamenti e note operative.",
        organizerCta: "Apri accesso organizer",
        image: "/images/about/passreserve-hero.png"
      },
      footer: "Passreserve.com - sistema di registrazione eventi per organizer locali"
    };
  }

  return {
    metaTitle: "About Passreserve.com",
    metaDescription:
      "Passreserve is a calmer event registration system for local organizers who want direct public pages and operationally clear admin tools.",
    backLabel: "Back to Passreserve",
    hero: {
      title: "The event registration system built for local organizers.",
      subtitle: "Built for real events. Not noisy marketplaces.",
      description:
        "Passreserve brings the essentials into one flow: organizer page, event page, published dates, attendee questionnaire, payments, and operations. Less theatre, more clarity.",
      attendeeCta: "Go to home",
      organizerCta: "Open organizer access",
      image: "/images/about/passreserve-hero.png"
    },
    whatIs: {
      title: "What is Passreserve?",
      paragraphs: [
        "Passreserve is an event registration platform built around local organizers, published dates, and direct sign-up flows. Instead of turning everything into a wall of cards, it keeps venue, calendar, availability, and next steps in view.",
        "Whether you are running workshops, dinners, family formats, retreats, or small cultural events, Passreserve helps you publish a direct page, collect the right attendee data, and follow registrations and payments without unnecessary noise."
      ],
      whyBuiltTitle: "Why we built Passreserve",
      whyBuiltParagraph:
        "Many event tools are either too generic or too marketing-driven. Passreserve was built to give local organizers a readable public page and an operational backend where dates, dietary restrictions, and registration status are visible at first glance.",
      whoUsesTitle: "Who it fits best",
      whoUsesList: [
        "Independent organizers with recurring dates or small seasonal calendars",
        "Venues that want a much more direct event page",
        "Teams that need participants, restrictions, and payment status in one place",
        "Formats with limited seats and sales windows tied to real operational deadlines",
        "Local experiences that need clarity instead of social-style presentation",
        "Organizations that want both Italian and English in the same system"
      ],
      image: "/images/about/passreserve-discovery.png"
    },
    attendees: {
      title: "How attendee registration works in Passreserve",
      intro:
        "The public flow stays short and readable. No noisy template imagery, no ambiguous next step, no bloated event pages.",
      steps: [
        {
          title: "Choose an organizer or event",
          description:
            "The public page starts from a very clear surface where the calendar, venue, and published formats are immediately visible."
        },
        {
          title: "Pick the right date",
          description:
            "Available dates show price, capacity, operational notes, and blocked sales if the registration window is closed."
        },
        {
          title: "Complete the required questionnaire",
          description:
            "For each attendee we collect first name, last name, address, phone, email, and any dietary restrictions or custom food notes."
        },
        {
          title: "Confirm and pay when needed",
          description:
            "The system sends the confirmation email and, when required, opens the payment step without breaking the flow."
        }
      ],
      image: "/images/about/passreserve-questionnaire.png"
    },
    confirmation: {
      title: "Registration confirmation with email verification",
      intro:
        "To keep registrations clean and reduce incomplete requests, Passreserve asks for an explicit confirmation before the seat is fully locked.",
      steps: [
        "The request creates a temporary hold on the seat",
        "A confirmation email arrives with a dedicated link",
        "The attendee reviews the data and confirms",
        "The registration becomes confirmed or moves into payment"
      ],
      codeTitle: "Registration code",
      codeDescription:
        "Each confirmed registration can be tracked with a unique code that helps both the event team and venue-side checks.",
      image: "/images/about/passreserve-confirmation.png"
    },
    organizers: {
      title: "Operational backend for organizers and teams",
      intro:
        "The backend follows the same principle as the public pages: less decoration, more useful signals. Dates, registrations, payments, and dietary restrictions are readable immediately.",
      features: [
        {
          title: "Today dashboard",
          description:
            "An operational overview with active registrations, payment status, attendees with restrictions, and follow-ups that need attention.",
          bullets: [
            "registration counts and essential checks",
            "people with allergies or intolerances visible right away",
            "quick actions for small teams"
          ],
          image: "/images/about/passreserve-dashboard.png"
        },
        {
          title: "Calendar and dates",
          description:
            "Every event has a clear calendar, per-date overrides, and sales windows that stop registrations when the window is over.",
          bullets: [
            "published dates and capacity in chronological order",
            "sales windows at event or single-date level",
            "clear messaging when a date is no longer purchasable"
          ],
          image: "/images/about/passreserve-calendar.png"
        },
        {
          title: "Registrations and attendee data",
          description:
            "A registration is not just a name and an email. The team sees participants, contacts, dietary needs, and payment state in one flow.",
          bullets: [
            "full data for every participant",
            "standard allergies and custom notes kept separate",
            "payments and reminders next to the registration"
          ],
          image: "/images/about/passreserve-operations.png"
        }
      ],
      settingsTitle: "Settings that stay readable",
      settingsIntro:
        "Settings are meant to be used by organizers, not just configured once and forgotten.",
      settings: [
        {
          title: "Sales and availability",
          description: "Sales windows, minimum lead time, and rules to stop registrations beyond a specific date."
        },
        {
          title: "Payments",
          description: "No online prepay, deposit, or full online collection, with consistent public copy on every event."
        },
        {
          title: "Email",
          description: "Delivery logs, templates, and explicit operational status without pretending inbound mailbox support exists."
        },
        {
          title: "Interface language",
          description: "Italian and English on public pages, backend, and emails, with automatic detection and saved preference."
        }
      ]
    },
    comparison: {
      title: "Passreserve vs generic event tools",
      intro:
        "The goal is not to have more features than everyone else. It is to make the right information visible at the right moment for both organizers and attendees.",
      headers: ["System", "Public experience", "Operations", "Attendee data", "Fit"],
      rows: [
        ["Ticketing marketplaces", "Highly promotional", "Split across modules", "Often minimal", "Large-scale event discovery"],
        ["CMS + forms + spreadsheets", "Flexible but fragile", "Mostly manual", "Depends on setup", "Adaptive small teams"],
        ["Passreserve", "Direct and calendar-first", "One flow", "Structured per attendee", "Local organizers"]
      ],
      problemsTitle: "Where generic tools break down",
      problems: [
        {
          title: "Pages become too social",
          description: "The event starts to feel like a promotional post instead of an operational page with readable dates and rules."
        },
        {
          title: "Backends lack visual priorities",
          description: "Tabs and settings fail to show what is active, what is urgent, and what needs immediate follow-up."
        },
        {
          title: "Weak attendee questionnaires",
          description: "Participant data, allergies, and food notes end up outside the system or inside vague free-text fields."
        }
      ],
      image: "/images/about/passreserve-discovery.png"
    },
    different: {
      title: "Why Passreserve feels different",
      noCatchTitle: "No noisy templates",
      noCatchParagraphs: [
        "The public page should help someone decide, not distract them.",
        "That is why Passreserve privileges title, calendar, venue, price, and next steps."
      ],
      howWeTitle: "What stays intentional",
      howWeParagraphs: [
        "Every public and admin surface is reduced until only the information that helps an action remains.",
        "That creates less wasted scrolling, less ambiguity, and a reading experience closer to a booking system than a mini social network."
      ],
      bulletsTitle: "What we keep visible",
      bullets: [
        "available dates and closed dates",
        "payment and registration status",
        "venue and essential instructions",
        "participants and dietary restrictions",
        "operational actions in one logical flow"
      ],
      image: "/images/about/passreserve-dashboard.png"
    },
    setup: {
      title: "Operational launch in 4 steps",
      intro:
        "Activation is straightforward: set up the organizer, publish the events, open the dates, and share the link.",
      steps: [
        {
          duration: "1 min",
          title: "Request access",
          description: "The team opens the account and prepares the base organizer workspace."
        },
        {
          duration: "2 min",
          title: "Add events",
          description: "Define title, summary, venue, prices, and the payment model."
        },
        {
          duration: "2 min",
          title: "Publish dates",
          description: "Add the calendar, capacity, notes, and the sales window for each date."
        },
        {
          duration: "30 sec",
          title: "Share the link",
          description: "The organizer page is ready for your site, Google Business Profile, email signature, or venue QR code."
        }
      ],
      image: "/images/about/passreserve-calendar.png"
    },
    availability: {
      title: "Availability and sales windows without ambiguity",
      intro:
        "Passreserve combines capacity, publication state, and sales windows so that people only see what is actually registrable.",
      formula: "Visible seats = capacity - confirmed registrations",
      features: [
        {
          title: "Automatic closing",
          description: "A date can close automatically when its sales window expires."
        },
        {
          title: "Per-date override",
          description: "Each occurrence can use rules that differ from the parent event."
        },
        {
          title: "Clear messages",
          description: "The attendee understands immediately whether a date is sold out, closed, or not open yet."
        }
      ],
      image: "/images/about/passreserve-calendar.png"
    },
    niche: {
      title: "Built for local formats and real calendars",
      intro:
        "Passreserve works best when the calendar matters more than the feed and when a small team still needs reliable operational context.",
      sections: [
        {
          title: "Strong fit for",
          bullets: [
            "workshops, tastings, and dinners with limited seats",
            "retreats and formats that need per-attendee data capture",
            "families of recurring events around local venues"
          ]
        },
        {
          title: "Keeps visible",
          bullets: [
            "venue and venue notes",
            "published calendar",
            "economic state and dietary restrictions"
          ]
        }
      ],
      image: "/images/about/passreserve-operations.png"
    },
    faq: {
      title: "FAQ",
      attendeesTitle: "For attendees",
      organizersTitle: "For organizers",
      items: {
        attendees: [
          {
            question: "Do I need to choose a specific date before registering?",
            answer: "Yes. Registration always starts from a concrete date so pricing, availability, and notes stay clear."
          },
          {
            question: "Can I immediately see if a date is blocked or unavailable?",
            answer: "Yes. If sales are closed or a date is no longer purchasable, the event page makes it explicit."
          },
          {
            question: "Why does Passreserve ask for every attendee's details?",
            answer: "So the organizer can manage the event properly, contact the group, and handle any dietary requirements."
          }
        ],
        organizers: [
          {
            question: "Can I use both Italian and English?",
            answer: "Yes. Public pages, backend, and attendee emails can follow the detected or selected language."
          },
          {
            question: "Can I close sales before the event date?",
            answer: "Yes. You can define a sales window at event level and override it on a single date."
          },
          {
            question: "Do attendee allergies stay visible in the backend?",
            answer: "Yes. They are aggregated in the dashboard and shown inside each registration detail."
          }
        ]
      }
    },
    cta: {
      title: "Try it from the right side",
      attendeeTitle: "Want to see the public flow?",
      attendeeDescription:
        "Open the homepage and try the minimal path: organizer, event page, available dates, and registration.",
      attendeeCta: "Go to home",
      organizerTitle: "Want Passreserve for your events?",
      organizerDescription:
        "Request access and configure a calmer backend for dates, participants, payments, and operational notes.",
      organizerCta: "Open organizer access",
      image: "/images/about/passreserve-hero.png"
    },
    footer: "Passreserve.com - event registration software for local organizers"
  };
}

function AboutImage({ alt, src, className = "" }) {
  return (
    <img
      alt={alt}
      className={`w-full rounded-3xl border border-gray-200 shadow-xl ${className}`.trim()}
      src={src}
    />
  );
}

function StepCard({ description, index, title }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="mb-4 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-900 text-lg font-semibold text-white">
          {index + 1}
        </div>
        <div className="pt-2">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        </div>
      </div>
      <p className="pl-16 text-base leading-7 text-gray-600">{description}</p>
    </div>
  );
}

function FeatureBlock({ description, image, imageAlt, reverse = false, title, bullets = [] }) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2">
      <div className={reverse ? "lg:order-2" : ""}>
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold text-gray-900">{title}</h3>
          <p className="text-lg leading-8 text-gray-600">{description}</p>
          <ul className="space-y-3 pt-2">
            {bullets.map((bullet) => (
              <li className="flex items-start gap-3" key={bullet}>
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#244231]" />
                <span className="text-gray-600">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={reverse ? "lg:order-1" : ""}>
        <AboutImage alt={imageAlt} src={image} />
      </div>
    </div>
  );
}

export async function generateMetadata() {
  const { locale } = await getTranslations();
  const content = getAboutContent(locale === "it");

  return {
    title: content.metaTitle,
    description: content.metaDescription
  };
}

export default async function AboutPage() {
  const { locale, dictionary } = await getTranslations();
  const isItalian = locale === "it";
  const content = getAboutContent(isItalian);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/92 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            href="/"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{content.backLabel}</span>
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(36,66,49,0.08),transparent_30rem)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-2">
          <div className="relative space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
                {content.hero.title}
              </h1>
              <p className="text-xl font-medium text-gray-500 md:text-2xl">
                {content.hero.subtitle}
              </p>
            </div>
            <p className="max-w-xl text-lg leading-8 text-gray-600">{content.hero.description}</p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                className="inline-flex h-14 items-center justify-center gap-3 whitespace-nowrap rounded-2xl bg-gray-900 px-6 text-base font-semibold text-white transition hover:bg-gray-800 sm:px-8 sm:text-lg"
                href="/"
              >
                <Ticket className="h-5 w-5 shrink-0" />
                <span>{content.hero.attendeeCta}</span>
                <ArrowRight className="h-5 w-5 shrink-0" />
              </Link>
              <Link
                className="inline-flex h-14 items-center justify-center gap-3 whitespace-nowrap rounded-2xl border-2 border-gray-200 px-6 text-base font-medium text-gray-900 transition hover:border-gray-300 hover:bg-gray-50 sm:px-8 sm:text-lg"
                href="/admin/login"
              >
                <LayoutDashboard className="h-5 w-5 shrink-0" />
                <span>{content.hero.organizerCta}</span>
              </Link>
            </div>
          </div>
          <div className="hidden lg:block">
            <AboutImage alt="Passreserve interface overview" src={content.hero.image} />
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-8 text-3xl font-semibold text-gray-900 md:text-4xl">
            {content.whatIs.title}
          </h2>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="space-y-6">
              {content.whatIs.paragraphs.map((paragraph) => (
                <p className="text-lg leading-8 text-gray-600" key={paragraph}>
                  {paragraph}
                </p>
              ))}
              <div className="pt-4">
                <h3 className="mb-4 text-2xl font-semibold text-gray-900">
                  {content.whatIs.whyBuiltTitle}
                </h3>
                <p className="text-lg leading-8 text-gray-600">
                  {content.whatIs.whyBuiltParagraph}
                </p>
              </div>
            </div>
            <div className="space-y-8">
              <AboutImage alt="Passreserve discovery surface" src={content.whatIs.image} />
              <div className="rounded-3xl bg-gray-50 p-6">
                <h3 className="mb-4 text-xl font-semibold text-gray-900">
                  {content.whatIs.whoUsesTitle}
                </h3>
                <ul className="space-y-3">
                  {content.whatIs.whoUsesList.map((item) => (
                    <li className="flex items-start gap-3" key={item}>
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#244231]" />
                      <span className="text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-semibold text-gray-900 md:text-4xl">
              {content.attendees.title}
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-gray-600">{content.attendees.intro}</p>
          </div>
          <div className="mb-12 grid gap-8 md:grid-cols-2">
            {content.attendees.steps.map((step, index) => (
              <StepCard
                description={step.description}
                index={index}
                key={step.title}
                title={step.title}
              />
            ))}
          </div>
          <div className="mb-20">
            <AboutImage alt="Passreserve attendee questionnaire" src={content.attendees.image} />
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm md:p-12">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <div className="mb-6 flex items-center gap-4">
                  <div className="rounded-2xl bg-[#ecf5ef] p-3">
                    <ShieldCheck className="h-6 w-6 text-[#244231]" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {content.confirmation.title}
                  </h3>
                </div>
                <p className="mb-8 text-lg text-gray-600">{content.confirmation.intro}</p>
                <div className="mb-8 grid grid-cols-2 gap-4">
                  {content.confirmation.steps.map((step, index) => (
                    <div className="rounded-2xl bg-gray-50 p-4 text-center" key={step}>
                      <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
                        {index + 1}
                      </div>
                      <p className="text-xs leading-5 text-gray-600">{step}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-4 rounded-2xl bg-[#eef4ff] p-6">
                  <MailCheck className="mt-1 h-6 w-6 shrink-0 text-[#234a85]" />
                  <div>
                    <h4 className="mb-1 font-semibold text-gray-900">
                      {content.confirmation.codeTitle}
                    </h4>
                    <p className="text-sm leading-6 text-gray-600">
                      {content.confirmation.codeDescription}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <AboutImage
                  alt="Passreserve registration confirmation"
                  src={content.confirmation.image}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-semibold text-gray-900 md:text-4xl">
              {content.organizers.title}
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-gray-600">{content.organizers.intro}</p>
          </div>
          <div className="space-y-12">
            {content.organizers.features.map((feature, index) => (
              <FeatureBlock
                bullets={feature.bullets}
                description={feature.description}
                image={feature.image}
                imageAlt={feature.title}
                key={feature.title}
                reverse={index % 2 === 1}
                title={feature.title}
              />
            ))}
          </div>

          <div className="mt-20 rounded-3xl bg-gray-50 p-8 md:p-12">
            <div className="mb-8 flex items-center gap-4">
              <div className="rounded-2xl bg-gray-200 p-3">
                <Settings2 className="h-6 w-6 text-gray-700" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {content.organizers.settingsTitle}
                </h3>
                <p className="text-gray-600">{content.organizers.settingsIntro}</p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {content.organizers.settings.map((section) => (
                <div className="rounded-2xl bg-white p-6 shadow-sm" key={section.title}>
                  <h4 className="mb-2 font-semibold text-gray-900">{section.title}</h4>
                  <p className="text-sm leading-6 text-gray-600">{section.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-semibold text-gray-900 md:text-4xl">
              {content.comparison.title}
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-gray-600">{content.comparison.intro}</p>
          </div>

          <div className="mb-16 overflow-x-auto">
            <table className="w-full overflow-hidden rounded-3xl bg-white shadow-sm">
              <thead>
                <tr className="bg-gray-100">
                  {content.comparison.headers.map((header) => (
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900" key={header}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {content.comparison.rows.map((row) => {
                  const isPassreserve = row[0] === "Passreserve";

                  return (
                    <tr className={`border-t border-gray-100 ${isPassreserve ? "bg-[#ecf5ef]" : ""}`} key={row[0]}>
                      {row.map((cell) => (
                        <td
                          className={`px-6 py-4 text-sm ${isPassreserve ? "font-semibold text-[#244231]" : "text-gray-600"}`}
                          key={`${row[0]}-${cell}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mb-16">
            <AboutImage alt="Passreserve public discovery" src={content.comparison.image} />
          </div>

          <div>
            <h3 className="mb-8 text-center text-2xl font-semibold text-gray-900">
              {content.comparison.problemsTitle}
            </h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {content.comparison.problems.map((problem) => (
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm" key={problem.title}>
                  <h4 className="mb-3 text-lg font-semibold text-gray-900">{problem.title}</h4>
                  <p className="text-sm leading-6 text-gray-600">{problem.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-[#ecf5ef] p-4">
                  <Globe2 className="h-8 w-8 text-[#244231]" />
                </div>
                <h2 className="text-3xl font-semibold text-gray-900 md:text-4xl">
                  {content.different.title}
                </h2>
              </div>

              <div className="rounded-3xl border border-[#d8eadf] bg-[#f3faf6] p-6">
                <h3 className="mb-4 text-xl font-semibold text-[#244231]">
                  {content.different.noCatchTitle}
                </h3>
                {content.different.noCatchParagraphs.map((paragraph) => (
                  <p className="mb-3 leading-7 text-[#345b45] last:mb-0" key={paragraph}>
                    {paragraph}
                  </p>
                ))}
              </div>

              <div>
                <h3 className="mb-4 text-xl font-semibold text-gray-900">
                  {content.different.howWeTitle}
                </h3>
                {content.different.howWeParagraphs.map((paragraph) => (
                  <p className="mb-3 leading-7 text-gray-600 last:mb-0" key={paragraph}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <AboutImage alt="Passreserve admin surface" src={content.different.image} />
              <div className="rounded-3xl bg-gray-50 p-6">
                <h3 className="mb-4 text-xl font-semibold text-gray-900">
                  {content.different.bulletsTitle}
                </h3>
                <ul className="space-y-3">
                  {content.different.bullets.map((bullet) => (
                    <li className="flex items-start gap-3" key={bullet}>
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#244231]" />
                      <span className="text-gray-600">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-3">
              <div className="rounded-2xl bg-gray-900 p-3">
                <Ticket className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-3xl font-semibold text-gray-900 md:text-4xl">
                {content.setup.title}
              </h2>
            </div>
            <p className="mx-auto max-w-3xl text-xl text-gray-600">{content.setup.intro}</p>
          </div>

          <div className="mb-12 grid gap-6 md:grid-cols-4">
            {content.setup.steps.map((step, index) => (
              <div className="relative rounded-3xl border border-gray-100 bg-white p-6 shadow-sm" key={step.title}>
                <div className="absolute -left-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 font-semibold text-white">
                  {index + 1}
                </div>
                <div className="pt-4">
                  <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                    <Clock3 className="h-4 w-4" />
                    <span>{step.duration}</span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">{step.title}</h3>
                  <p className="text-sm leading-6 text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-20">
            <AboutImage alt="Passreserve setup and calendar" src={content.setup.image} />
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm md:p-12">
            <div className="mb-8 grid items-center gap-12 lg:grid-cols-2">
              <div>
                <div className="mb-6 flex items-center gap-4">
                  <div className="rounded-2xl bg-[#eef4ff] p-3">
                    <CalendarDays className="h-6 w-6 text-[#234a85]" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {content.availability.title}
                  </h3>
                </div>
                <p className="mb-8 text-lg text-gray-600">{content.availability.intro}</p>
                <div className="rounded-2xl bg-gray-900 px-6 py-4 text-center font-mono text-lg text-white">
                  {content.availability.formula}
                </div>
              </div>
              <div>
                <AboutImage alt="Passreserve calendar management" src={content.availability.image} />
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {content.availability.features.map((feature) => (
                <div className="rounded-2xl bg-gray-50 p-6" key={feature.title}>
                  <h4 className="mb-2 font-semibold text-gray-900">{feature.title}</h4>
                  <p className="text-sm leading-6 text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-semibold text-gray-900 md:text-4xl">
                {content.niche.title}
              </h2>
              <p className="text-lg leading-8 text-gray-600">{content.niche.intro}</p>
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                {content.niche.sections.map((section) => (
                  <div className="rounded-3xl bg-gray-50 p-6" key={section.title}>
                    <h3 className="mb-4 text-xl font-semibold text-gray-900">{section.title}</h3>
                    <ul className="space-y-3">
                      {section.bullets.map((bullet) => (
                        <li className="flex items-start gap-3" key={bullet}>
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#244231]" />
                          <span className="text-gray-600">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <AboutImage alt="Passreserve operations panel" src={content.niche.image} />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-semibold text-gray-900 md:text-4xl">{content.faq.title}</h2>
          </div>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-[#fff4e8] p-2">
                  <Users className="h-5 w-5 text-[#9a5b18]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{content.faq.attendeesTitle}</h3>
              </div>
              <div className="space-y-4">
                {content.faq.items.attendees.map((item) => (
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm" key={item.question}>
                    <h4 className="mb-2 font-semibold text-gray-900">{item.question}</h4>
                    <p className="text-sm leading-6 text-gray-600">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-[#eef4ff] p-2">
                  <MapPin className="h-5 w-5 text-[#234a85]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{content.faq.organizersTitle}</h3>
              </div>
              <div className="space-y-4">
                {content.faq.items.organizers.map((item) => (
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm" key={item.question}>
                    <h4 className="mb-2 font-semibold text-gray-900">{item.question}</h4>
                    <p className="text-sm leading-6 text-gray-600">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-semibold text-gray-900 md:text-4xl">
            {content.cta.title}
          </h2>
          <div className="mb-12">
            <AboutImage alt="Passreserve overview" src={content.cta.image} />
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex flex-col rounded-3xl bg-gray-900 p-8 text-white">
              <h3 className="mb-4 text-2xl font-semibold text-white">{content.cta.attendeeTitle}</h3>
              <p className="mb-6 flex-1 text-gray-300">{content.cta.attendeeDescription}</p>
              <Link
                className="inline-flex h-14 w-full items-center justify-center gap-3 whitespace-nowrap rounded-2xl bg-white px-6 text-base font-semibold text-gray-900 transition hover:bg-gray-100 sm:text-lg"
                href="/"
              >
                <span>{content.cta.attendeeCta}</span>
                <ArrowRight className="h-5 w-5 shrink-0" />
              </Link>
            </div>
            <div className="flex flex-col rounded-3xl bg-[#244231] p-8 text-white">
              <h3 className="mb-4 text-2xl font-semibold text-white">{content.cta.organizerTitle}</h3>
              <p className="mb-6 flex-1 text-[#d7e4dc]">{content.cta.organizerDescription}</p>
              <Link
                className="inline-flex h-14 w-full items-center justify-center gap-3 whitespace-nowrap rounded-2xl bg-white px-6 text-base font-semibold text-[#244231] transition hover:bg-[#f3f6f4] sm:text-lg"
                href="/admin/login"
              >
                <span>{content.cta.organizerCta}</span>
                <ArrowRight className="h-5 w-5 shrink-0" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-6">
        <PublicFooter dictionary={dictionary} locale={locale} />
      </div>
    </main>
  );
}
