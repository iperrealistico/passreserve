import { LegalLinksRow } from "./legal-links-row.js";
import { getOperatorFooterLine } from "../lib/passreserve-legal.js";

export function AdminLegalFooter({ locale = "en" }) {
  return (
    <footer className="admin-legal-footer">
      <div className="admin-legal-footer-copy">{getOperatorFooterLine(locale)}</div>
      <LegalLinksRow className="admin-legal-footer-links" locale={locale} />
    </footer>
  );
}
