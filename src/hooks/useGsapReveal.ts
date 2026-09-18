import { useEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

function ensureGsapPlugins() {
  if (registered || typeof window === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

/** Hero entrance — clean, not flashy */
export function useHeroGsap(scopeRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    ensureGsapPlugins();
    const root = scopeRef.current;
    if (!root) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      gsap.set(root.querySelectorAll('[data-hero]'), { opacity: 1, y: 0, x: 0, yPercent: 0, clearProps: 'transform' });
      return;
    }

    const ctx = gsap.context(() => {
      const intro = gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: {
          trigger: root,
          start: 'top 80%',
          once: true,
        },
      });
      intro.from('[data-hero="rail"]', { opacity: 0, x: -16, duration: 0.7 })
        .from('[data-hero="kicker"]', { opacity: 0, y: 14, duration: 0.55 }, '-=0.4')
        .from('[data-hero="brand"]', { opacity: 0, y: 18, duration: 0.7 }, '-=0.35')
        .from('[data-hero="eyebrow"]', { opacity: 0, y: 12, duration: 0.5 }, '-=0.4')
        .from('[data-hero="lead"]', { yPercent: 100, duration: 1.05 }, '-=0.25')
        .from('[data-hero="feel"]', { yPercent: 100, duration: 1.1 }, '-=0.82')
        .from('[data-hero="copy"]', { opacity: 0, y: 18, duration: 0.7 }, '-=0.55')
        .from('[data-hero="cta"] > *', { opacity: 0, y: 16, stagger: 0.1, duration: 0.6 }, '-=0.4')
        .from('[data-hero="specs"] > *', { opacity: 0, y: 18, stagger: 0.08, duration: 0.55 }, '-=0.35')
        .from('[data-hero="paints"]', { opacity: 0, y: 16, duration: 0.55 }, '-=0.35')
        .from('[data-hero="hint"]', { opacity: 0, y: 10, duration: 0.5 }, '-=0.4');
    }, root);

    return () => ctx.revert();
  }, [scopeRef]);
}

/** Scroll-triggered fades for section headings, cards, featured blocks */
export function useScrollGsap(scopeRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    ensureGsapPlugins();
    const root = scopeRef.current;
    if (!root) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduced || coarse) return;

    const ctx = gsap.context(() => {
      const onceIn = {
        start: 'top 90%',
        once: true,
      } as const;

      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 22 },
          {
            opacity: 1,
            y: 0,
            duration: 0.55,
            ease: 'power2.out',
            overwrite: 'auto',
            scrollTrigger: { trigger: el, ...onceIn },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>('[data-reveal-stagger]').forEach((group) => {
        const kids = group.querySelectorAll(':scope > *');
        gsap.fromTo(
          kids,
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.05,
            ease: 'power2.out',
            overwrite: 'auto',
            scrollTrigger: { trigger: group, ...onceIn },
          },
        );
      });

      const featured = root.querySelector<HTMLElement>('#featured');
      if (featured) {
        const surface = featured.querySelector<HTMLElement>('.featured-surface');
        const copyBits = featured.querySelectorAll('.surface-copy > *');
        const metaBits = featured.querySelectorAll('.surface-meta > *');
        const featureView = {
          trigger: surface ?? featured,
          start: 'top 88%',
          once: true,
        } as const;

        if (surface) {
          gsap.fromTo(
            surface,
            { y: 48 },
            {
              y: 0,
              duration: 1,
              ease: 'power3.out',
              overwrite: 'auto',
              scrollTrigger: { ...featureView, trigger: surface },
            },
          );
        }
        if (copyBits.length) {
          gsap.fromTo(
            copyBits,
            { opacity: 0, y: 24 },
            {
              opacity: 1,
              y: 0,
              stagger: 0.1,
              duration: 0.75,
              ease: 'power3.out',
              overwrite: 'auto',
              scrollTrigger: featureView,
            },
          );
        }
        if (metaBits.length) {
          gsap.fromTo(
            metaBits,
            { opacity: 0, y: 16 },
            {
              opacity: 1,
              y: 0,
              stagger: 0.07,
              duration: 0.6,
              ease: 'power2.out',
              overwrite: 'auto',
              scrollTrigger: featureView,
            },
          );
        }
      }

      requestAnimationFrame(() => ScrollTrigger.refresh());
    }, root);

    return () => ctx.revert();
  }, [scopeRef]);
}

export function useGsapMagnetic(ref: RefObject<HTMLElement | null>, strength = 18) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      gsap.to(el, { x: x / strength, y: y / strength, duration: 0.45, ease: 'power2.out' });
    };
    const onLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.55, ease: 'power3.out' });
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      gsap.killTweensOf(el);
    };
  }, [ref, strength]);
}

/** Hollywood-sign XANOX — grows from small to large as you reach the footer */
export function useFooterSign(scopeRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    ensureGsapPlugins();
    const root = scopeRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const word = root.querySelector('.footer-sign-word');
    const letters = root.querySelectorAll('.footer-sign-letter');
    if (!word) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        word,
        { scale: 0.42, y: 36, opacity: 0.45 },
        {
          scale: 1,
          y: 0,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top 85%',
            end: 'top 35%',
            scrub: 0.75,
          },
        },
      );
      gsap.fromTo(
        letters,
        { y: 28, rotateX: 18, opacity: 0.25 },
        {
          y: 0,
          rotateX: 0,
          opacity: 1,
          stagger: 0.05,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top 90%',
            end: 'center 78%',
            scrub: 0.55,
          },
        },
      );
    }, root);

    requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => ctx.revert();
  }, [scopeRef]);
}
