import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

function isCoarsePointer() {
  return window.matchMedia('(pointer: coarse)').matches
    || window.matchMedia('(hover: none)').matches;
}

/**
 * Native scroll only. Lenis + Three.js + ScrollTrigger on the same
 * rAF tick was dropping frames, especially on Windows and phones.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!registered) {
      gsap.registerPlugin(ScrollTrigger);
      registered = true;
    }

    document.documentElement.classList.remove('lenis', 'lenis-smooth');
    delete (window as Window & { __lenis?: unknown }).__lenis;

    ScrollTrigger.config({
      ignoreMobileResize: true,
      autoRefreshEvents: isCoarsePointer() ? 'visibilitychange,DOMContentLoaded,load' : 'visibilitychange,DOMContentLoaded,load,resize',
    });

    const refresh = () => ScrollTrigger.refresh();
    const id = window.requestAnimationFrame(refresh);
    return () => window.cancelAnimationFrame(id);
  }, []);
}
