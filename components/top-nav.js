"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "../lib/utils.js";

function isLinkActive(pathname, link) {
  if (link.exact) {
    return pathname === link.href;
  }

  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export function TopNav({
  brand,
  brandHref = "/",
  links = [],
  rightSlot = null,
  className = ""
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className={cn("admin-topbar", className)}>
      <div className="flex items-center justify-between gap-4">
        <Link className="font-heading text-xl font-semibold tracking-tight text-foreground" href={brandHref}>
          {brand}
        </Link>

        <div className="hidden items-center gap-4 lg:flex">
          <nav aria-label="Primary" className="flex items-center gap-1">
            {links.map((link) => {
              const active = isLinkActive(pathname, link);

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          {rightSlot}
        </div>

        <button
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
          className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background text-foreground lg:hidden"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open ? (
        <div className="mt-4 flex flex-col gap-4 rounded-[1.5rem] border border-border bg-background p-4 lg:hidden">
          <nav aria-label="Mobile primary" className="flex flex-col gap-2">
            {links.map((link) => {
              const active = isLinkActive(pathname, link);

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  href={link.href}
                  key={link.href}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          {rightSlot ? <div className="border-t border-border pt-4">{rightSlot}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
