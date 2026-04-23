import Link from "next/link";

import { LocaleSwitcher } from "../../../components/locale-switcher.js";
import { TopNav } from "../../../components/top-nav.js";
import {
  getPlatformOverview,
} from "../../../lib/passreserve-admin-service.js";
import { getTranslations } from "../../../lib/passreserve-i18n.js";
import { platformLogoutAction } from "../actions.js";
import { requirePlatformAdminSession } from "../../../lib/passreserve-auth.js";

export const dynamic = "force-dynamic";

export default async function PlatformAdminLayout({ children }) {
  await requirePlatformAdminSession();
  const overview = await getPlatformOverview();
  const { locale, dictionary } = await getTranslations();
  const navigation = [
    { label: dictionary.admin.overview, href: "/admin", exact: true, hint: "Start here for the current queue, totals, and follow-up." },
    { label: dictionary.admin.organizers, href: "/admin/organizers", hint: "Approve hosts, update accounts, and open organizer dashboards." },
    { label: dictionary.admin.settings, href: "/admin/settings", hint: "Manage site-wide details such as contact info and defaults." },
    { label: dictionary.admin.about, href: "/admin/about", hint: "Review the site story and shared public-facing copy." },
    { label: dictionary.admin.emails, href: "/admin/emails", hint: "Check templates and inbox-style organizer request activity." },
    { label: dictionary.admin.logs, href: "/admin/logs", hint: "Review recent system, registration, and payment activity." },
    { label: dictionary.admin.health, href: "/admin/health", hint: "Check storage, email, and Stripe readiness for production." }
  ];

  return (
    <main className="shell admin-shell">
      <div className="content admin-content">
        <TopNav
          brand={`Passreserve · ${dictionary.admin.platformTitle}`}
          brandHref="/admin"
          links={navigation}
          rightSlot={
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <LocaleSwitcher
                label={dictionary.admin.localeHint}
                labels={dictionary.locales}
                locale={locale}
              />
              <form action={platformLogoutAction}>
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
              <div className="page-place">{overview.releaseLabel}</div>
              <h1 className="admin-sidebar-title">Support dashboard</h1>
              <p className="admin-sidebar-copy">
                Review hosts, keep public pages accurate, check emails, and follow the main
                internal checks from one place.
              </p>
            </div>

            <div className="admin-summary-grid">
              <div className="admin-summary-card">
                <span className="metric-label">Organizers</span>
                <strong>{overview.summary.organizerCount}</strong>
              </div>
              <div className="admin-summary-card">
                <span className="metric-label">Events</span>
                <strong>{overview.summary.eventCount}</strong>
              </div>
              <div className="admin-summary-card">
                <span className="metric-label">Inbox open</span>
                <strong>{overview.summary.openRequestsCount}</strong>
              </div>
              <div className="admin-summary-card">
                <span className="metric-label">Inbox storage</span>
                <strong>{overview.summary.inboxStorageLabel}</strong>
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
              <div className="section-kicker">How to use this area</div>
              <div className="status-list">
                {[
                  {
                    title: "Organizers and requests",
                    detail:
                      "Use the Organizers area to approve new hosts, update their details, suspend accounts, or jump straight into their dashboard."
                  },
                  {
                    title: "Settings and public copy",
                    detail:
                      "Use Settings and About when you want to adjust shared brand details, contact information, or public-facing wording."
                  },
                  {
                    title: "Emails, logs, and checks",
                    detail:
                      "Use Emails, Logs, and Health when you need to confirm delivery, investigate an issue, or verify that payments and storage are ready."
                  }
                ].map((item, index) => (
                  <div className="status-item" key={item.title}>
                    <span className="status-index">{index + 1}</span>
                    <div>
                      <strong>{item.title}</strong>
                      {item.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-sidebar-block admin-sidebar-footer">
              <span className="spotlight-label">Team contact</span>
              <strong>{overview.supportEmail}</strong>
              <span>{overview.summary.onlineCollectedLabel} collected online across active organizers</span>
            </div>
          </aside>

          <div className="admin-main">{children}</div>
        </section>
      </div>
    </main>
  );
}
