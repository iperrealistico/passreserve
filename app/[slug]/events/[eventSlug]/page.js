import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicFooter } from "../../../public-footer.js";
import { PublicHeader } from "../../../public-header.js";
import { getTranslations } from "../../../../lib/passreserve-i18n.js";
import { getRegistrationExperienceBySlugs } from "../../../../lib/passreserve-service.js";

export const dynamic = "force-dynamic";

function normalizeQueryValue(value) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return typeof value === "string" ? value : "";
}

function splitTicketLabel(label) {
  const normalized = String(label || "").trim();
  const delimiterIndex = normalized.lastIndexOf(" - ");

  if (delimiterIndex === -1) {
    return {
      context: "",
      title: normalized
    };
  }

  return {
    context: normalized.slice(0, delimiterIndex).trim(),
    title: normalized.slice(delimiterIndex + 3).trim()
  };
}

function buildTicketFormatGroups(ticketCategories = [], event, isItalian) {
  const groups = new Map();

  for (const ticket of ticketCategories) {
    const signature = JSON.stringify({
      unitPriceLabel: ticket.unitPriceLabel || "",
      summary: ticket.summary || "",
      included: ticket.included || [],
      onlineAmountLabel: ticket.payment?.onlineAmountLabel || "",
      dueAtEventLabel: ticket.payment?.dueAtEventLabel || ""
    });

    if (!groups.has(signature)) {
      groups.set(signature, {
        signature,
        tickets: [],
        unitPriceLabel: ticket.unitPriceLabel,
        collectionLabel: event.collectionLabel,
        summary: ticket.summary,
        included: ticket.included || [],
        onlineAmountLabel: ticket.payment?.onlineAmountLabel || null,
        dueAtEventLabel: ticket.payment?.dueAtEventLabel || null
      });
    }

    groups.get(signature).tickets.push(ticket);
  }

  return Array.from(groups.values()).map((group, index) => {
    const labels = group.tickets
      .map((ticket) => splitTicketLabel(ticket.label))
      .filter((entry) => entry.title);
    const uniqueTitles = [...new Set(labels.map((entry) => entry.title))];
    const derivedTitle =
      uniqueTitles.length === 1
        ? uniqueTitles[0]
        : group.tickets[0]?.label || (isItalian ? "Formato disponibile" : "Available format");
    const hasRepeatedDates = group.tickets.length > 1;

    return {
      id: `${group.signature}-${index}`,
      title: derivedTitle,
      availabilityHint: hasRepeatedDates
        ? isItalian
          ? "Stesso formato disponibile sulle date pubblicate."
          : "The same format is available across the published dates."
        : null,
      unitPriceLabel: group.unitPriceLabel,
      collectionLabel: group.collectionLabel,
      summary: group.summary,
      included: group.included,
      onlineAmountLabel: group.onlineAmountLabel,
      dueAtEventLabel: group.dueAtEventLabel
    };
  });
}

function reorderOccurrences(occurrences = [], selectedOccurrenceId = "") {
  if (!selectedOccurrenceId) {
    return occurrences;
  }

  const selectedOccurrence = occurrences.find((occurrence) => occurrence.id === selectedOccurrenceId);

  if (!selectedOccurrence) {
    return occurrences;
  }

  return [
    selectedOccurrence,
    ...occurrences.filter((occurrence) => occurrence.id !== selectedOccurrenceId)
  ];
}

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

export default async function EventDetailPage({ params, searchParams }) {
  const { slug, eventSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const { locale, dictionary } = await getTranslations();
  const selectedOccurrenceId = normalizeQueryValue(resolvedSearchParams?.occurrence);
  const entry = await getRegistrationExperienceBySlugs(slug, eventSlug, {
    locale,
    occurrenceId: selectedOccurrenceId
  });
  const isItalian = locale === "it";

  if (!entry) {
    notFound();
  }

  const { organizer, event } = entry;
  const summary = event.description || event.summary;
  const selectedOccurrence =
    event.occurrences.find((occurrence) => occurrence.id === selectedOccurrenceId) ||
    event.nextOccurrence ||
    event.occurrences[0] ||
    null;
  const orderedOccurrences = reorderOccurrences(event.occurrences, selectedOccurrence?.id || "");
  const ticketFormatGroups = buildTicketFormatGroups(event.ticketCategories, event, isItalian);
  const registerHeroHref =
    selectedOccurrence?.registrationAvailable && selectedOccurrence?.registrationHref
      ? selectedOccurrence.registrationHref
      : "#occurrences";

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
              <a className="button button-primary" href={registerHeroHref}>
                {selectedOccurrence?.registrationAvailable
                  ? isItalian
                    ? "Registrati per questa data"
                    : "Register for this date"
                  : isItalian
                    ? "Scegli data"
                    : "Choose date"}
              </a>
              <Link className="button button-secondary" href={organizer.organizerHref}>
                {dictionary.event.hostPage}
              </Link>
            </div>
          </section>

          {selectedOccurrence ? (
            <section className="detail-hero-summary mt-6">
              <div className="detail-hero-summary-head">
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="section-kicker">
                    {isItalian ? "Data in evidenza" : "Selected date"}
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    {selectedOccurrence.label}
                  </h2>
                  <p className="text-base leading-7 text-muted-foreground sm:text-lg">
                    {selectedOccurrence.time}
                  </p>
                </div>

                <span className="route-label">{selectedOccurrence.capacityLabel}</span>
              </div>

              <div className="event-meta-row mt-5">
                <span>{event.priceRangeLabel || event.priceLabel}</span>
                <span className="event-meta-divider" aria-hidden="true" />
                <span>{event.collectionLabel}</span>
                <span className="event-meta-divider" aria-hidden="true" />
                <span>{event.venueTitle || organizer.venue.title}</span>
              </div>

              {selectedOccurrence.note ? (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {selectedOccurrence.note}
                </p>
              ) : null}
            </section>
          ) : null}

          {event.refundPolicy ? (
            <section className="panel section-card mt-6">
              <div className="section-kicker">{isItalian ? "Policy rimborso" : "Refund policy"}</div>
              <h2>{event.refundPolicy.label}</h2>
              <p className="event-policy-summary mt-3">{event.refundPolicy.summary}</p>
              <div className="event-policy-detail mt-5">
                <p>{event.refundPolicy.detail}</p>
              </div>
            </section>
          ) : null}

          {ticketFormatGroups.length ? (
            <section className="panel section-card mt-6">
              <div className="section-kicker">{isItalian ? "Formato" : "Format"}</div>
              <h2>
                {isItalian ? "Cosa include la registrazione" : "What the registration includes"}
              </h2>

              <div className="registration-choice-grid mt-6">
                {ticketFormatGroups.map((group) => (
                  <article className="event-format-card" key={group.id}>
                    <div className="event-format-head">
                      <div className="event-format-copy">
                        <strong>{group.title}</strong>
                        {group.availabilityHint ? <span>{group.availabilityHint}</span> : null}
                      </div>
                      <div className="event-format-price">
                        <strong>{group.unitPriceLabel}</strong>
                        <span>{group.collectionLabel}</span>
                      </div>
                    </div>

                    {group.summary ? (
                      <p className="event-format-summary">{group.summary}</p>
                    ) : null}

                    <div className="event-meta-row mt-5">
                      {group.onlineAmountLabel ? (
                        <>
                          <span>
                            {isItalian ? "Online" : "Online"} {group.onlineAmountLabel}
                          </span>
                          {group.dueAtEventLabel ? (
                            <span className="event-meta-divider" aria-hidden="true" />
                          ) : null}
                        </>
                      ) : null}
                      {group.dueAtEventLabel ? (
                        <span>
                          {isItalian ? "Sul posto" : "At the event"} {group.dueAtEventLabel}
                        </span>
                      ) : null}
                    </div>

                    {group.included?.length ? (
                      <div className="event-format-included">
                        <strong>{isItalian ? "Include" : "Includes"}</strong>
                        <ul className="event-format-included-list">
                          {group.included.map((includedItem) => (
                            <li key={`${group.id}-${includedItem}`}>{includedItem}</li>
                          ))}
                        </ul>
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
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              {isItalian
                ? "Scegli la serata che preferisci: ogni card qui sotto porta direttamente alla registrazione della data selezionata."
                : "Choose the date you prefer: each card below leads directly to the registration flow for that specific date."}
            </p>

            <div className="agenda-list">
              {orderedOccurrences.length ? (
                orderedOccurrences.map((occurrence) => (
                  <article
                    className={`agenda-item${occurrence.id === selectedOccurrence?.id ? " registration-choice-active" : ""}`}
                    key={occurrence.id}
                  >
                    <div className="agenda-head">
                      <div className="flex flex-col gap-2">
                        <strong className="text-2xl font-semibold text-foreground">
                          {occurrence.label}
                        </strong>
                        <span>{occurrence.time}</span>
                      </div>
                      <span className="route-label">{occurrence.capacityLabel}</span>
                    </div>

                    <div className="event-meta-row mt-5">
                      <span>{event.priceRangeLabel || event.priceLabel}</span>
                      <span className="event-meta-divider" aria-hidden="true" />
                      <span>{event.collectionLabel}</span>
                      <span className="event-meta-divider" aria-hidden="true" />
                      <span>{event.venueTitle || organizer.venue.title}</span>
                      {occurrence.note ? <span>{occurrence.note}</span> : null}
                    </div>

                    {occurrence.registrationAvailable ? (
                      <div className="hero-actions mt-5">
                        <Link className="button button-primary" href={occurrence.registrationHref}>
                          {isItalian ? "Registrati per questa data" : "Register for this date"}
                        </Link>
                      </div>
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
