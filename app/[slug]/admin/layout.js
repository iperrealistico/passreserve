import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getOrganizerOperationsBySlug,
  organizerOperationsGuidance
} from "../../../lib/passreserve-operations";

export default async function OrganizerAdminLayout({ children, params }) {
  const { slug } = await params;
  const organizer = getOrganizerOperationsBySlug(slug);

  if (!organizer) {
    notFound();
  }

  const navigation = [
    {
      label: "Dashboard",
      href: organizer.dashboardHref
    },
    {
      label: "Calendar",
      href: organizer.calendarHref
    },
    {
      label: "Registrations",
      href: organizer.registrationsHref
    },
    {
      label: "Payments",
      href: organizer.paymentsHref
    },
    {
      label: "Event catalog",
      href: organizer.eventsHref
    },
    {
      label: "Occurrences",
      href: organizer.occurrencesHref
    },
    {
      label: "Public host page",
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
              Host dashboard for dates, registrations, and payments
            </span>
          </div>
          <nav className="nav" aria-label="Host dashboard shortcuts">
            <Link href="/">Public home</Link>
            <Link href={organizer.publicHref}>Host page</Link>
            <Link href={organizer.dashboardHref}>Dashboard</Link>
            <Link href={organizer.calendarHref}>Calendar</Link>
            <Link href={organizer.registrationsHref}>Registrations</Link>
            <Link href={organizer.paymentsHref}>Payments</Link>
          </nav>
        </header>

        <section className="admin-layout">
          <aside className="panel admin-sidebar">
            <div className="admin-sidebar-block">
              <span className="eyebrow">Host dashboard</span>
              <div className="page-place">
                {organizer.city}, {organizer.region}
              </div>
              <h1 className="admin-sidebar-title">{organizer.name}</h1>
              <p className="admin-sidebar-copy">{organizer.tagline}</p>
            </div>

            <div className="admin-summary-grid">
              <div className="admin-summary-card">
                <span className="metric-label">Active regs</span>
                <strong>{organizer.summary.activeCount}</strong>
              </div>
              <div className="admin-summary-card">
                <span className="metric-label">Upcoming dates</span>
                <strong>{organizer.totalUpcomingOccurrences}</strong>
              </div>
              <div className="admin-summary-card">
                <span className="metric-label">Online collected</span>
                <strong>{organizer.summary.onlineCollectedLabel}</strong>
              </div>
              <div className="admin-summary-card">
                <span className="metric-label">Due at venue</span>
                <strong>{organizer.summary.dueAtEventLabel}</strong>
              </div>
            </div>

            <div className="admin-sidebar-block">
              <div className="section-kicker">Quick links</div>
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
              <div className="section-kicker">Today's focus</div>
              <div className="status-list">
                {organizerOperationsGuidance.map((item, index) => (
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
              <span>{organizer.timeZone}</span>
            </div>
          </aside>

          <div className="admin-main">{children}</div>
        </section>
      </div>
    </main>
  );
}
