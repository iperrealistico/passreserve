"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { driver } from "driver.js";

import {
  ORGANIZER_ADMIN_TOUR_EVENT,
  ORGANIZER_ADMIN_TOUR_STORAGE_KEY,
  ORGANIZER_ADMIN_TOUR_VERSION,
  getOrganizerAdminTourDefinition
} from "../../../lib/organizer-admin-tour.js";
import {
  PASSRESERVE_LOCALE_COOKIE,
  SUPPORTED_LOCALES
} from "../../../lib/passreserve-locales.js";

function isVisibleElement(element) {
  return Boolean(element) && element.getClientRects().length > 0;
}

function findTarget(selector) {
  if (!selector) {
    return null;
  }

  const matches = Array.from(document.querySelectorAll(selector));
  return matches.find(isVisibleElement) || matches[0] || null;
}

function waitForTarget(selector, timeoutMs = 1600) {
  if (!selector) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const startedAt = window.performance.now();

    const tick = () => {
      const target = findTarget(selector);

      if (target) {
        resolve(target);
        return;
      }

      if (window.performance.now() - startedAt >= timeoutMs) {
        resolve(null);
        return;
      }

      window.requestAnimationFrame(tick);
    };

    tick();
  });
}

function readStoredState() {
  try {
    const raw = window.localStorage.getItem(ORGANIZER_ADMIN_TOUR_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredState(status) {
  try {
    window.localStorage.setItem(
      ORGANIZER_ADMIN_TOUR_STORAGE_KEY,
      JSON.stringify({
        version: ORGANIZER_ADMIN_TOUR_VERSION,
        status,
        updatedAt: new Date().toISOString()
      })
    );
  } catch {
    // Ignore storage failures and keep the tour usable.
  }
}

export function OrganizerAdminTour({ locale, slug }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const driverRef = useRef(null);
  const activeRef = useRef(false);
  const activeStepIndexRef = useRef(0);
  const pendingStepIndexRef = useRef(null);
  const autoStartCheckedRef = useRef(false);
  const renderTokenRef = useRef(0);
  const [tourLocale, setTourLocale] = useState(locale);
  const definition = useMemo(
    () => getOrganizerAdminTourDefinition({ slug, locale: tourLocale }),
    [slug, tourLocale]
  );

  const dashboardRoute = definition.steps[0]?.route || `/${slug}/admin/dashboard`;

  function destroyDriver() {
    driverRef.current?.destroy();
    driverRef.current = null;
  }

  function finishTour(status) {
    destroyDriver();
    activeRef.current = false;
    pendingStepIndexRef.current = null;
    renderTokenRef.current += 1;
    writeStoredState(status);
  }

  function switchTourLocale(nextLocale) {
    if (!SUPPORTED_LOCALES.includes(nextLocale) || nextLocale === tourLocale) {
      return;
    }

    pendingStepIndexRef.current = activeStepIndexRef.current;
    renderTokenRef.current += 1;
    destroyDriver();

    document.cookie = `${PASSRESERVE_LOCALE_COOKIE}=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setTourLocale(nextLocale);

    const query = searchParams?.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
    router.refresh();
  }

  async function showStep(stepIndex) {
    const step = definition.steps[stepIndex];

    if (!step) {
      finishTour("completed");
      return;
    }

    activeRef.current = true;
    activeStepIndexRef.current = stepIndex;
    pendingStepIndexRef.current = null;

    const token = renderTokenRef.current + 1;
    renderTokenRef.current = token;

    const target = await waitForTarget(step.target);

    if (!activeRef.current || renderTokenRef.current !== token) {
      return;
    }

    destroyDriver();

    const steps = definition.steps.map((entry, index) => {
      const popover = {
        align: entry.align,
        description: entry.description,
        showButtons: ["previous", "next"],
        side: entry.side,
        title: entry.title
      };

      if (index === stepIndex) {
        return target
          ? {
              element: target,
              popover
            }
          : {
              popover
            };
      }

      return {
        element: () => findTarget(entry.target),
        popover
      };
    });

    const instance = driver({
      allowClose: false,
      allowKeyboardControl: true,
      doneBtnText: definition.labels.done,
      nextBtnText: definition.labels.next,
      overlayColor: "rgba(12, 18, 15, 0.78)",
      overlayOpacity: 0.74,
      popoverClass: "organizer-tour-popover",
      prevBtnText: definition.labels.previous,
      showProgress: true,
      smoothScroll: true,
      stagePadding: 14,
      stageRadius: 22,
      steps,
      onNextClick: () => {
        if (stepIndex >= definition.steps.length - 1) {
          finishTour("completed");
          return;
        }

        void goToStep(stepIndex + 1);
      },
      onPrevClick: () => {
        if (stepIndex <= 0) {
          return;
        }

        void goToStep(stepIndex - 1);
      },
      onPopoverRender: (popover) => {
        const localeToolbar = document.createElement("div");
        localeToolbar.className = "organizer-tour-locale-toolbar";

        const localeLabel = document.createElement("span");
        localeLabel.className = "organizer-tour-locale-label";
        localeLabel.textContent = definition.labels.language;
        localeToolbar.append(localeLabel);

        const localeGroup = document.createElement("div");
        localeGroup.className = "organizer-tour-locale-group";
        localeGroup.setAttribute("aria-label", definition.labels.language);
        localeGroup.setAttribute("role", "group");

        definition.localeOptions.forEach((option) => {
          const optionButton = document.createElement("button");
          optionButton.className = "organizer-tour-locale-option";
          optionButton.dataset.active = option.value === tourLocale ? "true" : "false";
          optionButton.textContent = option.shortLabel;
          optionButton.title = option.label;
          optionButton.type = "button";
          optionButton.setAttribute("aria-label", option.label);
          optionButton.setAttribute(
            "aria-pressed",
            option.value === tourLocale ? "true" : "false"
          );
          optionButton.addEventListener("click", () => {
            switchTourLocale(option.value);
          });
          localeGroup.append(optionButton);
        });

        localeToolbar.append(localeGroup);
        popover.description.before(localeToolbar);

        const skipButton = document.createElement("button");
        skipButton.className = "driver-popover-btn organizer-tour-skip-btn";
        skipButton.textContent = definition.labels.skip;
        skipButton.type = "button";
        skipButton.addEventListener("click", () => {
          finishTour("skipped");
        });
        popover.footerButtons.prepend(skipButton);
      }
    });

    driverRef.current = instance;
    instance.drive(stepIndex);
  }

  async function goToStep(stepIndex) {
    const step = definition.steps[stepIndex];

    if (!step) {
      finishTour("completed");
      return;
    }

    if (pathname !== step.route) {
      pendingStepIndexRef.current = stepIndex;
      destroyDriver();
      router.push(step.route);
      return;
    }

    await showStep(stepIndex);
  }

  async function startTour() {
    destroyDriver();
    activeRef.current = true;
    pendingStepIndexRef.current = 0;

    if (pathname !== dashboardRoute) {
      router.push(dashboardRoute);
      return;
    }

    await showStep(0);
  }

  useEffect(() => {
    const handleStart = () => {
      void startTour();
    };

    window.addEventListener(ORGANIZER_ADMIN_TOUR_EVENT, handleStart);
    return () => {
      window.removeEventListener(ORGANIZER_ADMIN_TOUR_EVENT, handleStart);
    };
  });

  useEffect(() => {
    setTourLocale(locale);
  }, [locale]);

  useEffect(() => {
    if (!activeRef.current) {
      return;
    }

    const pendingStepIndex = pendingStepIndexRef.current;

    if (pendingStepIndex !== null) {
      const pendingStep = definition.steps[pendingStepIndex];

      if (pendingStep?.route === pathname) {
        pendingStepIndexRef.current = null;
        void showStep(pendingStepIndex);
      }

      return;
    }

    const activeStepIndex = activeStepIndexRef.current;
    const activeStep = definition.steps[activeStepIndex];

    if (activeStep?.route === pathname) {
      void showStep(activeStepIndex);
      return;
    }

    if (activeStep) {
      finishTour("skipped");
    }
  }, [definition.steps, pathname]);

  useEffect(() => {
    if (autoStartCheckedRef.current || pathname !== dashboardRoute) {
      return;
    }

    autoStartCheckedRef.current = true;
    const savedState = readStoredState();

    if (
      savedState?.version === ORGANIZER_ADMIN_TOUR_VERSION &&
      (savedState.status === "completed" || savedState.status === "skipped")
    ) {
      return;
    }

    void startTour();
  }, [dashboardRoute, pathname]);

  useEffect(() => {
    return () => {
      destroyDriver();
    };
  }, []);

  return null;
}
