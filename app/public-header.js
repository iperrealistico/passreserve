import Link from "next/link";

import { LocaleSwitcher } from "../components/locale-switcher.js";

export function PublicHeader({ locale = "en", dictionary, currentPath = "/" }) {
  const navItems = [
    { href: "/", label: dictionary.nav.discover },
    { href: "/events", label: dictionary.nav.events },
    { href: "/about", label: dictionary.nav.about }
  ];

  return (
    <header className="topbar">
      <Link className="wordmark" href="/">
        <span className="wordmark-name">Passreserve.com</span>
        <span className="wordmark-tag">{dictionary.home.eyebrow}</span>
      </Link>
      <div className="flex flex-col items-start gap-3 sm:items-end">
        <nav className="nav" aria-label="Primary">
          {navItems.map((item) => (
            <Link aria-current={currentPath === item.href ? "page" : undefined} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/admin/login">{dictionary.nav.organizerAccess}</Link>
        </nav>
        <LocaleSwitcher
          label={dictionary.languageLabel}
          labels={dictionary.locales}
          locale={locale}
        />
      </div>
    </header>
  );
}
