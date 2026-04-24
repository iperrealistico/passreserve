import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicFooter } from "../../../public-footer.js";
import { PublicHeader } from "../../../public-header.js";
import { getTranslations } from "../../../../lib/passreserve-i18n.js";
import { getRegistrationExperienceBySlugs } from "../../../../lib/passreserve-service.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug, eventSlug } = await params;
  const { locale } = await getTranslations();
  const entry = await getRegistrationExperienceBySlugs(slug, eventSlug, { locale });

  if (!entry) {
    return { title: "Event not found" };
  }

  return {
    title: entry.event.title,
    description: entry.event.summary
  };
}

export default async function EventDetailPage({ params }) {
  const { slug, eventSlug } = await params;
  const { locale, dictionary } = await getTranslations();
  const entry = await getRegistrationExperienceBySlugs(slug, eventSlug, { locale });
  const isItalian = locale === "it";

  if (!entry) {
    notFound();
  }

  const { organizer, event } = entry;
  const summary = event.description || event.summary;

  return (
    <main className="shell">
      <div className="content">
        <PublicHeader
          contextItem={{ href: event.detailHref, label: event.title }}
          currentPath={event.detailHref}
          dictionary={dictionary}
          locale={locale}
        />

        <div className="mx-auto max-w-4xl">
          <section className="panel section-card mt-6">
            <div className="breadcrumb">
              <Link href={organizer.organizerHref}>{organizer.name}</Link>
              <span>/</span>
              <span>{event.title}</span>
            </div>
            <div className="page-place">
              {organizer.city}, {organizer.region}
            </div>
            <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">{event.title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
              {summary}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="rounded-full border border-border px-3 py-2">
                {event.priceRangeLabel || event.priceLabel}
              </span>
              <span className="rounded-full border border-border px-3 py-2">
                {event.collectionLabel}
              </span>
              <span className="rounded-full border border-border px-3 py-2">
                {event.venueTitle || organizer.venue.title}
              </span>
              {event.duration ? (
                <span className="rounded-full border border-border px-3 py-2">
                  {event.duration}
                </span>
              ) : null}
            </div>

            <div className="hero-actions mt-6">
              <a className="button button-primary" href="#occurrences">
                {isItalian ? "Scegli data" : "Choose date"}
              </a>
              <Link className="button button-secondary" href={organizer.organizerHref}>
                {dictionary.event.hostPage}
              </Link>
            </div>
          </section>

          {event.ticketCategories?.length ? (
            <section className="panel section-card mt-6">
              <div className="section-kicker">{isItalian ? "Ticket" : "Tickets"}</div>
              <h2>{isItalian ? "Scegli il formato giusto" : "Choose the right ticket"}</h2>

              <div className="registration-choice-grid mt-6">
                {event.ticketCategories.map((ticket) => (
                  <article className="registration-choice registration-choice-active" key={ticket.id}>
                    <div className="registration-choice-head">
                      <div>
                        <strong>{ticket.label}</strong>
                        <span>{ticket.unitPriceLabel}</span>
                      </div>
                      {ticket.isDefault ? (
                        <span className="route-label">{isItalian ? "Default" : "Default"}</span>
                      ) : null}
                    </div>
                    <p>{ticket.summary}</p>
                    {ticket.included?.length ? (
                      <div className="timeline mt-4">
                        {ticket.included.map((includedItem) => (
                          <div className="timeline-step" key={`${ticket.id}-${includedItem}`}>
                            <strong>{isItalian ? "Include" : "Includes"}</strong>
                            <span>{includedItem}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="panel section-card mt-6" id="occurrences">
            <div className="section-kicker">{dictionary.event.dates}</div>
            <h2>{isItalian ? "Date disponibili" : "Available dates"}</h2>

            <div className="agenda-list">
              {event.occurrences.length ? (
                event.occurrences.map((occurrence) => (
                  <article className="agenda-item" key={occurrence.id}>
                    <div className="agenda-head">
                      <div className="flex flex-col gap-1">
                        <strong className="text-2xl font-semibold text-foreground">
                          {occurrence.label}
                        </strong>
                        <span>{occurrence.time}</span>
                      </div>
                      <span className="route-label">{occurrence.capacityLabel}</span>
                    </div>

                    <div className="agenda-meta">
                      <span>{event.priceRangeLabel || event.priceLabel}</span>
                      <span>{event.collectionLabel}</span>
                      <span>{event.venueTitle || organizer.venue.title}</span>
                      {occurrence.note ? <span>{occurrence.note}</span> : null}
                    </div>

                    {occurrence.registrationAvailable ? (
                      <Link className="button button-primary mt-4" href={occurrence.registrationHref}>
                        {dictionary.event.register}
                      </Link>
                    ) : (
                      <div className="mt-4 rounded-[1.25rem] bg-muted px-4 py-3 text-sm text-muted-foreground">
                        {occurrence.registrationGate?.reason || dictionary.registration.blocked}
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <article className="search-empty">
                  <h3>{dictionary.event.noDates}</h3>
                  <p>
                    {isItalian
                      ? "La pagina evento e pronta, ma le date devono ancora essere pubblicate."
                      : "The event page is ready, but dates still need to be published."}
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
