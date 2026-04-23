import Link from "next/link";

import { LocaleSwitcher } from "../components/locale-switcher.js";

export function PublicFooter({ locale = "en", dictionary }) {
  const year = new Date().getFullYear();
  const navItems = [
    { href: "/", label: dictionary.nav.discover },
    { href: "/events", label: dictionary.nav.events },
    { href: "/about", label: dictionary.nav.about },
    { href: "/admin/login", label: dictionary.nav.organizerAccess }
  ];

  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <div className="site-footer-brand-block">
          <Link className="site-footer-brand" href="/">
            Passreserve.com
          </Link>
          <p className="site-footer-copy">{dictionary.footer.summary}</p>
        </div>

        <nav aria-label="Footer" className="site-footer-nav">
          {navItems.map((item) => (
            <Link href={item.href} key={item.href}>
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
        <span>{`© ${year} Passreserve.com. ${dictionary.footer.rights}`}</span>
        <span>{dictionary.footer.note}</span>
      </div>
    </footer>
  );
}
