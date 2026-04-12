import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getOrganizerShell
} from "../../../lib/passreserve-admin-service.js";
import { getCurrentSessionUser, getStoredPlatformSessionUser } from "../../../lib/passreserve-auth.js";
import { organizerLogoutAction, returnToPlatformDashboardAction } from "./actions.js";

export default async function OrganizerAdminLayout({ children, params }) {
  const { slug } = await params;
  const shell = await getOrganizerShell(slug);

  if (!shell) {
    notFound();
  }
  const organizer = shell.organizer;
  const sessionUser = await getCurrentSessionUser();
  const platformUser = await getStoredPlatformSessionUser();
  const signedIn = sessionUser?.type === "organizer" && sessionUser.organizerSlug === slug;

  if (!signedIn) {
    return children;
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
      label: "Billing",
      href: organizer.billingHref
    },
    {
      label: "Settings",
      href: organizer.settingsHref
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
            <Link href={organizer.billingHref}>Billing</Link>
            <Link href={organizer.settingsHref}>Settings</Link>
          </nav>
        </header>

        <section className="admin-layout">
          <aside className="panel admin-sidebar">
            <div className="admin-sidebar-block">
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
              <div className="section-kicker">Current focus</div>
              <div className="status-list">
                <div className="status-item">
                  <span className="status-index">1</span>
                  <div>
                    <strong>Keep published dates current</strong>
                    Update events and occurrences when schedules, pricing, or venue details change.
                  </div>
                </div>
                <div className="status-item">
                  <span className="status-index">2</span>
                  <div>
                    <strong>Review registrations often</strong>
                    Payment follow-up, attendance status, and venue balances are all tracked here.
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-sidebar-block admin-sidebar-footer">
              <span className="spotlight-label">Support contact</span>
              <strong>{organizer.supportEmail}</strong>
              <span>{organizer.timeZone}</span>
              {platformUser?.type === "platform" ? (
                <form action={returnToPlatformDashboardAction}>
                  <button className="button button-secondary" type="submit">
                    Return to support dashboard
                  </button>
                </form>
              ) : null}
              <form action={organizerLogoutAction}>
                <input name="slug" type="hidden" value={slug} />
                <button className="button button-secondary" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          </aside>

          <div className="admin-main">{children}</div>
        </section>
      </div>
    </main>
  );
}
