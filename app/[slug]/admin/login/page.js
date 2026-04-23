import Link from "next/link";

import { organizerLoginAction, organizerRequestResetAction } from "../actions.js";
import { getOrganizerShell } from "../../../../lib/passreserve-admin-service.js";
import { getTranslations } from "../../../../lib/passreserve-i18n.js";

export const metadata = {
  title: "Organizer sign in"
};

function messageFor(value, locale) {
  const isItalian = locale === "it";

  switch (value) {
    case "invalid":
      return isItalian
        ? "Email o password non corrispondono a un account admin organizer attivo."
        : "The email and password did not match an active organizer admin account.";
    case "reset-sent":
      return isItalian
        ? "Se l'account organizer esiste, è stato generato un link di reset."
        : "If that organizer admin exists, a password reset link has been generated.";
    case "password-updated":
      return isItalian
        ? "Password aggiornata. Ora puoi accedere."
        : "Password updated. You can sign in now.";
    case "signed-out":
      return isItalian ? "Sei uscito dalla sessione." : "You have been signed out.";
    default:
      return "";
  }
}

export default async function OrganizerLoginPage({ params, searchParams }) {
  const { slug } = await params;
  const shell = await getOrganizerShell(slug);
  const query = await searchParams;
  const { locale } = await getTranslations();
  const isItalian = locale === "it";
  const error = messageFor(typeof query.error === "string" ? query.error : "", locale);
  const message = messageFor(typeof query.message === "string" ? query.message : "", locale);

  if (!shell) {
    return (
      <main className="shell">
        <div className="content">
          <section className="empty-state">
            <article className="panel empty-card">
              <h1>{isItalian ? "Organizer non trovato" : "Organizer not found"}</h1>
              <p>
                {isItalian
                  ? "Questa route admin organizer non è disponibile."
                  : "This organizer admin route is not available."}
              </p>
            </article>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="shell admin-shell">
      <div className="content">
        <section className="hero detail-hero">
          <article className="panel hero-copy public-hero-copy">
            <div className="section-kicker">{shell.organizer.name}</div>
            <h1>{isItalian ? "Accesso admin organizer" : "Organizer admin sign in"}</h1>
            <p>
              {isItalian
                ? "Gestisci eventi, date, registrazioni, pagamenti e dati partecipanti da un'area admin pulita e responsive."
                : "Manage events, dates, registrations, payments, and attendee data from a cleaner responsive admin area."}
            </p>
            <div className="pill-list">
              <span className="pill">{isItalian ? "Eventi" : "Events"}</span>
              <span className="pill">{isItalian ? "Date" : "Dates"}</span>
              <span className="pill">{isItalian ? "Registrazioni" : "Registrations"}</span>
            </div>
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
                <input name="email" placeholder="host-admin@example.com" type="email" />
              </label>
              <label className="field">
                <span>Password</span>
                <input name="password" type="password" />
              </label>
              <div className="hero-actions">
                <button className="button button-primary" type="submit">
                  {isItalian ? "Accedi" : "Sign in"}
                </button>
                <Link className="button button-secondary" href={`/${slug}`}>
                  {isItalian ? "Pagina pubblica" : "Public page"}
                </Link>
              </div>
            </form>
          </article>

          <aside className="panel hero-aside public-hero-aside">
            <div className="status-block">
              <div className="status-label">{isItalian ? "Reset password" : "Password reset"}</div>
              <h2>
                {isItalian
                  ? "Genera un nuovo link per l'admin organizer."
                  : "Generate a fresh link for the organizer admin."}
              </h2>
              <p>
                {isItalian
                  ? "Passreserve invierà o registrerà il link in base alla configurazione email corrente."
                  : "Passreserve will email or log the link depending on the active email configuration."}
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
                <span>{isItalian ? "Email account" : "Account email"}</span>
                <input name="email" placeholder="host-admin@example.com" type="email" />
              </label>
              <div className="hero-actions">
                <button className="button button-secondary" type="submit">
                  {isItalian ? "Invia link reset" : "Send reset link"}
                </button>
              </div>
            </form>
          </aside>
        </section>
      </div>
    </main>
  );
}
