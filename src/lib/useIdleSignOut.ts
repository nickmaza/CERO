import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/** Signed-in browsers are signed out after this long with no clicks, taps or typing. */
export const IDLE_LIMIT_MS = 30 * 60 * 1000;

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'visibilitychange'] as const;

/**
 * On the website, signs the person out after 30 minutes without activity, so payroll data
 * isn't left open on a shared or family computer. Phones lock themselves, so this only runs on web.
 */
export function useIdleSignOut(active: boolean, onIdle: () => void) {
  // Kept in a ref so re-renders don't restart the idle clock.
  const onIdleRef = useRef(onIdle);
  useEffect(() => {
    onIdleRef.current = onIdle;
  });

  useEffect(() => {
    if (!active || Platform.OS !== 'web' || typeof window === 'undefined') return;

    let last = Date.now();
    const touch = () => {
      last = Date.now();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    // Checking every minute also catches a laptop that slept past the limit.
    const timer = window.setInterval(() => {
      if (Date.now() - last >= IDLE_LIMIT_MS) onIdleRef.current();
    }, 60 * 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, touch));
      window.clearInterval(timer);
    };
  }, [active]);
}
