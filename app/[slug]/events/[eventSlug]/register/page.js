import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getRegistrationExperienceBySlugs,
  getRegistrationFieldRules,
  getRegistrationRouteParams
} from "../../../../../lib/passreserve-service.js";
import { PublicVisual } from "../../../../../lib/passreserve-visual-component.js";
import { routeVisuals } from "../../../../../lib/passreserve-visuals.js";
import RegistrationFlowExperience from "./registration-flow-experience.js";

export async function generateStaticParams() {
  return getRegistrationRouteParams();
}

export async function generateMetadata({ params }) {
  const { slug, eventSlug } = await params;
  const entry = await getRegistrationExperienceBySlugs(slug, eventSlug);

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
  const entry = await getRegistrationExperienceBySlugs(slug, eventSlug, {
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
              Simple registration with clear dates and payment expectations
            </span>
          </div>
          <nav className="nav" aria-label="Registration navigation">
            <Link href="/">Discover</Link>
            <Link href={organizer.organizerHref}>Host page</Link>
            <Link href={event.detailHref}>Event page</Link>
          </nav>
        </header>

        <section className="hero detail-hero">
          <article className="panel hero-copy public-hero-copy">
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
            <h1>Start your registration.</h1>
            <p>
              Choose a date, select the right ticket, add your contact details, and review your
              total before you confirm anything.
            </p>
            <div className="pill-list">
              <span className="pill">{event.collectionLabel}</span>
              <span className="pill">{event.occurrences.length} upcoming dates</span>
              <span className="pill">{selectedOccurrence?.capacityLabel}</span>
              <span className="pill">{selectedTicketCategory?.label}</span>
            </div>
          </article>

          <aside className="panel hero-aside public-hero-aside">
            <PublicVisual
              className="aside-visual"
              sizes="(min-width: 1024px) 28vw, 100vw"
              visualId={routeVisuals.registrationStart}
            />
            <div className="status-block">
              <div className="status-label">Selected date</div>
              <h2>{selectedOccurrence?.label}</h2>
              <p>
                Your place is only reserved after you confirm on the next screen. If an online
                payment is required, you&apos;ll see that split clearly before it opens.
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
                  <strong>Clear availability</strong>
                  The seat count shown here reflects what is currently open for this date.
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">2</span>
                <div>
                  <strong>Review before you commit</strong>
                  You&apos;ll confirm your details and payment split before the registration is finalized.
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">3</span>
                <div>
                  <strong>Payment stays explicit</strong>
                  If any amount is due online, you&apos;ll see it separately from what stays due at the event.
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
          <span>Need more context first? Return to the event page at any time.</span>
          <Link href={event.detailHref}>Return to the event page</Link>
        </footer>
      </div>
    </main>
  );
}
