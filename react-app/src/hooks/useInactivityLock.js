import { useCallback, useEffect, useRef } from "react";

// Preserve the original key so existing App Lock users migrate automatically.
export const APP_LOCK_KEY = "appLockEnabled";
export const LAST_ACTIVITY_KEY = "bantayBudgetLastActivity";
export const APP_LOCK_DELAY = 3 * 60 * 1000;

export function recordAuthenticatedActivity(timestamp = Date.now()) {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
}

export function automaticSignOutHasExpired(timestamp = Date.now()) {
  if (localStorage.getItem(APP_LOCK_KEY) !== "true") return false;

  const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
  return Number.isFinite(lastActivity)
    && lastActivity > 0
    && timestamp - lastActivity >= APP_LOCK_DELAY;
}

export function useInactivityLock(enabled, onSignOut) {
  const timerRef = useRef(null);
  const signingOutRef = useRef(false);
  const lastPersistedRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const signOutForInactivity = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    clearTimer();

    try {
      await onSignOut();
    } catch (error) {
      signingOutRef.current = false;
      console.error("Automatic sign-out failed:", error);
    }
  }, [clearTimer, onSignOut]);

  const scheduleSignOut = useCallback(() => {
    clearTimer();
    if (!enabled || signingOutRef.current) return;

    const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
    const elapsed = Number.isFinite(lastActivity) ? Date.now() - lastActivity : 0;
    const remaining = Math.max(APP_LOCK_DELAY - elapsed, 0);

    if (remaining === 0) {
      void signOutForInactivity();
      return;
    }

    timerRef.current = window.setTimeout(() => {
      if (automaticSignOutHasExpired()) void signOutForInactivity();
      else scheduleSignOut();
    }, remaining);
  }, [clearTimer, enabled, signOutForInactivity]);

  const registerActivity = useCallback(() => {
    if (!enabled || signingOutRef.current) return;
    const now = Date.now();

    if (now - lastPersistedRef.current >= 1000) {
      lastPersistedRef.current = now;
      recordAuthenticatedActivity(now);
      scheduleSignOut();
    }
  }, [enabled, scheduleSignOut]);

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      signingOutRef.current = false;
      return undefined;
    }

    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) recordAuthenticatedActivity();

    if (automaticSignOutHasExpired()) {
      void signOutForInactivity();
      return undefined;
    }

    scheduleSignOut();
    const activityEvents = ["pointerdown", "keydown", "scroll"];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, registerActivity, { passive: true });
    });

    const checkElapsedTime = () => {
      if (document.visibilityState !== "visible") return;
      if (automaticSignOutHasExpired()) void signOutForInactivity();
      else scheduleSignOut();
    };

    document.addEventListener("visibilitychange", checkElapsedTime);
    window.addEventListener("pageshow", checkElapsedTime);

    return () => {
      clearTimer();
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, registerActivity);
      });
      document.removeEventListener("visibilitychange", checkElapsedTime);
      window.removeEventListener("pageshow", checkElapsedTime);
    };
  }, [clearTimer, enabled, registerActivity, scheduleSignOut, signOutForInactivity]);
}
