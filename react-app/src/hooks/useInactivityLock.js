import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export const APP_LOCK_KEY = "appLockEnabled";
export const APP_LOCK_DELAY = 3 * 60 * 1000;

export function useInactivityLock(enabled) {
  const [locked, setLocked] = useState(false);

  const timerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const lockedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const lockApp = useCallback(() => {
    clearTimer();
    lockedRef.current = true;
    setLocked(true);
  }, [clearTimer]);

  const scheduleLock = useCallback(() => {
    clearTimer();

    if (!enabled || lockedRef.current) {
      return;
    }

    const elapsed =
      Date.now() - lastActivityRef.current;

    const remaining = Math.max(
      APP_LOCK_DELAY - elapsed,
      0,
    );

    if (remaining === 0) {
      lockApp();
      return;
    }

    timerRef.current = window.setTimeout(() => {
      const inactiveFor =
        Date.now() - lastActivityRef.current;

      if (
        enabled &&
        inactiveFor >= APP_LOCK_DELAY
      ) {
        lockApp();
      } else {
        scheduleLock();
      }
    }, remaining);
  }, [clearTimer, enabled, lockApp]);

  const registerActivity = useCallback(() => {
    if (!enabled || lockedRef.current) {
      return;
    }

    lastActivityRef.current = Date.now();
    scheduleLock();
  }, [enabled, scheduleLock]);

  const unlock = useCallback(() => {
    lockedRef.current = false;
    lastActivityRef.current = Date.now();
    setLocked(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      lockedRef.current = false;
      setLocked(false);
      return undefined;
    }

    lockedRef.current = false;
    lastActivityRef.current = Date.now();
    scheduleLock();

    const activityEvents = [
      "pointerdown",
      "keydown",
      "scroll",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(
        eventName,
        registerActivity,
        { passive: true },
      );
    });

    return () => {
      clearTimer();

      activityEvents.forEach((eventName) => {
        window.removeEventListener(
          eventName,
          registerActivity,
        );
      });
    };
  }, [
    enabled,
    clearTimer,
    registerActivity,
    scheduleLock,
  ]);

  useEffect(() => {
    if (!locked && enabled) {
      lockedRef.current = false;
      lastActivityRef.current = Date.now();
      scheduleLock();
    }
  }, [locked, enabled, scheduleLock]);

  return {
    locked,
    unlock,
  };
}