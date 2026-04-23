import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicHeader } from "../../../../../public-header.js";
import { getTranslations } from "../../../../../../lib/passreserve-i18n.js";
import { getRegistrationPendingView } from "../../../../../../lib/passreserve-service.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug, eventSlug } = await params;
  const view = await getRegistrationPendingView(slug, eventSlug);

  if (view.state !== "ready") {
    return { title: "Check your email" };
  }

  return {
    title: `Check your email for ${view.event.title}`,
    description: `Open the confirmation email for ${view.event.title} to finish your registration.`
  };
}

export default async function RegistrationPendingPage({ params }) {
  const { slug, eventSlug } = await params;
  const view = await getRegistrationPendingView(slug, eventSlug);
  const { locale, dictionary } = await getTranslations();

  if (view.state !== "ready") {
    notFound();
  }

  return (
    <main className="shell">
      <div className="content">
        <PublicHeader dictionary={dictionary} locale={locale} />

        <section className="hero">
          <article className="hero-copy">
            <div className="breadcrumb">
              <Link href={view.organizer.organizerHref}>{view.organizer.name}</Link>
              <span>/</span>
              <Link href={view.event.detailHref}>{view.event.title}</Link>
              <span>/</span>
              <span>Email</span>
            </div>
            <h1>Open the email we just sent you.</h1>
            <p>
              Your place is being held briefly. Use the confirmation link in that email to review
              the details and finish the registration.
            </p>
          </article>

          <aside className="hero-aside">
            <div className="timeline">
              {view.steps.map((step) => (
                <div className="timeline-step" key={step.title}>
                  <strong>{step.title}</strong>
                  <span>{step.detail}</span>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="panel section-card mt-6">
          <div className="hero-actions">
            <Link className="button button-primary" href={view.event.detailHref}>
              Return to the event page
            </Link>
            {view.supportReplyEmail ? (
              <Link
                className="button button-secondary"
                href={`mailto:${view.supportReplyEmail}?subject=${encodeURIComponent(`Help with ${view.event.title}`)}`}
              >
                Email the organizer
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
