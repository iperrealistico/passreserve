import Link from "next/link";
import { notFound } from "next/navigation";

import { getRegistrationPendingView } from "../../../../../../lib/passreserve-service.js";
import { PublicVisual } from "../../../../../../lib/passreserve-visual-component.js";
import { routeVisuals } from "../../../../../../lib/passreserve-visuals.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug, eventSlug } = await params;
  const view = await getRegistrationPendingView(slug, eventSlug);

  if (view.state !== "ready") {
    return {
      title: "Check your email"
    };
  }

  return {
    title: `Check your email for ${view.event.title}`,
    description: `Open the confirmation email for ${view.event.title} to finish your Passreserve registration.`
  };
}

export default async function RegistrationPendingPage({ params }) {
  const { slug, eventSlug } = await params;
  const view = await getRegistrationPendingView(slug, eventSlug);

  if (view.state !== "ready") {
    notFound();
  }

  return (
    <main className="shell">
      <div className="content">
        <header className="topbar">
          <div className="wordmark">
            <Link className="wordmark-name" href="/">
              Passreserve.com
            </Link>
            <span className="wordmark-tag">
              Check your email to confirm the registration
            </span>
          </div>
          <nav className="nav" aria-label="Registration pending navigation">
            <Link href={view.organizer.organizerHref}>Host page</Link>
            <Link href={view.event.detailHref}>Event page</Link>
          </nav>
        </header>

        <section className="hero detail-hero">
          <article className="panel hero-copy public-hero-copy">
            <div className="breadcrumb">
              <Link href={view.organizer.organizerHref}>{view.organizer.name}</Link>
              <span>/</span>
              <Link href={view.event.detailHref}>{view.event.title}</Link>
              <span>/</span>
              <span>Check your email</span>
            </div>
            <div className="page-place">
              {view.organizer.city}, {view.organizer.region}
            </div>
            <h1>Open the email we just sent you.</h1>
            <p>
              Your place is being held briefly. Use the confirmation link in that email to review
              the details, accept the attendee checkboxes, and finish the registration.
            </p>
            <div className="pill-list">
              <span className="pill">{view.event.collectionLabel}</span>
              <span className="pill">{view.event.nextOccurrenceLabel}</span>
            </div>
          </article>

          <aside className="panel hero-aside public-hero-aside">
            <PublicVisual
              className="aside-visual"
              sizes="(min-width: 1024px) 28vw, 100vw"
              visualId={routeVisuals.registrationConfirm}
            />
            <div className="status-block">
              <div className="status-label">Next step</div>
              <h2>Confirm from your inbox</h2>
              <p>
                The email arrives at the address you just entered on the registration form. If you
                do not see it right away, check spam or promotions too.
              </p>
            </div>
          </aside>
        </section>

        <section className="registration-grid">
          <article className="panel section-card registration-flow-card">
            <div className="section-kicker">What happens now</div>
            <h2>Three quick steps</h2>
            <div className="registration-rule-list">
              {view.steps.map((step) => (
                <div className="registration-rule-item" key={step.title}>
                  <strong>{step.title}</strong>
                  <span>{step.detail}</span>
                </div>
              ))}
            </div>
          </article>

          <aside className="panel section-card registration-aside">
            <div className="section-kicker">Need help?</div>
            <h3>Start from the event page if needed</h3>
            <p>
              If the email does not arrive or you entered the wrong address, go back to the event
              page and create a fresh registration.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={view.event.detailHref}>
                Return to the event page
              </Link>
              {view.supportReplyEmail ? (
                <Link
                  className="button button-secondary"
                  href={`mailto:${view.supportReplyEmail}?subject=${encodeURIComponent(`Help with ${view.event.title}`)}`}
                >
                  Email the host
                </Link>
              ) : null}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
