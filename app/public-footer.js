import Link from "next/link";

import { LegalLinksRow } from "../components/legal-links-row.js";
import { LocaleSwitcher } from "../components/locale-switcher.js";

export function PublicFooter({ locale = "en", dictionary }) {
  const year = new Date().getFullYear();
  const navItems = [
    { href: "/", label: dictionary.nav.discover },
    { href: "/events", label: dictionary.nav.events },
    { href: "/about", label: dictionary.nav.about },
    { href: "/organizer-access", label: dictionary.nav.organizerAccess }
  ];

  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <Link className="site-footer-brand" href="/" prefetch={false}>
          Passreserve.com
        </Link>

        <p className="site-footer-copy">{dictionary.footer.summary}</p>

        <nav aria-label="Footer" className="site-footer-nav">
          {navItems.map((item) => (
            <Link href={item.href} key={item.href} prefetch={false}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-footer-tools">
          <LocaleSwitcher
            label={dictionary.languageLabel}
            labels={dictionary.locales}
            locale={locale}
          />
        </div>
      </div>

      <div className="site-footer-bottom">
        <div className="site-footer-bottom-copy">
          <span>{`© ${year} Passreserve.com. ${dictionary.footer.rights}`}</span>
          <span>{dictionary.footer.note}</span>
        </div>
        <LegalLinksRow locale={locale} />
      </div>
    </footer>
  );
}
