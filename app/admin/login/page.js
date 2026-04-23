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
    <main className="shell admin-shell auth-page">
      <div className="content auth-content">
        <section className="auth-grid">
          <article className="panel auth-card">
            <div className="auth-head">
              <div className="section-kicker">
                {isItalian ? "Accesso piattaforma" : "Platform access"}
              </div>
              <h1>{isItalian ? "Accesso admin" : "Admin sign in"}</h1>
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
                <input
                  autoComplete="username"
                  name="email"
                  placeholder="team@passreserve.com"
                  type="email"
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input autoComplete="current-password" name="password" type="password" />
              </label>
              <div className="hero-actions">
                <button className="button button-primary" type="submit">
                  {isItalian ? "Accedi" : "Sign in"}
                </button>
              </div>
            </form>
          </article>

          <aside className="panel auth-card auth-card-secondary">
            <div className="auth-head">
              <div className="section-kicker">{isItalian ? "Reset password" : "Password reset"}</div>
              <h2>{isItalian ? "Invia link reset" : "Send reset link"}</h2>
            </div>
            <form action={platformRequestResetAction} className="registration-panel-stack">
              <input
                name="baseUrl"
                type="hidden"
                value={typeof query.baseUrl === "string" ? query.baseUrl : ""}
              />
              <label className="field">
                <span>{isItalian ? "Email account" : "Account email"}</span>
                <input
                  autoComplete="email"
                  name="email"
                  placeholder="team@passreserve.com"
                  type="email"
                />
              </label>
              <div className="hero-actions">
                <button className="button button-secondary" type="submit">
                  {isItalian ? "Invia link reset" : "Send reset link"}
                </button>
                <Link className="button button-muted" href="/">
                  {isItalian ? "Vai al sito" : "Open site"}
                </Link>
              </div>
            </form>
          </aside>
        </section>
      </div>
    </main>
  );
}
