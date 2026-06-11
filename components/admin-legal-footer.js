import { LegalLinksRow } from "./legal-links-row.js";

export function AdminLegalFooter({ locale = "en" }) {
  return (
    <footer className="admin-legal-footer">
      <LegalLinksRow className="admin-legal-footer-links" locale={locale} />
    </footer>
  );
}
