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
  const isItalian = locale === "it";
  const navigation = [
    { label: dictionary.admin.overview, href: "/admin", exact: true, icon: "activity" },
    { label: dictionary.admin.organizers, href: "/admin/organizers", icon: "building" },
    { label: dictionary.admin.settings, href: "/admin/settings", icon: "settings" },
    { label: dictionary.admin.about, href: "/admin/about", icon: "file" },
    { label: dictionary.admin.emails, href: "/admin/emails", icon: "mail" },
    { label: dictionary.admin.logs, href: "/admin/logs", icon: "logs" },
    { label: dictionary.admin.health, href: "/admin/health", icon: "health" }
  ];
  const overviewNotes = [
    {
      title: isItalian ? "Organizer e richieste" : "Organizers and requests",
      detail: isItalian
        ? "Approva nuovi host, aggiorna account e apri rapidamente la loro dashboard operativa."
        : "Approve new hosts, update accounts, and jump directly into their operations dashboard."
    },
    {
      title: isItalian ? "Contenuti condivisi" : "Shared content",
      detail: isItalian
        ? "Usa Settings e About per mantenere coerenti brand, contatti e messaggi pubblici."
        : "Use Settings and About to keep brand details, contact info, and public messaging aligned."
    },
    {
      title: isItalian ? "Email, log e health" : "Email, logs, and health",
      detail: isItalian
        ? "Questa e la console per verificare delivery, audit trail e stato dei sistemi."
        : "This is the console for delivery checks, audit trails, and system readiness."
    },
    {
      title: isItalian ? "Team contact" : "Team contact",
      detail: `${overview.supportEmail} · ${overview.summary.onlineCollectedLabel}`
    }
  ];

  return (
    <main className="shell admin-shell">
      <div className="content admin-content">
        <TopNav
          brand={isItalian ? "Supporto Passreserve" : "Passreserve support"}
          brandHref="/admin"
          links={navigation}
          navigationLabel={isItalian ? "Navigazione piattaforma" : "Platform navigation"}
          mobileNavigationLabel={isItalian ? "Navigazione piattaforma mobile" : "Mobile platform navigation"}
          openLabel={isItalian ? "Apri navigazione" : "Open navigation"}
          closeLabel={isItalian ? "Chiudi navigazione" : "Close navigation"}
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
          <div className="admin-main admin-main-shell">
            <section className="panel admin-shell-intro">
              <div className="admin-shell-heading">
                <div>
                  <div className="page-place">{overview.releaseLabel}</div>
                  <h1 className="admin-shell-title">
                    {isItalian ? "Dashboard di supporto" : "Support dashboard"}
                  </h1>
                  <p className="admin-shell-copy">
                    {isItalian
                      ? "Controlla organizer, contenuti pubblici, email e stato operativo da una console unica e piu vicina al linguaggio di MTB Reserve."
                      : "Review organizers, public content, email activity, and operational readiness from a simpler console closer to the MTB Reserve pattern."}
                  </p>
                </div>
                <div className="hero-actions">
                  <Link className="button button-secondary" href="/admin/organizers">
                    {dictionary.admin.organizers}
                  </Link>
                </div>
              </div>

              <div className="admin-shell-summary">
                <div className="admin-summary-card">
                  <span className="metric-label">{isItalian ? "Organizer" : "Organizers"}</span>
                  <strong>{overview.summary.organizerCount}</strong>
                </div>
                <div className="admin-summary-card">
                  <span className="metric-label">{isItalian ? "Eventi" : "Events"}</span>
                  <strong>{overview.summary.eventCount}</strong>
                </div>
                <div className="admin-summary-card">
                  <span className="metric-label">{isItalian ? "Inbox aperte" : "Inbox open"}</span>
                  <strong>{overview.summary.openRequestsCount}</strong>
                </div>
                <div className="admin-summary-card">
                  <span className="metric-label">{isItalian ? "Storage inbox" : "Inbox storage"}</span>
                  <strong>{overview.summary.inboxStorageLabel}</strong>
                </div>
              </div>

              <div className="admin-shell-note-grid">
                {overviewNotes.map((item) => (
                  <div className="admin-shell-note" key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                ))}
              </div>
            </section>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
