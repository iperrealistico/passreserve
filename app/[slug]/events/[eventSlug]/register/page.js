import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicHeader } from "../../../../public-header.js";
import { dietaryFlags } from "../../../../../lib/passreserve-dietary.js";
import { getTranslations } from "../../../../../lib/passreserve-i18n.js";
import { getRegistrationExperienceBySlugs } from "../../../../../lib/passreserve-service.js";
import RegistrationFlowExperience from "./registration-flow-experience.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug, eventSlug } = await params;
  const entry = await getRegistrationExperienceBySlugs(slug, eventSlug);

  if (!entry) {
    return { title: "Registration not found" };
  }

  return {
    title: `Register for ${entry.event.title}`,
    description: `Start the registration for ${entry.event.title} and complete the attendee questionnaire.`
  };
}

export default async function RegistrationPage({ params, searchParams }) {
  const { slug, eventSlug } = await params;
  const query = await searchParams;
  const { locale, dictionary } = await getTranslations();
  const entry = await getRegistrationExperienceBySlugs(slug, eventSlug, {
    occurrenceId: typeof query.occurrence === "string" ? query.occurrence : undefined
  });

  if (!entry) {
    notFound();
  }

  const { organizer, event, selectedOccurrence, selectedTicketCategory } = entry;
  const dietaryOptions = dietaryFlags.map((flag) => ({
    id: flag.id,
    label: flag.label[locale]
  }));

  return (
    <main className="shell">
      <div className="content">
        <PublicHeader dictionary={dictionary} locale={locale} />

        <section className="hero">
          <article className="hero-copy">
            <div className="breadcrumb">
              <Link href={organizer.organizerHref}>{organizer.name}</Link>
              <span>/</span>
              <Link href={event.detailHref}>{event.title}</Link>
              <span>/</span>
              <span>{dictionary.registration.eyebrow}</span>
            </div>
            <div className="page-place">
              {organizer.city}, {organizer.region}
            </div>
            <h1>{dictionary.registration.title}</h1>
            <p>{dictionary.registration.summary}</p>
          </article>

          <aside className="hero-aside">
            <div className="metrics">
              <div className="metric">
                <div className="metric-label">{dictionary.registration.steps.occurrence}</div>
                <div className="metric-value">{selectedOccurrence?.label}</div>
              </div>
              <div className="metric">
                <div className="metric-label">{dictionary.registration.steps.ticket}</div>
                <div className="metric-value">{selectedTicketCategory?.label}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Availability</div>
                <div className="metric-value">{selectedOccurrence?.capacityLabel}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Payment</div>
                <div className="metric-value">{event.collectionLabel}</div>
              </div>
            </div>

            {!selectedOccurrence?.registrationAvailable ? (
              <div className="registration-message-error mt-6">
                {selectedOccurrence?.registrationGate?.reason || dictionary.registration.blocked}
              </div>
            ) : null}
          </aside>
        </section>

        <RegistrationFlowExperience
          dictionary={dictionary}
          dietaryOptions={dietaryOptions}
          event={event}
          initialOccurrenceId={selectedOccurrence?.id ?? null}
          initialTicketCategoryId={selectedTicketCategory?.id ?? null}
          locale={locale}
        />
      </div>
    </main>
  );
}
