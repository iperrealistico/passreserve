"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useInteractionFeedback } from "./interaction-feedback-provider.js";
import {
  PASSRESERVE_LOCALE_COOKIE,
  SUPPORTED_LOCALES
} from "../lib/passreserve-locales.js";

export function LocaleSwitcher({ locale = "en", label = "Language", labels = {} }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startRouteFeedback } = useInteractionFeedback();

  function handleLocaleChange(nextLocale) {
    if (!SUPPORTED_LOCALES.includes(nextLocale) || nextLocale === locale) {
      return;
    }

    document.cookie = `${PASSRESERVE_LOCALE_COOKIE}=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    const query = searchParams?.toString();
    startRouteFeedback({
      currentPathname: pathname,
      targetPathname: pathname,
      label: "Updating interface language"
    });
    router.replace(query ? `${pathname}?${query}` : pathname);
    router.refresh();
  }

  return (
    <label className="locale-switcher">
      <span className="locale-switcher-label">{label}</span>
      <select onChange={(event) => handleLocaleChange(event.target.value)} value={locale}>
        {SUPPORTED_LOCALES.map((entry) => (
          <option key={entry} value={entry}>
            {labels[entry] || entry.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
