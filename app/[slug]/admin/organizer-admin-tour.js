"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { driver } from "driver.js";

import {
  ORGANIZER_ADMIN_TOUR_EVENT,
  ORGANIZER_ADMIN_TOUR_MODES,
  ORGANIZER_ADMIN_TOUR_STORAGE_KEY,
  ORGANIZER_ADMIN_TOUR_VERSION,
  getOrganizerAdminTourDefinition
} from "../../../lib/organizer-admin-tour.js";
import {
  PASSRESERVE_LOCALE_COOKIE,
  SUPPORTED_LOCALES
} from "../../../lib/passreserve-locales.js";

const LEGACY_TOUR_VERSION = "2026-04-27-organizer-admin-tour-v1";
const TOUR_PENDING_STATUS = "pending";
const TOUR_COMPLETED_STATUS = "completed";
const TOUR_SKIPPED_STATUS = "skipped";

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

function createDefaultStoredState() {
  return {
    version: ORGANIZER_ADMIN_TOUR_VERSION,
    modes: {
      [ORGANIZER_ADMIN_TOUR_MODES.SHOWCASE]: TOUR_PENDING_STATUS,
      [ORGANIZER_ADMIN_TOUR_MODES.SETUP]: TOUR_PENDING_STATUS
    },
    active: null,
    updatedAt: null
  };
}

function normalizeMode(value) {
  return Object.values(ORGANIZER_ADMIN_TOUR_MODES).includes(value) ? value : null;
}

function normalizeModeStatus(value) {
  return [TOUR_PENDING_STATUS, TOUR_COMPLETED_STATUS, TOUR_SKIPPED_STATUS].includes(value)
    ? value
    : TOUR_PENDING_STATUS;
}

function normalizeQueryCondition(raw) {
  if (
    raw &&
    typeof raw === "object" &&
    raw.type === "query-value" &&
    typeof raw.key === "string" &&
    typeof raw.value === "string"
  ) {
    return {
      type: "query-value",
      key: raw.key,
      value: raw.value
    };
  }

  return null;
}

function normalizePendingAdvance(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const stepIndex = Number(raw.stepIndex);

  if (!Number.isInteger(stepIndex) || stepIndex < 0) {
    return null;
  }

  return {
    stepIndex,
    waitFor: normalizeQueryCondition(raw.waitFor)
  };
}

function normalizeActiveState(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const mode = normalizeMode(raw.mode);
  const stepIndex = Number(raw.stepIndex);

  if (!mode || !Number.isInteger(stepIndex) || stepIndex < 0) {
    return null;
  }

  return {
    mode,
    stepIndex,
    pendingAdvance: normalizePendingAdvance(raw.pendingAdvance),
    locale: SUPPORTED_LOCALES.includes(raw.locale) ? raw.locale : null
  };
}

function migrateLegacyStoredState(raw) {
  const next = createDefaultStoredState();

  next.modes[ORGANIZER_ADMIN_TOUR_MODES.SHOWCASE] = normalizeModeStatus(raw?.status);
  next.updatedAt = typeof raw?.updatedAt === "string" ? raw.updatedAt : new Date().toISOString();
  return next;
}

function normalizeStoredState(raw) {
  if (!raw || typeof raw !== "object") {
    return createDefaultStoredState();
  }

  if (raw.version === LEGACY_TOUR_VERSION) {
    return migrateLegacyStoredState(raw);
  }

  if (raw.version !== ORGANIZER_ADMIN_TOUR_VERSION) {
    return createDefaultStoredState();
  }

  const defaults = createDefaultStoredState();

  return {
    version: ORGANIZER_ADMIN_TOUR_VERSION,
    modes: {
      [ORGANIZER_ADMIN_TOUR_MODES.SHOWCASE]: normalizeModeStatus(
        raw.modes?.[ORGANIZER_ADMIN_TOUR_MODES.SHOWCASE]
      ),
      [ORGANIZER_ADMIN_TOUR_MODES.SETUP]: normalizeModeStatus(
        raw.modes?.[ORGANIZER_ADMIN_TOUR_MODES.SETUP]
      )
    },
    active: normalizeActiveState(raw.active),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : defaults.updatedAt
  };
}

function readStoredState() {
  try {
    const raw = window.localStorage.getItem(ORGANIZER_ADMIN_TOUR_STORAGE_KEY);
    return normalizeStoredState(raw ? JSON.parse(raw) : null);
  } catch {
    return createDefaultStoredState();
  }
}

function writeStoredState(nextState) {
  try {
    window.localStorage.setItem(
      ORGANIZER_ADMIN_TOUR_STORAGE_KEY,
      JSON.stringify(normalizeStoredState(nextState))
    );
  } catch {
    // Ignore storage failures and keep the tour usable.
  }
}

function updateStoredState(mutator) {
  const current = readStoredState();
  const next = mutator(current);
  writeStoredState(next);
  return normalizeStoredState(next);
}

function matchesQueryCondition(condition, searchParams) {
  if (!condition) {
    return true;
  }

  if (condition.type !== "query-value") {
    return false;
  }

  return searchParams?.get(condition.key) === condition.value;
}

export function OrganizerAdminTour({ locale, slug }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const driverRef = useRef(null);
  const interactionAbortRef = useRef(null);
  const activeRef = useRef(false);
  const activeStepIndexRef = useRef(0);
  const pendingAdvanceRef = useRef(null);
  const activeModeRef = useRef(ORGANIZER_ADMIN_TOUR_MODES.SETUP);
  const bootstrappedRef = useRef(false);
  const autoStartCheckedRef = useRef(false);
  const renderTokenRef = useRef(0);
  const [tourLocale, setTourLocale] = useState(locale);
  const [tourMode, setTourMode] = useState(ORGANIZER_ADMIN_TOUR_MODES.SETUP);

  const definitions = useMemo(
    () => ({
      [ORGANIZER_ADMIN_TOUR_MODES.SHOWCASE]: getOrganizerAdminTourDefinition({
        slug,
        locale: tourLocale,
        mode: ORGANIZER_ADMIN_TOUR_MODES.SHOWCASE
      }),
      [ORGANIZER_ADMIN_TOUR_MODES.SETUP]: getOrganizerAdminTourDefinition({
        slug,
        locale: tourLocale,
        mode: ORGANIZER_ADMIN_TOUR_MODES.SETUP
      })
    }),
    [slug, tourLocale]
  );

  const dashboardRoute =
    definitions[ORGANIZER_ADMIN_TOUR_MODES.SETUP].steps[0]?.route ||
    `/${slug}/admin/dashboard`;
  const routeStateKey = `${pathname}?${searchParams?.toString() || ""}`;

  function getDefinition(mode = activeModeRef.current) {
    return definitions[mode] || definitions[ORGANIZER_ADMIN_TOUR_MODES.SHOWCASE];
  }

  function setActiveMode(mode) {
    const safeMode =
      normalizeMode(mode) || ORGANIZER_ADMIN_TOUR_MODES.SHOWCASE;

    activeModeRef.current = safeMode;
    setTourMode(safeMode);
    return safeMode;
  }

  function destroyDriver() {
    interactionAbortRef.current?.abort();
    interactionAbortRef.current = null;
    driverRef.current?.destroy();
    driverRef.current = null;
  }

  function invalidateCurrentRender() {
    renderTokenRef.current += 1;
  }

  function persistActiveState({
    mode = activeModeRef.current,
    stepIndex,
    pendingAdvance = null,
    localeValue = tourLocale
  }) {
    updateStoredState((state) => ({
      ...state,
      active: {
        mode,
        stepIndex,
        pendingAdvance,
        locale: localeValue
      },
      updatedAt: new Date().toISOString()
    }));
  }

  function persistFinishedState(status, mode = activeModeRef.current) {
    updateStoredState((state) => ({
      ...state,
      active: null,
      modes: {
        ...state.modes,
        [mode]: status
      },
      updatedAt: new Date().toISOString()
    }));
  }

  function finishTour(status) {
    invalidateCurrentRender();
    destroyDriver();
    activeRef.current = false;
    pendingAdvanceRef.current = null;
    persistFinishedState(status);
  }

  function switchTourLocale(nextLocale) {
    if (!SUPPORTED_LOCALES.includes(nextLocale) || nextLocale === tourLocale) {
      return;
    }

    persistActiveState({
      mode: activeModeRef.current,
      stepIndex: activeStepIndexRef.current,
      pendingAdvance: pendingAdvanceRef.current,
      localeValue: nextLocale
    });
    invalidateCurrentRender();
    destroyDriver();

    document.cookie = `${PASSRESERVE_LOCALE_COOKIE}=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setTourLocale(nextLocale);

    const query = searchParams?.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
    router.refresh();
  }

  async function showStep(stepIndex, mode = activeModeRef.current) {
    const modeDefinition = getDefinition(mode);
    const step = modeDefinition.steps[stepIndex];

    if (!step) {
      finishTour(TOUR_COMPLETED_STATUS);
      return;
    }

    activeRef.current = true;
    setActiveMode(mode);
    activeStepIndexRef.current = stepIndex;
    pendingAdvanceRef.current = null;
    persistActiveState({
      mode,
      stepIndex,
      pendingAdvance: null
    });

    const token = renderTokenRef.current + 1;
    renderTokenRef.current = token;

    const target = await waitForTarget(step.target);

    if (!activeRef.current || renderTokenRef.current !== token) {
      return;
    }

    destroyDriver();

    const activeButtons =
      step.advanceOn && target ? ["previous"] : ["previous", "next"];

    const steps = modeDefinition.steps.map((entry, index) => {
      const popover = {
        align: entry.align,
        description: entry.description,
        showButtons: index === stepIndex ? activeButtons : ["previous", "next"],
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

    const nextStep = modeDefinition.steps[stepIndex + 1];
    const advanceTargetSelector = step.advanceSelector || step.target;

    const instance = driver({
      allowClose: false,
      allowKeyboardControl: true,
      doneBtnText: modeDefinition.labels.done,
      nextBtnText: modeDefinition.labels.next,
      overlayColor: "rgba(12, 18, 15, 0.78)",
      overlayOpacity: 0.74,
      popoverClass: `organizer-tour-popover organizer-tour-popover-${mode}`,
      prevBtnText: modeDefinition.labels.previous,
      showProgress: true,
      smoothScroll: true,
      stagePadding: 14,
      stageRadius: 22,
      steps,
      onNextClick: () => {
        if (stepIndex >= modeDefinition.steps.length - 1) {
          finishTour(TOUR_COMPLETED_STATUS);
          return;
        }

        void goToStep(stepIndex + 1, mode);
      },
      onPrevClick: () => {
        if (stepIndex <= 0) {
          return;
        }

        void goToStep(stepIndex - 1, mode);
      },
      onPopoverRender: (popover) => {
        const localeToolbar = document.createElement("div");
        localeToolbar.className = "organizer-tour-locale-toolbar";

        const localeLabel = document.createElement("span");
        localeLabel.className = "organizer-tour-locale-label";
        localeLabel.textContent = modeDefinition.labels.language;
        localeToolbar.append(localeLabel);

        const localeGroup = document.createElement("div");
        localeGroup.className = "organizer-tour-locale-group";
        localeGroup.setAttribute("aria-label", modeDefinition.labels.language);
        localeGroup.setAttribute("role", "group");

        modeDefinition.localeOptions.forEach((option) => {
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
        skipButton.textContent = modeDefinition.labels.skip;
        skipButton.type = "button";
        skipButton.addEventListener("click", () => {
          finishTour(TOUR_SKIPPED_STATUS);
        });
        popover.footerButtons.prepend(skipButton);
      }
    });

    driverRef.current = instance;
    instance.drive(stepIndex);

    if (step.advanceOn && nextStep) {
      const advanceElement = await waitForTarget(advanceTargetSelector, 400);

      if (!advanceElement || !activeRef.current || renderTokenRef.current !== token) {
        return;
      }

      const controller = new AbortController();
      interactionAbortRef.current = controller;

      const armPendingAdvance = () => {
        const pendingAdvance = {
          stepIndex: stepIndex + 1,
          waitFor: step.resumeWhen || null
        };

        pendingAdvanceRef.current = pendingAdvance;
        persistActiveState({
          mode,
          stepIndex,
          pendingAdvance
        });
        invalidateCurrentRender();
        destroyDriver();

        if (!pendingAdvance.waitFor && nextStep.route === pathname) {
          window.setTimeout(() => {
            void showStep(stepIndex + 1, mode);
          }, 160);
        }
      };

      if (step.advanceOn === "form-submit") {
        advanceElement.addEventListener("submit", armPendingAdvance, {
          once: true,
          signal: controller.signal
        });
      } else {
        advanceElement.addEventListener("click", armPendingAdvance, {
          once: true,
          signal: controller.signal
        });
      }
    }
  }

  async function goToStep(stepIndex, mode = activeModeRef.current) {
    const modeDefinition = getDefinition(mode);
    const step = modeDefinition.steps[stepIndex];

    if (!step) {
      finishTour(TOUR_COMPLETED_STATUS);
      return;
    }

    if (pathname !== step.route) {
      const pendingAdvance = {
        stepIndex,
        waitFor: null
      };

      pendingAdvanceRef.current = pendingAdvance;
      persistActiveState({
        mode,
        stepIndex: activeStepIndexRef.current,
        pendingAdvance
      });
      invalidateCurrentRender();
      destroyDriver();
      router.push(step.route);
      return;
    }

    await showStep(stepIndex, mode);
  }

  async function startTour(mode = ORGANIZER_ADMIN_TOUR_MODES.SHOWCASE) {
    const safeMode = setActiveMode(mode);
    const modeDefinition = getDefinition(safeMode);
    const startRoute = modeDefinition.steps[0]?.route || dashboardRoute;

    autoStartCheckedRef.current = true;
    activeRef.current = true;
    activeStepIndexRef.current = 0;
    pendingAdvanceRef.current = null;

    invalidateCurrentRender();
    destroyDriver();

    if (pathname !== startRoute) {
      const pendingAdvance = {
        stepIndex: 0,
        waitFor: null
      };

      pendingAdvanceRef.current = pendingAdvance;
      persistActiveState({
        mode: safeMode,
        stepIndex: 0,
        pendingAdvance
      });
      router.push(startRoute);
      return;
    }

    await showStep(0, safeMode);
  }

  useEffect(() => {
    const handleStart = (event) => {
      const requestedMode = normalizeMode(event?.detail?.mode);
      void startTour(requestedMode || ORGANIZER_ADMIN_TOUR_MODES.SHOWCASE);
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
    if (bootstrappedRef.current) {
      return;
    }

    bootstrappedRef.current = true;
    const savedState = readStoredState();

    if (!savedState.active?.mode) {
      return;
    }

    activeRef.current = true;
    activeStepIndexRef.current = savedState.active.stepIndex;
    pendingAdvanceRef.current = savedState.active.pendingAdvance;
    setActiveMode(savedState.active.mode);

    if (savedState.active.locale && savedState.active.locale !== locale) {
      setTourLocale(savedState.active.locale);
    }
  }, [locale]);

  useEffect(() => {
    if (activeRef.current) {
      const activeDefinition = getDefinition();
      const currentStep = activeDefinition.steps[activeStepIndexRef.current];
      const pendingAdvance = pendingAdvanceRef.current;

      if (pendingAdvance) {
        const pendingStep = activeDefinition.steps[pendingAdvance.stepIndex];

        if (
          pendingStep?.route === pathname &&
          matchesQueryCondition(pendingAdvance.waitFor, searchParams)
        ) {
          pendingAdvanceRef.current = null;
          void showStep(pendingAdvance.stepIndex);
          return;
        }

        if (
          currentStep?.route === pathname &&
          searchParams?.has("error")
        ) {
          pendingAdvanceRef.current = null;
          persistActiveState({
            mode: activeModeRef.current,
            stepIndex: activeStepIndexRef.current,
            pendingAdvance: null
          });
          void showStep(activeStepIndexRef.current);
        }

        return;
      }

      if (currentStep?.route === pathname) {
        void showStep(activeStepIndexRef.current);
      }

      return;
    }

    if (autoStartCheckedRef.current || pathname !== dashboardRoute) {
      return;
    }

    const savedState = readStoredState();

    if (savedState.active?.mode) {
      activeRef.current = true;
      activeStepIndexRef.current = savedState.active.stepIndex;
      pendingAdvanceRef.current = savedState.active.pendingAdvance;
      setActiveMode(savedState.active.mode);

      if (savedState.active.locale && savedState.active.locale !== locale) {
        setTourLocale(savedState.active.locale);
      }

      return;
    }

    if (
      savedState.modes[ORGANIZER_ADMIN_TOUR_MODES.SETUP] === TOUR_COMPLETED_STATUS ||
      savedState.modes[ORGANIZER_ADMIN_TOUR_MODES.SETUP] === TOUR_SKIPPED_STATUS
    ) {
      autoStartCheckedRef.current = true;
      return;
    }

    void startTour(ORGANIZER_ADMIN_TOUR_MODES.SETUP);
  }, [dashboardRoute, locale, pathname, routeStateKey, tourLocale, tourMode]);

  useEffect(() => {
    return () => {
      invalidateCurrentRender();
      destroyDriver();
    };
  }, []);

  return null;
}
