import Link from "next/link";

import { platformAdminPhase, siteSettingsSnapshot } from "../../../lib/passreserve-platform";

export const metadata = {
  title: "Platform admin login"
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
              Super-admin adaptation, CMS, emails, and platform operations
            </span>
          </div>
          <nav className="nav" aria-label="Platform login navigation">
            <Link href="/">Discover</Link>
            <Link href="/about">About</Link>
          </nav>
        </header>

        <section className="hero">
          <article className="panel hero-copy hero-stack">
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              {platformAdminPhase.label} live
            </span>
            <h1>Platform admins now enter Passreserve.com in event terms.</h1>
            <p>
              This sample-data workspace does not persist real super-admin credentials, so the
              login route focuses on the copy, routing, and operational framing that the real
              platform layer will need.
            </p>
            <p>
              The important shift is already here: organizers replace tenants, registrations
              replace bookings, and the platform-admin layer now connects settings, CMS, emails,
              logs, and health checks without rental-era language.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/admin">
                Enter platform admin
              </Link>
              <Link className="button button-secondary" href="/about">
                Review public story
              </Link>
            </div>
          </article>

          <aside className="panel hero-aside">
            <div className="status-block">
              <div className="status-label">Platform access note</div>
              <h2>Auth copy reviewed</h2>
              <p>
                The live message now describes platform-admin access, organizer support, and
                deployment responsibility instead of singleton super-admin or tenant terminology.
              </p>
            </div>

            <div className="status-list">
              <div className="status-item">
                <span className="status-index">1</span>
                <div>
                  <strong>Operations inbox</strong>
                  Organizer requests route to {siteSettingsSnapshot.operations.launchInbox}.
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">2</span>
                <div>
                  <strong>Platform notifications</strong>
                  Deployment, email, and health follow-up route to{" "}
                  {siteSettingsSnapshot.operations.adminNotifications}.
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">3</span>
                <div>
                  <strong>Verification rule</strong>
                  Every completed phase still needs post-push Vercel verification before handoff.
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
