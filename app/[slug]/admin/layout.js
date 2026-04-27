import Link from "next/link";
import { notFound } from "next/navigation";

import { LocaleSwitcher } from "../../../components/locale-switcher.js";
import { TopNav } from "../../../components/top-nav.js";
import { getTranslations } from "../../../lib/passreserve-i18n.js";
import {
  getOrganizerShell
} from "../../../lib/passreserve-admin-service.js";
import {
  getValidatedOrganizerAdminSessionUser,
  getValidatedStoredPlatformSessionUser
} from "../../../lib/passreserve-auth.js";
import { OrganizerAdminTour } from "./organizer-admin-tour.js";
import { organizerLogoutAction, returnToPlatformDashboardAction } from "./actions.js";

export default async function OrganizerAdminLayout({ children, params }) {
  const { slug } = await params;
  const shell = await getOrganizerShell(slug);
  const { locale, dictionary } = await getTranslations();

  if (!shell) {
    notFound();
  }
  const organizer = shell.organizer;
  const sessionUser = await getValidatedOrganizerAdminSessionUser(slug);
  const platformUser = await getValidatedStoredPlatformSessionUser();
  const signedIn = Boolean(sessionUser);
  const isItalian = locale === "it";

  if (!signedIn) {
    return children;
  }

  const navigation = [
    {
      label: dictionary.admin.overview,
      href: organizer.dashboardHref,
      exact: true,
      icon: "today",
      tourId: "nav-dashboard"
    },
    {
      label: dictionary.admin.schedule,
      href: organizer.calendarHref,
      icon: "calendar",
      tourId: "nav-schedule"
    },
    {
      label: dictionary.admin.events,
      href: organizer.eventsHref,
      icon: "events",
      tourId: "nav-events"
    },
    {
      label: dictionary.admin.registrations,
      href: organizer.registrationsHref,
      icon: "registrations",
      tourId: "nav-registrations"
    },
    {
      label: dictionary.admin.settings,
      href: organizer.settingsHref,
      icon: "settings",
      tourId: "nav-settings",
      matchPrefixes: [organizer.settingsHref, organizer.billingHref]
    }
  ];

  return (
    <main className="shell admin-shell">
      <OrganizerAdminTour
        locale={locale}
        slug={slug}
        storageSeed={shell.organizer.tourStorageSeed}
      />
      <div className="content admin-content">
        <TopNav
          brand={organizer.name}
          brandHref={organizer.dashboardHref}
          links={navigation}
          navigationLabel={isItalian ? "Navigazione organizer" : "Organizer navigation"}
          mobileNavigationLabel={isItalian ? "Navigazione organizer mobile" : "Mobile organizer navigation"}
          openLabel={isItalian ? "Apri navigazione" : "Open navigation"}
          closeLabel={isItalian ? "Chiudi navigazione" : "Close navigation"}
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
          <div className="admin-main admin-main-shell">
            <section className="panel admin-shell-intro">
              <div className="admin-shell-heading">
                <div>
                  <div className="page-place">
                    {organizer.city}, {organizer.region}
                  </div>
                  <h1 className="admin-shell-title">{organizer.name}</h1>
                  {organizer.tagline ? <p className="admin-shell-copy">{organizer.tagline}</p> : null}
                </div>
                <div className="hero-actions">
                  <Link className="button button-secondary" href={organizer.billingHref}>
                    {organizer.billing.enabled
                      ? isItalian
                        ? "Billing"
                        : "Billing"
                      : isItalian
                        ? "Completa billing"
                        : "Finish billing"}
                  </Link>
                  <Link className="button button-secondary" href={organizer.publicHref}>
                    {dictionary.admin.publicPage}
                  </Link>
                  {platformUser?.type === "platform" ? (
                    <form action={returnToPlatformDashboardAction}>
                      <button className="button button-secondary" type="submit">
                        {isItalian ? "Torna al supporto" : "Return to support"}
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>

              <div className="admin-shell-meta">
                <div className="pill-list">
                  <span className="pill">{organizer.timeZone}</span>
                  <span className="pill">{organizer.supportEmail}</span>
                  <span className="pill">
                    {organizer.billing.enabled
                      ? isItalian
                        ? "Checkout online pronto"
                        : "Online checkout ready"
                      : isItalian
                        ? "Checkout online da completare"
                        : "Online checkout needs setup"}
                  </span>
                </div>

                <div className="admin-shell-stat-row">
                  <span className="admin-shell-stat">
                    <span className="metric-label">{isItalian ? "Registrazioni attive" : "Active regs"}</span>
                    <strong>{organizer.summary.activeCount}</strong>
                  </span>
                  <span className="admin-shell-stat">
                    <span className="metric-label">{isItalian ? "Date future" : "Upcoming dates"}</span>
                    <strong>{organizer.totalUpcomingOccurrences}</strong>
                  </span>
                  <span className="admin-shell-stat">
                    <span className="metric-label">{isItalian ? "Incassato online" : "Online collected"}</span>
                    <strong>{organizer.summary.onlineCollectedLabel}</strong>
                  </span>
                  <span className="admin-shell-stat">
                    <span className="metric-label">{isItalian ? "Saldo in venue" : "Due at venue"}</span>
                    <strong>{organizer.summary.dueAtEventLabel}</strong>
                  </span>
                </div>
              </div>
            </section>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
