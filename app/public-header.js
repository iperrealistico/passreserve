import Link from "next/link";

export function PublicHeader({ dictionary, currentPath = "/", contextItem = null }) {
  const navItems = [
    { href: "/", label: dictionary.nav.discover },
    { href: "/events", label: dictionary.nav.events },
    { href: "/about", label: dictionary.nav.about }
  ];

  if (contextItem?.href && contextItem?.label) {
    navItems.push({
      href: contextItem.href,
      label: contextItem.label,
      contextual: true
    });
  }

  return (
    <header className="topbar">
      <Link className="wordmark" href="/">
        <span className="wordmark-name">Passreserve.com</span>
        <span className="wordmark-tag">{dictionary.home.eyebrow}</span>
      </Link>
      <div className="topbar-actions">
        <nav className="nav" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              aria-current={currentPath === item.href ? "page" : undefined}
              className={item.contextual ? "nav-context-link" : undefined}
              href={item.href}
              key={item.href}
              title={item.label}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/admin/login">{dictionary.nav.organizerAccess}</Link>
        </nav>
      </div>
    </header>
  );
}
