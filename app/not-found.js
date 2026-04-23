import Link from "next/link";

import { getTranslations } from "../lib/passreserve-i18n.js";

export default async function NotFound() {
  const { locale } = await getTranslations();
  const isItalian = locale === "it";

  return (
    <main className="empty-state">
      <section className="panel empty-card">
        <div className="section-kicker">{isItalian ? "Errore 404" : "Error 404"}</div>
        <h1>
          {isItalian
            ? "Questa pagina non è disponibile."
            : "We couldn&apos;t find that page."}
        </h1>
        <p>
          {isItalian
            ? "Il link potrebbe essere vecchio, oppure l'evento o l'organizer non sono più disponibili. Riparti dalla discovery principale per vedere gli eventi attivi."
            : "The link may be out of date, or the event or organizer may no longer be available. Start from the main discovery page to browse live organizers and upcoming events."}
        </p>
        <div className="hero-actions" style={{ justifyContent: "center" }}>
          <Link className="button button-primary" href="/">
            {isItalian ? "Esplora eventi" : "Browse events"}
          </Link>
        </div>
      </section>
    </main>
  );
}
