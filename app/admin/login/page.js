import Link from "next/link";

import { platformLoginAction, platformRequestResetAction } from "../actions.js";
import { PublicVisual } from "../../../lib/passreserve-visual-component.js";
import { routeVisuals } from "../../../lib/passreserve-visuals.js";

export const metadata = {
  title: "Team sign in"
};

function messageFor(value) {
  switch (value) {
    case "invalid":
      return "The email and password did not match an approved team account.";
    case "reset-sent":
      return "If that account exists, a password reset link has been generated.";
    case "password-updated":
      return "Password updated. You can sign in now.";
    case "signed-out":
      return "You have been signed out.";
    default:
      return "";
  }
}

export default async function PlatformAdminLoginPage({ searchParams }) {
  const query = await searchParams;
  const error = messageFor(typeof query.error === "string" ? query.error : "");
  const message = messageFor(typeof query.message === "string" ? query.message : "");

  return (
    <main className="shell admin-shell">
      <div className="content">
        <header className="topbar admin-topbar">
          <div className="wordmark">
            <Link className="wordmark-name" href="/">
              Passreserve.com
            </Link>
            <span className="wordmark-tag">Protected platform access for approved team accounts</span>
          </div>
          <nav className="nav" aria-label="Platform login navigation">
            <Link href="/">Discover</Link>
            <Link href="/about">About</Link>
          </nav>
        </header>

        <section className="hero detail-hero">
          <article className="panel hero-copy public-hero-copy">
            <div className="section-kicker">Team access</div>
            <h1>Sign in to manage organizers, content, and operational checks.</h1>
            <p>
              This area is protected with real team sessions. Organizer onboarding, templates,
              settings, logs, and support views all live behind this sign-in.
            </p>
            {error ? (
              <div className="registration-message registration-message-error">{error}</div>
            ) : null}
            {message ? (
              <div className="registration-message registration-message-success">{message}</div>
            ) : null}

            <form action={platformLoginAction} className="registration-panel-stack">
              <label className="field">
                <span>Email</span>
                <input name="email" placeholder="admin@passreserve.local" type="email" />
              </label>
              <label className="field">
                <span>Password</span>
                <input name="password" type="password" />
              </label>
              <div className="hero-actions">
                <button className="button button-primary" type="submit">
                  Sign in
                </button>
              </div>
            </form>
          </article>

          <aside className="panel hero-aside public-hero-aside">
            <PublicVisual
              className="aside-visual"
              sizes="(min-width: 1024px) 28vw, 100vw"
              visualId={routeVisuals.staffLogin}
            />
            <div className="status-block">
              <div className="status-label">Need a reset?</div>
              <h2>Request a fresh password link.</h2>
              <p>
                If the account exists, Passreserve will generate a one-time reset link and send
                or log it according to the current email configuration.
              </p>
            </div>

            <form action={platformRequestResetAction} className="registration-panel-stack">
              <input
                name="baseUrl"
                type="hidden"
                value={typeof query.baseUrl === "string" ? query.baseUrl : ""}
              />
              <label className="field">
                <span>Account email</span>
                <input name="email" placeholder="admin@passreserve.local" type="email" />
              </label>
              <div className="hero-actions">
                <button className="button button-secondary" type="submit">
                  Send reset link
                </button>
              </div>
            </form>
          </aside>
        </section>
      </div>
    </main>
  );
}
