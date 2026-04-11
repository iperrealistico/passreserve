import Link from "next/link";

import { HomeOrganizerRequestModal } from "./home-organizer-request-modal.js";
import { PublicHeader } from "./public-header.js";
import {
  organizerLaunchWindows,
  organizerPaymentModels,
} from "../lib/passreserve-domain.js";
import { PublicVisual } from "../lib/passreserve-visual-component.js";
import { routeVisuals } from "../lib/passreserve-visuals.js";

const hostIntentArticles = [
  {
    label: "Free setup",
    title: "A free event platform that still feels ready for real guests",
    paragraphs: [
      "If you are comparing free event registration software, a free event booking platform, or a free event signup platform, Passreserve gives you a clean way to publish dates, pricing, venue details, and registration rules without adding friction for your audience.",
      "It works as free event management software, a free ticketing alternative, and a free event page builder for teams searching free software for event organizers, free software for workshops and classes, or free event software for small teams."
    ]
  },
  {
    label: "Flexible payments",
    title: "Payment rules that match the way your events actually run",
    paragraphs: [
      "Some formats need guests to pay at the event, while others work better with pay later event booking, deposit event registration, or deposit-only event booking. Passreserve is event software without forced checkout, so the payment flow can match the venue, the audience, and the way you host.",
      "That gives organizers room for event booking with balance due at venue, a simple way to collect deposits for workshops, the option to let guests pay at the venue, and no online fee event booking when a lighter registration flow makes more sense."
    ]
  },
  {
    label: "Starting out",
    title: "Useful answers for hosts who are trying to get online quickly",
    paragraphs: [
      "Many organizers arrive with questions like how to create an event page for free or how to accept event registrations without high fees. Passreserve answers that with host pages that explain the experience clearly, show the next dates, and keep signup simple for guests.",
      "For people comparing the best free platform to book events, it also works as software for hosts who want guests to pay at the event, while still keeping registrations organized and the public page easy to trust."
    ]
  },
  {
    label: "Recurring formats",
    title: "A better fit for repeat dates, classes, retreats, and local experiences",
    paragraphs: [
      "If you host repeating sessions, Passreserve works as free event software for recurring dates, event booking software for retreats, and class booking software for small businesses that need upcoming dates, capacity, and pricing to stay easy to read.",
      "It also fits a free platform for local experiences, from workshops and tastings to guided rides, community gatherings, and seasonal programs that need calm presentation instead of a heavy marketplace feel."
    ]
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

export default async function HomePage({ searchParams }) {
  const query = await searchParams;

  return (
    <main className="shell">
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
                deposits, or let guests pay at the event, with a calmer setup that stays easy to
                understand for both hosts and attendees.
              </p>
            </div>

            <div aria-label="Host guides" className="host-intent-rail">
              {hostIntentArticles.map((article) => (
                <article className="host-intent-card" key={article.title}>
                  <span className="host-intent-tag">{article.label}</span>
                  <h3>{article.title}</h3>
                  {article.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </article>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
