import Link from "next/link";

import { platformLoginAction, platformRequestResetAction } from "../actions.js";
import { getTranslations } from "../../../lib/passreserve-i18n.js";

export const metadata = {
  title: "Team sign in"
};

function messageFor(value, locale) {
  const isItalian = locale === "it";

  switch (value) {
    case "invalid":
      return isItalian
        ? "Email o password non corrispondono a un account team approvato."
        : "The email and password did not match an approved team account.";
    case "reset-sent":
      return isItalian
        ? "Se l'account esiste, è stato generato un link di reset password."
        : "If that account exists, a password reset link has been generated.";
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

export default async function PlatformAdminLoginPage({ searchParams }) {
  const query = await searchParams;
  const { locale } = await getTranslations();
  const isItalian = locale === "it";
  const error = messageFor(typeof query.error === "string" ? query.error : "", locale);
  const message = messageFor(typeof query.message === "string" ? query.message : "", locale);

  return (
    <main className="shell admin-shell">
      <div className="content">
        <section className="hero detail-hero">
          <article className="panel hero-copy public-hero-copy">
            <div className="section-kicker">
              {isItalian ? "Accesso piattaforma" : "Platform access"}
            </div>
            <h1>
              {isItalian
                ? "Accedi per gestire organizer, contenuti e controlli operativi."
                : "Sign in to manage organizers, content, and operational checks."}
            </h1>
            <p>
              {isItalian
                ? "Questa area è riservata al team. Da qui gestisci onboarding organizer, contenuti condivisi, email e health checks."
                : "This area is reserved for the team. Use it for organizer onboarding, shared content, email delivery, and health checks."}
            </p>
            <div className="pill-list">
              <span className="pill">{isItalian ? "Organizer" : "Organizers"}</span>
              <span className="pill">{isItalian ? "Email" : "Emails"}</span>
              <span className="pill">{isItalian ? "Health" : "Health"}</span>
            </div>
            {error ? (
              <div className="registration-message registration-message-error">{error}</div>
            ) : null}
            {message ? (
              <div className="registration-message registration-message-success">{message}</div>
            ) : null}

            <form action={platformLoginAction} className="registration-panel-stack">
              <label className="field">
                <span>Email</span>
                <input name="email" placeholder="team@passreserve.com" type="email" />
              </label>
              <label className="field">
                <span>Password</span>
                <input name="password" type="password" />
              </label>
              <div className="hero-actions">
                <button className="button button-primary" type="submit">
                  {isItalian ? "Accedi" : "Sign in"}
                </button>
                <Link className="button button-secondary" href="/">
                  {isItalian ? "Vai al sito" : "Open site"}
                </Link>
              </div>
            </form>
          </article>

          <aside className="panel hero-aside public-hero-aside">
            <div className="status-block">
              <div className="status-label">{isItalian ? "Reset password" : "Password reset"}</div>
              <h2>
                {isItalian
                  ? "Genera un nuovo link di accesso in pochi secondi."
                  : "Generate a fresh access link in a few seconds."}
              </h2>
              <p>
                {isItalian
                  ? "Se l'account esiste, Passreserve invierà o registrerà il link in base alla configurazione email corrente."
                  : "If the account exists, Passreserve will send or log the link according to the current email configuration."}
              </p>
            </div>

            <form action={platformRequestResetAction} className="registration-panel-stack">
              <input
                name="baseUrl"
                type="hidden"
                value={typeof query.baseUrl === "string" ? query.baseUrl : ""}
              />
              <label className="field">
                <span>{isItalian ? "Email account" : "Account email"}</span>
                <input name="email" placeholder="team@passreserve.com" type="email" />
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
