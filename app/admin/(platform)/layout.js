import Link from "next/link";

import {
  getPlatformOverview,
  platformAdminGuidance,
  platformAdminNavigation,
  platformAdminPhase
} from "../../../lib/passreserve-platform";

export default function PlatformAdminLayout({ children }) {
  const overview = getPlatformOverview();

  return (
    <main className="shell admin-shell">
      <div className="content admin-content">
        <header className="topbar admin-topbar">
          <div className="wordmark">
            <Link className="wordmark-name" href="/">
              Passreserve.com
            </Link>
            <span className="wordmark-tag">
              Platform admin, organizer management, CMS, emails, and health
            </span>
          </div>
          <nav className="nav" aria-label="Platform admin shortcuts">
            <Link href="/">Discover</Link>
            <Link href="/about">About</Link>
            <Link href="/admin/organizers">Organizers</Link>
            <Link href="/admin/emails">Emails</Link>
            <Link href="/admin/health">Health</Link>
          </nav>
        </header>

        <section className="admin-layout">
          <aside className="panel admin-sidebar">
            <div className="admin-sidebar-block">
              <span className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true" />
                {platformAdminPhase.label} live
              </span>
              <div className="page-place">{overview.releaseLabel}</div>
              <h1 className="admin-sidebar-title">Platform admin</h1>
              <p className="admin-sidebar-copy">{platformAdminPhase.summary}</p>
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
                <span className="metric-label">Stripe mode</span>
                <strong>{overview.summary.stripeModeLabel}</strong>
              </div>
            </div>

            <div className="admin-sidebar-block">
              <div className="section-kicker">Admin navigation</div>
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
              <div className="section-kicker">Phase guidance</div>
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
              <span className="spotlight-label">Platform support</span>
              <strong>{overview.supportEmail}</strong>
              <span>{overview.summary.onlineCollectedLabel} collected online across seeded organizers</span>
            </div>
          </aside>

          <div className="admin-main">{children}</div>
        </section>
      </div>
    </main>
  );
}
