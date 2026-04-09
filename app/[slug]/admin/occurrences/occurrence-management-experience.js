"use client";

import Link from "next/link";
import { useState } from "react";

import {
  findVenueScheduleConflicts,
  occurrenceStatusOptions,
  recurrenceModeOptions
} from "../../../../lib/passreserve-admin";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const dateLabelFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Rome"
});

const timeLabelFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Rome"
});

const inputDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/Rome"
});

function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}

function addDaysToDateString(dateValue, days) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function toRomeIso(dateValue, timeValue) {
  return new Date(`${dateValue}T${timeValue}:00+02:00`).toISOString();
}

function toInputDate(value) {
  return inputDateFormatter.format(new Date(value));
}

function toInputTime(value) {
  return timeLabelFormatter.format(new Date(value));
}

function formatDateLabel(value) {
  return dateLabelFormatter.format(new Date(value));
}

function formatTimeRange(startValue, endValue) {
  return `${timeLabelFormatter.format(new Date(startValue))} to ${timeLabelFormatter.format(
    new Date(endValue)
  )}`;
}

function sortOccurrences(occurrences) {
  return [...occurrences].sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

function buildNextOccurrenceLabel(occurrences) {
  const sortedOccurrences = sortOccurrences(occurrences);
  const nextOccurrence =
    sortedOccurrences.find((occurrence) => occurrence.published) ?? sortedOccurrences[0] ?? null;

  return nextOccurrence
    ? `${nextOccurrence.label} - ${nextOccurrence.timeLabel}`
    : "No published dates yet";
}

function hydrateEventStats(event) {
  const occurrences = sortOccurrences(event.occurrences);

  return {
    ...event,
    occurrences,
    occurrenceCount: occurrences.length,
    publishedOccurrenceCount: occurrences.filter((occurrence) => occurrence.published).length,
    registrationsCount: occurrences.reduce(
      (sum, occurrence) => sum + occurrence.registeredCount,
      0
    ),
    nextOccurrenceLabel: buildNextOccurrenceLabel(occurrences)
  };
}

function findEventBySlug(events, eventSlug) {
  return events.find((event) => event.slug === eventSlug) ?? null;
}

function buildPlannerState(event) {
  const firstOccurrence = event.occurrences[0] ?? null;

  return {
    date: firstOccurrence ? toInputDate(firstOccurrence.startsAt) : "2026-06-06",
    time: firstOccurrence ? toInputTime(firstOccurrence.startsAt) : "09:00",
    durationMinutes: String(event.durationMinutes ?? 210),
    recurrenceMode: recurrenceModeOptions[0].id,
    repeatCount: "4",
    capacityOverride: String(event.defaultCapacity),
    priceOverride: String(event.basePrice),
    prepayOverride: String(event.prepayPercentage),
    venueOverride: event.defaultVenue,
    published: true,
    status: "scheduled",
    note: `Use the ${event.title} defaults, then adjust the specific date if needed.`
  };
}

function buildOccurrenceRecord(event, planner, sequenceIndex) {
  const nextDate =
    planner.recurrenceMode === "weekly"
      ? addDaysToDateString(planner.date, sequenceIndex * 7)
      : planner.date;
  const startsAt = toRomeIso(nextDate, planner.time);
  const endsAt = new Date(
    new Date(startsAt).getTime() + Number(planner.durationMinutes) * 60 * 1000
  ).toISOString();
  const capacity = Number(planner.capacityOverride) || event.defaultCapacity;
  const price = Number(planner.priceOverride) || event.basePrice;
  const prepayPercentage = Number(planner.prepayOverride);

  return {
    id: `${event.slug}-${nextDate}-${planner.time.replace(":", "")}-${sequenceIndex + 1}`,
    label: formatDateLabel(startsAt),
    startsAt,
    endsAt,
    timeLabel: formatTimeRange(startsAt, endsAt),
    capacity,
    registeredCount: 0,
    remainingCount: capacity,
    price,
    priceLabel: formatCurrency(price),
    prepayPercentage,
    collectionLabel: `${prepayPercentage}% online`,
    venue: planner.venueOverride.trim() || event.defaultVenue,
    published: planner.published,
    status: planner.status,
    note: planner.note.trim() || "Draft occurrence ready for organizer review.",
    recurrenceLabel:
      planner.recurrenceMode === "weekly"
        ? `Weekly series · run ${sequenceIndex + 1}`
        : "One-off date",
    eventSlug: event.slug,
    eventTitle: event.title
  };
}

function toOccurrenceEditor(occurrence) {
  return {
    label: occurrence.label,
    date: toInputDate(occurrence.startsAt),
    time: toInputTime(occurrence.startsAt),
    durationMinutes: String(
      Math.round(
        (new Date(occurrence.endsAt).getTime() - new Date(occurrence.startsAt).getTime()) /
          60000
      )
    ),
    capacity: String(occurrence.capacity),
    price: String(occurrence.price),
    prepayPercentage: String(occurrence.prepayPercentage),
    venue: occurrence.venue,
    published: occurrence.published,
    status: occurrence.status,
    note: occurrence.note
  };
}

function buildUpdatedOccurrence(baseOccurrence, editor) {
  const startsAt = toRomeIso(editor.date, editor.time);
  const endsAt = new Date(
    new Date(startsAt).getTime() + Number(editor.durationMinutes) * 60 * 1000
  ).toISOString();
  const capacity = Number(editor.capacity);
  const registeredCount = Math.min(baseOccurrence.registeredCount, capacity);

  return {
    ...baseOccurrence,
    label: formatDateLabel(startsAt),
    startsAt,
    endsAt,
    timeLabel: formatTimeRange(startsAt, endsAt),
    capacity,
    registeredCount,
    remainingCount: capacity - registeredCount,
    price: Number(editor.price),
    priceLabel: formatCurrency(Number(editor.price)),
    prepayPercentage: Number(editor.prepayPercentage),
    collectionLabel: `${Number(editor.prepayPercentage)}% online`,
    venue: editor.venue.trim(),
    published: editor.published,
    status: editor.status,
    note: editor.note.trim()
  };
}

function replaceOccurrence(events, occurrenceId, nextOccurrence) {
  return events.map((event) => ({
    ...(event.occurrences.some((occurrence) => occurrence.id === occurrenceId)
      ? hydrateEventStats({
          ...event,
          occurrences: event.occurrences.map((occurrence) =>
            occurrence.id === occurrenceId ? nextOccurrence : occurrence
          )
        })
      : event)
  }));
}

function removeOccurrence(events, occurrenceId) {
  return events.map((event) => ({
    ...(event.occurrences.some((occurrence) => occurrence.id === occurrenceId)
      ? hydrateEventStats({
          ...event,
          occurrences: event.occurrences.filter((occurrence) => occurrence.id !== occurrenceId)
        })
      : event)
  }));
}

function removeOccurrenceForConflictCheck(events, occurrenceId) {
  return events.map((event) => ({
    ...event,
    occurrences: event.occurrences.filter((occurrence) => occurrence.id !== occurrenceId)
  }));
}

function getOccurrenceById(events, occurrenceId) {
  for (const event of events) {
    const occurrence = event.occurrences.find((entry) => entry.id === occurrenceId);

    if (occurrence) {
      return {
        event,
        occurrence
      };
    }
  }

  return null;
}

export default function OccurrenceManagementExperience({
  organizer,
  initialEventSlug
}) {
  const initialEvent =
    findEventBySlug(organizer.events, initialEventSlug) ?? organizer.events[0] ?? null;
  const [events, setEvents] = useState(organizer.events);
  const [selectedEventSlug, setSelectedEventSlug] = useState(initialEvent?.slug ?? null);
  const [planner, setPlanner] = useState(
    initialEvent ? buildPlannerState(initialEvent) : null
  );
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState(
    initialEvent?.occurrences[0]?.id ?? null
  );
  const [editor, setEditor] = useState(
    initialEvent?.occurrences[0] ? toOccurrenceEditor(initialEvent.occurrences[0]) : null
  );
  const [message, setMessage] = useState("");

  const selectedEvent = selectedEventSlug ? findEventBySlug(events, selectedEventSlug) : null;
  const selectedOccurrence = selectedOccurrenceId
    ? getOccurrenceById(events, selectedOccurrenceId)
    : null;
  const previewOccurrences =
    selectedEvent && planner
      ? Array.from(
          { length: planner.recurrenceMode === "weekly" ? Number(planner.repeatCount) : 1 },
          (_, index) => buildOccurrenceRecord(selectedEvent, planner, index)
        )
      : [];
  const builderConflicts = selectedEvent
    ? findVenueScheduleConflicts(events, previewOccurrences).filter((conflict) =>
        conflict.items.some((item) => item.source === "preview")
      )
    : [];
  const existingConflicts = findVenueScheduleConflicts(events);
  const selectedEventOccurrences = selectedEvent
    ? sortOccurrences(selectedEvent.occurrences)
    : [];
  const publishedOccurrences = events.reduce(
    (sum, event) => sum + event.occurrences.filter((occurrence) => occurrence.published).length,
    0
  );

  function handlePlannerChange(event) {
    const { name, value, type, checked } = event.target;

    setPlanner((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handleEditorChange(event) {
    const { name, value, type, checked } = event.target;

    setEditor((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handleEventSwitch(event) {
    const nextEvent = findEventBySlug(events, event.target.value);

    if (!nextEvent) {
      return;
    }

    setSelectedEventSlug(nextEvent.slug);
    setPlanner(buildPlannerState(nextEvent));
    setSelectedOccurrenceId(nextEvent.occurrences[0]?.id ?? null);
    setEditor(nextEvent.occurrences[0] ? toOccurrenceEditor(nextEvent.occurrences[0]) : null);
    setMessage(`Loaded ${nextEvent.title} for occurrence planning.`);
  }

  function handleCreateOccurrences(event) {
    event.preventDefault();

    if (!selectedEvent || !previewOccurrences.length) {
      setMessage("Select an event type and build at least one occurrence preview.");
      return;
    }

    if (builderConflicts.length) {
      setMessage("Resolve the flagged venue-time conflicts before creating these dates.");
      return;
    }

    const nextEvents = events.map((eventRecord) => {
      if (eventRecord.slug !== selectedEvent.slug) {
        return eventRecord;
      }

      return hydrateEventStats({
        ...eventRecord,
        occurrences: [...eventRecord.occurrences, ...previewOccurrences]
      });
    });

    setEvents(nextEvents);
    setSelectedOccurrenceId(previewOccurrences[0].id);
    setEditor(toOccurrenceEditor(previewOccurrences[0]));
    setPlanner(buildPlannerState(findEventBySlug(nextEvents, selectedEvent.slug)));
    setMessage(
      `Created ${previewOccurrences.length} ${
        previewOccurrences.length === 1 ? "occurrence" : "occurrences"
      } for ${selectedEvent.title}.`
    );
  }

  function openOccurrence(occurrence) {
    setSelectedOccurrenceId(occurrence.id);
    setEditor(toOccurrenceEditor(occurrence));
    setMessage(`Editing ${occurrence.label} for ${selectedEvent?.title}.`);
  }

  function handleSaveOccurrence(event) {
    event.preventDefault();

    if (!selectedOccurrence || !editor) {
      return;
    }

    const nextOccurrence = buildUpdatedOccurrence(selectedOccurrence.occurrence, editor);
    const trimmedEvents = removeOccurrenceForConflictCheck(events, selectedOccurrence.occurrence.id);
    const conflicts = findVenueScheduleConflicts(trimmedEvents, [
      {
        ...nextOccurrence,
        eventSlug: selectedOccurrence.event.slug,
        eventTitle: selectedOccurrence.event.title
      }
    ]).filter((conflict) => conflict.items.some((item) => item.source === "preview"));

    if (conflicts.length) {
      setMessage("This update creates a venue conflict. Adjust the time, venue, or publication state first.");
      return;
    }

    const nextEvents = replaceOccurrence(events, selectedOccurrence.occurrence.id, nextOccurrence);

    setEvents(nextEvents);
    setEditor(toOccurrenceEditor(nextOccurrence));
    setMessage(`${selectedOccurrence.event.title} updated for ${nextOccurrence.label}.`);
  }

  function handleDeleteOccurrence() {
    if (!selectedOccurrence) {
      return;
    }

    if (
      !window.confirm(
        `Delete the ${selectedOccurrence.occurrence.label} occurrence from ${selectedOccurrence.event.title}?`
      )
    ) {
      return;
    }

    const nextEvents = removeOccurrence(events, selectedOccurrence.occurrence.id);
    const nextEvent = findEventBySlug(nextEvents, selectedOccurrence.event.slug);
    const nextOccurrence = nextEvent?.occurrences[0] ?? null;

    setEvents(nextEvents);
    setSelectedOccurrenceId(nextOccurrence?.id ?? null);
    setEditor(nextOccurrence ? toOccurrenceEditor(nextOccurrence) : null);
    setMessage(`${selectedOccurrence.event.title} occurrence removed.`);
  }

  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="section-kicker">Occurrence management</div>
          <h2>One-off dates and recurring series now live as first-class organizer admin records.</h2>
          <p>
            Choose an event type, generate a one-off date or weekly run, then adjust
            capacity, pricing, venue, and publication on the specific occurrence without
            touching the reusable event definition.
          </p>
          <div className="pill-list">
            <span className="pill">{events.length} event types</span>
            <span className="pill">{publishedOccurrences} published dates</span>
            <span className="pill">{existingConflicts.length} flagged conflicts</span>
          </div>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">Selected event type</div>
            <h2>{selectedEvent?.title ?? "No event selected"}</h2>
            <p>
              Use recurring planning for steady weekly formats, or lock a one-off date when
              the organizer needs a single published occurrence with its own overrides.
            </p>
          </div>

          <div className="status-list">
            <div className="status-item">
              <span className="status-index">1</span>
              <div>
                <strong>Default price</strong>
                {selectedEvent ? selectedEvent.basePriceLabel : "Select an event"}
              </div>
            </div>
            <div className="status-item">
              <span className="status-index">2</span>
              <div>
                <strong>Default capacity</strong>
                {selectedEvent ? String(selectedEvent.defaultCapacity) : "Select an event"}
              </div>
            </div>
            <div className="status-item">
              <span className="status-index">3</span>
              <div>
                <strong>Conflict handling</strong>
                Venue overlaps are blocked before creation so organizers can resolve the clash
                inside the planner.
              </div>
            </div>
          </div>

          <div className="hero-actions">
            <Link className="button button-primary" href={organizer.eventsHref}>
              Back to event catalog
            </Link>
            <Link className="button button-secondary" href={organizer.publicHref}>
              Open public host page
            </Link>
          </div>
        </aside>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section admin-section-wide">
          <div className="admin-section-header">
            <div>
              <div className="section-kicker">Recurring planner</div>
              <h3>Generate one-off or weekly occurrence drafts.</h3>
            </div>
            <label className="admin-field admin-field-inline">
              <span>Event type</span>
              <select
                className="admin-select"
                onChange={handleEventSwitch}
                value={selectedEventSlug ?? ""}
              >
                {events.map((event) => (
                  <option key={event.slug} value={event.slug}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {planner && selectedEvent ? (
            <form className="admin-form" onSubmit={handleCreateOccurrences}>
              <div className="admin-field-grid">
                <label className="admin-field">
                  <span>Start date</span>
                  <input
                    className="admin-input"
                    name="date"
                    onChange={handlePlannerChange}
                    type="date"
                    value={planner.date}
                  />
                </label>

                <label className="admin-field">
                  <span>Start time</span>
                  <input
                    className="admin-input"
                    name="time"
                    onChange={handlePlannerChange}
                    type="time"
                    value={planner.time}
                  />
                </label>

                <label className="admin-field">
                  <span>Duration (minutes)</span>
                  <input
                    className="admin-input"
                    min="30"
                    name="durationMinutes"
                    onChange={handlePlannerChange}
                    step="15"
                    type="number"
                    value={planner.durationMinutes}
                  />
                </label>

                <label className="admin-field">
                  <span>Creation mode</span>
                  <select
                    className="admin-select"
                    name="recurrenceMode"
                    onChange={handlePlannerChange}
                    value={planner.recurrenceMode}
                  >
                    {recurrenceModeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {planner.recurrenceMode === "weekly" ? (
                  <label className="admin-field">
                    <span>How many weekly runs</span>
                    <input
                      className="admin-input"
                      max="8"
                      min="2"
                      name="repeatCount"
                      onChange={handlePlannerChange}
                      type="number"
                      value={planner.repeatCount}
                    />
                  </label>
                ) : null}

                <label className="admin-field">
                  <span>Capacity override</span>
                  <input
                    className="admin-input"
                    min="1"
                    name="capacityOverride"
                    onChange={handlePlannerChange}
                    type="number"
                    value={planner.capacityOverride}
                  />
                </label>

                <label className="admin-field">
                  <span>Price override (EUR)</span>
                  <input
                    className="admin-input"
                    min="0"
                    name="priceOverride"
                    onChange={handlePlannerChange}
                    type="number"
                    value={planner.priceOverride}
                  />
                </label>

                <label className="admin-field">
                  <span>Online collection (%)</span>
                  <input
                    className="admin-input"
                    max="100"
                    min="0"
                    name="prepayOverride"
                    onChange={handlePlannerChange}
                    type="number"
                    value={planner.prepayOverride}
                  />
                </label>

                <label className="admin-field">
                  <span>Status</span>
                  <select
                    className="admin-select"
                    name="status"
                    onChange={handlePlannerChange}
                    value={planner.status}
                  >
                    {occurrenceStatusOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="admin-field">
                <span>Venue override</span>
                <input
                  className="admin-input"
                  name="venueOverride"
                  onChange={handlePlannerChange}
                  type="text"
                  value={planner.venueOverride}
                />
              </label>

              <label className="admin-field">
                <span>Occurrence note</span>
                <textarea
                  className="admin-textarea"
                  name="note"
                  onChange={handlePlannerChange}
                  rows="3"
                  value={planner.note}
                />
              </label>

              <label className="admin-checkbox">
                <input
                  checked={planner.published}
                  name="published"
                  onChange={handlePlannerChange}
                  type="checkbox"
                />
                <span>Publish these dates immediately</span>
              </label>

              <div className="admin-form-actions">
                <button className="button button-primary" type="submit">
                  Create {previewOccurrences.length || 1} occurrence
                  {previewOccurrences.length === 1 ? "" : "s"}
                </button>
              </div>
            </form>
          ) : null}

          <div className="admin-preview-grid">
            <div className="admin-preview-panel">
              <div className="section-kicker">Preview</div>
              <h4>These dates will be created from the current planner settings.</h4>
              <div className="admin-occurrence-list">
                {previewOccurrences.map((occurrence) => (
                  <article className="admin-occurrence-card" key={occurrence.id}>
                    <div className="admin-card-head">
                      <div>
                        <span className="route-label">{occurrence.recurrenceLabel}</span>
                        <h4>{occurrence.label}</h4>
                      </div>
                      <span className={`admin-badge admin-badge-${occurrence.published ? "public" : "draft"}`}>
                        {occurrence.published ? "published" : "draft"}
                      </span>
                    </div>
                    <div className="admin-card-metrics">
                      <div>
                        <span className="spotlight-label">Time</span>
                        <strong>{occurrence.timeLabel}</strong>
                      </div>
                      <div>
                        <span className="spotlight-label">Capacity</span>
                        <strong>{occurrence.capacity}</strong>
                      </div>
                      <div>
                        <span className="spotlight-label">Price</span>
                        <strong>{occurrence.priceLabel}</strong>
                      </div>
                    </div>
                    <p>{occurrence.note}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="admin-preview-panel">
              <div className="section-kicker">Conflict review</div>
              <h4>Venue overlap is checked before anything is added.</h4>
              {builderConflicts.length ? (
                <div className="admin-conflict-list">
                  {builderConflicts.map((conflict) => (
                    <article className="admin-conflict-card" key={conflict.id}>
                      <strong>{conflict.summary}</strong>
                      <p>
                        {conflict.items[0].label} and {conflict.items[1].label} both use{" "}
                        {conflict.venue}.
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="admin-message admin-message-success">
                  No venue-time collisions were found in this preview.
                </div>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section admin-section-wide">
          <div className="admin-section-header">
            <div>
              <div className="section-kicker">Scheduled occurrences</div>
              <h3>Each date can override the reusable event defaults.</h3>
            </div>
            <div className="admin-inline-metrics">
              <span>{selectedEventOccurrences.length} dates for this event</span>
              <span>{existingConflicts.length} organizer-wide conflicts</span>
            </div>
          </div>

          <div className="admin-occurrence-list">
            {selectedEventOccurrences.map((occurrence) => (
              <article className="admin-occurrence-card" key={occurrence.id}>
                <div className="admin-card-head">
                  <div>
                    <div className="admin-badge-row">
                      <span className={`admin-badge admin-badge-${occurrence.published ? "public" : "draft"}`}>
                        {occurrence.published ? "published" : "draft"}
                      </span>
                      <span className="route-label">{occurrence.status}</span>
                    </div>
                    <h4>{occurrence.label}</h4>
                  </div>
                  <button
                    className="button button-secondary"
                    onClick={() => openOccurrence(occurrence)}
                    type="button"
                  >
                    Edit occurrence
                  </button>
                </div>

                <div className="admin-card-metrics">
                  <div>
                    <span className="spotlight-label">Time</span>
                    <strong>{occurrence.timeLabel}</strong>
                  </div>
                  <div>
                    <span className="spotlight-label">Venue</span>
                    <strong>{occurrence.venue}</strong>
                  </div>
                  <div>
                    <span className="spotlight-label">Capacity</span>
                    <strong>
                      {occurrence.registeredCount}/{occurrence.capacity}
                    </strong>
                  </div>
                  <div>
                    <span className="spotlight-label">Collection</span>
                    <strong>{occurrence.collectionLabel}</strong>
                  </div>
                </div>

                <p>{occurrence.note}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel section-card admin-section">
          <div className="section-kicker">Occurrence editor</div>
          <h3>
            {selectedOccurrence ? selectedOccurrence.occurrence.label : "Select an occurrence"}
          </h3>
          <p>
            Update the specific date without touching the event defaults. Publication, venue,
            price, and capacity can all diverge when the organizer needs a special-case run.
          </p>

          {editor && selectedOccurrence ? (
            <form className="admin-form" onSubmit={handleSaveOccurrence}>
              <div className="admin-field-grid">
                <label className="admin-field">
                  <span>Date</span>
                  <input
                    className="admin-input"
                    name="date"
                    onChange={handleEditorChange}
                    type="date"
                    value={editor.date}
                  />
                </label>

                <label className="admin-field">
                  <span>Time</span>
                  <input
                    className="admin-input"
                    name="time"
                    onChange={handleEditorChange}
                    type="time"
                    value={editor.time}
                  />
                </label>

                <label className="admin-field">
                  <span>Duration (minutes)</span>
                  <input
                    className="admin-input"
                    min="30"
                    name="durationMinutes"
                    onChange={handleEditorChange}
                    step="15"
                    type="number"
                    value={editor.durationMinutes}
                  />
                </label>

                <label className="admin-field">
                  <span>Capacity</span>
                  <input
                    className="admin-input"
                    min="1"
                    name="capacity"
                    onChange={handleEditorChange}
                    type="number"
                    value={editor.capacity}
                  />
                </label>

                <label className="admin-field">
                  <span>Price (EUR)</span>
                  <input
                    className="admin-input"
                    min="0"
                    name="price"
                    onChange={handleEditorChange}
                    type="number"
                    value={editor.price}
                  />
                </label>

                <label className="admin-field">
                  <span>Online collection (%)</span>
                  <input
                    className="admin-input"
                    max="100"
                    min="0"
                    name="prepayPercentage"
                    onChange={handleEditorChange}
                    type="number"
                    value={editor.prepayPercentage}
                  />
                </label>

                <label className="admin-field">
                  <span>Status</span>
                  <select
                    className="admin-select"
                    name="status"
                    onChange={handleEditorChange}
                    value={editor.status}
                  >
                    {occurrenceStatusOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="admin-field">
                <span>Venue</span>
                <input
                  className="admin-input"
                  name="venue"
                  onChange={handleEditorChange}
                  type="text"
                  value={editor.venue}
                />
              </label>

              <label className="admin-field">
                <span>Occurrence note</span>
                <textarea
                  className="admin-textarea"
                  name="note"
                  onChange={handleEditorChange}
                  rows="4"
                  value={editor.note}
                />
              </label>

              <label className="admin-checkbox">
                <input
                  checked={editor.published}
                  name="published"
                  onChange={handleEditorChange}
                  type="checkbox"
                />
                <span>Published on the public host page</span>
              </label>

              <div className="admin-form-actions">
                <button className="button button-primary" type="submit">
                  Save occurrence
                </button>
                <button className="button button-secondary" onClick={handleDeleteOccurrence} type="button">
                  Delete occurrence
                </button>
              </div>
            </form>
          ) : (
            <div className="admin-message">
              Pick an occurrence card to edit its venue, capacity, price, publication state,
              or status.
            </div>
          )}

          <div className="admin-message" aria-live="polite">
            {message || "Planner and editor updates will report here."}
          </div>
        </article>
      </section>
    </div>
  );
}
