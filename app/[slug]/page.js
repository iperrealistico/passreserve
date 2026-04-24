import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicFooter } from "../public-footer.js";
import { PublicHeader } from "../public-header.js";
import { getTranslations } from "../../lib/passreserve-i18n.js";
import { getOrganizerPage } from "../../lib/passreserve-service.js";

export const dynamic = "force-dynamic";

function buildRegistrationHref(slug, eventSlug, occurrenceId) {
  return `/${slug}/events/${eventSlug}/register?occurrence=${occurrenceId}`;
}

function toList(value) {
  return Array.isArray(value) ? value : [];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { locale } = await getTranslations();
  const organizer = await getOrganizerPage(slug, { locale });

  if (!organizer) {
    return { title: "Page not found" };
  }

  return {
    title: `${organizer.name} · Organizer`,
    description: organizer.description
  };
}

export default async function OrganizerPage({ params }) {
  const { slug } = await params;
  const { locale, dictionary } = await getTranslations();
  const organizer = await getOrganizerPage(slug, { locale });
  const isItalian = locale === "it";

  if (!organizer) {
    notFound();
  }

  const agenda = toList(organizer.agenda);
  const summary =
    organizer.tagline ||
    organizer.description ||
    (isItalian
      ? "Pagina essenziale con date pubblicate e accesso diretto alla registrazione."
      : "Minimal page with published dates and direct access to registration.");

  return (
    <main className="shell">
      <div className="content">
        <PublicHeader
          contextItem={{ href: organizer.organizerHref, label: organizer.name }}
          currentPath={organizer.organizerHref}
          dictionary={dictionary}
          locale={locale}
        />

        <div className="mx-auto max-w-4xl">
          <section className="panel section-card mt-6">
            <div className="page-place">
              {organizer.city}, {organizer.region}
            </div>
            <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">{organizer.name}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
              {summary}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {organizer.venue.title ? (
                <span className="rounded-full border border-border px-3 py-2">
                  {organizer.venue.title}
                </span>
              ) : null}
              {organizer.defaultCollectionLabel ? (
                <span className="rounded-full border border-border px-3 py-2">
                  {organizer.defaultCollectionLabel}
                </span>
              ) : null}
            </div>

            <div className="hero-actions mt-6">
              <a className="button button-primary" href="#agenda">
                {isItalian ? "Vedi calendario" : "View calendar"}
              </a>
            </div>
          </section>

          <section className="panel section-card mt-6" id="agenda">
            <div className="section-kicker">{dictionary.organizer.agenda}</div>
            <h2>{isItalian ? "Date pubblicate" : "Published dates"}</h2>

            <div className="agenda-list">
              {agenda.length ? (
                agenda.map((occurrence) => (
                  <article className="agenda-item" key={occurrence.id}>
                    <div className="agenda-head">
                      <div className="flex flex-col gap-1">
                        <Link
                          className="text-2xl font-semibold text-foreground hover:text-primary"
                          href={`/${organizer.slug}/events/${occurrence.eventSlug}`}
                        >
                          {occurrence.eventTitle}
                        </Link>
                        <span>
                          {occurrence.label} · {occurrence.time}
                        </span>
                      </div>
                      <span className="route-label">{occurrence.capacity}</span>
                    </div>

                    <div className="agenda-meta">
                      <span>{occurrence.priceLabel}</span>
                      <span>{occurrence.collectionLabel}</span>
                      {occurrence.note ? <span>{occurrence.note}</span> : null}
                    </div>

                    <div className="hero-actions mt-4">
                      <Link
                        className="button button-primary"
                        href={buildRegistrationHref(organizer.slug, occurrence.eventSlug, occurrence.id)}
                      >
                        {dictionary.organizer.cta}
                      </Link>
                      <Link
                        className="button button-secondary"
                        href={`/${organizer.slug}/events/${occurrence.eventSlug}`}
                      >
                        {dictionary.events.openEvent}
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <article className="search-empty">
                  <h3>{isItalian ? "Nessuna data pubblicata" : "No published dates yet"}</h3>
                  <p>
                    {isItalian
                      ? "L'organizer puo pubblicare le prime date dall'area admin."
                      : "The organizer can publish the first dates from the admin area."}
                  </p>
                </article>
              )}
            </div>
          </section>
        </div>

        <PublicFooter dictionary={dictionary} locale={locale} />
      </div>
    </main>
  );
}
