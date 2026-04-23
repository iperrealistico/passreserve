import Link from "next/link";

import { PublicHeader } from "../public-header.js";
import { getTranslations } from "../../lib/passreserve-i18n.js";
import { getPublicSiteContent } from "../../lib/passreserve-service.js";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const { locale, dictionary } = await getTranslations();
  const content = await getPublicSiteContent();
  const aboutPage = content.aboutPage;
  const aboutSections = Array.isArray(aboutPage?.sections?.sections)
    ? aboutPage.sections.sections
    : [];
  const faq = Array.isArray(aboutPage?.sections?.faq) ? aboutPage.sections.faq : [];

  return (
    <main className="shell">
      <div className="content">
        <PublicHeader currentPath="/about" dictionary={dictionary} locale={locale} />

        <section className="hero">
          <article className="hero-copy">
            <div className="section-kicker">{aboutPage?.heroEyebrow || dictionary.about.sections.compare}</div>
            <h1>{aboutPage?.heroTitle || dictionary.about.title}</h1>
            <p>{aboutPage?.heroSummary || dictionary.about.summary}</p>
            <div className="hero-actions mt-6">
              <Link className="button button-primary" href="/events">
                {dictionary.about.finalCta}
              </Link>
              <Link className="button button-secondary" href="/admin/login">
                {dictionary.nav.organizerAccess}
              </Link>
            </div>
          </article>

          <aside className="hero-aside">
            <div className="status-list">
              {(aboutPage?.sections?.metrics || []).map((metric) => (
                <div className="status-item" key={metric.label}>
                  <span className="status-index">•</span>
                  <div>
                    <strong>{metric.label}</strong>
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="section-grid">
          {aboutSections.map((section) => (
            <article className="panel section-card" key={section.id}>
              <div className="section-kicker">{section.id}</div>
              <h2>{section.title}</h2>
              <p>{section.detail}</p>
            </article>
          ))}
        </section>

        <section className="section-grid mt-6" id="faq">
          <article className="panel section-card section-span">
            <div className="section-kicker">{dictionary.about.sections.faq}</div>
            <h2>{dictionary.about.title}</h2>
            <div className="faq-list">
              {faq.map((item) => (
                <article className="faq-item" key={item.question}>
                  <strong>{item.question}</strong>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="cta-band">
          <div>
            <div className="section-kicker">{aboutPage?.sections?.cta?.title || dictionary.about.finalCta}</div>
            <h2>{aboutPage?.sections?.cta?.title || dictionary.about.title}</h2>
            <p>{aboutPage?.sections?.cta?.detail || dictionary.about.summary}</p>
          </div>
          <div className="hero-actions cta-actions">
            <Link className="button button-primary bg-white text-primary hover:bg-white/90" href="/events">
              {dictionary.about.finalCta}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
