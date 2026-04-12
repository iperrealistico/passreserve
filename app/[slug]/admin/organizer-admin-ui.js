import Link from "next/link";

function buildQueryString(query = {}, eventSlug = "") {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query || {})) {
    if (["event", "message", "error"].includes(key)) {
      continue;
    }

    if (typeof value === "string" && value) {
      params.set(key, value);
    }
  }

  if (eventSlug) {
    params.set("event", eventSlug);
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export function OrganizerAdminPageHeader({
  eyebrow,
  title,
  description,
  tip,
  basePath,
  events = [],
  selectedEvent = "",
  query = {},
  actions = null
}) {
  return (
    <section className="panel section-card admin-section">
      <div className="admin-section-header">
        <div>
          <div className="section-kicker">{eyebrow}</div>
          <h2>{title}</h2>
        </div>
        {actions ? <div className="hero-actions">{actions}</div> : null}
      </div>
      {description ? <p className="admin-page-lead">{description}</p> : null}
      {tip ? <p className="admin-page-tip">{tip}</p> : null}
      {events.length > 1 ? (
        <div className="admin-filter-strip">
          <span className="admin-filter-label">Filter by event</span>
          <div className="filter-row">
            <Link
              className={`filter-pill ${selectedEvent ? "" : "filter-pill-active"}`}
              href={`${basePath}${buildQueryString(query)}`}
            >
              All events
            </Link>
            {events.map((event) => (
              <Link
                className={`filter-pill ${selectedEvent === event.slug ? "filter-pill-active" : ""}`}
                href={`${basePath}${buildQueryString(query, event.slug)}`}
                key={event.slug}
              >
                {event.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
