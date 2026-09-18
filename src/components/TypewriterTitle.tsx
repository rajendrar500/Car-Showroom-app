import { useEffect, useRef, useState } from 'react';

function TypeCar() {
  return (
    <svg className="typewriter-car-svg" viewBox="0 0 52 22" fill="none" aria-hidden="true">
      <path
        d="M8.5 15.2 12.2 8.4c.4-.8 1.2-1.3 2.1-1.3h7.4c.7 0 1.4-.3 1.8-.8l2.2-2.4c.6-.7 1.5-1.1 2.5-1.1h5.8c.9 0 1.7.5 2.1 1.3l3.6 7.2c.2.4.6.7 1 .7h2.6c1.4 0 2.5 1.2 2.5 2.6v.6H6.2v-.6c0-1.2.9-2.2 2.3-2.2Z"
        fill="currentColor"
      />
      <path d="M18.2 7.6h12.6" stroke="#1a1610" strokeWidth="0.7" opacity=".35" />
      <circle cx="14.2" cy="17.4" r="2.55" fill="#1a1610" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="14.2" cy="17.4" r="1" fill="currentColor" />
      <circle cx="36.6" cy="17.4" r="2.55" fill="#1a1610" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="36.6" cy="17.4" r="1" fill="currentColor" />
      <path d="M21.4 6.4h6.8c.4 0 .8.3.9.7l.6 2.2H20.6l.8-2.9Z" fill="#f4efe6" opacity=".55" />
    </svg>
  );
}

export function TypewriterTitle({
  text,
  className = '',
  speed = 36,
}: {
  text: string;
  className?: string;
  speed?: number;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActive(true);
      setCount(text.length);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
        } else {
          setActive(false);
          setCount(0);
        }
      },
      { threshold: 0.4, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [text]);

  useEffect(() => {
    if (!active || count >= text.length) return;
    const char = text[count];
    const wait = char === ' ' ? Math.max(12, speed * 0.45) : speed;
    const timer = window.setTimeout(() => setCount((value) => value + 1), wait);
    return () => window.clearTimeout(timer);
  }, [active, count, speed, text]);

  const shown = text.slice(0, count);
  const typing = active && count < text.length;

  return (
    <span ref={wrapRef} className={`typewriter-title ${className}`.trim()}>
      <span className="typewriter-ghost" aria-hidden="true">{text}</span>
      <span className="typewriter-live">
        <span className="typewriter-text">{shown}</span>
        <span className={`typewriter-car ${typing ? 'is-typing' : count >= text.length ? 'is-done' : ''}`} aria-hidden="true">
          <TypeCar />
        </span>
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
