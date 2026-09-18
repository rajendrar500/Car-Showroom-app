import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { cars } from '@/data/cars';
import { getMotomarksLogoUrl, type MotomarksBrand } from '@/lib/motomarks';
import { tx, useLocale } from '@/locale';

const FEATURED_BRANDS: MotomarksBrand[] = [
  { id: 'ferrari', name: 'Ferrari', color: '#FF2800', vehicleTypes: ['car'] },
  { id: 'lamborghini', name: 'Lamborghini', color: '#000000', vehicleTypes: ['car'] },
  { id: 'porsche', name: 'Porsche', color: '#D5001C', vehicleTypes: ['car'] },
  { id: 'mercedes-benz', name: 'Mercedes-Benz', color: '#000000', vehicleTypes: ['car'] },
  { id: 'bmw', name: 'BMW', color: '#0066B1', vehicleTypes: ['car'] },
  { id: 'audi', name: 'Audi', color: '#000000', vehicleTypes: ['car'] },
  { id: 'aston-martin', name: 'Aston Martin', color: '#00352F', vehicleTypes: ['car'] },
  { id: 'bentley', name: 'Bentley', color: '#000000', vehicleTypes: ['car'] },
  { id: 'mclaren', name: 'McLaren', color: '#FF8000', vehicleTypes: ['car'] },
  { id: 'rolls-royce', name: 'Rolls-Royce', color: '#000000', vehicleTypes: ['car'] },
  { id: 'jaguar', name: 'Jaguar', color: '#000000', vehicleTypes: ['car'] },
  { id: 'lexus', name: 'Lexus', color: '#000000', vehicleTypes: ['car'] },
];

const COUNT = FEATURED_BRANDS.length;
const START = Math.max(0, FEATURED_BRANDS.findIndex((brand) => brand.id === 'audi'));

function wrapIndex(value: number) {
  return ((Math.round(value) % COUNT) + COUNT) % COUNT;
}

function shortestTo(position: number, index: number) {
  const wrapped = ((position % COUNT) + COUNT) % COUNT;
  let delta = index - wrapped;
  if (delta > COUNT / 2) delta -= COUNT;
  if (delta < -COUNT / 2) delta += COUNT;
  return position + delta;
}

function vehicleCount(brand: MotomarksBrand) {
  return cars.filter((car) => {
    const slug = car.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/g, '');
    return (
      car.brand.toLowerCase() === brand.name.toLowerCase()
      || slug === brand.id
      || (brand.id.includes('mercedes') && car.brand.toLowerCase().includes('mercedes'))
    );
  }).length;
}

function BrandLogo({ brand }: { brand: MotomarksBrand }) {
  const [failed, setFailed] = useState(false);
  const initial = brand.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 1).toUpperCase() || 'X';

  if (failed) {
    return <span className="brand-fallback">{initial}</span>;
  }

  return (
    <img
      className="brand-logo"
      src={getMotomarksLogoUrl(brand.id, { size: 'md', type: 'badge' })}
      alt=""
      width={180}
      height={180}
      draggable={false}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function BrandMarques({ onSelect }: { onSelect: (brand: MotomarksBrand) => void }) {
  const { t } = useLocale();
  const [front, setFront] = useState(START);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const position = useRef(START);
  const target = useRef(START);
  const gapRef = useRef(200);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const moved = useRef(0);
  const paused = useRef(false);
  const wheelLock = useRef(0);
  const kickRef = useRef<() => void>(() => {});
  const counts = useMemo(() => Object.fromEntries(FEATURED_BRANDS.map((brand) => [brand.id, vehicleCount(brand)])), []);
  const current = FEATURED_BRANDS[front];
  const glow = current.color && current.color !== '#000000' ? current.color : '#d4af6a';

  const goTo = (index: number) => {
    target.current = shortestTo(position.current, index);
    kickRef.current();
  };

  const step = (dir: number) => {
    target.current = Math.round(target.current) + dir;
    kickRef.current();
  };

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      gapRef.current = Math.max(88, (el.clientWidth - 120) / 6.35);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let onScreen = true;
    const last = new WeakMap<HTMLElement, string>();

    const layout = () => {
      const pos = position.current;
      const gap = gapRef.current;
      FEATURED_BRANDS.forEach((_, index) => {
        const node = cardsRef.current[index];
        if (!node) return;
        let diff = index - pos;
        while (diff > COUNT / 2) diff -= COUNT;
        while (diff < -COUNT / 2) diff += COUNT;
        const abs = Math.abs(diff);
        const x = Math.round(diff * gap);
        const y = Math.round(abs * 2);
        const z = abs < 0.2 ? 36 : -8 - abs * 6;
        const rotate = Math.round(diff * -6);
        const scale = abs < 0.2 ? 1.03 : abs < 1.2 ? 0.92 : abs < 2.2 ? 0.84 : 0.76;
        const opacity = abs > 3.2 ? 0 : abs < 0.35 ? 1 : abs < 1.35 ? 0.52 : abs < 2.35 ? 0.32 : 0.2;
        const key = `${x}|${y}|${z}|${rotate}|${scale}|${opacity}`;
        if (last.get(node) === key) return;
        last.set(node, key);
        node.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotate}deg) scale(${scale})`;
        node.style.opacity = String(opacity);
        node.style.zIndex = String(20 - Math.round(abs * 4));
        node.style.pointerEvents = abs > 3.2 ? 'none' : 'auto';
        node.classList.toggle('is-front', abs < 0.5);
      });
      const nearest = wrapIndex(pos);
      setFront((prev) => (prev === nearest ? prev : nearest));
    };

    const tick = () => {
      frame = 0;
      if (!onScreen && !dragging.current) return;
      if (!dragging.current) {
        const ease = reduced ? 1 : 0.08;
        position.current += (target.current - position.current) * ease;
        if (Math.abs(target.current - position.current) < 0.002) {
          position.current = target.current;
        }
      }
      layout();
      const moving = dragging.current || Math.abs(target.current - position.current) >= 0.002;
      if (moving && onScreen) frame = window.requestAnimationFrame(tick);
    };

    const kick = () => {
      if (!frame) frame = window.requestAnimationFrame(tick);
    };
    kickRef.current = kick;

    const stage = stageRef.current;
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) kick();
    }, { rootMargin: '120px' });
    if (stage) io.observe(stage);

    layout();
    kick();
    return () => {
      io.disconnect();
      kickRef.current = () => {};
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const timer = window.setInterval(() => {
      if (!paused.current && !dragging.current) step(1);
    }, 7600);
    return () => window.clearInterval(timer);
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    paused.current = true;
    moved.current = 0;
    lastX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const delta = event.clientX - lastX.current;
    lastX.current = event.clientX;
    moved.current += Math.abs(delta);
    position.current -= delta / (gapRef.current * 1.55);
    target.current = position.current;
    kickRef.current();
  };

  const release = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    paused.current = false;
    target.current = Math.round(position.current);
    kickRef.current();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    const delta = event.deltaX;
    if (Math.abs(delta) < 12) return;
    const now = performance.now();
    if (now - wheelLock.current < 720) return;
    wheelLock.current = now;
    event.preventDefault();
    step(delta > 0 ? 1 : -1);
  };

  return (
    <section className="brands-showroom" id="brands">
      <div className="brands-showroom-bg" aria-hidden="true" />
      <div className="brands-heading" data-reveal>
        <div className="eyebrow">{t.brandsEyebrow}</div>
        <h2>
          {t.brandsTitleBefore} <em className="display">{t.brandsTitleEm}</em> <span className="display">{t.brandsTitleAfter}</span>
        </h2>
        <p>{t.brandsCopy}</p>
      </div>

      <div
        ref={stageRef}
        className="brands-stage"
        data-reveal
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerEnter={() => { paused.current = true; }}
        onPointerLeave={() => { if (!dragging.current) paused.current = false; }}
        onWheel={onWheel}
      >
        <div className="brands-columns" aria-hidden="true" />
        <div className="brands-glow" style={{ background: `radial-gradient(circle, ${glow}40, transparent 64%)` }} />

        <div className="brands-deck">
          {FEATURED_BRANDS.map((brand, index) => {
            const count = counts[brand.id] ?? 0;
            return (
              <button
                key={brand.id}
                type="button"
                className="brand-plaque"
                ref={(node) => { cardsRef.current[index] = node; }}
                onClick={() => {
                  if (moved.current > 8) return;
                  const diff = (() => {
                    let d = index - position.current;
                    while (d > COUNT / 2) d -= COUNT;
                    while (d < -COUNT / 2) d += COUNT;
                    return d;
                  })();
                  if (Math.abs(diff) > 0.45) {
                    goTo(index);
                    return;
                  }
                  onSelect(brand);
                }}
                data-testid={`button-brand-${brand.id}`}
              >
                <span className="brand-plaque-face">
                  <span className="brand-shine" aria-hidden="true" />
                  <span className="brand-mark">
                    <BrandLogo brand={brand} />
                  </span>
                  <span className="brand-name">{brand.name}</span>
                  <span className="brand-count">{count > 0 ? tx(count === 1 ? t.vehicleOne : t.vehicleCount, { n: count }) : t.byAppointment}</span>
                </span>
              </button>
            );
          })}
        </div>

        <button className="brands-nav brands-nav-prev" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => step(-1)} aria-label={t.prevBrand}>
          <ChevronLeft size={22} />
        </button>
        <button className="brands-nav brands-nav-next" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => step(1)} aria-label={t.nextBrand}>
          <ChevronRight size={22} />
        </button>

        <div className="brands-dots">
          {FEATURED_BRANDS.map((brand, index) => (
            <button
              key={brand.id}
              type="button"
              className={index === front ? 'active' : ''}
              aria-label={tx(t.showBrand, { name: brand.name })}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
