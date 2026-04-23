import Link from "next/link";

import { PublicFooter } from "./public-footer.js";
import { getTranslations } from "../lib/passreserve-i18n.js";

export default async function NotFound() {
  const { locale, dictionary } = await getTranslations();
  const isItalian = locale === "it";

  return (
    <main className="shell">
      <div className="content">
        <section className="not-found-shell">
          <article className="panel not-found-card">
            <div className="not-found-display">404</div>
            <div className="section-kicker">{isItalian ? "Pagina non trovata" : "Page not found"}</div>
            <h1>{isItalian ? "Questa pagina non è disponibile." : "We couldn't find that page."}</h1>
            <p>
              {isItalian
                ? "Il link potrebbe essere vecchio, oppure l'evento o l'organizer non sono più disponibili. Riparti dalla home o dalla lista eventi per vedere ciò che è ancora attivo."
                : "The link may be out of date, or the event or organizer may no longer be available. Start again from the homepage or the event list to see what is still live."}
            </p>
            <div className="hero-actions not-found-actions">
              <Link className="button button-primary" href="/">
                {isItalian ? "Vai alla home" : "Go home"}
              </Link>
              <Link className="button button-secondary" href="/events">
                {isItalian ? "Vedi eventi" : "Browse events"}
              </Link>
            </div>
          </article>
        </section>

        <PublicFooter dictionary={dictionary} locale={locale} />
      </div>
    </main>
  );
}
