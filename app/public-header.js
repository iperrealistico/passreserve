import Link from "next/link";

import { publicNavigation } from "../lib/passreserve-domain.js";

export function PublicHeader() {
  return (
    <header className="topbar">
      <Link className="wordmark" href="/">
        <span className="wordmark-name">Passreserve.com</span>
        <span className="wordmark-tag">Find an event or launch one with confidence</span>
      </Link>
      <nav className="nav" aria-label="Primary">
        {publicNavigation.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
