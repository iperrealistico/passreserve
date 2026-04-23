import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveSuccessfulRegistrationConfirmation } from "../../../../../../../../lib/passreserve-service.js";

export async function generateMetadata({ params }) {
  const { eventSlug } = await params;

  return {
    title: `Payment status for ${eventSlug}`,
    description: `Resolve the payment status for ${eventSlug}.`
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
        <section className="search-empty">
          <h1>{resolution.title}</h1>
          <p>{resolution.message}</p>
          <div className="hero-actions mt-4">
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
        </section>
      </div>
    </main>
  );
}
