import Link from "next/link";
import { notFound } from "next/navigation";

import { LocaleSwitcher } from "../../../components/locale-switcher.js";
import { TopNav } from "../../../components/top-nav.js";
import { getTranslations } from "../../../lib/passreserve-i18n.js";
import {
  getOrganizerShell
} from "../../../lib/passreserve-admin-service.js";
import { getCurrentSessionUser, getStoredPlatformSessionUser } from "../../../lib/passreserve-auth.js";
import { organizerLogoutAction, returnToPlatformDashboardAction } from "./actions.js";

export default async function OrganizerAdminLayout({ children, params }) {
  const { slug } = await params;
  const shell = await getOrganizerShell(slug);
  const { locale, dictionary } = await getTranslations();

  if (!shell) {
    notFound();
  }
  const organizer = shell.organizer;
  const sessionUser = await getCurrentSessionUser();
  const platformUser = await getStoredPlatformSessionUser();
  const signedIn = sessionUser?.type === "organizer" && sessionUser.organizerSlug === slug;

  if (!signedIn) {
    return children;
  }

  const navigation = [
    {
      label: dictionary.admin.today,
      href: organizer.dashboardHref,
      hint: "See the overall queue, next dates, and open follow-up."
    },
    {
      label: dictionary.admin.calendar,
      href: organizer.calendarHref,
      hint: "See scheduled dates in date order across your events."
    },
    {
      label: dictionary.admin.registrations,
      href: organizer.registrationsHref,
      hint: "Track attendee status, online payments, and balances still due at the venue."
    },
    {
      label: dictionary.admin.billing,
      href: organizer.billingHref,
      hint: "Connect Stripe and review how online checkout is configured."
    },
    {
      label: dictionary.admin.settings,
      href: organizer.settingsHref,
      hint: "Edit your host details, venue information, and admin profile."
    },
    {
      label: dictionary.admin.events,
      href: organizer.eventsHref,
      hint: "Manage event pages, copy, pricing, and visibility."
    },
    {
      label: dictionary.admin.dates,
      href: organizer.occurrencesHref,
      hint: "Create and publish the actual dates attached to each event."
    },
    {
      label: dictionary.admin.publicPage,
      href: organizer.publicHref,
      hint: "Preview the page attendees see before they register."
    }
  ];

  return (
    <main className="shell admin-shell">
      <div className="content admin-content">
        <TopNav
          brand={`${organizer.name} · ${dictionary.admin.organizerTitle}`}
          brandHref={organizer.dashboardHref}
          links={navigation}
          rightSlot={
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <LocaleSwitcher
                label={dictionary.admin.localeHint}
                labels={dictionary.locales}
                locale={locale}
              />
              <form action={organizerLogoutAction}>
                <input name="slug" type="hidden" value={slug} />
                <button className="button button-secondary" type="submit">
                  {dictionary.admin.signOut}
                </button>
              </form>
            </div>
          }
        />

        <section className="admin-layout">
          <aside className="panel admin-sidebar">
            <div className="admin-sidebar-block">
              <div className="page-place">
                {organizer.city}, {organizer.region}
              </div>
              <h1 className="admin-sidebar-title">{organizer.name}</h1>
              <p className="admin-sidebar-copy">{organizer.tagline}</p>
            </div>

            <div className="admin-summary-grid">
              <div className="admin-summary-card">
                <span className="metric-label">Active regs</span>
                <strong>{organizer.summary.activeCount}</strong>
              </div>
              <div className="admin-summary-card">
                <span className="metric-label">Upcoming dates</span>
                <strong>{organizer.totalUpcomingOccurrences}</strong>
              </div>
              <div className="admin-summary-card">
                <span className="metric-label">Online collected</span>
                <strong>{organizer.summary.onlineCollectedLabel}</strong>
              </div>
              <div className="admin-summary-card">
                <span className="metric-label">Due at venue</span>
                <strong>{organizer.summary.dueAtEventLabel}</strong>
              </div>
            </div>

            <div className="admin-sidebar-block">
              <div className="section-kicker">Quick links</div>
              <div className="admin-nav-list">
                {navigation.map((item) => (
                  <Link className="admin-nav-link" href={item.href} key={item.href}>
                    <span className="admin-nav-link-body">
                      <span className="admin-nav-title">{item.label}</span>
                      <span className="admin-nav-hint">{item.hint}</span>
                    </span>
                    <span aria-hidden="true">/</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="admin-sidebar-block">
              <div className="section-kicker">How to use these tools</div>
              <div className="status-list">
                <div className="status-item">
                  <span className="status-index">1</span>
                  <div>
                    <strong>Events describe what you host</strong>
                    Use the Events area for titles, copy, pricing defaults, and whether an event
                    should be public, draft, or paused.
                  </div>
                </div>
                <div className="status-item">
                  <span className="status-index">2</span>
                  <div>
                    <strong>Dates are the actual scheduled sessions</strong>
                    The Dates area is where you add the real calendar instances that attendees can
                    book, publish, or cancel.
                  </div>
                </div>
                <div className="status-item">
                  <span className="status-index">3</span>
                  <div>
                    <strong>Registrations are the live queue</strong>
                    Use the registration cards to track confirmations, online payments, and any
                    balance you collect at the venue.
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-sidebar-block admin-sidebar-footer">
              <span className="spotlight-label">Support contact</span>
              <strong>{organizer.supportEmail}</strong>
              <span>{organizer.timeZone}</span>
              {platformUser?.type === "platform" ? (
                <form action={returnToPlatformDashboardAction}>
                  <button className="button button-secondary" type="submit">
                    Return to support dashboard
                  </button>
                </form>
              ) : null}
            </div>
          </aside>

          <div className="admin-main">{children}</div>
        </section>
      </div>
    </main>
  );
}
