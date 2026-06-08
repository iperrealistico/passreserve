"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const InteractionFeedbackContext = createContext({
  startRouteFeedback: () => {},
  stopRouteFeedback: () => {}
});

const ROUTE_OVERLAY_DELAY_MS = 80;
const BUTTON_FEEDBACK_DURATION_MS = 220;
const SOUND_THROTTLE_MS = 70;
const ROUTE_FEEDBACK_FAILSAFE_MS = 10000;
const SAME_PATH_REFRESH_FALLBACK_MS = 1600;

function isOrganizerAdminPath(pathname) {
  return /^\/[^/]+\/admin(?:\/.*)?$/.test(pathname) && !/^\/[^/]+\/admin\/login(?:\/.*)?$/.test(pathname);
}

function isAuthLikePath(pathname) {
  return (
    pathname === "/organizer-access" ||
    pathname === "/admin/login" ||
    /^\/admin\/login\/reset\/[^/]+$/.test(pathname) ||
    /^\/[^/]+\/admin\/login(?:\/.*)?$/.test(pathname)
  );
}

function getRouteFeedbackProfile(currentPathname, targetPathname) {
  if (isOrganizerAdminPath(currentPathname) || isOrganizerAdminPath(targetPathname)) {
    return {
      label: "Opening organizer dashboard",
      overlay: true
    };
  }

  if (isAuthLikePath(currentPathname) || isAuthLikePath(targetPathname)) {
    return {
      label: "Opening secure page",
      overlay: true
    };
  }

  return null;
}

function isModifiedMouseEvent(event) {
  return Boolean(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
}

function isDisabledInteractive(target) {
  if (!target || !(target instanceof HTMLElement)) {
    return true;
  }

  if (target.matches(":disabled")) {
    return true;
  }

  return (
    target.getAttribute("aria-disabled") === "true" ||
    target.getAttribute("data-feedback-disabled") === "true"
  );
}

function getButtonFeedbackTarget(element) {
  if (!(element instanceof Element)) {
    return null;
  }

  return (
    element.closest('button, input[type="submit"], input[type="button"], a.button, [role="button"]') ||
    null
  );
}

function getInternalLinkTarget(element) {
  if (!(element instanceof Element)) {
    return null;
  }

  return element.closest("a[href]");
}

function shouldHandleAnchorNavigation(anchor, event) {
  if (!(anchor instanceof HTMLAnchorElement)) {
    return false;
  }

  if (anchor.target && anchor.target !== "_self") {
    return false;
  }

  if (anchor.hasAttribute("download")) {
    return false;
  }

  if (isModifiedMouseEvent(event)) {
    return false;
  }

  if ("button" in event && event.button !== 0) {
    return false;
  }

  try {
    const currentUrl = new URL(window.location.href);
    const targetUrl = new URL(anchor.href, currentUrl);

    if (targetUrl.origin !== currentUrl.origin) {
      return false;
    }

    if (
      targetUrl.pathname === currentUrl.pathname &&
      targetUrl.search === currentUrl.search &&
      targetUrl.hash
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function buildRouteFeedbackLabel(profile, targetPathname) {
  if (isOrganizerAdminPath(targetPathname)) {
    return "Loading organizer dashboard";
  }

  if (isAuthLikePath(targetPathname)) {
    return "Loading sign-in flow";
  }

  return profile?.label || "Loading next page";
}

function playFeedbackTone(audioContextRef, lastSoundAtRef) {
  if (typeof window === "undefined") {
    return;
  }

  const now = window.performance.now();

  if (now - lastSoundAtRef.current < SOUND_THROTTLE_MS) {
    return;
  }

  lastSoundAtRef.current = now;

  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext || null;

  if (!AudioContextClass) {
    return;
  }

  if (!audioContextRef.current) {
    audioContextRef.current = new AudioContextClass();
  }

  const context = audioContextRef.current;

  if (context.state === "suspended") {
    void context.resume().catch(() => undefined);
  }

  const startAt = context.currentTime + 0.002;
  const gain = context.createGain();
  const oscillator = context.createOscillator();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(540, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(410, startAt + 0.075);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.025, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.085);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.09);
}

export function useInteractionFeedback() {
  return useContext(InteractionFeedbackContext);
}

export function InteractionFeedbackProvider({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams?.toString() || "";
  const audioContextRef = useRef(null);
  const lastSoundAtRef = useRef(-Infinity);
  const feedbackTimersRef = useRef(new WeakMap());
  const overlayTimerRef = useRef(null);
  const failSafeTimerRef = useRef(null);
  const routeTicketRef = useRef(0);
  const [routeFeedback, setRouteFeedback] = useState({
    active: false,
    overlayVisible: false,
    label: ""
  });

  const stopRouteFeedback = useCallback(() => {
    routeTicketRef.current += 1;

    if (overlayTimerRef.current) {
      window.clearTimeout(overlayTimerRef.current);
      overlayTimerRef.current = null;
    }

    if (failSafeTimerRef.current) {
      window.clearTimeout(failSafeTimerRef.current);
      failSafeTimerRef.current = null;
    }

    setRouteFeedback((current) =>
      current.active || current.overlayVisible || current.label
        ? {
            active: false,
            overlayVisible: false,
            label: ""
          }
        : current
    );
  }, []);

  const startRouteFeedback = useCallback(
    ({ currentPathname = pathname, targetPathname = pathname, label = "" } = {}) => {
      const profile = getRouteFeedbackProfile(currentPathname, targetPathname);

      if (!profile) {
        return;
      }

      const nextTicket = routeTicketRef.current + 1;
      routeTicketRef.current = nextTicket;

      if (overlayTimerRef.current) {
        window.clearTimeout(overlayTimerRef.current);
      }

      setRouteFeedback({
        active: true,
        overlayVisible: false,
        label: label || buildRouteFeedbackLabel(profile, targetPathname)
      });

      if (profile.overlay) {
        overlayTimerRef.current = window.setTimeout(() => {
          if (routeTicketRef.current !== nextTicket) {
            return;
          }

          setRouteFeedback((current) =>
            current.active
              ? {
                  ...current,
                  overlayVisible: true
                }
              : current
          );
        }, ROUTE_OVERLAY_DELAY_MS);
      }

      failSafeTimerRef.current = window.setTimeout(() => {
        if (routeTicketRef.current === nextTicket) {
          stopRouteFeedback();
        }
      }, ROUTE_FEEDBACK_FAILSAFE_MS);

      if (currentPathname === targetPathname) {
        window.setTimeout(() => {
          if (routeTicketRef.current === nextTicket) {
            stopRouteFeedback();
          }
        }, SAME_PATH_REFRESH_FALLBACK_MS);
      }
    },
    [pathname, stopRouteFeedback]
  );

  useEffect(() => {
    stopRouteFeedback();
  }, [pathname, searchKey, stopRouteFeedback]);

  useEffect(() => {
    const pulseInteractive = (target) => {
      if (!(target instanceof HTMLElement) || isDisabledInteractive(target)) {
        return;
      }

      const existingTimer = feedbackTimersRef.current.get(target);

      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      target.dataset.feedbackActive = "true";

      const timerId = window.setTimeout(() => {
        target.removeAttribute("data-feedback-active");
        feedbackTimersRef.current.delete(target);
      }, BUTTON_FEEDBACK_DURATION_MS);

      feedbackTimersRef.current.set(target, timerId);
    };

    const handleClick = (event) => {
      const feedbackTarget = getButtonFeedbackTarget(event.target);

      if (feedbackTarget && !isDisabledInteractive(feedbackTarget)) {
        pulseInteractive(feedbackTarget);
        playFeedbackTone(audioContextRef, lastSoundAtRef);
      }

      const anchor = getInternalLinkTarget(event.target);

      if (!anchor || !shouldHandleAnchorNavigation(anchor, event)) {
        return;
      }

      const targetUrl = new URL(anchor.href, window.location.href);
      startRouteFeedback({
        currentPathname: window.location.pathname,
        targetPathname: targetUrl.pathname
      });
    };

    const handleSubmit = (event) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;

      if (!form) {
        return;
      }

      const submitter =
        event.submitter instanceof HTMLElement ? event.submitter : null;

      if (submitter && !isDisabledInteractive(submitter)) {
        pulseInteractive(submitter);
      }

      playFeedbackTone(audioContextRef, lastSoundAtRef);

      let targetPathname = window.location.pathname;
      const action = form.getAttribute("action");

      if (action) {
        try {
          targetPathname = new URL(action, window.location.href).pathname;
        } catch {
          targetPathname = window.location.pathname;
        }
      }

      startRouteFeedback({
        currentPathname: window.location.pathname,
        targetPathname
      });
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, [startRouteFeedback]);

  const contextValue = useMemo(
    () => ({
      startRouteFeedback,
      stopRouteFeedback
    }),
    [startRouteFeedback, stopRouteFeedback]
  );

  return (
    <InteractionFeedbackContext.Provider value={contextValue}>
      {routeFeedback.active ? (
        <div aria-hidden="true" className="app-route-progress" data-active="true" />
      ) : null}
      {routeFeedback.active ? (
        <div
          aria-live="polite"
          className="app-route-overlay"
          data-active={routeFeedback.overlayVisible ? "true" : "false"}
        >
          <div className="app-route-overlay-card">
            <div aria-hidden="true" className="app-route-spinner-stack">
              <span className="app-route-spinner app-route-spinner-outer" />
              <span className="app-route-spinner app-route-spinner-inner" />
              <span className="app-route-spinner-dot" />
            </div>
            <div className="app-route-overlay-copy">
              <strong>Passreserve</strong>
              <span>{routeFeedback.label || "Loading next page"}</span>
            </div>
            <div aria-hidden="true" className="app-route-overlay-bars">
              <span className="app-route-overlay-bar app-route-overlay-bar-strong" />
              <span className="app-route-overlay-bar" />
              <span className="app-route-overlay-bar app-route-overlay-bar-soft" />
            </div>
          </div>
        </div>
      ) : null}
      {children}
    </InteractionFeedbackContext.Provider>
  );
}
