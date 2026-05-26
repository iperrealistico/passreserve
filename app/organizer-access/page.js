import Link from "next/link";

import { openOrganizerAccessAction } from "./actions.js";
import { getTranslations } from "../../lib/passreserve-i18n.js";

export const metadata = {
  title: "Organizer access"
};

export default async function OrganizerAccessPage({ searchParams }) {
  const query = await searchParams;
  const { dictionary } = await getTranslations();
  const showMissingError = query.error === "missing";
  const copy = dictionary.organizerAccessPage;

  return (
    <main className="shell admin-shell auth-page">
      <div className="content auth-content">
        <section className="auth-grid">
          <article className="panel auth-card">
            <div className="auth-head">
              <div className="section-kicker">{dictionary.nav.organizerAccess}</div>
              <h1>{copy.title}</h1>
            </div>
            <p>{copy.summary}</p>
            {showMissingError ? (
              <div className="registration-message registration-message-error">
                {copy.missing}
              </div>
            ) : null}

            <form action={openOrganizerAccessAction} className="registration-panel-stack">
              <label className="field">
                <span>{copy.slugLabel}</span>
                <input
                  autoComplete="off"
                  name="slug"
                  placeholder={copy.slugPlaceholder}
                  spellCheck="false"
                  type="text"
                />
              </label>
              <div className="hero-actions">
                <button className="button button-primary" type="submit">
                  {copy.submit}
                </button>
                <Link className="button button-secondary" href="/">
                  {copy.backToSite}
                </Link>
              </div>
            </form>

            <p className="muted-text">{copy.helper}</p>
          </article>

          <aside className="panel auth-card auth-card-secondary">
            <div className="auth-head">
              <div className="section-kicker">{copy.platformLabel}</div>
              <h2>{copy.platformTitle}</h2>
            </div>
            <p>{copy.platformSummary}</p>
            <div className="hero-actions">
              <Link className="button button-secondary" href="/admin/login">
                {copy.platformCta}
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
