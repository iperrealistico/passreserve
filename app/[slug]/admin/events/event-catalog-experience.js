"use client";

import Link from "next/link";
import { useState } from "react";

import { eventVisibilityOptions } from "../../../../lib/passreserve-admin";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const categoryOptions = [
  "Guided morning",
  "Skills clinic",
  "Weekend pass",
  "Workshop",
  "Family experience",
  "Wellness session"
];

function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildEmptyEventForm(organizer) {
  return {
    title: "",
    category: categoryOptions[0],
    visibility: "draft",
    summary: "",
    defaultVenue: organizer.venueTitle,
    mapHref: organizer.venueMapHref,
    durationLabel: "3h 30m",
    defaultCapacity: 18,
    basePrice: 60,
    prepayPercentage: 30,
    attendeeInstructions:
      "Tell attendees where they arrive, what is already included, and what still happens at the venue.",
    organizerNotes:
      "Capture the promise guests should understand before the public page is updated.",
    cancellationPolicy:
      "Deposits stay tied to the selected occurrence unless the organizer republishes a replacement date."
  };
}

function toEditableEvent(event) {
  return {
    title: event.title,
    category: event.category,
    visibility: event.visibility,
    summary: event.summary,
    defaultVenue: event.defaultVenue,
    mapHref: event.mapHref,
    durationLabel: event.durationLabel,
    defaultCapacity: event.defaultCapacity,
    basePrice: event.basePrice,
    prepayPercentage: event.prepayPercentage,
    attendeeInstructions: event.attendeeInstructions,
    organizerNotes: event.organizerNotes,
    cancellationPolicy: event.cancellationPolicy
  };
}

function ensureUniqueSlug(existingEvents, baseSlug, currentSlug) {
  if (!baseSlug) {
    return `event-${existingEvents.length + 1}`;
  }

  let candidate = baseSlug;
  let suffix = 2;

  while (existingEvents.some((event) => event.slug === candidate && event.slug !== currentSlug)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function buildEventRecord(existingEvents, form, currentEvent) {
  const baseSlug = slugify(form.title);
  const slug = ensureUniqueSlug(existingEvents, baseSlug, currentEvent?.slug ?? null);
  const basePrice = Number(form.basePrice);
  const defaultCapacity = Number(form.defaultCapacity);
  const prepayPercentage = Number(form.prepayPercentage);

  return {
    ...(currentEvent ?? {}),
    slug,
    title: form.title.trim(),
    category: form.category,
    visibility: form.visibility,
    summary: form.summary.trim(),
    description: form.summary.trim(),
    defaultVenue: form.defaultVenue.trim(),
    mapHref: form.mapHref.trim(),
    durationLabel: form.durationLabel.trim(),
    durationMinutes: currentEvent?.durationMinutes ?? 210,
    defaultCapacity,
    basePrice,
    basePriceLabel: formatCurrency(basePrice),
    prepayPercentage,
    collectionLabel: `${prepayPercentage}% online`,
    attendeeInstructions: form.attendeeInstructions.trim(),
    organizerNotes: form.organizerNotes.trim(),
    cancellationPolicy: form.cancellationPolicy.trim(),
    nextOccurrenceLabel:
      currentEvent?.nextOccurrenceLabel ?? "No dates yet - add them in the date planner",
    occurrenceCount: currentEvent?.occurrenceCount ?? 0,
    publishedOccurrenceCount: currentEvent?.publishedOccurrenceCount ?? 0,
    registrationsCount: currentEvent?.registrationsCount ?? 0,
    publicHref: currentEvent?.publicHref ?? null,
    occurrences: currentEvent?.occurrences ?? []
  };
}

export default function EventCatalogExperience({ organizer }) {
  const [events, setEvents] = useState(organizer.events);
  const [selectedSlug, setSelectedSlug] = useState(organizer.events[0]?.slug ?? null);
  const [mode, setMode] = useState("edit");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(
    organizer.events[0] ? toEditableEvent(organizer.events[0]) : buildEmptyEventForm(organizer)
  );

  const selectedEvent = events.find((event) => event.slug === selectedSlug) ?? null;
  const publishedEvents = events.filter((event) => event.visibility === "public").length;
  const draftEvents = events.filter((event) => event.visibility === "draft").length;
  const totalOccurrences = events.reduce((sum, event) => sum + event.occurrenceCount, 0);

  function handleFieldChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function openCreateMode() {
    setMode("create");
    setSelectedSlug(null);
    setForm(buildEmptyEventForm(organizer));
    setMessage("Preparing a new event type draft for this organizer.");
  }

  function openEditMode(eventRecord) {
    setMode("edit");
    setSelectedSlug(eventRecord.slug);
    setForm(toEditableEvent(eventRecord));
    setMessage(`Editing ${eventRecord.title}.`);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim() || !form.summary.trim()) {
      setMessage("Add at least a title and short summary before saving.");
      return;
    }

    const currentEvent = selectedEvent;
    const nextRecord = buildEventRecord(events, form, mode === "edit" ? currentEvent : null);

    setEvents((current) => {
      if (mode === "edit" && currentEvent) {
        return current.map((eventRecord) =>
          eventRecord.slug === currentEvent.slug ? nextRecord : eventRecord
        );
      }

      return [nextRecord, ...current];
    });
    setSelectedSlug(nextRecord.slug);
    setMode("edit");
    setMessage(
      mode === "edit"
        ? `${nextRecord.title} updated.`
        : `${nextRecord.title} created. Add dates in the occurrence planner next.`
    );
  }

  function handleDelete() {
    if (!selectedEvent) {
      return;
    }

    if (
      !window.confirm(
        `Delete ${selectedEvent.title}? This removes its current date plan from this dashboard.`
      )
    ) {
      return;
    }

    const remaining = events.filter((event) => event.slug !== selectedEvent.slug);
    const nextSelection = remaining[0] ?? null;

    setEvents(remaining);
    setSelectedSlug(nextSelection?.slug ?? null);
    setMode(nextSelection ? "edit" : "create");
    setForm(nextSelection ? toEditableEvent(nextSelection) : buildEmptyEventForm(organizer));
    setMessage(`${selectedEvent.title} removed from the event catalog draft.`);
  }

  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="section-kicker">Event catalog management</div>
          <h2>Shape the event formats people can book.</h2>
          <p>
            Use this board to define the promise for each event type: venue, pricing, visibility,
            and default online collection before date-specific planning begins.
          </p>
          <div className="pill-list">
            <span className="pill">{events.length} event types</span>
            <span className="pill">{publishedEvents} public</span>
            <span className="pill">{draftEvents} draft</span>
            <span className="pill">{totalOccurrences} scheduled dates</span>
          </div>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">Current organizer focus</div>
            <h2>{organizer.name}</h2>
            <p>
              Create, update, and retire event types here, then hand each format over to the
              occurrence planner for one-off dates and recurring runs.
            </p>
          </div>

          <div className="status-list">
            <div className="status-item">
              <span className="status-index">1</span>
              <div>
                <strong>Default venue</strong>
                {organizer.venueTitle}
              </div>
            </div>
            <div className="status-item">
              <span className="status-index">2</span>
              <div>
                <strong>Collection model</strong>
                Event defaults decide whether dates start at 0%, deposit, or 100% online.
              </div>
            </div>
            <div className="status-item">
              <span className="status-index">3</span>
              <div>
                <strong>Public preview</strong>
                Published event types can still link straight back to the host page and live event
                pages.
              </div>
            </div>
          </div>

          <div className="hero-actions">
            <button className="button button-primary" onClick={openCreateMode} type="button">
              New event type
            </button>
            <Link className="button button-secondary" href={organizer.occurrencesHref}>
              Open occurrence planner
            </Link>
          </div>
        </aside>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section admin-section-wide">
          <div className="admin-section-header">
            <div>
              <div className="section-kicker">Catalog board</div>
              <h3>Each row now represents a reusable event type.</h3>
            </div>
            <div className="admin-inline-metrics">
              <span>{events.length} total</span>
              <span>{publishedEvents} public</span>
              <span>{totalOccurrences} linked dates</span>
            </div>
          </div>

          <div className="admin-card-grid">
            {events.map((event) => {
              const isActive = event.slug === selectedSlug;

              return (
                <article
                  className={`admin-card${isActive ? " admin-card-active" : ""}`}
                  key={event.slug}
                >
                  <div className="admin-card-head">
                    <div>
                      <div className="admin-badge-row">
                        <span className={`admin-badge admin-badge-${event.visibility}`}>
                          {event.visibility}
                        </span>
                        <span className="route-label">{event.category}</span>
                      </div>
                      <h4>{event.title}</h4>
                    </div>
                    <div className="admin-card-price">
                      <strong>{event.basePriceLabel}</strong>
                      <span>{event.collectionLabel}</span>
                    </div>
                  </div>

                  <p>{event.summary}</p>

                  <div className="admin-card-metrics">
                    <div>
                      <span className="spotlight-label">Default capacity</span>
                      <strong>{event.defaultCapacity}</strong>
                    </div>
                    <div>
                      <span className="spotlight-label">Occurrences</span>
                      <strong>{event.occurrenceCount}</strong>
                    </div>
                    <div>
                      <span className="spotlight-label">Published dates</span>
                      <strong>{event.publishedOccurrenceCount}</strong>
                    </div>
                  </div>

                  <div className="admin-note-list">
                    <div className="admin-note-item">
                      <span className="spotlight-label">Next live date</span>
                      <strong>{event.nextOccurrenceLabel}</strong>
                    </div>
                    <div className="admin-note-item">
                      <span className="spotlight-label">Venue default</span>
                      <strong>{event.defaultVenue}</strong>
                    </div>
                  </div>

                  <div className="admin-actions-row">
                    <button
                      className="button button-primary"
                      onClick={() => openEditMode(event)}
                      type="button"
                    >
                      Edit event
                    </button>
                    <Link
                      className="button button-secondary"
                      href={`${organizer.occurrencesHref}?event=${event.slug}`}
                    >
                      Manage dates
                    </Link>
                    {event.publicHref ? (
                      <Link className="button button-secondary" href={event.publicHref}>
                        Preview public page
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </article>

        <article className="panel section-card admin-section">
          <div className="section-kicker">{mode === "edit" ? "Edit event type" : "Create event type"}</div>
          <h3>
            {mode === "edit" && selectedEvent
              ? selectedEvent.title
              : "Create the next event type"}
          </h3>
          <p>
            Use this form to set the reusable defaults. The occurrence planner applies
            one-off or recurring dates on top of the event type once the organizer is ready.
          </p>

          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-field-grid">
              <label className="admin-field">
                <span>Event title</span>
                <input
                  className="admin-input"
                  name="title"
                  onChange={handleFieldChange}
                  placeholder="Sunrise ridge session"
                  type="text"
                  value={form.title}
                />
              </label>

              <label className="admin-field">
                <span>Category</span>
                <select
                  className="admin-select"
                  name="category"
                  onChange={handleFieldChange}
                  value={form.category}
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>Visibility</span>
                <select
                  className="admin-select"
                  name="visibility"
                  onChange={handleFieldChange}
                  value={form.visibility}
                >
                  {eventVisibilityOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>Duration label</span>
                <input
                  className="admin-input"
                  name="durationLabel"
                  onChange={handleFieldChange}
                  placeholder="3h 30m"
                  type="text"
                  value={form.durationLabel}
                />
              </label>

              <label className="admin-field">
                <span>Default venue</span>
                <input
                  className="admin-input"
                  name="defaultVenue"
                  onChange={handleFieldChange}
                  type="text"
                  value={form.defaultVenue}
                />
              </label>

              <label className="admin-field">
                <span>Venue map link</span>
                <input
                  className="admin-input"
                  name="mapHref"
                  onChange={handleFieldChange}
                  type="url"
                  value={form.mapHref}
                />
              </label>

              <label className="admin-field">
                <span>Default capacity</span>
                <input
                  className="admin-input"
                  min="1"
                  name="defaultCapacity"
                  onChange={handleFieldChange}
                  type="number"
                  value={form.defaultCapacity}
                />
              </label>

              <label className="admin-field">
                <span>Base price (EUR)</span>
                <input
                  className="admin-input"
                  min="0"
                  name="basePrice"
                  onChange={handleFieldChange}
                  type="number"
                  value={form.basePrice}
                />
              </label>

              <label className="admin-field">
                <span>Online collection (%)</span>
                <input
                  className="admin-input"
                  max="100"
                  min="0"
                  name="prepayPercentage"
                  onChange={handleFieldChange}
                  type="number"
                  value={form.prepayPercentage}
                />
              </label>
            </div>

            <label className="admin-field">
              <span>Short summary</span>
              <textarea
                className="admin-textarea"
                name="summary"
                onChange={handleFieldChange}
                rows="4"
                value={form.summary}
              />
            </label>

            <label className="admin-field">
              <span>Attendee instructions</span>
              <textarea
                className="admin-textarea"
                name="attendeeInstructions"
                onChange={handleFieldChange}
                rows="3"
                value={form.attendeeInstructions}
              />
            </label>

            <label className="admin-field">
              <span>Organizer notes</span>
              <textarea
                className="admin-textarea"
                name="organizerNotes"
                onChange={handleFieldChange}
                rows="3"
                value={form.organizerNotes}
              />
            </label>

            <label className="admin-field">
              <span>Cancellation policy</span>
              <textarea
                className="admin-textarea"
                name="cancellationPolicy"
                onChange={handleFieldChange}
                rows="3"
                value={form.cancellationPolicy}
              />
            </label>

            <div className="admin-form-actions">
              <button className="button button-primary" type="submit">
                {mode === "edit" ? "Save event type" : "Create event type"}
              </button>
              <button className="button button-secondary" onClick={openCreateMode} type="button">
                Start a new draft
              </button>
              <button
                className="button button-secondary"
                disabled={!selectedEvent}
                onClick={handleDelete}
                type="button"
              >
                Delete current event
              </button>
            </div>
          </form>

          <div className="admin-message" aria-live="polite">
            {message || "Select an event card or start a fresh draft to change the catalog."}
          </div>
        </article>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section">
          <div className="section-kicker">Helpful working patterns</div>
          <h3>This board keeps event setup clear.</h3>
          <div className="admin-note-list">
            <div className="admin-note-item">
              <span className="spotlight-label">Catalog-first list</span>
              <strong>Each event type stays editable from one board instead of hidden modal flows.</strong>
            </div>
            <div className="admin-note-item">
              <span className="spotlight-label">Direct public preview</span>
              <strong>Published event types still jump back to the live host page and event pages.</strong>
            </div>
            <div className="admin-note-item">
              <span className="spotlight-label">Date planning</span>
              <strong>Dates and per-occurrence overrides move into a dedicated planner instead of slot settings.</strong>
            </div>
          </div>
        </article>

        <article className="panel section-card admin-section">
          <div className="section-kicker">Ready for scheduling</div>
          <h3>Once the event defaults are right, shift into the occurrence planner.</h3>
          <p>
            Keep reusable event defaults here, then shape individual dates in the occurrence
            planner when timing, pricing, capacity, or venue details need to change.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href={organizer.occurrencesHref}>
              Plan one-off and recurring dates
            </Link>
            <Link className="button button-secondary" href={organizer.publicHref}>
              Review the public host page
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
