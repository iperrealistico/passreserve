import Link from "next/link";

import { siteSettingsSnapshot } from "../../../lib/passreserve-platform";

export const metadata = {
  title: "Team sign in"
};

export default function PlatformAdminLoginPage() {
  return (
    <main className="shell admin-shell">
      <div className="content">
        <header className="topbar admin-topbar">
          <div className="wordmark">
            <Link className="wordmark-name" href="/">
              Passreserve.com
            </Link>
            <span className="wordmark-tag">
              Staff tools for host requests, emails, settings, and service status
            </span>
          </div>
          <nav className="nav" aria-label="Platform login navigation">
            <Link href="/">Discover</Link>
            <Link href="/about">About</Link>
          </nav>
        </header>

        <section className="hero">
          <article className="panel hero-copy hero-stack">
            <span className="eyebrow">Staff access</span>
            <h1>Sign in to the Passreserve team dashboard.</h1>
            <p>
              Use this entry when you review host requests, manage settings, check emails, or
              monitor service status across Passreserve.com.
            </p>
            <p>
              Visitors should stay on host and event pages. This area is for the team supporting
              hosts behind the scenes.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/admin">
                Open team dashboard
              </Link>
              <Link className="button button-secondary" href="/about">
                Read about Passreserve
              </Link>
            </div>
          </article>

          <aside className="panel hero-aside">
            <div className="status-block">
              <div className="status-label">Support notes</div>
              <h2>One place for host requests, emails, and service status</h2>
              <p>
                Access is organized around host requests, settings, email delivery, and service
                status.
              </p>
            </div>

            <div className="status-list">
              <div className="status-item">
                <span className="status-index">1</span>
                <div>
                  <strong>Host request inbox</strong>
                  New host requests are sent to {siteSettingsSnapshot.operations.launchInbox}.
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">2</span>
                <div>
                  <strong>Team alerts</strong>
                  Deployment, email, and health follow-up go to{" "}
                  {siteSettingsSnapshot.operations.adminNotifications}.
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">3</span>
                <div>
                  <strong>Response target</strong>
                  {siteSettingsSnapshot.operations.supportResponseTarget}
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
