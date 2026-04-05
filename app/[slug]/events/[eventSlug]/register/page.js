import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getRegistrationExperienceBySlugs,
  getRegistrationFieldRules,
  getRegistrationRouteParams,
  registrationFlowPhase
} from "../../../../../lib/passreserve-registrations";
import RegistrationFlowExperience from "./registration-flow-experience";

export function generateStaticParams() {
  return getRegistrationRouteParams();
}

export async function generateMetadata({ params }) {
  const { slug, eventSlug } = await params;
  const entry = getRegistrationExperienceBySlugs(slug, eventSlug);

  if (!entry) {
    return {
      title: "Registration not found"
    };
  }

  return {
    title: `Register for ${entry.event.title}`,
    description: `Create a registration hold for ${entry.event.title} on Passreserve.com.`
  };
}

export default async function RegistrationPage({ params, searchParams }) {
  const { slug, eventSlug } = await params;
  const query = await searchParams;
  const entry = getRegistrationExperienceBySlugs(slug, eventSlug, {
    occurrenceId: typeof query.occurrence === "string" ? query.occurrence : undefined
  });

  if (!entry) {
    notFound();
  }

  const { organizer, event, selectedOccurrence, selectedTicketCategory } = entry;

  return (
    <main className="shell">
      <div className="content">
        <header className="topbar">
          <div className="wordmark">
            <Link className="wordmark-name" href="/">
              Passreserve.com
            </Link>
            <span className="wordmark-tag">
              Registration holds, confirmation-first lifecycle, and Stripe-ready payment handoff
            </span>
          </div>
          <nav className="nav" aria-label="Registration navigation">
            <Link href="/">Discover</Link>
            <Link href={organizer.organizerHref}>Organizer hub</Link>
            <Link href={event.detailHref}>Event page</Link>
          </nav>
        </header>

        <section className="hero detail-hero">
          <article className="panel hero-copy public-hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              {registrationFlowPhase.label} live
            </span>
            <div className="breadcrumb">
              <Link href={organizer.organizerHref}>{organizer.name}</Link>
              <span>/</span>
              <Link href={event.detailHref}>{event.title}</Link>
              <span>/</span>
              <span>Register</span>
            </div>
            <div className="page-place">
              {organizer.city}, {organizer.region}
            </div>
            <h1>Start the attendee registration flow.</h1>
            <p>{registrationFlowPhase.summary}</p>
            <p>
              The attendee now picks a real occurrence, chooses ticket quantity, adds contact
              details, and creates a signed hold before landing on the confirmation step.
            </p>
            <div className="pill-list">
              <span className="pill">{event.collectionLabel}</span>
              <span className="pill">{event.occurrences.length} live occurrences</span>
              <span className="pill">{selectedOccurrence?.capacityLabel}</span>
              <span className="pill">{selectedTicketCategory?.label}</span>
            </div>
          </article>

          <aside className="panel hero-aside public-hero-aside">
            <div className="status-block">
              <div className="status-label">Registration snapshot</div>
              <h2>{selectedOccurrence?.label}</h2>
              <p>
                Holds last 30 minutes so the selected quantity can be protected without
                overselling the occurrence. Confirmation and registration code generation
                happen on the next two routes.
              </p>
            </div>

            <div className="metrics">
              <div className="metric">
                <div className="metric-label">Open dates</div>
                <div className="metric-value">{event.occurrences.length}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Seats still open</div>
                <div className="metric-value">{event.totalRemainingCapacity}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Collection rule</div>
                <div className="metric-value">{event.collectionLabel}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Venue</div>
                <div className="metric-value">{organizer.venue.title}</div>
              </div>
            </div>

            <div className="status-list">
              <div className="status-item">
                <span className="status-index">1</span>
                <div>
                  <strong>Capacity engine</strong>
                  Confirmed attendees, pending holds, and pending-payment seats now shape the
                  published availability.
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">2</span>
                <div>
                  <strong>Confirmation flow</strong>
                  The attendee still reviews the occurrence and acceptance checklist before the
                  registration is finalized.
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">3</span>
                <div>
                  <strong>Payment handoff</strong>
                  After confirmation, payment-required registrations now hand off into Stripe
                  Checkout or an explicit preview fallback when Stripe keys are absent.
                </div>
              </div>
            </div>
          </aside>
        </section>

        <RegistrationFlowExperience
          event={event}
          fieldRules={getRegistrationFieldRules()}
          initialOccurrenceId={selectedOccurrence?.id ?? null}
          initialTicketCategoryId={selectedTicketCategory?.id ?? null}
          organizer={organizer}
        />

        <footer className="footer">
          <span>
            Phase 09 keeps the occurrence-first registration flow intact while adding hosted
            payment handoff and webhook-ready reconciliation.
          </span>
          <Link href={event.detailHref}>Return to the event page</Link>
        </footer>
      </div>
    </main>
  );
}
