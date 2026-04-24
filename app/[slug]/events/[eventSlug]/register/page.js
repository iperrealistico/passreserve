import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicFooter } from "../../../../public-footer.js";
import { PublicHeader } from "../../../../public-header.js";
import { dietaryFlags } from "../../../../../lib/passreserve-dietary.js";
import { getTranslations } from "../../../../../lib/passreserve-i18n.js";
import { getRegistrationExperienceBySlugs } from "../../../../../lib/passreserve-service.js";
import RegistrationFlowExperience from "./registration-flow-experience.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug, eventSlug } = await params;
  const { locale } = await getTranslations();
  const entry = await getRegistrationExperienceBySlugs(slug, eventSlug, { locale });

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
    locale,
    occurrenceId: typeof query.occurrence === "string" ? query.occurrence : undefined
  });

  if (!entry) {
    notFound();
  }

  const { organizer, event, selectedOccurrence } = entry;
  const dietaryOptions = dietaryFlags.map((flag) => ({
    id: flag.id,
    label: flag.label[locale]
  }));

  return (
    <main className="shell">
      <div className="content">
        <PublicHeader dictionary={dictionary} locale={locale} />

        <div className="registration-page-bar">
          <div className="breadcrumb">
            <Link href={organizer.organizerHref}>{organizer.name}</Link>
            <span>/</span>
            <Link href={event.detailHref}>{event.title}</Link>
            <span>/</span>
            <span>{dictionary.registration.eyebrow}</span>
          </div>
          <div className="registration-page-meta">
            <span>
              {organizer.city}, {organizer.region}
            </span>
            {selectedOccurrence?.label ? <span>{selectedOccurrence.label}</span> : null}
            {selectedOccurrence?.capacityLabel ? <span>{selectedOccurrence.capacityLabel}</span> : null}
            <span>{event.collectionLabel}</span>
          </div>
        </div>

        {!selectedOccurrence?.registrationAvailable ? (
          <div className="registration-message-error mt-6">
            {selectedOccurrence?.registrationGate?.reason || dictionary.registration.blocked}
          </div>
        ) : null}

        <RegistrationFlowExperience
          dictionary={dictionary}
          dietaryOptions={dietaryOptions}
          event={event}
          initialOccurrenceId={selectedOccurrence?.id ?? null}
          locale={locale}
        />

        <PublicFooter dictionary={dictionary} locale={locale} />
      </div>
    </main>
  );
}
