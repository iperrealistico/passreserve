import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getOrganizerAdminBySlug,
  organizerAdminGuidance,
  organizerAdminPhase
} from "../../../lib/passreserve-admin";

export default async function OrganizerAdminLayout({ children, params }) {
  const { slug } = await params;
  const organizer = getOrganizerAdminBySlug(slug);

  if (!organizer) {
    notFound();
  }

  const navigation = [
    {
      label: "Event catalog",
      href: organizer.eventsHref
    },
    {
      label: "Occurrences",
      href: organizer.occurrencesHref
    },
    {
      label: "Public organizer page",
      href: organizer.publicHref
    }
  ];

  return (
    <main className="shell admin-shell">
      <div className="content admin-content">
        <header className="topbar admin-topbar">
          <div className="wordmark">
            <Link className="wordmark-name" href="/">
              Passreserve.com
            </Link>
            <span className="wordmark-tag">
              Organizer admin, event catalog management, and occurrence scheduling
            </span>
          </div>
          <nav className="nav" aria-label="Organizer admin shortcuts">
            <Link href="/">Discover</Link>
            <Link href={organizer.publicHref}>Organizer hub</Link>
            <Link href={organizer.eventsHref}>Admin events</Link>
            <Link href={organizer.occurrencesHref}>Admin occurrences</Link>
          </nav>
        </header>

        <section className="admin-layout">
          <aside className="panel admin-sidebar">
            <div className="admin-sidebar-block">
              <span className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true" />
                {organizerAdminPhase.label} live
              </span>
              <div className="page-place">
                {organizer.city}, {organizer.region}
              </div>
              <h1 className="admin-sidebar-title">{organizer.name}</h1>
              <p className="admin-sidebar-copy">{organizer.tagline}</p>
            </div>

            <div className="admin-summary-grid">
              <div className="admin-summary-card">
                <span className="metric-label">Event types</span>
                <strong>{organizer.metrics.eventCount}</strong>
              </div>
              <div className="admin-summary-card">
                <span className="metric-label">Occurrences</span>
                <strong>{organizer.metrics.occurrenceCount}</strong>
              </div>
              <div className="admin-summary-card">
                <span className="metric-label">Published</span>
                <strong>{organizer.metrics.publishedOccurrences}</strong>
              </div>
              <div className="admin-summary-card">
                <span className="metric-label">Conflicts</span>
                <strong>{organizer.metrics.conflictCount}</strong>
              </div>
            </div>

            <div className="admin-sidebar-block">
              <div className="section-kicker">Admin navigation</div>
              <div className="admin-nav-list">
                {navigation.map((item) => (
                  <Link className="admin-nav-link" href={item.href} key={item.href}>
                    <span>{item.label}</span>
                    <span aria-hidden="true">/</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="admin-sidebar-block">
              <div className="section-kicker">Why this admin layer exists</div>
              <div className="status-list">
                {organizerAdminGuidance.map((item, index) => (
                  <div className="status-item" key={item.title}>
                    <span className="status-index">{index + 1}</span>
                    <div>
                      <strong>{item.title}</strong>
                      {item.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-sidebar-block admin-sidebar-footer">
              <span className="spotlight-label">Support contact</span>
              <strong>{organizer.supportEmail}</strong>
              <span>{organizer.venueTitle}</span>
            </div>
          </aside>

          <div className="admin-main">{children}</div>
        </section>
      </div>
    </main>
  );
}
