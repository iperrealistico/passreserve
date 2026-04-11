import Link from "next/link";

import { organizerLoginAction, organizerRequestResetAction } from "../actions.js";
import { getOrganizerShell } from "../../../../lib/passreserve-admin-service.js";

export const metadata = {
  title: "Organizer sign in"
};

function messageFor(value) {
  switch (value) {
    case "invalid":
      return "The email and password did not match an active organizer admin account.";
    case "reset-sent":
      return "If that organizer admin exists, a password reset link has been generated.";
    case "password-updated":
      return "Password updated. You can sign in now.";
    case "signed-out":
      return "You have been signed out.";
    default:
      return "";
  }
}

export default async function OrganizerLoginPage({ params, searchParams }) {
  const { slug } = await params;
  const shell = await getOrganizerShell(slug);
  const query = await searchParams;
  const error = messageFor(typeof query.error === "string" ? query.error : "");
  const message = messageFor(typeof query.message === "string" ? query.message : "");

  if (!shell) {
    return (
      <main className="shell">
        <div className="content">
          <section className="empty-state">
            <article className="panel empty-card">
              <h1>Organizer not found</h1>
              <p>This organizer admin route is not available.</p>
            </article>
          </section>
        </div>
      </main>
    );
  }

  return (
    <section className="hero detail-hero">
      <article className="panel hero-copy public-hero-copy">
        <div className="section-kicker">{shell.organizer.name}</div>
        <h1>Organizer admin sign in</h1>
        <p>
          Manage events, occurrences, registrations, and payments for this organizer from the
          protected admin area.
        </p>
        {error ? (
          <div className="registration-message registration-message-error">{error}</div>
        ) : null}
        {message ? (
          <div className="registration-message registration-message-success">{message}</div>
        ) : null}

        <form action={organizerLoginAction} className="registration-panel-stack">
          <input name="slug" type="hidden" value={slug} />
          <label className="field">
            <span>Email</span>
            <input name="email" placeholder={`admin@${slug}.passreserve.local`} type="email" />
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
        <div className="status-block">
          <div className="status-label">Need a reset?</div>
          <h2>Generate a fresh organizer reset link.</h2>
          <p>
            Passreserve will email or log a reset link for this organizer admin account, depending
            on the configured delivery mode.
          </p>
        </div>
        <form action={organizerRequestResetAction} className="registration-panel-stack">
          <input name="slug" type="hidden" value={slug} />
          <input
            name="baseUrl"
            type="hidden"
            value={typeof query.baseUrl === "string" ? query.baseUrl : ""}
          />
          <label className="field">
            <span>Account email</span>
            <input name="email" placeholder={`admin@${slug}.passreserve.local`} type="email" />
          </label>
          <div className="hero-actions">
            <button className="button button-secondary" type="submit">
              Send reset link
            </button>
            <Link className="button button-secondary" href={`/${slug}`}>
              Public organizer page
            </Link>
          </div>
        </form>
      </aside>
    </section>
  );
}
