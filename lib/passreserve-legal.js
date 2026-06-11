import { SESSION_COOKIE_NAME } from "./passreserve-config.js";
import { PASSRESERVE_LOCALE_COOKIE } from "./passreserve-locales.js";

export const LEGAL_DOCUMENT_VERSION = "2026-06-10";
export const COOKIE_CONSENT_VERSION = LEGAL_DOCUMENT_VERSION;
export const COOKIE_CONSENT_COOKIE = "passreserve_cookie_consent";
export const COOKIE_CONSENT_MAX_AGE = 60 * 60 * 24 * 180;

export const PASSRESERVE_LEGAL_ENTITY = {
  businessName: "Leonardo Fiori",
  vatNumber: "IT02639600465",
  addressLine: "Via Nicola Raffaelli 2",
  cityLine: "55020 Fosciandora (LU), Italia",
  country: "Italia"
};

export const COOKIE_CATEGORIES = ["necessary", "preferences", "analytics", "marketing"];

export function buildDefaultCookieConsent() {
  return {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    preferences: false,
    analytics: false,
    marketing: false,
    updatedAt: ""
  };
}

export function normalizeCookieConsent(input) {
  const defaults = buildDefaultCookieConsent();

  if (!input || typeof input !== "object") {
    return defaults;
  }

  return {
    version:
      typeof input.version === "string" && input.version.trim()
        ? input.version.trim()
        : defaults.version,
    necessary: true,
    preferences: input.preferences === true,
    analytics: input.analytics === true,
    marketing: input.marketing === true,
    updatedAt:
      typeof input.updatedAt === "string" && input.updatedAt.trim()
        ? input.updatedAt.trim()
        : defaults.updatedAt
  };
}

export function serializeCookieConsentValue(input) {
  const consent = normalizeCookieConsent(input);
  const value = {
    v: consent.version,
    p: consent.preferences ? 1 : 0,
    a: consent.analytics ? 1 : 0,
    m: consent.marketing ? 1 : 0,
    t: consent.updatedAt || new Date().toISOString()
  };

  return encodeURIComponent(JSON.stringify(value));
}

export function parseCookieConsentValue(rawValue) {
  if (!rawValue || typeof rawValue !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue));
    return normalizeCookieConsent({
      version: parsed.v,
      preferences: parsed.p === 1,
      analytics: parsed.a === 1,
      marketing: parsed.m === 1,
      updatedAt: parsed.t
    });
  } catch {
    return null;
  }
}

export function buildClientCookieString(
  name,
  value,
  {
    maxAge = COOKIE_CONSENT_MAX_AGE,
    path = "/",
    sameSite = "Lax",
    secure = typeof window !== "undefined" && window.location.protocol === "https:"
  } = {}
) {
  const parts = [
    `${name}=${value}`,
    `path=${path}`,
    `max-age=${Math.max(0, Number(maxAge || 0))}`,
    `samesite=${sameSite}`
  ];

  if (secure) {
    parts.push("secure");
  }

  return parts.join("; ");
}

export function getLegalLinkLabels(locale = "en") {
  if (locale === "it") {
    return {
      privacy: "Privacy",
      cookiePolicy: "Cookie",
      terms: "Termini",
      manageCookies: "Gestisci cookie"
    };
  }

  return {
    privacy: "Privacy",
    cookiePolicy: "Cookies",
    terms: "Terms",
    manageCookies: "Manage cookies"
  };
}

export function getLegalLinks(locale = "en") {
  const labels = getLegalLinkLabels(locale);

  return [
    {
      href: "/privacy",
      label: labels.privacy
    },
    {
      href: "/cookie-policy",
      label: labels.cookiePolicy
    },
    {
      href: "/terms",
      label: labels.terms
    }
  ];
}

function buildAddressLine(locale = "en") {
  if (locale === "it") {
    return `${PASSRESERVE_LEGAL_ENTITY.addressLine}, ${PASSRESERVE_LEGAL_ENTITY.cityLine}`;
  }

  return `${PASSRESERVE_LEGAL_ENTITY.addressLine}, ${PASSRESERVE_LEGAL_ENTITY.cityLine}`;
}

function buildCommonCookieRows(locale = "en") {
  const necessaryLabel = locale === "it" ? "Necessario" : "Necessary";
  const browserStorageLabel =
    locale === "it" ? "Cookie / storage di prima parte" : "First-party cookie / storage";
  const functionalPurpose =
    locale === "it"
      ? "Autenticazione admin, sicurezza, continuità del booking, lingua selezionata, salvataggio preferenze cookie."
      : "Admin authentication, security, booking continuity, selected language, and saved cookie preferences.";

  return [
    {
      name: SESSION_COOKIE_NAME,
      provider: "Passreserve.com",
      category: necessaryLabel,
      duration: locale === "it" ? "Sessione" : "Session",
      storage: browserStorageLabel,
      purpose:
        locale === "it"
          ? "Mantiene la sessione autenticata per organizer e admin piattaforma."
          : "Keeps organizer and platform-admin sessions authenticated."
    },
    {
      name: PASSRESERVE_LOCALE_COOKIE,
      provider: "Passreserve.com",
      category: necessaryLabel,
      duration: locale === "it" ? "12 mesi" : "12 months",
      storage: browserStorageLabel,
      purpose:
        locale === "it"
          ? "Ricorda la lingua scelta dall’utente per mostrare l’interfaccia corretta."
          : "Remembers the language expressly selected by the user."
    },
    {
      name: COOKIE_CONSENT_COOKIE,
      provider: "Passreserve.com",
      category: necessaryLabel,
      duration: locale === "it" ? "6 mesi" : "6 months",
      storage: browserStorageLabel,
      purpose:
        locale === "it"
          ? "Memorizza le preferenze sui cookie per non riproporre il banner a ogni visita."
          : "Stores cookie preferences so the banner is not shown on every visit."
    },
    {
      name: locale === "it" ? "Storage browser locale" : "Local browser storage",
      provider: "Passreserve.com",
      category: necessaryLabel,
      duration: locale === "it" ? "Variabile" : "Variable",
      storage: locale === "it" ? "Storage browser di prima parte" : "First-party browser storage",
      purpose: functionalPurpose
    }
  ];
}

const legalDocuments = {
  en: {
    privacy: {
      title: "Privacy Notice",
      summary:
        "This notice explains how Passreserve.com processes personal data when people browse the site, request organizer access, manage organizer accounts, create registrations, and complete payments through connected organizer Stripe accounts.",
      lastUpdatedLabel: "Last updated 10 June 2026",
      sections: [
        {
          title: "1. Data controller",
          paragraphs: [
            `The operator of Passreserve.com is ${PASSRESERVE_LEGAL_ENTITY.businessName}, VAT ${PASSRESERVE_LEGAL_ENTITY.vatNumber}, with registered office at ${buildAddressLine("en")}.`,
            "For the purposes described in this notice, Passreserve.com acts as controller for the operation, security, administration, and support of the platform. Organizers using Passreserve may separately act as independent controllers for their own event management, attendee operations, tax, accounting, venue, and customer-care obligations."
          ]
        },
        {
          title: "2. Scope of this notice",
          paragraphs: [
            "This notice applies to visitors, attendees, organizer applicants, organizer admins, and platform admins who interact with Passreserve.com.",
            "It covers processing carried out through the website, organizer admin dashboard, platform admin dashboard, registration flows, operational emails, and connected support workflows."
          ]
        },
        {
          title: "3. Categories of personal data",
          bullets: [
            "Identification and contact data, such as name, email address, phone number, postal address, organizer name, and venue details.",
            "Registration data, such as selected event, selected occurrence, ticket mix, attendee details, dietary restrictions, booking language, and operational notes.",
            "Organizer application data, such as launch window, payment model, city, event focus, and onboarding notes.",
            "Authentication and security data, such as password hashes, password-reset tokens, session identifiers, IP-based anti-abuse controls, and audit logs.",
            "Transaction bridge data, such as Stripe session identifiers, payment-intent identifiers, refund state, and payment ledger status.",
            "Communications data, such as transactional email delivery logs, organizer outreach, support correspondence, and template-render metadata."
          ]
        },
        {
          title: "4. Purposes and legal bases",
          bullets: [
            "To provide the public site, the organizer pages, and the booking flow: performance of a contract or pre-contractual steps, and legitimate interest in operating the platform.",
            "To create, confirm, update, and reconcile registrations: performance of a contract and legitimate interest in keeping an auditable booking ledger.",
            "To process and reconcile payments handled through Stripe connected accounts: performance of a contract and legitimate interest in fraud prevention, accounting consistency, and dispute handling.",
            "To onboard organizers and manage organizer-access requests: pre-contractual measures and legitimate interest in screening and provisioning platform accounts.",
            "To authenticate organizer and platform admins, maintain sessions, prevent abuse, and protect infrastructure: legitimate interest and legal obligations relating to security and accountability.",
            "To send mandatory service emails such as access emails, confirmation emails, payment emails, and reminder emails: performance of a contract and legitimate interest in service continuity.",
            "To comply with legal obligations, respond to lawful requests, and preserve evidence where necessary: legal obligation and legitimate interest."
          ]
        },
        {
          title: "5. Payments and Stripe",
          paragraphs: [
            "Paid events are processed through Stripe technology and through the connected Stripe account of the organizer where the event is hosted. Passreserve does not present itself as the seller or event operator unless expressly stated otherwise on the relevant page.",
            "Passreserve does not store full card numbers, CVC codes, or complete payment instrument data on its own servers. Passreserve stores only limited payment-reference data strictly necessary to create, resume, reconcile, or audit the booking and refund flow.",
            "Stripe acts under its own privacy and security terms for the payment infrastructure it provides. Organizers remain responsible for the commercial, tax, refund, and consumer-facing consequences of the events they publish, subject to applicable law."
          ]
        },
        {
          title: "6. Organizers and role allocation",
          paragraphs: [
            "Organizers are responsible for the legality, accuracy, and performance of their events, for their own event policies, for attendee communications relating to the event itself, for tax and accounting obligations, and for the lawfulness of any personal data they request through Passreserve.",
            "Depending on the situation, Passreserve and the relevant organizer may each process attendee data as independent controllers for their respective purposes. Passreserve does not assume general responsibility for the organizer’s own compliance obligations merely because the organizer uses the platform."
          ]
        },
        {
          title: "7. Recipients and service providers",
          paragraphs: [
            "Passreserve may share personal data with carefully selected service providers and infrastructure vendors strictly to operate the service, including hosting and deployment providers, database providers, email-delivery providers, payment infrastructure providers, and professional advisers where necessary.",
            "As of this version, the core service stack may involve providers such as Vercel for hosting and deployment, PostgreSQL-based database infrastructure configured by Passreserve, Resend for email delivery, and Stripe for payment infrastructure and connected-account processing."
          ]
        },
        {
          title: "8. International transfers",
          paragraphs: [
            "Some service providers used to operate Passreserve may process data outside the EEA. Where that happens, Passreserve relies on a valid transfer mechanism under applicable law, such as an adequacy decision or standard contractual clauses together with supplementary measures where appropriate."
          ]
        },
        {
          title: "9. Retention",
          bullets: [
            "Organizer applications: for the time necessary to evaluate, provision, archive, and evidence the onboarding process.",
            "Organizer and platform admin account data: for the lifetime of the account and for a reasonable post-closure period required for security, audits, and legal defence.",
            "Registration and payment-ledger data: for as long as reasonably necessary for event operations, refunds, accounting, audits, and legal claims handling.",
            "Transactional email logs and audit logs: for as long as reasonably necessary to demonstrate service operation, support, abuse prevention, and legal compliance.",
            "Cookie and consent records: for the lifetime of the relevant setting and the related compliance window."
          ]
        },
        {
          title: "10. Data-subject rights",
          paragraphs: [
            "Where applicable, you may request access, rectification, erasure, restriction, portability, or objection, and you may withdraw consent where consent is the legal basis.",
            "Requests may require identity verification and may be limited where Passreserve must keep data to comply with legal obligations, preserve evidence, secure the platform, or defend legal claims."
          ]
        },
        {
          title: "11. Security",
          paragraphs: [
            "Passreserve uses organizational and technical measures appropriate to the nature of the service, including authenticated admin sessions, password hashing, anti-abuse controls, auditable payment and registration ledgers, hosted checkout through Stripe, and operational monitoring.",
            "No online service can guarantee absolute security. Users and organizers must also adopt reasonable security practices, including protecting their own devices, passwords, inboxes, and Stripe accounts."
          ]
        },
        {
          title: "12. Children and third-party data",
          paragraphs: [
            "Users must not submit third-party data unless they are authorized to do so and have provided any notices required by law. Organizers are solely responsible for verifying whether their events, questionnaires, and policies are appropriate for minors or sensitive attendance categories."
          ]
        },
        {
          title: "13. Updates and contact",
          paragraphs: [
            "Passreserve may update this notice to reflect legal, technical, or operational changes. Material changes will be reflected through an updated effective date and, where appropriate, additional notice mechanisms.",
            `For privacy-related requests concerning the platform itself, contact the site operator at ${PASSRESERVE_LEGAL_ENTITY.businessName}, ${buildAddressLine("en")}, or through the legal/support contact details published on Passreserve.com.`
          ]
        }
      ]
    },
    "cookie-policy": {
      title: "Cookie Policy",
      summary:
        "This policy explains how Passreserve.com uses cookies and similar technologies, how consent choices are respected, and how users can revisit those choices.",
      lastUpdatedLabel: "Last updated 10 June 2026",
      sections: [
        {
          title: "1. How Passreserve uses cookies and similar technologies",
          paragraphs: [
            "Passreserve uses first-party cookies and similar browser technologies to keep essential site functions working, such as authentication, language selection, booking continuity, and the storage of cookie preferences.",
            "Passreserve does not activate analytics, marketing, or profiling technologies before valid consent where such consent is required."
          ]
        },
        {
          title: "2. Categories",
          table: {
            columns: ["Category", "Status", "Purpose"],
            rows: [
              ["Necessary", "Always active", "Security, sign-in, booking continuity, language and consent storage."],
              ["Preferences", "Optional", "Non-essential personalization and convenience features, if enabled in the future."],
              ["Analytics", "Optional", "Traffic measurement or product-improvement tools that are not strictly necessary."],
              ["Marketing", "Optional", "Advertising, remarketing, or similar tracking technologies."]
            ]
          }
        },
        {
          title: "3. Cookies currently used by Passreserve",
          table: {
            columns: ["Name", "Provider", "Category", "Duration", "Storage", "Purpose"],
            rows: buildCommonCookieRows("en").map((entry) => [
              entry.name,
              entry.provider,
              entry.category,
              entry.duration,
              entry.storage,
              entry.purpose
            ])
          }
        },
        {
          title: "4. Current optional-cookie status",
          paragraphs: [
            "At the date of this version, Passreserve is structured so that optional analytics, marketing, or equivalent tracking technologies remain inactive unless they are separately enabled and covered by a valid consent choice.",
            "If Passreserve later introduces new optional tracking tools, the cookie layer must respect your saved choices and may re-prompt where the law requires a fresh choice."
          ]
        },
        {
          title: "5. Consent and refusal",
          paragraphs: [
            "Where consent is required, users must be able to accept all optional categories, reject non-essential categories, or customize their choices. Closing the banner or choosing the rejection path preserves the default state of non-essential technologies being off.",
            "Passreserve records cookie choices through a first-party technical cookie so the banner is not shown at every visit within the applicable refresh window."
          ]
        },
        {
          title: "6. How to change your choices",
          paragraphs: [
            "Users can reopen the cookie settings at any time from the footer or from any cookie-preferences control made available by the site."
          ]
        },
        {
          title: "7. Browser controls",
          paragraphs: [
            "You can also block or delete cookies using your browser settings. Doing so may affect secure sign-in, language persistence, or parts of the booking and organizer-dashboard experience."
          ]
        },
        {
          title: "8. More information",
          paragraphs: [
            "For more information on how Passreserve processes personal data beyond cookie technologies, read the Privacy Notice."
          ]
        }
      ]
    },
    terms: {
      title: "Terms of Use",
      summary:
        "These terms govern access to and use of Passreserve.com by visitors, attendees, organizers, organizer admins, and platform users.",
      lastUpdatedLabel: "Last updated 10 June 2026",
      sections: [
        {
          title: "1. Scope of the service",
          paragraphs: [
            "Passreserve provides website, registration, organizer-admin, and operational tooling designed to let organizers publish event pages, collect registrations, and manage event operations.",
            "Unless expressly stated otherwise for a specific service, Passreserve acts as a technical platform provider and is not itself the organizer, seller, venue operator, travel provider, insurer, or merchant of record for the underlying event."
          ]
        },
        {
          title: "2. Relationship between attendees, organizers, and Passreserve",
          paragraphs: [
            "The organizer is responsible for the event offer, event execution, pricing, attendee admissions, refund policies, venue compliance, tax handling, and post-booking support relating to that event.",
            "Passreserve is not a guarantor of the organizer’s identity, solvency, lawfulness, quality, or performance, and users must exercise ordinary care before relying on any event listing."
          ]
        },
        {
          title: "3. Booking and event information",
          paragraphs: [
            "Attendees are responsible for reviewing the event page, occurrence details, organizer notes, venue requirements, cancellation terms, and any published restrictions before completing a booking.",
            "Organizers are responsible for keeping their own pages, dates, capacities, policy notes, and payment settings accurate and up to date."
          ]
        },
        {
          title: "4. Payments and Stripe",
          paragraphs: [
            "Where an event accepts online payment, payment processing is handled through Stripe technology and, in the Passreserve Connect model, through the connected Stripe account of the organizer.",
            "Passreserve does not store full card numbers or CVC values and does not promise uninterrupted card-network, banking, or payment-service availability.",
            "To the fullest extent permitted by law, payment authorization, settlement timing, card-network issues, authentication failures, chargeback flows, bank-side restrictions, and payment-instrument misuse are governed by the relevant payment provider, card issuer, acquiring framework, and organizer relationship rather than by Passreserve alone."
          ]
        },
        {
          title: "5. Refunds, cancellations, and disputes",
          paragraphs: [
            "Refunds, event cancellations, schedule changes, participant eligibility, venue issues, and event-performance disputes are primarily matters between the organizer and the attendee, subject to applicable law and any mandatory consumer rights.",
            "Passreserve may provide technical tooling that helps an organizer trigger a cancellation or a Stripe-side refund request, but that tooling does not make Passreserve the substantive decision-maker or primary obligor for the organizer’s commercial obligations."
          ]
        },
        {
          title: "6. Account and platform security",
          paragraphs: [
            "Users are responsible for the security of their own devices, inboxes, passwords, organizer-admin credentials, and Stripe accounts. You must not share access, circumvent security, attempt unauthorized access, or interfere with the operation of the service.",
            "Passreserve may suspend, throttle, or block activity that appears abusive, fraudulent, unlawful, insecure, or operationally harmful."
          ]
        },
        {
          title: "7. Organizer-specific responsibilities",
          bullets: [
            "Publish only lawful and accurate event content.",
            "Collect only data that the organizer is entitled to collect and use.",
            "Maintain a valid payment setup where online payments are enabled.",
            "Handle refunds, tax, invoicing, consumer-facing notices, and event operations in compliance with applicable law.",
            "Indemnify Passreserve against claims arising from the organizer’s own event, content, policies, tax treatment, privacy misuse, or unlawful conduct, to the extent permitted by law."
          ]
        },
        {
          title: "8. Acceptable use",
          bullets: [
            "No fraudulent or misleading event listings.",
            "No unlawful data harvesting, scraping, credential attacks, or payment abuse.",
            "No infringement of intellectual-property, privacy, publicity, or consumer-protection rights.",
            "No use of the platform to facilitate scams, counterfeit activity, or unlawful services."
          ]
        },
        {
          title: "9. Availability and no absolute warranty",
          paragraphs: [
            "Passreserve aims to keep the service available and reasonably secure, but the platform is provided on an as-available basis. Maintenance windows, outages, third-party failures, email delays, payment-network issues, or infrastructure faults may affect availability.",
            "Passreserve does not warrant that every organizer is genuine, that every event will proceed exactly as planned, or that every payment, email, or browser interaction will be free of interruption or error."
          ]
        },
        {
          title: "10. Limitation of liability",
          paragraphs: [
            "To the fullest extent permitted by law, Passreserve shall not be liable for indirect, consequential, incidental, exemplary, special, or punitive losses, nor for loss of profits, loss of revenue, loss of reputation, or loss arising from organizer conduct, event cancellation, organizer insolvency, venue issues, third-party payment failures, card misuse, or disputes between attendees and organizers.",
            "Where liability cannot be excluded, Passreserve’s liability is limited to the maximum extent permitted by mandatory law and shall in no event exclude liability that cannot legally be excluded, including liability for wilful misconduct, gross negligence, personal injury, fraud, or mandatory consumer rights."
          ]
        },
        {
          title: "11. Mandatory rights preserved",
          paragraphs: [
            "Nothing in these Terms removes or restricts rights that users or consumers are entitled to under mandatory applicable law, including mandatory consumer-protection, privacy, payment, or unfair-terms rules."
          ]
        },
        {
          title: "12. Governing law and forum",
          paragraphs: [
            "These Terms are governed by Italian law, without prejudice to any mandatory rights that consumers may enjoy under the law of their habitual residence.",
            "Any dispute concerning the platform-provider relationship shall be brought before the competent courts identified under applicable law. Where a user qualifies as a consumer, mandatory jurisdiction rules continue to apply."
          ]
        }
      ]
    }
  },
  it: {
    privacy: {
      title: "Informativa Privacy",
      summary:
        "Questa informativa spiega come Passreserve.com tratta i dati personali quando una persona visita il sito, richiede accesso come organizer, gestisce account admin, crea registrazioni o completa pagamenti tramite account Stripe collegati agli organizer.",
      lastUpdatedLabel: "Ultimo aggiornamento 10 giugno 2026",
      sections: [
        {
          title: "1. Titolare del trattamento",
          paragraphs: [
            `Il gestore di Passreserve.com è ${PASSRESERVE_LEGAL_ENTITY.businessName}, P. IVA ${PASSRESERVE_LEGAL_ENTITY.vatNumber}, con sede in ${buildAddressLine("it")}.`,
            "Per i trattamenti descritti in questa informativa, Passreserve.com agisce come titolare per il funzionamento, la sicurezza, l’amministrazione e il supporto della piattaforma. Gli organizer che usano Passreserve possono a loro volta agire come titolari autonomi per la gestione del proprio evento, delle operazioni con i partecipanti, degli obblighi fiscali, della venue e dell’assistenza clienti."
          ]
        },
        {
          title: "2. Ambito dell’informativa",
          paragraphs: [
            "Questa informativa si applica a visitatori, partecipanti, richiedenti accesso organizer, admin organizer e admin piattaforma che interagiscono con Passreserve.com.",
            "Copre i trattamenti svolti tramite sito web, dashboard organizer, dashboard piattaforma, flussi di registrazione, email operative e workflow di supporto connessi."
          ]
        },
        {
          title: "3. Categorie di dati trattati",
          bullets: [
            "Dati identificativi e di contatto, come nome, email, numero di telefono, indirizzo postale, nome organizer e dettagli venue.",
            "Dati di registrazione, come evento selezionato, data selezionata, mix ticket, dati dei partecipanti, restrizioni alimentari, lingua della prenotazione e note operative.",
            "Dati delle richieste organizer, come finestra di lancio, modello pagamenti, città, focus eventi e note di onboarding.",
            "Dati di autenticazione e sicurezza, come hash password, token reset password, identificatori di sessione, controlli anti-abuso basati su IP e audit log.",
            "Dati ponte di transazione, come identificativi Stripe di sessione o payment intent, stato rimborso e stato del ledger pagamenti.",
            "Dati di comunicazione, come log di delivery email, outreach organizer, corrispondenza di supporto e metadata di rendering template."
          ]
        },
        {
          title: "4. Finalità e basi giuridiche",
          bullets: [
            "Fornire il sito pubblico, le pagine organizer e il flow di prenotazione: esecuzione di un contratto o misure precontrattuali e legittimo interesse a operare la piattaforma.",
            "Creare, confermare, aggiornare e riconciliare le registrazioni: esecuzione di un contratto e legittimo interesse a mantenere un ledger prenotazioni auditabile.",
            "Gestire e riconciliare pagamenti trattati tramite account Stripe collegati: esecuzione di un contratto e legittimo interesse in prevenzione frodi, coerenza contabile e gestione dispute.",
            "Onboardare organizer e gestire richieste di accesso: misure precontrattuali e legittimo interesse a valutare e provisionare account piattaforma.",
            "Autenticare admin organizer e piattaforma, mantenere sessioni, prevenire abusi e proteggere l’infrastruttura: legittimo interesse e obblighi di sicurezza/accountability.",
            "Inviare email di servizio obbligatorie, come accessi, conferme, pagamenti e reminder: esecuzione di un contratto e legittimo interesse alla continuità del servizio.",
            "Adempiere obblighi di legge, rispondere a richieste legittime e conservare evidenze quando necessario: obbligo legale e legittimo interesse."
          ]
        },
        {
          title: "5. Pagamenti e Stripe",
          paragraphs: [
            "Gli eventi a pagamento sono gestiti tramite tecnologia Stripe e tramite l’account Stripe collegato all’organizer che ospita l’evento. Passreserve non si presenta come venditore o organizer dell’evento, salvo ove espressamente indicato.",
            "Passreserve non conserva sui propri server numeri completi di carta, codici CVC o dati completi dello strumento di pagamento. Conserva solo riferimenti minimi strettamente necessari a creare, riprendere, riconciliare o auditare il flow di prenotazione e rimborso.",
            "Stripe opera secondo i propri termini privacy e di sicurezza per l’infrastruttura di pagamento. Gli organizer restano responsabili delle conseguenze commerciali, fiscali, di rimborso e consumer-facing degli eventi che pubblicano, salvo quanto diversamente imposto dalla legge."
          ]
        },
        {
          title: "6. Organizer e riparto dei ruoli",
          paragraphs: [
            "L’organizer è responsabile della liceità, accuratezza ed esecuzione dei propri eventi, delle policy evento, delle comunicazioni ai partecipanti relative all’evento, degli obblighi fiscali e contabili e della liceità di ogni dato personale richiesto tramite Passreserve.",
            "A seconda del contesto, Passreserve e il relativo organizer possono trattare i dati dei partecipanti come titolari autonomi per finalità diverse e proprie. L’uso della piattaforma da parte dell’organizer non trasferisce automaticamente a Passreserve gli obblighi di compliance dell’organizer."
          ]
        },
        {
          title: "7. Destinatari e fornitori di servizi",
          paragraphs: [
            "Passreserve può condividere dati personali con fornitori selezionati e infrastrutture tecniche strettamente necessari a operare il servizio, inclusi hosting e deployment, infrastruttura database, email delivery, infrastruttura pagamenti e consulenti professionali quando necessario.",
            "Alla data di questa versione, lo stack può coinvolgere fornitori come Vercel per hosting e deployment, infrastruttura database PostgreSQL configurata da Passreserve, Resend per email delivery e Stripe per pagamenti e account collegati."
          ]
        },
        {
          title: "8. Trasferimenti internazionali",
          paragraphs: [
            "Alcuni fornitori usati per operare Passreserve possono trattare dati fuori dallo SEE. In tali casi Passreserve si basa su un meccanismo di trasferimento valido ai sensi della legge applicabile, come decisioni di adeguatezza o clausole contrattuali standard con eventuali misure supplementari."
          ]
        },
        {
          title: "9. Conservazione",
          bullets: [
            "Richieste organizer: per il tempo necessario a valutare, provisionare, archiviare e dimostrare il processo di onboarding.",
            "Dati account admin organizer e piattaforma: per la durata dell’account e per un periodo successivo ragionevole richiesto da sicurezza, audit e difesa legale.",
            "Dati registrazione e ledger pagamenti: per il tempo ragionevolmente necessario a operazioni evento, rimborsi, contabilità, audit e gestione contestazioni.",
            "Log email transazionali e audit log: per il tempo ragionevolmente necessario a dimostrare operatività, supporto, prevenzione abusi e compliance.",
            "Record cookie e consenso: per la durata della relativa impostazione e della finestra di compliance associata."
          ]
        },
        {
          title: "10. Diritti degli interessati",
          paragraphs: [
            "Ove applicabile, puoi richiedere accesso, rettifica, cancellazione, limitazione, portabilità od opposizione, e puoi revocare il consenso quando il consenso è la base giuridica pertinente.",
            "Le richieste possono richiedere verifica dell’identità e possono essere limitate quando Passreserve deve conservare dati per obblighi di legge, preservazione delle prove, sicurezza della piattaforma o difesa di diritti."
          ]
        },
        {
          title: "11. Sicurezza",
          paragraphs: [
            "Passreserve usa misure tecniche e organizzative adeguate alla natura del servizio, inclusi sessioni admin autenticate, hashing password, controlli anti-abuso, ledger registrazioni/pagamenti auditabili, checkout ospitato da Stripe e monitoraggio operativo.",
            "Nessun servizio online può garantire sicurezza assoluta. Anche utenti e organizer devono adottare misure ragionevoli di sicurezza, proteggendo dispositivi, password, caselle email e account Stripe."
          ]
        },
        {
          title: "12. Minori e dati di terzi",
          paragraphs: [
            "Gli utenti non devono inserire dati di terzi senza autorizzazione e senza aver fornito le eventuali informative richieste dalla legge. Gli organizer restano responsabili della verifica che eventi, questionari e policy siano appropriati per minori o categorie sensibili."
          ]
        },
        {
          title: "13. Aggiornamenti e contatti",
          paragraphs: [
            "Passreserve può aggiornare questa informativa per riflettere cambiamenti legali, tecnici o operativi. Le modifiche rilevanti saranno accompagnate da una data di aggiornamento e, se opportuno, da ulteriori meccanismi informativi.",
            `Per richieste privacy relative alla piattaforma in sé, puoi contattare il gestore del sito: ${PASSRESERVE_LEGAL_ENTITY.businessName}, ${buildAddressLine("it")}, oppure usare i recapiti legali/supporto pubblicati su Passreserve.com.`
          ]
        }
      ]
    },
    "cookie-policy": {
      title: "Cookie Policy",
      summary:
        "Questa policy spiega come Passreserve.com usa cookie e tecnologie simili, come vengono rispettate le scelte di consenso e come l’utente può modificarle.",
      lastUpdatedLabel: "Ultimo aggiornamento 10 giugno 2026",
      sections: [
        {
          title: "1. Come Passreserve usa cookie e tecnologie simili",
          paragraphs: [
            "Passreserve usa cookie di prima parte e tecnologie browser simili per mantenere attive funzioni essenziali del sito, come autenticazione, lingua selezionata, continuità del booking e memorizzazione delle preferenze cookie.",
            "Passreserve non attiva tecnologie analytics, marketing o profilazione prima di un consenso valido quando tale consenso è richiesto."
          ]
        },
        {
          title: "2. Categorie",
          table: {
            columns: ["Categoria", "Stato", "Finalità"],
            rows: [
              ["Necessari", "Sempre attivi", "Sicurezza, login, continuità prenotazione, lingua e salvataggio preferenze consenso."],
              ["Preferenze", "Opzionali", "Personalizzazioni non essenziali e funzioni di comodità, se abilitate in futuro."],
              ["Analytics", "Opzionali", "Misurazione traffico o strumenti di miglioramento prodotto non strettamente necessari."],
              ["Marketing", "Opzionali", "Pubblicità, remarketing o tecnologie di tracciamento analoghe."]
            ]
          }
        },
        {
          title: "3. Cookie attualmente usati da Passreserve",
          table: {
            columns: ["Nome", "Fornitore", "Categoria", "Durata", "Storage", "Finalità"],
            rows: buildCommonCookieRows("it").map((entry) => [
              entry.name,
              entry.provider,
              entry.category,
              entry.duration,
              entry.storage,
              entry.purpose
            ])
          }
        },
        {
          title: "4. Stato attuale dei cookie opzionali",
          paragraphs: [
            "Alla data di questa versione, Passreserve è strutturato in modo che strumenti opzionali di analytics, marketing o tracciamento equivalente restino inattivi salvo separata abilitazione e copertura da una valida scelta di consenso.",
            "Se in futuro Passreserve introdurrà nuovi strumenti opzionali, il layer cookie dovrà rispettare le preferenze salvate e potrà richiedere una nuova scelta ove la legge lo richieda."
          ]
        },
        {
          title: "5. Consenso e rifiuto",
          paragraphs: [
            "Quando il consenso è richiesto, l’utente deve poter accettare tutte le categorie opzionali, rifiutare quelle non essenziali oppure personalizzare le scelte. La chiusura del banner o il percorso di rifiuto mantengono lo stato predefinito con tecnologie non essenziali disattivate.",
            "Passreserve documenta le scelte cookie tramite un cookie tecnico di prima parte così da non riproporre il banner a ogni visita entro la finestra di rinnovo applicabile."
          ]
        },
        {
          title: "6. Come cambiare le scelte",
          paragraphs: [
            "L’utente può riaprire in qualsiasi momento il pannello preferenze cookie dal footer o da ogni altro controllo di gestione cookie messo a disposizione dal sito."
          ]
        },
        {
          title: "7. Controlli browser",
          paragraphs: [
            "Puoi anche bloccare o cancellare cookie tramite le impostazioni del browser. Ciò potrebbe incidere su login sicuro, persistenza lingua o su parti del flow di prenotazione e della dashboard organizer."
          ]
        },
        {
          title: "8. Maggiori informazioni",
          paragraphs: [
            "Per sapere come Passreserve tratta i dati personali oltre ai cookie, consulta l’Informativa Privacy."
          ]
        }
      ]
    },
    terms: {
      title: "Termini d’Uso",
      summary:
        "Questi termini disciplinano l’accesso e l’uso di Passreserve.com da parte di visitatori, partecipanti, organizer, admin organizer e utenti piattaforma.",
      lastUpdatedLabel: "Ultimo aggiornamento 10 giugno 2026",
      sections: [
        {
          title: "1. Ambito del servizio",
          paragraphs: [
            "Passreserve fornisce strumenti web, registrazione, dashboard organizer e operatività pensati per consentire agli organizer di pubblicare pagine evento, raccogliere registrazioni e gestire operazioni evento.",
            "Salvo ove espressamente indicato per uno specifico servizio, Passreserve agisce come fornitore tecnico di piattaforma e non è di per sé organizer, venditore, gestore venue, tour operator, assicuratore o merchant of record dell’evento sottostante."
          ]
        },
        {
          title: "2. Rapporto tra partecipanti, organizer e Passreserve",
          paragraphs: [
            "L’organizer è responsabile dell’offerta evento, dell’esecuzione dell’evento, della determinazione del prezzo, dell’ammissione dei partecipanti, delle policy di rimborso, della conformità venue, della fiscalità e del supporto post-prenotazione relativo al proprio evento.",
            "Passreserve non garantisce l’identità, solvibilità, liceità, qualità o effettiva esecuzione dell’organizer e l’utente deve usare ordinaria diligenza prima di fare affidamento su un evento pubblicato."
          ]
        },
        {
          title: "3. Prenotazione e informazioni evento",
          paragraphs: [
            "Il partecipante è responsabile di leggere la pagina evento, i dettagli della data, le note organizer, i requisiti venue, i termini di cancellazione e ogni restrizione pubblicata prima di completare la prenotazione.",
            "L’organizer è responsabile di mantenere accurate e aggiornate le proprie pagine, le date, le capienze, le note policy e le impostazioni di pagamento."
          ]
        },
        {
          title: "4. Pagamenti e Stripe",
          paragraphs: [
            "Quando un evento accetta pagamenti online, il processamento è gestito tramite tecnologia Stripe e, nel modello Connect di Passreserve, tramite l’account Stripe collegato dell’organizer.",
            "Passreserve non conserva numeri completi di carta o codici CVC e non garantisce disponibilità ininterrotta di circuiti carta, banche o servizi di pagamento.",
            "Nei limiti massimi consentiti dalla legge, autorizzazione, tempi di regolamento, problemi di rete, autenticazione forte, chargeback, restrizioni bancarie e uso improprio dello strumento di pagamento restano disciplinati dal relativo payment provider, dall’emittente, dal framework di acquiring e dal rapporto con l’organizer, più che da Passreserve in sé."
          ]
        },
        {
          title: "5. Rimborsi, cancellazioni e dispute",
          paragraphs: [
            "Rimborsi, cancellazioni evento, cambi orario, idoneità del partecipante, problemi venue e contestazioni sull’esecuzione dell’evento sono primariamente questioni tra organizer e partecipante, nel rispetto della legge applicabile e degli eventuali diritti consumer inderogabili.",
            "Passreserve può fornire tooling tecnico che aiuta un organizer a lanciare una cancellazione o una richiesta di rimborso Stripe, ma tale tooling non rende Passreserve il decisore sostanziale o il debitore principale degli obblighi commerciali dell’organizer."
          ]
        },
        {
          title: "6. Sicurezza account e piattaforma",
          paragraphs: [
            "Ogni utente è responsabile della sicurezza dei propri dispositivi, della casella email, delle password, delle credenziali admin organizer e del proprio account Stripe. È vietato condividere accessi, aggirare misure di sicurezza, tentare accessi non autorizzati o interferire con l’operatività del servizio.",
            "Passreserve può sospendere, limitare o bloccare attività che appaiano abusive, fraudolente, illecite, insicure o dannose sul piano operativo."
          ]
        },
        {
          title: "7. Responsabilità specifiche dell’organizer",
          bullets: [
            "Pubblicare solo contenuti evento leciti e accurati.",
            "Richiedere solo dati che l’organizer ha titolo a richiedere e usare.",
            "Mantenere un setup pagamenti valido quando i pagamenti online sono abilitati.",
            "Gestire rimborsi, fiscalità, fatturazione, informative consumer e operatività evento in conformità alla legge applicabile.",
            "Manlevare Passreserve per quanto consentito dalla legge rispetto a pretese derivanti dall’evento dell’organizer, dai contenuti, dalle policy, dal trattamento privacy dell’organizer o da condotte illecite dell’organizer."
          ]
        },
        {
          title: "8. Uso consentito",
          bullets: [
            "Nessuna pubblicazione ingannevole o fraudolenta di eventi.",
            "Nessun harvesting illecito di dati, scraping abusivo, attacchi a credenziali o abusi di pagamento.",
            "Nessuna violazione di diritti di proprietà intellettuale, privacy, immagine o tutela del consumatore.",
            "Nessun uso della piattaforma per facilitare truffe, contraffazione o servizi illeciti."
          ]
        },
        {
          title: "9. Disponibilità e assenza di garanzia assoluta",
          paragraphs: [
            "Passreserve mira a mantenere il servizio disponibile e ragionevolmente sicuro, ma la piattaforma è fornita secondo disponibilità. Finestre di manutenzione, outage, failure di terzi, ritardi email, problemi di rete pagamento o fault infrastrutturali possono incidere sulla disponibilità.",
            "Passreserve non garantisce che ogni organizer sia genuino, che ogni evento si svolga esattamente come pianificato o che ogni pagamento, email o interazione browser avvenga senza interruzioni o errori."
          ]
        },
        {
          title: "10. Limitazione di responsabilità",
          paragraphs: [
            "Nei limiti massimi consentiti dalla legge, Passreserve non risponde di danni indiretti, consequenziali, incidentali, esemplari, speciali o punitivi, né di perdita di profitti, ricavi o reputazione, né di perdite derivanti da condotta dell’organizer, cancellazione evento, insolvenza organizer, problemi venue, failure di payment provider terzi, uso illecito di carte o dispute tra partecipanti e organizer.",
            "Dove la responsabilità non possa essere esclusa, essa resta limitata nella misura massima consentita dalla legge applicabile e non include esclusioni che la legge non consente, incluse responsabilità per dolo, colpa grave, lesioni personali, frode o diritti consumer inderogabili."
          ]
        },
        {
          title: "11. Diritti inderogabili preservati",
          paragraphs: [
            "Nulla in questi Termini elimina o restringe diritti che utenti o consumatori hanno ai sensi di norme inderogabili applicabili, incluse norme su tutela consumatore, privacy, pagamenti o clausole vessatorie."
          ]
        },
        {
          title: "12. Legge applicabile e foro",
          paragraphs: [
            "Questi Termini sono regolati dalla legge italiana, salvo i diritti inderogabili eventualmente spettanti al consumatore ai sensi della legge del proprio luogo di residenza abituale.",
            "Le controversie relative al rapporto con il provider piattaforma sono devolute al giudice competente secondo la legge applicabile. Quando l’utente è consumatore, restano ferme le regole di giurisdizione inderogabili previste dalla legge."
          ]
        }
      ]
    }
  }
};

export function getLegalDocument(locale = "en", slug = "privacy") {
  const safeLocale = locale === "it" ? "it" : "en";
  const document = legalDocuments[safeLocale]?.[slug];

  if (!document) {
    return null;
  }

  return {
    ...document,
    slug,
    locale: safeLocale,
    version: LEGAL_DOCUMENT_VERSION
  };
}
