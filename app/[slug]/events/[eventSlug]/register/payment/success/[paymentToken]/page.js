import Link from "next/link";
import { redirect } from "next/navigation";

import {
  resolveSuccessfulRegistrationConfirmation
} from "../../../../../../../../lib/passreserve-service.js";
import { PublicVisual } from "../../../../../../../../lib/passreserve-visual-component.js";
import { routeVisuals } from "../../../../../../../../lib/passreserve-visuals.js";

export async function generateMetadata({ params }) {
  const { slug, eventSlug } = await params;

  return {
    title: `Payment status for ${eventSlug}`,
    description: `Resolve the Passreserve.com payment status for ${slug}.`
  };
}

export default async function RegistrationPaymentSuccessPage({
  params,
  searchParams
}) {
  const { slug, eventSlug, paymentToken } = await params;
  const query = await searchParams;
  const resolution = await resolveSuccessfulRegistrationConfirmation({
    slug,
    eventSlug,
    paymentToken,
    preview: typeof query.preview === "string" ? query.preview : "",
    sessionId: typeof query.session_id === "string" ? query.session_id : ""
  });

  if (resolution.state === "redirect") {
    redirect(resolution.redirectHref);
  }

  return (
    <main className="shell">
      <div className="content">
        <section className="empty-state">
          <article className="panel empty-card">
            <PublicVisual
              className="empty-card-visual"
              sizes="(min-width: 768px) 36vw, 90vw"
              visualId={routeVisuals.paymentSuccess}
            />
            <h1>{resolution.title}</h1>
            <p>{resolution.message}</p>
            <div className="hero-actions">
              <Link
                className="button button-primary"
                href={`/${slug}/events/${eventSlug}/register/payment/cancel/${paymentToken}`}
              >
                Open the pending payment page
              </Link>
              <Link className="button button-secondary" href={`/${slug}/events/${eventSlug}`}>
                Return to the event page
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
