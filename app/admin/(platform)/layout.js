import Link from "next/link";

import {
  getPlatformOverview,
} from "../../../lib/passreserve-admin-service.js";
import { platformLogoutAction } from "../actions.js";
import { requirePlatformAdminSession } from "../../../lib/passreserve-auth.js";

export const dynamic = "force-dynamic";

export default async function PlatformAdminLayout({ children }) {
  await requirePlatformAdminSession();
  const overview = await getPlatformOverview();
  const navigation = [
    { label: "Overview", href: "/admin", hint: "Start here for the current queue, totals, and follow-up." },
    { label: "Organizers", href: "/admin/organizers", hint: "Approve hosts, update accounts, and open organizer dashboards." },
    { label: "Settings", href: "/admin/settings", hint: "Manage site-wide details such as contact info and defaults." },
    { label: "About", href: "/admin/about", hint: "Review the site story and shared public-facing copy." },
    { label: "Emails", href: "/admin/emails", hint: "Check templates and inbox-style organizer request activity." },
    { label: "Logs", href: "/admin/logs", hint: "Review recent system, registration, and payment activity." },
    { label: "Health", href: "/admin/health", hint: "Check storage, email, and Stripe readiness for production." }
  ];

  return (
    <main className="shell admin-shell">
      <div className="content admin-content">
        <header className="topbar admin-topbar">
          <div className="wordmark">
            <Link className="wordmark-name" href="/">
              Passreserve.com
            </Link>
            <span className="wordmark-tag">Private tools for approved Passreserve staff</span>
          </div>
          <nav className="nav" aria-label="Team shortcuts">
            <Link href="/">Public home</Link>
            <Link href="/#faq">FAQ</Link>
            <Link href="/admin/organizers">Hosts</Link>
            <Link href="/admin/emails">Emails</Link>
            <Link href="/admin/health">Checks</Link>
          </nav>
        </header>

        <section className="admin-layout">
          <aside className="panel admin-sidebar">
            <div className="admin-sidebar-block">
              <div className="page-place">{overview.releaseLabel}</div>
              <h1 className="admin-sidebar-title">Support dashboard</h1>
              <p className="admin-sidebar-copy">
                Review hosts, keep public pages accurate, check emails, and follow the main
                internal checks from one place.
              </p>
            </div>

            <div className="admin-summary-grid">
              <div className="admin-summary-card">
                <span className="metric-label">Organizers</span>
                <strong>{overview.summary.organizerCount}</strong>
              </div>
              <div className="admin-summary-card">
                <span className="metric-label">Events</span>
                <strong>{overview.summary.eventCount}</strong>
              </div>
              <div className="admin-summary-card">
                <span className="metric-label">Inbox open</span>
                <strong>{overview.summary.openRequestsCount}</strong>
              </div>
              <div className="admin-summary-card">
                <span className="metric-label">Inbox storage</span>
                <strong>{overview.summary.inboxStorageLabel}</strong>
              </div>
            </div>

            <div className="admin-sidebar-block">
              <div className="section-kicker">Quick links</div>
              <div className="admin-nav-list">
                {navigation.map((item) => (
                  <Link className="admin-nav-link" href={item.href} key={item.href}>
                    <span className="admin-nav-link-body">
                      <span className="admin-nav-title">{item.label}</span>
                      <span className="admin-nav-hint">{item.hint}</span>
                    </span>
                    <span aria-hidden="true">/</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="admin-sidebar-block">
              <div className="section-kicker">How to use this area</div>
              <div className="status-list">
                {[
                  {
                    title: "Organizers and requests",
                    detail:
                      "Use the Organizers area to approve new hosts, update their details, suspend accounts, or jump straight into their dashboard."
                  },
                  {
                    title: "Settings and public copy",
                    detail:
                      "Use Settings and About when you want to adjust shared brand details, contact information, or public-facing wording."
                  },
                  {
                    title: "Emails, logs, and checks",
                    detail:
                      "Use Emails, Logs, and Health when you need to confirm delivery, investigate an issue, or verify that payments and storage are ready."
                  }
                ].map((item, index) => (
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
              <span className="spotlight-label">Team contact</span>
              <strong>{overview.supportEmail}</strong>
              <span>{overview.summary.onlineCollectedLabel} collected online across active organizers</span>
              <form action={platformLogoutAction}>
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
