import { useState, useEffect } from 'react';

/**
 * Robust reactive mobile viewport hook.
 * Directly inspects window.innerWidth and window.matchMedia with resize listeners.
 * Guarantees instantaneous, accurate switching between Mobile and Desktop layouts.
 */
export function useIsMobile(breakpointPx: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (typeof window.innerWidth === 'number' && window.innerWidth > 0) {
        return window.innerWidth < breakpointPx;
      }
      if (window.matchMedia) {
        return window.matchMedia(`(max-width: ${breakpointPx - 0.02}px)`).matches;
      }
    }
    // Mobile-first default
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      if (typeof window.innerWidth === 'number' && window.innerWidth > 0) {
        setIsMobile(window.innerWidth < breakpointPx);
      } else if (window.matchMedia) {
        setIsMobile(window.matchMedia(`(max-width: ${breakpointPx - 0.02}px)`).matches);
      }
    };

    // Immediate check on mount
    checkMobile();

    // Listen to resize and orientationchange events
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    const mql = window.matchMedia ? window.matchMedia(`(max-width: ${breakpointPx - 0.02}px)`) : null;
    if (mql) {
      if (mql.addEventListener) {
        mql.addEventListener('change', checkMobile);
      } else {
        mql.addListener(checkMobile);
      }
    }

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
      if (mql) {
        if (mql.removeEventListener) {
          mql.removeEventListener('change', checkMobile);
        } else {
          mql.removeListener(checkMobile);
        }
      }
    };
  }, [breakpointPx]);

  return isMobile;
}
