import { useCallback, useEffect, useRef, useState } from "react";

export const APP_LOCK_KEY = "appLockEnabled";
export const APP_LOCK_DELAY = 3 * 60 * 1000;

export function useInactivityLock(enabled) {
  const [locked, setLocked] = useState(false);
  const timerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const resetTimer = useCallback(() => {
    clearTimer();
    if (!enabled || locked) return;
    timerRef.current = window.setTimeout(() => setLocked(true), APP_LOCK_DELAY);
  }, [clearTimer, enabled, locked]);

  const unlock = useCallback(() => {
    setLocked(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      setLocked(false);
      return undefined;
    }

    const activityEvents = ["pointerdown", "touchstart", "keydown", "mousemove", "scroll"];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimer();
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [enabled, clearTimer, resetTimer]);

  useEffect(() => {
    if (!locked && enabled) resetTimer();
  }, [locked, enabled, resetTimer]);

  return { locked, unlock };
}
