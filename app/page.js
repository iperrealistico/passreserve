import Image from "next/image";
import Link from "next/link";

import { HomeOrganizerRequestModal } from "./home-organizer-request-modal.js";
import { PublicHeader } from "./public-header.js";
import {
  organizerLaunchWindows,
  organizerPaymentModels,
} from "../lib/passreserve-domain.js";
import { PublicVisual } from "../lib/passreserve-visual-component.js";
import { routeVisuals } from "../lib/passreserve-visuals.js";

const hostSetupCards = [
  {
    label: "Free setup",
    iconSrc: "/images/passreserve/icons/host-setup.webp",
    iconAlt: "A stylized calendar, event ticket, and location pin icon for setting up an event page.",
    title: "Create an event page for free and start taking registrations quickly",
    paragraphs: [
      "Passreserve works as free event registration software, a free event booking platform, and a free event signup platform for organizers who want to publish a clear event page with dates, venue details, pricing, and registration rules without paying to get started.",
      "It fits workshops, classes, retreats, guided rides, local experiences, seasonal dinners, and other formats that need a free event page builder, free software for event organizers, and free event software for small teams."
    ]
  },
  {
    label: "Own Stripe",
    iconSrc: "/images/passreserve/icons/online-payments.webp",
    iconAlt: "A stylized smartphone, payment card, and approval badge icon for online event payments.",
    title: "Collect online payments on your own Stripe account if you want online checkout",
    paragraphs: [
      "If you want to collect online payments, Passreserve can work with your own Stripe integration so you control payouts, payment timing, and the guest relationship instead of handing checkout to a marketplace-style platform.",
      "That makes it useful as free event management software for deposit event registration, for hosts who want to collect deposits for workshops, and for class booking software for small businesses or retreat organizers that need simple online payment without extra platform layers."
    ]
  },
  {
    label: "Pay at venue",
    iconSrc: "/images/passreserve/icons/venue-payments.webp",
    iconAlt: "A stylized venue marker, ticket, and payment tray icon for pay-at-the-event bookings.",
    title: "Let guests pay at the event, use pay later booking, or keep online collection optional",
    paragraphs: [
      "Passreserve supports pay at the event, pay later event booking, deposit-only event booking, and event booking with balance due at venue, so you are not forced into full online checkout when the event works better with in-person payment.",
      "For hosts searching for event software without forced checkout, no platform fee event software, or a way to let guests pay at the venue, this keeps the registration flow lighter, more flexible, and easier to trust."
    ]
  },
  {
    label: "Recurring formats",
    iconSrc: "/images/passreserve/icons/recurring-dates.webp",
    iconAlt: "A stylized recurring calendar icon for classes, workshops, and repeating event dates.",
    title: "Run recurring dates and local formats without turning the page into a complicated ticket stack",
    paragraphs: [
      "Passreserve is built for free event software for recurring dates, free software for workshops and classes, event booking software for retreats, and a free platform for local experiences that need repeating sessions, retreat weekends, or seasonal calendars to stay readable.",
      "It is a calmer option for organizers comparing the best free platform to book events, how to create an event page for free, or how to accept event registrations without high fees while still keeping date choice and pricing easy to understand."
    ]
  }
];

const comparisonRows = [
  {
    label: "Cost to start",
    passreserve:
      "Free to start and free as your base event registration software, so you can publish event pages and accept signups without a Passreserve subscription fee.",
    others:
      "Many event platforms start with monthly plans, paid tiers, or extra charges before the event page feels ready to share."
  },
  {
    label: "Platform fee",
    passreserve:
      "No Passreserve platform fee on registrations. If you choose online payments, only your own Stripe processing applies.",
    others:
      "Typical ticketing platforms often combine platform fees with payment processing or keep the payout flow inside the platform."
  },
  {
    label: "In-venue payment",
    passreserve:
      "Yes. Let guests pay at the event, use pay later event booking, or collect only a deposit online before arrival.",
    others:
      "Many event platforms push full online checkout first and make in-venue payment feel like an exception."
  },
  {
    label: "Stripe control",
    passreserve:
      "Optional own Stripe integration, so you can collect online payments, deposits, and registrations on your own account if you want it.",
    others:
      "Online payments are often locked to the platform checkout, a paid add-on, or a platform-controlled merchant flow."
  },
  {
    label: "Setup complexity",
    passreserve:
      "Simple host pages with clear dates, venue details, pricing, and registration links instead of a crowded ticket configuration panel.",
    others:
      "Extra ticket types, marketplace fields, and admin layers can make a small event feel more complicated than it needs to be."
  },
  {
    label: "Recurring formats",
    passreserve:
      "A strong fit for workshops, classes, retreats, guided rides, tastings, dinners, and recurring local experiences with repeating dates.",
    others:
      "A lot of platforms are optimized for one-off ticket sales first and recurring local formats second."
  },
  {
    label: "Guest payment flexibility",
    passreserve:
      "Choose free registration, deposit event registration, full online payment, or payment at the venue based on how the event actually runs.",
    others:
      "Guests are often pushed into one default checkout path whether the event needs it or not."
  },
  {
    label: "Organizer presentation",
    passreserve:
      "Organizer page first, calm public presentation, and no crowded marketplace feel around your event page.",
    others:
      "The platform brand, listing walls, and marketplace layout can dominate the guest experience."
  }
];

const discoveryChips = [
  "workshop",
  "retreat",
  "sunrise",
  "gravel",
  "family",
  "dinner"
];

const discoveryNotes = [
  {
    title: "By city",
    detail: "Search Bologna, Como, Parma, or the next place you want to explore."
  },
  {
    title: "By host",
    detail: "Start with the host page when you already know who is running the event."
  },
  {
    title: "By format",
    detail: "Use clear intent words like workshop, sunset, family, retreat, or gravel."
  }
];

const hostNotes = [
  {
    title: "Free to start",
    detail: "Publish a clean page before paying for heavier tools you may not need."
  },
  {
    title: "Flexible payments",
    detail: "Take deposits, charge online, or let guests pay at the event."
  },
  {
    title: "Repeat dates",
    detail: "Keep recurring classes, retreats, and local experiences easier to run."
  }
];

const homeFaqGroups = [
  {
    label: "Useful host questions",
    title: "Practical answers for organizers setting up event pages, payments, and recurring dates",
    intro:
      "These cover the decisions most hosts make first: whether the platform is free, how payment works, what kinds of events fit best, and how quickly a page can go live.",
    items: [
      {
        question: "What is Passreserve and who is it for?",
        answer:
          "Passreserve is free event registration software for organizers who want clear event pages, calm booking flows, and flexible payments. It works well for workshops, classes, retreats, guided rides, tastings, seasonal dinners, and local experiences that need a free event booking platform or a free event signup platform without the crowded feel of a marketplace listing."
      },
      {
        question: "Is Passreserve free for event organizers?",
        answer:
          "Yes. Passreserve is free to start and the base stays free, so hosts can publish pages, accept registrations, and manage attendee signups without a Passreserve platform subscription fee. That makes it useful as a free event page builder, free software for event organizers, and free event software for small teams that want a simple starting point."
      },
      {
        question: "Can guests pay at the event instead of online?",
        answer:
          "Yes. Hosts can let guests pay at the event, use pay later event booking, or keep online collection optional. If your event works better with in-person payment, Passreserve supports software for hosts who want guests to pay at the event instead of forcing a full online checkout every time."
      },
      {
        question: "Can I collect only a deposit online and the rest at the venue?",
        answer:
          "Yes. Passreserve supports deposit event registration, deposit-only event booking, and event booking with balance due at venue. It is designed for organizers who want to collect deposits for workshops, reserve seats in advance, and still take the remaining payment when guests arrive."
      },
      {
        question: "Do I need Stripe to start using Passreserve?",
        answer:
          "No. You can start with free registration or pay-at-the-event flows without connecting Stripe. Stripe only becomes relevant if you want to collect online payments or deposits before the event, which keeps the setup lighter for hosts who do not need checkout on day one."
      },
      {
        question: "Can I use my own Stripe account for online payments?",
        answer:
          "Yes. If you want online checkout, Passreserve can work with your own Stripe integration so payouts, payment timing, and customer relationships stay on your side. That is helpful for organizers comparing free ticketing alternatives and looking for an event platform that does not lock them into a platform-controlled merchant flow."
      },
      {
        question: "What kinds of events work best on Passreserve?",
        answer:
          "Passreserve is a strong fit for workshops, classes, retreats, guided experiences, small festivals, studio sessions, tastings, community events, and other local formats. It works especially well as class booking software for small businesses, event booking software for retreats, and a free platform for local experiences that need clarity more than complexity."
      },
      {
        question: "Can I run recurring dates or repeating sessions?",
        answer:
          "Yes. Passreserve is meant for hosts running recurring dates, repeating classes, retreat weekends, and seasonal calendars. If you are comparing free event software for recurring dates or free software for workshops and classes, the goal here is to keep date selection readable instead of burying people in a complicated ticket stack."
      },
      {
        question: "How quickly can I create an event page for free?",
        answer:
          "Hosts can move quickly because the setup is centered on one clear page with event details, dates, pricing, and registration flow. For people searching how to create an event page for free, Passreserve keeps the process focused on what guests actually need to understand before they sign up."
      },
      {
        question: "Is Passreserve a good fit for small teams, independent hosts, and venues?",
        answer:
          "Yes. Passreserve is intentionally simple for independent organizers, local venues, guides, studios, farms, and small teams that do not want expensive software or a bloated admin setup. It is especially useful when you want no platform fee event software, a calmer public page, and booking without high monthly costs."
      }
    ]
  },
  {
    label: "SEO-friendly questions",
    title: "Search-intent answers for hosts comparing free event software and payment flexibility",
    intro:
      "These questions use the language organizers often type into search engines when they are evaluating event platforms, payment options, and alternatives to higher-fee ticketing tools.",
    items: [
      {
        question: "What is the best free event registration software for workshops and classes?",
        answer:
          "The best fit depends on how much control you want, but Passreserve is built specifically for hosts who need free event registration software, free event booking software for workshops and classes, and a page that explains the event clearly before the booking starts. It is meant for organizers who care about trust, recurring dates, and straightforward payment choices."
      },
      {
        question: "Is there a free event booking platform that lets guests pay later or pay at the venue?",
        answer:
          "Yes. Passreserve is a free event booking platform that supports pay later event booking, pay at the event, and balance due at venue flows. That makes it a useful option for hosts who want event software without forced checkout or need no online fee event booking for experiences that close payment in person."
      },
      {
        question: "How can I accept event registrations without high platform fees?",
        answer:
          "A good starting point is to use a free platform that keeps the base software free and does not add its own platform fee on registrations. For hosts searching how to accept event registrations without high fees or the best free platform to book events, Passreserve keeps the booking flow simple and leaves optional online card processing to your own Stripe account when you want it."
      },
      {
        question: "What free event management software works for recurring retreats, classes, and local experiences?",
        answer:
          "Passreserve is designed for recurring schedules and place-based formats, which makes it useful as free event management software for retreats, classes, workshops, and a free platform for local experiences. It is especially relevant when you need repeating dates, deposit options, and a presentation that feels cleaner than a generic ticketing wall."
      },
      {
        question: "Is there a free ticketing alternative with your own Stripe integration?",
        answer:
          "Yes. If you are looking for a free ticketing alternative with your own Stripe integration, Passreserve gives hosts the option to collect online payments on their own Stripe account while still supporting free registrations, deposits, and pay-at-event flows. That combination is useful for organizers who want flexibility without giving up payout control."
      }
    ]
  }
];

const homeFaqHighlights = [
  "Free event registration software for workshops, classes, retreats, and local experiences",
  "Pay at the event, pay later booking, or deposit-only event registration",
  "Optional own Stripe integration for online payments",
  "Recurring dates that stay easy for guests to understand"
];

const homeFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: homeFaqGroups.flatMap((group) =>
    group.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  )
};

export default async function HomePage({ searchParams }) {
  const query = await searchParams;

  return (
    <main className="shell">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqSchema) }}
        suppressHydrationWarning
        type="application/ld+json"
      />
      <div className="content">
        <PublicHeader />

        {query.message ? (
          <div className="registration-message registration-message-success">
            Your organizer request is now in the Passreserve launch inbox.
          </div>
        ) : null}
        {query.error ? (
          <div className="registration-message registration-message-error">
            The organizer request could not be saved. Please check the form and try again.
          </div>
        ) : null}

        <section className="hero home-split-hero" id="discover">
          <article className="panel hero-copy hero-stack home-primary-panel" id="featured">
            <PublicVisual
              aspectRatio="16 / 10"
              className="home-panel-visual"
              priority
              sizes="(min-width: 1024px) 27vw, 100vw"
              visualId={routeVisuals.homeFind}
            />
            <h1 className="home-panel-title">Find an event</h1>
            <p>
              Search by host, city, or event style, then open the page that answers what it is,
              where it happens, what it costs, and how to join.
            </p>

            <form action="/events" className="search-lab home-search-lab" method="GET">
              <label className="search-field">
                <span className="search-label">Search by host, city, or event type</span>
                <input
                  name="query"
                  placeholder="Try Bologna, Trail Lab, family festival, or Dolomites"
                  type="text"
                />
              </label>
              <div className="hero-actions search-actions-row">
                <button className="button button-primary button-compact" type="submit">
                  Search events
                </button>
                <Link className="button button-secondary button-compact" href="/events">
                  Browse all events
                </Link>
              </div>

              <div className="quick-chip-row">
                {discoveryChips.map((chip) => (
                  <Link className="quick-chip" href={`/events?query=${encodeURIComponent(chip)}`} key={chip}>
                    {chip}
                  </Link>
                ))}
              </div>
            </form>

            <div className="home-panel-list" aria-label="Search tips">
              {discoveryNotes.map((note) => (
                <article className="home-panel-list-item" key={note.title}>
                  <strong>{note.title}</strong>
                  <span>{note.detail}</span>
                </article>
              ))}
            </div>
          </article>

          <aside className="panel hero-copy hero-stack home-organizer-panel" id="organizer-launch">
            <PublicVisual
              aspectRatio="16 / 10"
              className="home-panel-visual"
              sizes="(min-width: 1024px) 27vw, 100vw"
              visualId={routeVisuals.homeHost}
            />
            <h2 className="home-panel-title">Host an event</h2>
            <p>
              Request organizer access to publish a host page, manage recurring dates, and choose
              whether attendees pay online, leave a deposit, or pay at the event.
            </p>

            <div className="home-panel-list" aria-label="Host benefits">
              {hostNotes.map((note) => (
                <article className="home-panel-list-item" key={note.title}>
                  <strong>{note.title}</strong>
                  <span>{note.detail}</span>
                </article>
              ))}
            </div>

            <div className="home-panel-summary">
              <strong>Keep the setup simple</strong>
              <span>
                Start free, choose the payment flow that fits the event, and move guests to a calm
                registration page instead of a crowded marketplace listing.
              </span>
            </div>

            <div className="home-launch-actions">
              <HomeOrganizerRequestModal
                launchWindows={organizerLaunchWindows}
                paymentModels={organizerPaymentModels}
              />
              <Link className="button button-secondary button-compact button-small" href="#how-it-works">
                How hosting works
              </Link>
            </div>
          </aside>
        </section>

        <section className="section-grid" id="how-it-works">
          <article className="panel section-card section-span host-intent-section">
            <div className="host-intent-copy">
              <span className="section-kicker">For hosts</span>
              <h2>Free event registration software for hosts who want flexible payments</h2>
              <p>
                Passreserve helps organizers publish event pages, accept registrations, collect
                deposits, collect online payments, or let guests pay at the event, with a calmer
                setup that stays easy to understand for both hosts and attendees.
              </p>
              <p>
                It is built for hosts looking for free event registration software, free event
                booking software for workshops and classes, a free platform for local experiences,
                or a simpler way to run recurring dates without high platform fees or a rigid
                checkout flow.
              </p>
            </div>

            <div aria-label="Host setup and payment guides" className="seo-icon-grid host-card-grid">
              {hostSetupCards.map((card) => (
                <article className="seo-icon-card host-seo-card" key={card.title}>
                  <div className="seo-icon-media">
                    <Image
                      alt={card.iconAlt}
                      className="seo-icon-image"
                      height={160}
                      loading="lazy"
                      quality={82}
                      sizes="160px"
                      src={card.iconSrc}
                      width={160}
                    />
                  </div>
                  <span className="seo-icon-mark">{card.label}</span>
                  <strong>{card.title}</strong>
                  {card.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </article>
              ))}
            </div>

            <div className="seo-comparison-copy">
              <span className="section-kicker">Comparison</span>
              <h3>How Passreserve compares with typical event platforms</h3>
              <p>
                If you are comparing free event booking software, free event registration tools,
                or ticketing alternatives for workshops, classes, retreats, and local experiences,
                this table focuses on the things organizers usually care about first: cost,
                payment flexibility, Stripe control, guest experience, and how complicated the
                setup feels day to day.
              </p>
            </div>

            <div className="comparison-table-wrap">
              <table className="comparison-table">
                <caption>Passreserve compared with typical paid event platform setups</caption>
                <thead>
                  <tr>
                    <th scope="col">What organizers compare</th>
                    <th scope="col">Passreserve</th>
                    <th scope="col">Typical event platform</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      <td>{row.passreserve}</td>
                      <td>{row.others}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="comparison-footnote">
              Passreserve keeps the base free and does not charge its own platform fee. If you
              choose online checkout, card processing is handled through your own Stripe account.
            </p>
          </article>
        </section>

        <section className="section-grid home-faq-section" id="faq">
          <article className="panel section-card section-span home-faq-intro">
            <div className="home-faq-copy">
              <span className="section-kicker">Host FAQ</span>
              <h2>Answers for hosts comparing free event software, deposits, and pay-at-event flows</h2>
              <p>
                This FAQ is written for organizers choosing a free event booking platform, a free
                event page builder, or a calmer ticketing alternative. It covers how Passreserve
                works, when it fits best, how to keep the base free, and how to collect online
                payments, deposits, or event-day payments without forcing guests into a heavier
                checkout than the event really needs.
              </p>
            </div>
            <div className="home-faq-side">
              <div className="home-faq-highlight-list">
                {homeFaqHighlights.map((highlight) => (
                  <div className="home-faq-highlight" key={highlight}>
                    {highlight}
                  </div>
                ))}
              </div>
              <div className="hero-actions home-faq-actions">
                <Link className="button button-primary" href="#organizer-launch">
                  Request access
                </Link>
                <Link className="button button-secondary" href="/events">
                  Browse events
                </Link>
              </div>
            </div>
          </article>

          {homeFaqGroups.map((group) => (
            <article className="panel section-card faq-group-card" key={group.title}>
              <div className="section-kicker">{group.label}</div>
              <h3>{group.title}</h3>
              <p className="faq-group-intro">{group.intro}</p>
              <div className="faq-accordion-list">
                {group.items.map((item) => (
                  <details className="faq-accordion-item" key={item.question}>
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
