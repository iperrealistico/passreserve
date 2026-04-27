import Link from "next/link";

import { PublicFooter } from "./public-footer.js";
import { HomeOrganizerRequestModal } from "./home-organizer-request-modal.js";
import { PublicHeader } from "./public-header.js";
import {
  organizerLaunchWindows,
  organizerPaymentModels
} from "../lib/passreserve-domain.js";
import { getTranslations } from "../lib/passreserve-i18n.js";

export const dynamic = "force-dynamic";

function Notice({ query }) {
  if (query.message === "request-saved") {
    return (
      <div className="registration-message-success">
        Your organizer request has been received and added to the Passreserve inbox.
      </div>
    );
  }

  if (query.error === "request") {
    return (
      <div className="registration-message-error">
        We could not save that request. Please review the form and try again.
      </div>
    );
  }

  return null;
}

export default async function HomePage({ searchParams }) {
  const query = await searchParams;
  const { locale, dictionary } = await getTranslations();

  return (
    <main className="shell">
      <div className="content">
        <PublicHeader currentPath="/" dictionary={dictionary} locale={locale} />
        <Notice query={query} />

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="panel overflow-hidden p-0">
            <div className="flex h-full flex-col gap-8 bg-card px-6 py-8 sm:px-8">
              <div className="flex flex-col gap-6">
                <div className="section-kicker">{dictionary.home.attendeeLabel}</div>
                <div className="max-w-xl">
                  <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
                    {dictionary.home.attendeeTitle}
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                    {dictionary.home.attendeeSummary}
                  </p>
                </div>
                <form action="/events" className="search-lab">
                  <label className="search-field">
                    <span className="search-label">{dictionary.events.inputLabel}</span>
                    <input
                      name="query"
                      placeholder={dictionary.events.inputPlaceholder}
                      type="text"
                    />
                  </label>
                  <div className="hero-actions mt-4">
                    <button className="button button-primary" type="submit">
                      {dictionary.home.attendeeCta}
                    </button>
                    <Link className="button button-secondary" href="/events">
                      {dictionary.nav.events}
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </article>

          <article className="panel overflow-hidden p-0">
            <div className="flex h-full flex-col gap-8 bg-primary px-6 py-8 text-primary-foreground sm:px-8">
              <div className="flex flex-col gap-6">
                <div className="section-kicker text-primary-foreground/70">
                  {dictionary.home.organizerLabel}
                </div>
                <div className="max-w-xl">
                  <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                    {dictionary.home.organizerTitle}
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-primary-foreground/80 sm:text-lg">
                    {dictionary.home.organizerSummary}
                  </p>
                </div>
                <div className="search-lab border-white/12 bg-white/[0.06]">
                  <div className="search-field">
                    <span className="search-label text-white/72">
                      {dictionary.home.organizerAccessLabel}
                    </span>
                    <div className="flex h-12 items-center rounded-2xl border border-white/12 bg-white/[0.03] px-4 text-base text-white/42 sm:text-lg">
                      {dictionary.home.organizerAccessPlaceholder}
                    </div>
                  </div>
                  <div className="mt-4 w-full max-w-[32rem] overflow-hidden rounded-full border border-white/12 bg-white/[0.03] shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
                    <div className="grid grid-cols-2">
                      <HomeOrganizerRequestModal
                        launchWindows={organizerLaunchWindows}
                        paymentModels={organizerPaymentModels}
                        triggerClassName="h-11 w-full rounded-none rounded-l-full bg-white px-4 text-center text-sm font-semibold text-primary shadow-none hover:bg-white/92 sm:px-6 sm:text-base"
                        triggerLabel={dictionary.home.requestCta}
                      />
                      <Link
                        className="button h-11 w-full rounded-none rounded-r-full border-0 border-l border-white/10 bg-transparent px-4 text-center text-sm font-medium leading-tight text-white/82 hover:bg-white/[0.08] hover:text-white sm:px-6 sm:text-base"
                        href="/admin/login"
                      >
                        {dictionary.home.organizerCta}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>

        <div className="mt-5 flex justify-center">
          <Link className="inline-link" href="/about">
            {dictionary.home.storyLink}
          </Link>
        </div>

        <PublicFooter dictionary={dictionary} locale={locale} />
      </div>
    </main>
  );
}
