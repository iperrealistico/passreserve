import Link from "next/link";

import { PublicVisual } from "../../../lib/passreserve-visual-component";
import { routeVisuals } from "../../../lib/passreserve-visuals";

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
            <span className="wordmark-tag">Private sign-in for approved accounts</span>
          </div>
          <nav className="nav" aria-label="Platform login navigation">
            <Link href="/">Discover</Link>
            <Link href="/about">About</Link>
          </nav>
        </header>

        <section className="hero hero-single">
          <article className="panel hero-copy hero-stack hero-single-panel">
            <PublicVisual
              className="aside-visual admin-login-visual"
              sizes="(min-width: 1024px) 34rem, 100vw"
              visualId={routeVisuals.staffLogin}
            />
            <h1>Staff access</h1>
            <p>
              Sign in here if you already have access to the Passreserve team area.
            </p>
            <p>
              If you want to launch event pages on Passreserve.com, request access from the
              homepage first.
            </p>
            <div className="hero-actions hero-actions-inline">
              <Link className="button button-primary" href="/admin">
                Continue to dashboard
              </Link>
              <Link className="button button-secondary" href="/#organizer-launch">
                Request access
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
