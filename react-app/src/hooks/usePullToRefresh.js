import { useEffect, useRef, useState } from "react";

export function usePullToRefresh(disabled = false) {
  const targetRef = useRef(null);
  const timerRef = useRef(null);
  const refreshingRef = useRef(false);

  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const target = targetRef.current;

    if (!target || disabled) {
      return undefined;
    }

    let startY = 0;
    let armed = false;

    const onTouchStart = (event) => {
      if (
        window.scrollY === 0 &&
        !refreshingRef.current
      ) {
        startY = event.touches[0].clientY;
      }
    };

    const onTouchMove = (event) => {
      if (
        window.scrollY !== 0 ||
        refreshingRef.current
      ) {
        return;
      }

      armed =
        event.touches[0].clientY - startY > 80;

      setPulling(armed);
    };

    const onTouchEnd = () => {
      if (armed) {
        setRefreshing(true);
      }

      armed = false;
      setPulling(false);
    };

    target.addEventListener(
      "touchstart",
      onTouchStart,
      { passive: true }
    );

    target.addEventListener(
      "touchmove",
      onTouchMove,
      { passive: true }
    );

    target.addEventListener(
      "touchend",
      onTouchEnd,
      { passive: true }
    );

    return () => {
      target.removeEventListener(
        "touchstart",
        onTouchStart
      );

      target.removeEventListener(
        "touchmove",
        onTouchMove
      );

      target.removeEventListener(
        "touchend",
        onTouchEnd
      );

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [disabled]);

  useEffect(() => {
    refreshingRef.current = refreshing;

    if (!refreshing) {
      return undefined;
    }

    timerRef.current = window.setTimeout(() => {
      setRefreshing(false);
    }, 1200);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [refreshing]);

  return {
    targetRef,
    pulling: disabled ? false : pulling,
    refreshing: disabled ? false : refreshing,
  };
}