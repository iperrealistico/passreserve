"use client";

import Link from "next/link";
import {
  Activity,
  Building2,
  CalendarDays,
  CalendarRange,
  CreditCard,
  ExternalLink,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Mail,
  Menu,
  Settings,
  Terminal,
  Ticket,
  Users,
  X
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "../lib/utils.js";

const navIcons = {
  activity: Activity,
  building: Building2,
  calendar: CalendarDays,
  dates: CalendarRange,
  billing: CreditCard,
  external: ExternalLink,
  file: FileText,
  health: HeartPulse,
  today: LayoutDashboard,
  mail: Mail,
  settings: Settings,
  logs: Terminal,
  events: Ticket,
  registrations: Users
};

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
  className = "",
  navigationLabel = "Primary",
  mobileNavigationLabel = "Mobile primary",
  openLabel = "Open navigation",
  closeLabel = "Close navigation"
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className={cn("admin-topbar", className)}>
      <div className="admin-topbar-row">
        <Link className="admin-brand" href={brandHref}>
          {brand}
        </Link>

        <div className="admin-topbar-tools">
          {rightSlot}
        </div>

        <button
          aria-expanded={open}
          aria-label={open ? closeLabel : openLabel}
          className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background text-foreground lg:hidden"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <div className="admin-topbar-desktop">
        <nav aria-label={navigationLabel} className="admin-tab-nav">
          {links.map((link) => {
            const active = isLinkActive(pathname, link);
            const Icon = link.icon ? navIcons[link.icon] : null;

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "admin-tab-link",
                  active && "admin-tab-link-active"
                )}
                href={link.href}
                key={link.href}
              >
                {Icon ? <Icon className="admin-tab-icon" size={16} /> : null}
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {open ? (
        <div className="admin-mobile-nav">
          <nav aria-label={mobileNavigationLabel} className="flex flex-col gap-2">
            {links.map((link) => {
              const active = isLinkActive(pathname, link);
              const Icon = link.icon ? navIcons[link.icon] : null;

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "admin-mobile-tab-link",
                    active && "admin-mobile-tab-link-active"
                  )}
                  href={link.href}
                  key={link.href}
                  onClick={() => setOpen(false)}
                >
                  {Icon ? <Icon className="admin-tab-icon" size={16} /> : null}
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
