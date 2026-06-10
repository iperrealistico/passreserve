import Link from "next/link";

import { CookiePreferencesButton } from "./cookie-preferences-button.js";
import { getLegalLinkLabels, getLegalLinks } from "../lib/passreserve-legal.js";

export function LegalLinksRow({ locale = "en", className = "", itemClassName = "" }) {
  const links = getLegalLinks(locale);
  const labels = getLegalLinkLabels(locale);

  return (
    <div className={`site-legal-links ${className}`.trim()}>
      {links.map((link) => (
        <Link className={itemClassName || "site-legal-link"} href={link.href} key={link.href}>
          {link.label}
        </Link>
      ))}
      <CookiePreferencesButton className={itemClassName || "site-legal-link-button"}>
        {labels.manageCookies}
      </CookiePreferencesButton>
    </div>
  );
}
