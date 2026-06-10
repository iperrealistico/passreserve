import Link from "next/link";

import { PublicFooter } from "../app/public-footer.js";
import { PublicHeader } from "../app/public-header.js";

function LegalSection({ section }) {
  return (
    <section className="legal-section">
      <h2>{section.title}</h2>
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {section.bullets?.length ? (
        <ul className="legal-list">
          {section.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}
      {section.table ? (
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                {section.table.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, index) => (
                <tr key={`${section.title}-${index}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${section.title}-${index}-${cellIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export function LegalDocumentPage({ dictionary, document, locale }) {
  return (
    <main className="shell">
      <div className="content">
        <PublicHeader currentPath={`/${document.slug}`} dictionary={dictionary} locale={locale} />

        <section className="hero legal-hero">
          <article className="hero-copy legal-hero-copy">
            <div className="breadcrumb">
              <Link href="/">Passreserve.com</Link>
              <span>/</span>
              <span>{document.title}</span>
            </div>
            <div className="section-kicker">Legal</div>
            <h1>{document.title}</h1>
            <p>{document.summary}</p>
            <div className="pill-list mt-6">
              <span className="pill">{document.lastUpdatedLabel}</span>
              <span className="pill">Version {document.version}</span>
            </div>
          </article>
        </section>

        <article className="panel legal-document-card">
          {document.sections.map((section) => (
            <LegalSection key={section.title} section={section} />
          ))}
        </article>

        <PublicFooter dictionary={dictionary} locale={locale} />
      </div>
    </main>
  );
}
