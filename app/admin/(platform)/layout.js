import Link from "next/link";

import {
  getPlatformOverview,
  platformAdminGuidance,
  platformAdminNavigation
} from "../../../lib/passreserve-platform";

export const dynamic = "force-dynamic";

export default async function PlatformAdminLayout({ children }) {
  const overview = await getPlatformOverview();

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
            <Link href="/about">About</Link>
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
                {platformAdminNavigation.map((item) => (
                  <Link className="admin-nav-link" href={item.href} key={item.href}>
                    <span>{item.label}</span>
                    <span aria-hidden="true">/</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="admin-sidebar-block">
              <div className="section-kicker">What this area covers</div>
              <div className="status-list">
                {platformAdminGuidance.map((item, index) => (
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
            </div>
          </aside>

          <div className="admin-main">{children}</div>
        </section>
      </div>
    </main>
  );
}
