import {
  ArrowDownRight, ArrowLeft, ArrowRight, Bell, Building2, CalendarDays, Check, ChevronDown,
  ChevronLeft, ChevronRight, CircleCheck, Clock3, ExternalLink, Globe2, Heart, Mail, MapPin, Menu, MessageCircle,
  Moon, Phone, Power, Search, Settings, ShieldCheck, Sparkles, SlidersHorizontal, Sun, Truck, User, X, Zap,
} from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ImgHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, Route, Switch, useLocation, useParams, useSearch } from 'wouter';
import { Car3DViewer } from '@/components/Car3DViewer';
import { ExportQuote, ViewingDesk } from '@/components/ExportQuote';
import { BrandMarques } from '@/components/BrandMarques';
import { FlipDigits } from '@/components/FlipDigits';
import { InspectionBoard } from '@/components/InspectionBoard';
import { RoomBoard } from '@/components/RoomBoard';
import { useCarGallery } from '@/hooks/useCarGallery';
import { HeroScene3D, HERO_READY_EVENT, applyHeroPaint } from '@/components/HeroScene3D';
import { InventorySearch } from '@/components/InventorySearch';
import { cars, formatTime, type Car } from '@/data/cars';
import { brandSlug, filterInventory, groupByBrand, parseInventoryQuery } from '@/lib/inventory';
import { scrollPageToTop } from '@/lib/scrollTop';
import { isWikimediaUrl, optimizedImageUrl } from '@/lib/optimizeImage';
import { getMotomarksLogoUrl, type MotomarksBrand } from '@/lib/motomarks';
import { ErrorBoundary } from '@/components/error-boundary';
import { useHeroGsap, useScrollGsap, useFooterSign } from '@/hooks/useGsapReveal';
import { usePointerTilt } from '@/hooks/usePointerTilt';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';
import { carStory, labelAngle, labelBody, labelDrivetrain, labelEngine, labelFuel, labelLocation, labelState, LocaleProvider, tx, useLocale, type Locale } from '@/locale';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const reveal = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0, transition: { duration: .65, ease: [.22, .8, .25, 1] as const } } };

type Currency = 'KRW' | 'USD' | 'AED';

const CurrencyContext = createContext<{ currency: Currency; setCurrency: (currency: Currency) => void }>({ currency: 'KRW', setCurrency: () => undefined });

function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(() => {
    try { return (localStorage.getItem('xanox-currency') as Currency) || 'KRW'; } catch { return 'KRW'; }
  });
  useEffect(() => { localStorage.setItem('xanox-currency', currency); }, [currency]);
  return <CurrencyContext.Provider value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>;
}

function useCurrency() { return useContext(CurrencyContext); }

function formatDisplayPrice(price: number, currency: Currency) {
  const converted = price * ({ KRW: 16.3, USD: .012, AED: .044 }[currency]);
  return new Intl.NumberFormat(currency === 'KRW' ? 'ko-KR' : currency === 'AED' ? 'ar-AE' : 'en-US', { style: 'currency', currency, maximumFractionDigits: currency === 'KRW' ? 0 : 2 }).format(converted);
}

type ThemeName = 'light' | 'dark';
const ThemeContext = createContext<{ theme: ThemeName; setTheme: (theme: ThemeName) => void }>({
  theme: 'dark',
  setTheme: () => undefined,
});

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    try { return (localStorage.getItem('xanox-theme') as ThemeName) || 'dark'; } catch { return 'dark'; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('xanox-theme', theme);
  }, [theme]);
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div data-theme={theme}>{children}</div>
    </ThemeContext.Provider>
  );
}

function useTheme() {
  return useContext(ThemeContext);
}

function SafeImage({ src, alt, className = '', loading = 'lazy', width = 960, sizes, ...rest }: { src: string; alt: string; className?: string; loading?: 'lazy' | 'eager'; width?: number; sizes?: string } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'loading' | 'width' | 'sizes'>) {
  const [imageSrc, setImageSrc] = useState(() => optimizedImageUrl(src, width));
  useEffect(() => setImageSrc(optimizedImageUrl(src, width)), [src, width]);
  const compact = optimizedImageUrl(src, Math.min(width, 480));
  const srcSet = width >= 720
    ? `${optimizedImageUrl(src, 640)} 640w, ${optimizedImageUrl(src, width)} ${width}w`
    : undefined;
  return <img src={imageSrc} srcSet={srcSet} sizes={sizes} alt={alt} className={className} loading={loading} decoding="async" {...rest} onError={(event) => {
    if (imageSrc !== compact) {
      setImageSrc(compact);
      return;
    }
    if (!isWikimediaUrl(src) && imageSrc !== src) {
      setImageSrc(src);
      return;
    }
    event.currentTarget.style.opacity = '0';
  }} />;
}

function Logo() {
  const { t } = useLocale();
  return (
    <Link href="/" className="logo-lockup" aria-label={t.xanoxHome} data-testid="link-logo">
      <img className="logo-mark logo-mark-light" src="/xanox-logo-light.svg" alt="" />
      <img className="logo-mark logo-mark-dark" src="/xanox-logo-dark.svg" alt="" />
    </Link>
  );
}

function NavChoice({
  value,
  options,
  onChange,
  icon,
  label,
  testId,
  variant = 'nav',
}: {
  value: string;
  options: readonly { value: string; label: string; hint?: string }[];
  onChange: (value: string) => void;
  icon?: ReactNode;
  label: string;
  testId: string;
  variant?: 'nav' | 'filter';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`nav-choice${open ? ' is-open' : ''}${variant === 'filter' ? ' is-filter' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="nav-choice-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        title={label}
        data-testid={testId}
        onClick={() => setOpen((next) => !next)}
      >
        {icon}
        <span>{current.label}</span>
        <ChevronDown className="nav-choice-caret" size={11} strokeWidth={2.2} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            className="nav-choice-menu"
            role="listbox"
            aria-label={label}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 0.8, 0.25, 1] }}
          >
            {options.map((option) => {
              const active = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={active ? 'is-active' : ''}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <span>
                      {option.label}
                      {option.hint ? <small>{option.hint}</small> : null}
                    </span>
                    {active ? <Check size={12} strokeWidth={2.4} aria-hidden="true" /> : null}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [location] = useLocation();
  const { locale, setLocale, t } = useLocale();
  const { currency, setCurrency } = useCurrency();
  const currencyOptions = [
    { value: 'KRW', label: 'KRW', hint: t.won },
    { value: 'USD', label: 'USD', hint: t.dollar },
    { value: 'AED', label: 'AED', hint: t.dirham },
  ];
  const localeOptions = [
    { value: 'en', label: 'EN', hint: t.langEnglish },
    { value: 'ko', label: '한국어', hint: t.langKorean },
    { value: 'ar', label: 'عربي', hint: t.langArabic },
  ];
  return (
    <header className="float-nav">
      <Logo />
      <nav className="nav-links" aria-label={t.nav}>
        <Link href="/cars" data-testid="link-buy-cars">{t.buy}</Link>
        <Link href={location === '/' ? '#brands' : '/#brands'} data-testid="link-brands">{t.brands}</Link>
        <Link href="/auctions" data-testid="link-auctions">{t.auctions}</Link>
        <Link href="/gallery-3d" data-testid="link-gallery-3d">{t.gallery}</Link>
      </nav>
      <div className="nav-actions">
        <div className="nav-compact" aria-label={t.nav}>
          <NavChoice
            label={t.currency}
            value={currency}
            options={currencyOptions}
            onChange={(next) => setCurrency(next as Currency)}
            testId="select-currency"
          />
          <NavChoice
            label={t.language}
            value={locale}
            options={localeOptions}
            onChange={(next) => setLocale(next as Locale)}
            icon={<Globe2 size={13} strokeWidth={1.8} />}
            testId="select-language"
          />
          <Link href="/favorites" className="nav-icon" aria-label={t.favorites} data-testid="link-favorites"><Heart size={15} /></Link>
        </div>
        <button className="nav-icon" type="button" aria-label={t.notifications} onClick={() => setNoticeOpen((open) => !open)} data-testid="button-notifications"><Bell size={16} /></button>
        <Link href={location === '/' ? '#find' : '/#find'} className="nav-icon" aria-label={t.searchInventory} data-testid="link-search"><Search size={16} /></Link>
        <button className="nav-icon mobile-menu" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={t.toggleMenu} data-testid="button-mobile-menu"><Menu size={17} /></button>
      </div>
      <AnimatePresence>
        {noticeOpen && <motion.div className="notification-panel" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
          <div className="eyebrow">{t.noticeTitle}</div>
          <p>{t.noticeBody}</p>
        </motion.div>}
      </AnimatePresence>
      <AnimatePresence>
        {menuOpen && (
          <motion.nav initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mobile-nav">
            <Link href="/inventory" onClick={() => setMenuOpen(false)}>{t.desk}</Link>
            <Link href="/cars" onClick={() => setMenuOpen(false)}>{t.buy}</Link>
            <Link href="/#brands" onClick={() => setMenuOpen(false)}>{t.brands}</Link>
            <Link href="/auctions" onClick={() => setMenuOpen(false)}>{t.auctions}</Link>
            <Link href="/how-it-works" onClick={() => setMenuOpen(false)}>{t.how}</Link>
            <Link href="/shipping" onClick={() => setMenuOpen(false)}>{t.shipping}</Link>
            <Link href="/about" onClick={() => setMenuOpen(false)}>{t.about}</Link>
            <Link href="/gallery-3d" onClick={() => setMenuOpen(false)}>{t.gallery}</Link>
            <div className="mobile-preferences">
              <NavChoice
                label={t.currency}
                value={currency}
                options={currencyOptions}
                onChange={(next) => setCurrency(next as Currency)}
                testId="select-currency-mobile"
              />
              <NavChoice
                label={t.language}
                value={locale}
                options={localeOptions}
                onChange={(next) => setLocale(next as Locale)}
                icon={<Globe2 size={13} strokeWidth={1.8} />}
                testId="select-language-mobile"
              />
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('xanox-favorites') ?? localStorage.getItem('velocia-favorites') ?? '[]') as string[]; } catch { return []; }
  });
  useEffect(() => localStorage.setItem('xanox-favorites', JSON.stringify(favorites)), [favorites]);
  const toggleFavorite = (id: string) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return { favorites, toggleFavorite };
}

function EntranceLoader() {
  const [show, setShow] = useState(() => typeof window === 'undefined' || window.location.pathname === '/');

  useEffect(() => {
    if (!show) return;
    let done = false;
    let hideTimer = 0;
    const started = performance.now();
    const hide = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, 480 - (performance.now() - started));
      hideTimer = window.setTimeout(() => setShow(false), wait);
    };
    window.addEventListener(HERO_READY_EVENT, hide);
    const failsafe = window.setTimeout(hide, 8000);
    return () => {
      window.removeEventListener(HERO_READY_EVENT, hide);
      window.clearTimeout(hideTimer);
      window.clearTimeout(failsafe);
    };
  }, [show]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          className="loading-screen"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
        >
          <div className="loader-stack">
            <div className="loader-mark">XANOX</div>
            <svg className="loader-car" width="240" height="76" viewBox="0 0 240 76" fill="none" aria-hidden="true">
              <path className="loader-body" d="M18 53C29 51 34 43 45 35C58 26 73 22 95 22H139C157 22 169 27 181 37L211 42C218 43 223 48 224 53H18Z" />
              <path className="loader-body" d="M60 31L75 17H127C139 17 149 22 156 33" />
              <path className="loader-body" d="M21 53H224" />
              <circle className="loader-wheel" cx="58" cy="53" r="10" />
              <circle className="loader-wheel" cx="187" cy="53" r="10" />
            </svg>
            <div className="loader-line" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function SectionHeading({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy?: string; action?: ReactNode }) {
  return <div className="section-title"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div>{copy && <p>{copy}</p>}{action}</div>;
}

function CarCard({ car, favorite, onFavorite }: { car: Car; favorite: boolean; onFavorite: (id: string) => void }) {
  const { currency } = useCurrency();
  const { t } = useLocale();
  const tiltRef = usePointerTilt<HTMLElement>(8);
  return (
    <article
      className="car-card"
      ref={tiltRef}
      data-testid={`card-car-${car.id}`}
    >
      <Link
        href={`/cars/${car.id}`}
        className="car-card-hit"
        aria-label={tx(t.viewDetailsOf, { car: `${car.brand} ${car.model}` })}
        data-testid={`link-details-${car.id}`}
        onClick={scrollPageToTop}
      />
      <div className="car-image tilt-3d">
        <SafeImage src={car.images[0]} alt={`${car.brand} ${car.model}`} width={640} />
        <span className="tilt-shine" aria-hidden="true" />
        <span className="car-shutter" aria-hidden="true" />
        <span className="status-pill">{labelState(t, car.state)}</span>
        <button
          type="button"
          className={`favorite ${favorite ? 'active' : ''}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onFavorite(car.id);
          }}
          aria-label={`${favorite ? t.removedSaved : t.savedGarage}`}
          data-testid={`button-favorite-${car.id}`}
        >
          <Heart size={15} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="card-body">
        <div className="card-kicker"><span>{car.year} · {labelLocation(t, car.location)}</span>{car.has3d && <span className="gold">{t.ready3d}</span>}</div>
        <h3>{car.brand} {car.model}</h3>
        <div className="card-details"><span>{car.mileage}</span><span>{car.horsepower} {t.hp}</span><span>{labelBody(t, car.bodyType)}</span></div>
        <div className="card-bottom">
           <strong className="price">{formatDisplayPrice(car.price, currency)}</strong>
          <div className="card-actions">
            <span className="mini-action" aria-hidden="true"><ArrowRight size={15} /></span>
          </div>
        </div>
      </div>
    </article>
  );
}

const HERO_PAINTS = [
  { hex: '#e8c12a', key: 'paintYellow' },
  { hex: '#1a1d24', key: 'paintGraphite' },
  { hex: '#f0ebe3', key: 'paintArctic' },
  { hex: '#c5c8ce', key: 'paintSilver' },
  { hex: '#1e3a32', key: 'paintGreen' },
  { hex: '#1a2744', key: 'paintMidnight' },
  { hex: '#5c1a24', key: 'paintBurgundy' },
  { hex: '#c4a36a', key: 'paintChampagne' },
  { hex: '#9b1c1c', key: 'paintRed' },
] as const;

function Hero({ onSearch }: { onSearch: () => void }) {
  const heroRef = useRef<HTMLElement>(null);
  useHeroGsap(heroRef);
  const { t } = useLocale();
  const [paint, setPaint] = useState<string>(HERO_PAINTS[0].hex);
  const liveCount = cars.filter((car) => car.state === 'Live auction').length;
  const marqueCount = new Set(cars.map((car) => car.brand)).size;

  const choosePaint = (hex: string) => {
    setPaint(hex);
    applyHeroPaint(hex);
  };

  useEffect(() => {
    applyHeroPaint(paint);
  }, []);

  return (
    <section className="hero hero-drive" id="top" ref={heroRef}>
      <div className="hero-sticky">
        <HeroScene3D scrollRootSelector="#top" />
        <div className="hero-veil" />
        <div className="hero-vignette" aria-hidden="true" />
        <div className="hero-aurora" aria-hidden="true" />
        <div className="hero-frame" aria-hidden="true" />

        <div className="hero-rail" data-hero="rail">
          <span>01</span>
          <i />
          <span>{t.heroRail}</span>
        </div>

        <div className="hero-content">
          <div className="hero-copy-stack">
            <div className="hero-kicker" data-hero="kicker">
              <Sparkles size={12} />
              {t.heroKicker}
            </div>
            <div className="hero-brand" data-hero="brand">XANOX</div>
            <div className="hero-eyebrow" data-hero="eyebrow">{t.heroEyebrow}</div>
            <h1 className="hero-title">
              <span className="hero-title-line"><span className="hero-title-lead" data-hero="lead">{t.heroLead}</span></span>
              <span className="hero-title-line"><em className="hero-title-feel" data-hero="feel">{t.heroFeel}</em></span>
            </h1>
            <p className="hero-copy" data-hero="copy">
              {t.heroCopy}
            </p>
            <div className="hero-cta" data-hero="cta">
              <button className="btn-gold hero-btn-gold" type="button" onClick={onSearch} data-testid="button-explore-collection">
                {t.exploreCollection} <ArrowRight size={15} strokeWidth={2.2} />
              </button>
              <a className="btn-line hero-btn-line" href="#auctions" data-testid="link-live-auctions">
                {t.liveAuctions} <Zap size={14} />
              </a>
            </div>
            <div className="hero-specs" data-hero="specs">
              <div>
                <strong>{String(cars.length).padStart(2, '0')}</strong>
                <span>{t.vehicles}</span>
              </div>
              <div>
                <strong>{String(liveCount).padStart(2, '0')}</strong>
                <span>{t.liveAuctions}</span>
              </div>
              <div>
                <strong>{String(marqueCount).padStart(2, '0')}</strong>
                <span>{t.marques}</span>
              </div>
            </div>
            <div className="hero-paints" data-hero="paints">
              <span>{t.bodyColour}</span>
              <div className="hero-paint-row" role="listbox" aria-label={t.bodyColour}>
                {HERO_PAINTS.map((swatch) => {
                  const label = t[swatch.key];
                  return (
                  <button
                    key={swatch.hex}
                    type="button"
                    role="option"
                    aria-selected={paint === swatch.hex}
                    aria-label={label}
                    title={label}
                    className={`hero-paint${paint === swatch.hex ? ' is-active' : ''}`}
                    style={{ background: swatch.hex }}
                    onClick={() => choosePaint(swatch.hex)}
                  />
                );})}
              </div>
            </div>
            <div className="hero-scroll-hint" data-hero="hint">
              <span className="hero-mouse" aria-hidden="true"><i /></span>
              <span>{t.scrollToDrive}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedSurface({ car, onOpen }: { car: Car; onOpen: (car: Car) => void }) {
  const { currency } = useCurrency();
  const { t } = useLocale();
  const tiltRef = usePointerTilt<HTMLDivElement>(7);
  return (
    <div className="featured-surface">
      <div className="surface-image tilt-3d" ref={tiltRef}>
        <SafeImage src={car.images[1]} alt={`${car.brand} ${car.model} featured`} width={960} />
        <span className="tilt-shine" aria-hidden="true" />
        <span className="surface-tag"><Sparkles size={12} /> {t.editorsSelection}</span>
        <div className="surface-glow" aria-hidden="true" />
      </div>
      <div className="surface-copy">
        <div>
          <div className="eyebrow">{t.mood001}</div>
          <h3>{car.brand}<br /><em className="display">{car.model}</em></h3>
          <p>{t.featuredBody}</p>
        </div>
        <div>
          <div className="surface-meta">
            <div><span>{t.power}</span><strong>{car.horsepower} {t.hp}</strong></div>
            <div><span>{t.accel}</span><strong>3.6 {t.sec}</strong></div>
            <div><span>{t.location}</span><strong>{labelLocation(t, car.location)}</strong></div>
            <div><span>{t.asking}</span><strong>{formatDisplayPrice(car.price, currency)}</strong></div>
          </div>
          <button className="btn-gold hero-btn-gold surface-cta" type="button" onClick={() => onOpen(car)} data-testid={`button-preview-${car.id}`}>
            {t.viewThisCar} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AuctionCard({ car, timeLeft, onBid }: { car: Car; timeLeft: number; onBid: (car: Car) => void }) {
  const { currency } = useCurrency();
  const { t } = useLocale();
  return (
    <article className="auction-card" data-testid={`card-auction-${car.id}`}>
      <Link href={`/cars/${car.id}`} className="car-card-hit" aria-label={tx(t.viewDetailsOf, { car: `${car.brand} ${car.model}` })} onClick={scrollPageToTop} />
      <SafeImage src={car.images[0]} alt={`${car.brand} ${car.model} auction`} width={1100} />
      <div className="auction-info">
        <span className="timer"><Clock3 size={12} /> {t.endsIn} <FlipDigits value={formatTime(timeLeft)} /></span>
        <h3>{car.brand} {car.model}</h3>
        <p>{car.year} · {car.mileage} · {labelLocation(t, car.location)}</p>
        <div className="auction-bid">
          <strong>{formatDisplayPrice(car.price, currency)} <small style={{ color: '#8b8e95', fontSize: '.6rem' }}>{t.current}</small></strong>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onBid(car);
            }}
            data-testid={`button-bid-${car.id}`}
          >
            {t.placeBid}
          </button>
        </div>
      </div>
    </article>
  );
}

function Home() {
  const homeRef = useRef<HTMLDivElement>(null);
  useScrollGsap(homeRef);
  const { locale, t } = useLocale();
  const { favorites, toggleFavorite } = useFavorites();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState('all');
  const [body, setBody] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState('');
  const [newsletter, setNewsletter] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  const auctionCars = cars.filter((car) => car.state === 'Live auction' || car.state === 'Coming soon');
  const [times, setTimes] = useState<Record<string, number>>(() => Object.fromEntries(auctionCars.map((car) => [car.id, car.endsIn])));
  useEffect(() => {
    const interval = window.setInterval(() => setTimes((current) => Object.fromEntries(Object.entries(current).map(([id, time]) => [id, Math.max(0, time - 1)]))), 1000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(''), 2700); return () => window.clearTimeout(timeout); }, [toast]);
  useEffect(() => setVisibleCount(6), [query, brand, body]);
  const filteredCars = useMemo(() => cars.filter((car) => {
    const text = `${car.brand} ${car.model} ${car.trim}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (brand === 'all' || car.brand === brand) && (body === 'all' || car.bodyType === body);
  }), [query, brand, body]);
  const visibleCars = filteredCars.slice(0, visibleCount);
  const featured = cars[0];
  const findTiltRef = usePointerTilt<HTMLDivElement>(7);
  const handleBid = (car: Car) => setToast(tx(t.bidOpened, { car: `${car.brand} ${car.model}` }));
  const submitNewsletter = (event: FormEvent) => { event.preventDefault(); if (newsletter.includes('@')) setSubscribed(true); };
  const handleSelectBrand = (marque: MotomarksBrand) => {
    const inventoryBrands = Array.from(new Set(cars.map((car) => car.brand)));
    const matched = inventoryBrands.find((name) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
      return name.toLowerCase() === marque.name.toLowerCase() || slug === marque.id || (marque.id.includes('mercedes') && name.toLowerCase().includes('mercedes'));
    });
    setLocation(`/inventory${matched ? `?make=${encodeURIComponent(matched)}` : ''}`);
  };
  return (
    <div className="velocia-shell noise" ref={homeRef}>
      <Navbar />
      <main>
        <Hero onSearch={() => {
          document.getElementById('find')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }} />
        <section className="find-desk section-pad" id="find">
          <div className="find-stage">
            <div className="find-texture" aria-hidden="true" />
            <div className="find-copy" data-reveal>
              <div className="eyebrow">{t.findEyebrow}</div>
              <h2>{t.findTitle} <em className="display">{t.findTitleEm}</em></h2>
              <p>{t.findCopy}</p>
              <InventorySearch locale={locale} />
            </div>
            <div className="find-portrait" data-reveal>
              <div className="find-portrait-frame tilt-3d" ref={findTiltRef}>
                <SafeImage src={cars[3].images[0]} alt={`${cars[3].brand} ${cars[3].model}`} width={960} />
                <span className="tilt-shine" aria-hidden="true" />
                <span className="surface-tag"><Sparkles size={12} /> {t.inTheRoom}</span>
              </div>
            </div>
          </div>
        </section>
        <section className="section-pad section-dark featured-section" id="featured">
          <div data-reveal><SectionHeading eyebrow={t.featuredEyebrow} title={t.featuredTitle} copy={t.featuredCopy} /></div>
          <FeaturedSurface car={featured} onOpen={(car) => { scrollPageToTop(); setLocation(`/cars/${car.id}`); }} />
        </section>
        <BrandMarques onSelect={handleSelectBrand} />
        <section className="section-pad" id="discover">
          <div data-reveal><SectionHeading eyebrow={t.collectionEyebrow} title={t.collectionTitle} copy={t.collectionCopy} /></div>
          <div className="toolbar" data-reveal>
            <div className="searchbox"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchPlaceholder} aria-label={t.searchCars} data-testid="input-search-cars" />{query && <button type="button" className="nav-icon" onClick={() => setQuery('')} aria-label={t.clearSearch} data-testid="button-clear-search"><X size={14} /></button>}</div>
            <button className="btn-line" type="button" onClick={() => setShowFilters((show) => !show)} data-testid="button-toggle-filters"><SlidersHorizontal size={14} /> {t.filters} <ChevronDown size={13} /></button>
            <span className="result-count" data-testid="text-result-count">{tx(t.vehiclesFound, { n: filteredCars.length })}</span>
          </div>
          <AnimatePresence>
            {showFilters && (
              <motion.div
                className="filter-row"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 0.8, 0.25, 1] }}
              >
                <NavChoice
                  variant="filter"
                  label={t.filterBrand}
                  value={brand}
                  options={[{ value: 'all', label: t.allMarques }, ...Array.from(new Set(cars.map((car) => car.brand))).map((item) => ({ value: item, label: item }))]}
                  onChange={setBrand}
                  testId="select-brand"
                />
                <NavChoice
                  variant="filter"
                  label={t.filterBody}
                  value={body}
                  options={[{ value: 'all', label: t.allBodyTypes }, ...Array.from(new Set(cars.map((car) => car.bodyType))).map((item) => ({ value: item, label: labelBody(t, item) }))]}
                  onChange={setBody}
                  testId="select-body"
                />
                {(brand !== 'all' || body !== 'all') && <button className="btn-line" type="button" onClick={() => { setBrand('all'); setBody('all'); }} data-testid="button-clear-filters">{t.clearFilters} <X size={13} /></button>}
              </motion.div>
            )}
          </AnimatePresence>
          {filteredCars.length > 0 ? <><div className="car-grid" data-reveal-stagger>{visibleCars.map((car) => <CarCard key={car.id} car={car} favorite={favorites.includes(car.id)} onFavorite={(id) => { toggleFavorite(id); setToast(favorites.includes(id) ? t.removedSaved : t.savedGarage); }} />)}</div>{visibleCount < filteredCars.length && <div className="collection-more" data-reveal><span>{tx(t.showingOf, { a: visibleCars.length, b: filteredCars.length })}</span><button className="btn-line" type="button" onClick={() => setVisibleCount((count) => count + 6)} data-testid="button-load-more-cars">{t.loadMore} <ArrowDownRight size={14} /></button></div>}</> : <div className="viewer" style={{ minHeight: 300 }}><div className="viewer-content"><Search size={28} className="gold" /><h3>{t.noMatch}</h3><p>{t.noMatchHint}</p><button className="btn-line" type="button" onClick={() => { setQuery(''); setBrand('all'); setBody('all'); }}>{t.resetCollection}</button></div></div>}
        </section>
        <RoomBoard liveLots={auctionCars.filter((car) => car.state === 'Live auction').length} />
        <section className="section-pad section-deep" id="auctions">
          <div data-reveal><SectionHeading eyebrow={t.auctionsEyebrow} title={t.auctionsTitle} copy={t.auctionsCopy} /></div>
          <div className="auction-grid" data-reveal-stagger>{auctionCars.slice(0, 3).map((car) => <AuctionCard key={car.id} car={car} timeLeft={times[car.id] ?? 0} onBid={handleBid} />)}</div>
        </section>
        <section className="section-pad section-dark" id="collections">
          <div data-reveal><SectionHeading eyebrow={t.curatedEyebrow} title={t.curatedTitle} /></div>
          <div className="collections" data-reveal-stagger>
            <div className="collection"><SafeImage src={cars[3].images[0]} alt={t.nightTitle} width={900} data-parallax /><span className="eyebrow">{t.nightEyebrow}</span><h3>{t.nightTitle}</h3><p>{t.nightCopy}</p></div>
            <div className="collection"><SafeImage src={cars[7].images[0]} alt={t.tourTitle} width={900} data-parallax /><span className="eyebrow">{t.tourEyebrow}</span><h3>{t.tourTitle}</h3><p>{t.tourCopy}</p></div>
            <div className="collection collection-wide"><SafeImage src={cars[9].images[0]} alt={t.classicTitle} width={1100} data-parallax /><span className="eyebrow">{t.classicEyebrow}</span><h3>{t.classicTitle}</h3><p>{t.classicCopy}</p><Link href="/#discover" className="btn-line" style={{ width: 'max-content', marginTop: '1rem' }}>{t.exploreEdit} <ArrowRight size={14} /></Link></div>
          </div>
        </section>
        <section className="section-pad">
          <div data-reveal><SectionHeading eyebrow={t.latestEyebrow} title={t.latestTitle} copy={t.latestCopy} action={<a className="btn-line" href="#discover" data-testid="link-view-all">{t.viewAll} <ArrowRight size={14} /></a>} /></div>
          <div className="car-grid" data-reveal-stagger>{cars.slice(4, 6).map((car) => <CarCard key={car.id} car={car} favorite={favorites.includes(car.id)} onFavorite={(id) => toggleFavorite(id)} />)}</div>
        </section>
        <section className="section-pad section-dark"><div className="newsletter" data-reveal><div><div className="eyebrow">{t.newsEyebrow}</div><h2>{t.newsTitle}<br /><em className="display">{t.newsTitleEm}</em></h2><p>{t.newsCopy}</p></div><div><form className="signup" onSubmit={submitNewsletter}><input type="email" value={newsletter} onChange={(event) => setNewsletter(event.target.value)} placeholder={t.emailPlaceholder} aria-label={t.emailAddress} required data-testid="input-newsletter" /><button type="submit" aria-label={t.subscribe} data-testid="button-newsletter"><ArrowRight size={18} /></button></form>{subscribed && <div className="success-note"><Check size={13} /> {t.subscribed}</div>}</div></div></section>
      </main>
      <Footer />
      {toast && <div className="toast-note" role="status" data-testid="status-toast">{toast}</div>}
    </div>
  );
}

function RouteHero({ eyebrow, title, copy, image, caption }: { eyebrow: string; title: ReactNode; copy: string; image: string; caption: string }) {
  const { t } = useLocale();
  const tiltRef = usePointerTilt<HTMLDivElement>(7);
  return (
    <motion.div className="route-hero" initial="hidden" animate="visible" variants={reveal}>
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p className="route-lede">{copy}</p>
      </div>
      <div className="route-visual-stage">
        <div className="route-visual tilt-3d" ref={tiltRef}>
          <SafeImage src={image} alt={caption} width={960} loading="eager" />
          <div className="gallery-texture" aria-hidden="true" />
          <span className="tilt-shine" aria-hidden="true" />
          <div className="route-visual-caption">
            <span className="eyebrow">{t.incheonCaption}</span>
            <span className="eyebrow">{caption}</span>
          </div>
        </div>
        <div className="gallery-plinth" aria-hidden="true" />
      </div>
    </motion.div>
  );
}

function InventoryPage() {
  const search = useSearch();
  const { locale, t } = useLocale();
  const { currency } = useCurrency();
  const query = useMemo(() => parseInventoryQuery(search), [search]);
  const results = useMemo(() => filterInventory(query), [query]);
  const groups = useMemo(() => groupByBrand(results), [results]);

  return (
    <div className="velocia-shell noise">
      <Navbar />
      <main className="route-page">
        <div data-reveal>
          <div className="eyebrow">{t.invEyebrow}</div>
          <h1 style={{ maxWidth: 720, margin: '.8rem 0 1rem', fontSize: 'clamp(2.6rem,6vw,5.2rem)', lineHeight: .9, letterSpacing: '-.06em', fontWeight: 500 }}>
            {t.invTitle}
          </h1>
          <p className="route-lede">{t.invLead}</p>
          <InventorySearch locale={locale} initial={query} compact />
        </div>
        {groups.length ? groups.map((group) => (
          <section className="brand-lane" key={group.brand} data-reveal>
            <div className="brand-lane-head">
              <img className="brand-lane-mark" src={getMotomarksLogoUrl(brandSlug(group.brand), { size: 'sm', type: 'badge' })} alt="" />
              <h3>{group.brand}</h3>
              <span>{tx(t.vehiclesCount, { n: group.cars.length })}</span>
            </div>
            <div className="inventory-shots">
              {group.cars.map((car) => (
                <Link key={car.id} href={`/cars/${car.id}`} className="inventory-shot" data-testid={`shot-${car.id}`} onClick={scrollPageToTop}>
                  <SafeImage src={car.images[0]} alt={`${car.brand} ${car.model}`} width={1100} />
                  <div className="inventory-shot-copy">
                    <small>{car.year} · {labelBody(t, car.bodyType)} · {labelFuel(t, car.fuel)}</small>
                    <strong>{car.model}</strong>
                    <em>{formatDisplayPrice(car.price, currency)}</em>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )) : (
          <div className="viewer" style={{ minHeight: 320, marginTop: '2.5rem' }}>
            <div className="viewer-content">
              <Search size={28} className="gold" />
              <h3>{t.noMatch}</h3>
              <Link href="/inventory" className="btn-line">{t.resetFilters}</Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function BuyCarsPage() {
  const { t } = useLocale();
  const { favorites, toggleFavorite } = useFavorites();
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '');
  const [body, setBody] = useState('all');
  const [toast, setToast] = useState('');
  const filtered = useMemo(() => cars.filter((car) => `${car.brand} ${car.model} ${car.trim}`.toLowerCase().includes(query.toLowerCase()) && (body === 'all' || car.bodyType === body)), [query, body]);
  return <div className="velocia-shell noise"><Navbar /><main className="route-page">
    <RouteHero eyebrow={t.buyEyebrow} title={<>{t.buyTitleBefore}<br /><em>{t.buyTitleEm}</em></>} copy={t.buyCopy} image={cars[2].images[0]} caption={t.buyCaption} />
    <section className="route-section">
      <div className="toolbar"><div className="searchbox"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchPlaceholder} aria-label={t.searchInventory} data-testid="input-buy-search" /></div><NavChoice variant="filter" label={t.filterBody} value={body} options={[{ value: 'all', label: t.allBodyTypes }, ...Array.from(new Set(cars.map((car) => car.bodyType))).map((item) => ({ value: item, label: labelBody(t, item) }))]} onChange={setBody} testId="select-buy-body" /><span className="result-count">{tx(t.vehiclesCount, { n: filtered.length })}</span></div>
      {filtered.length ? <motion.div className="car-grid" initial="hidden" animate="visible" transition={{ staggerChildren: .06 }}>{filtered.map((car) => <CarCard key={car.id} car={car} favorite={favorites.includes(car.id)} onFavorite={(id) => { toggleFavorite(id); setToast(favorites.includes(id) ? t.removedFavorites : t.savedFavorites); }} />)}</motion.div> : <div className="viewer"><div className="viewer-content"><Search size={27} className="gold" /><h3>{t.noMatch}</h3><p>{t.noMatchBroad}</p><button className="btn-line" type="button" onClick={() => { setQuery(''); setBody('all'); }}>{t.resetSearch}</button></div></div>}
    </section>
    <section className="route-section"><div className="info-grid"><div className="info-card"><div className="eyebrow">{t.apptEyebrow}</div><h3>{t.apptTitle}</h3><p>{t.apptCopy}</p><div className="contact-list"><a href="tel:+8281977008"><Phone size={14} /> +82-8197-7008</a><a href="mailto:info@xanox.net"><Mail size={14} /> info@xanox.net</a></div></div><div className="info-card"><div className="eyebrow">{t.handoverEyebrow}</div><h3>{t.handoverTitle}</h3><p>{t.handoverCopy}</p><Link href="/how-it-works" className="btn-line" style={{ marginTop: '1.2rem' }}>{t.seeProcess} <ArrowRight size={14} /></Link></div></div></section>
  </main><Footer />{toast && <div className="toast-note" role="status">{toast}</div>}</div>;
}

function AuctionsPage() {
  const { t } = useLocale();
  const auctionCars = cars.filter((car) => car.state !== 'For sale');
  const [times, setTimes] = useState<Record<string, number>>(() => Object.fromEntries(auctionCars.map((car) => [car.id, car.endsIn])));
  const [toast, setToast] = useState('');
  useEffect(() => { const interval = window.setInterval(() => setTimes((current) => Object.fromEntries(Object.entries(current).map(([id, time]) => [id, Math.max(0, time - 1)]))), 1000); return () => window.clearInterval(interval); }, []);
  return <div className="velocia-shell noise"><Navbar /><main className="route-page"><RouteHero eyebrow={t.aucPageEyebrow} title={<>{t.aucPageTitleBefore}<br /><em>{t.aucPageTitleEm}</em></>} copy={t.aucPageCopy} image={cars[1].images[0]} caption={t.aucCaption} />
    <section className="route-section"><div className="section-title"><div><div className="eyebrow">{t.openWindows}</div><h2>{t.quietRooms}</h2></div><p>{t.aucPack}</p></div><motion.div className="auction-grid" initial="hidden" animate="visible" transition={{ staggerChildren: .1 }}>{auctionCars.map((car) => <AuctionCard key={car.id} car={car} timeLeft={times[car.id] ?? 0} onBid={(item) => setToast(tx(t.bidOpenedShort, { car: `${item.brand} ${item.model}` }))} />)}</motion.div></section>
    <section className="route-section"><div className="info-grid"><div className="info-card"><CircleCheck className="gold" size={22} /><h3>{t.oneStandard}</h3><p>{t.oneStandardCopy}</p></div><div className="info-card"><div className="eyebrow">{t.needHand}</div><h3>{t.callDesk}</h3><p>+82-8197-7008 · info@xanox.net</p><Link href="/how-it-works" className="btn-line" style={{ marginTop: '1.1rem' }}>{t.howAuctions} <ArrowRight size={14} /></Link></div></div></section>
  </main><Footer />{toast && <div className="toast-note" role="status">{toast}</div>}</div>;
}

function HowItWorksPage() {
  const { t } = useLocale();
  const steps = [
    ['01', t.step1Title, t.step1Copy],
    ['02', t.step2Title, t.step2Copy],
    ['03', t.step3Title, t.step3Copy],
  ];
  return <div className="velocia-shell noise"><Navbar /><main className="route-page"><RouteHero eyebrow={t.howEyebrow} title={<>{t.howTitleBefore}<br /><em>{t.howTitleEm}</em></>} copy={t.howCopy} image={cars[0].images[1]} caption={t.howCaption} />
    <section className="route-section"><div className="eyebrow">{t.sequence}</div><h2>{t.threeMoves}</h2><div className="step-grid">{steps.map(([number, title, copy]) => <article className="step-card" key={number}><span className="eyebrow">{number}</span><strong>{title}</strong><p>{copy}</p></article>)}</div></section>
    <section className="route-section"><div className="info-grid"><div className="info-card"><ShieldCheck className="gold" size={24} /><h3>{t.inspectedTitle}</h3><p>{t.inspectedCopy}</p></div><div className="info-card"><MessageCircle className="gold" size={24} /><h3>{t.namedTitle}</h3><p>{t.namedCopy}</p><Link href="/about" className="btn-line" style={{ marginTop: '1.1rem' }}>{t.meetXanox} <ArrowRight size={14} /></Link></div></div></section>
  </main><Footer /></div>;
}

function ShippingPage() {
  const { t } = useLocale();
  return <div className="velocia-shell noise"><Navbar /><main className="route-page"><RouteHero eyebrow={t.shipEyebrow} title={<>{t.shipTitleBefore}<br /><em>{t.shipTitleEm}</em></>} copy={t.shipCopy} image={cars[8].images[0]} caption={t.shipCaption} />
    <section className="route-section"><div className="section-title"><div><div className="eyebrow">{t.consideredRoute}</div><h2>{t.deliveryWithout}</h2></div><p>{t.routeIntro}</p></div><div className="step-grid"><article className="step-card"><Truck className="gold" size={22} /><strong>{t.prepare}</strong><p>{t.prepareCopy}</p></article><article className="step-card"><MapPin className="gold" size={22} /><strong>{t.move}</strong><p>{t.moveCopy}</p></article><article className="step-card"><CircleCheck className="gold" size={22} /><strong>{t.receive}</strong><p>{t.receiveCopy}</p></article></div></section>
    <section className="route-section"><div className="info-grid"><div className="info-card"><div className="eyebrow">{t.startRoute}</div><h3>{t.whereRoad}</h3><p>{t.routePlanCopy}</p><div className="contact-list"><a href="tel:+8281977008"><Phone size={14} /> +82-8197-7008</a><a href="mailto:info@xanox.net"><Mail size={14} /> info@xanox.net</a></div></div><div className="info-card"><div className="eyebrow">{t.homeBase}</div><h3>{t.incheonTitle}</h3><p>{t.addressFull}</p><Link href="/about" className="btn-line" style={{ marginTop: '1.1rem' }}>{t.aboutRoom} <ArrowRight size={14} /></Link></div></div></section>
  </main><Footer /></div>;
}

function AboutPage() {
  const { t } = useLocale();
  return <div className="velocia-shell noise"><Navbar /><main className="route-page"><RouteHero eyebrow={t.aboutEyebrow} title={<>{t.aboutTitleBefore}<br /><em>{t.aboutTitleEm}</em></>} copy={t.aboutCopy} image={cars[7].images[0]} caption={t.aboutCaption} />
    <section className="route-section"><div className="info-grid"><div className="info-card"><Building2 className="gold" size={24} /><h3>{t.roomNotWarehouse}</h3><p>{t.roomCopy}</p></div><div className="info-card"><div className="eyebrow">{t.theAddress}</div><h3>{t.comeSee}</h3><p>{t.addressFull}</p><div className="contact-list"><a href="tel:+8281977008"><Phone size={14} /> +82-8197-7008</a><a href="mailto:info@xanox.net"><Mail size={14} /> info@xanox.net</a></div></div></div></section>
    <section className="route-section"><div className="eyebrow">{t.ourPromise}</div><h2>{t.goodCarsDeserve}<br /><em className="display">{t.goodContext}</em></h2><p className="route-section-copy">{t.promiseCopy}</p><Link href="/cars" className="btn-gold" style={{ marginTop: '1.6rem' }}>{t.exploreCollection} <ArrowRight size={14} /></Link></section>
  </main><Footer /></div>;
}

function Gallery3DPage() {
  const { t, locale } = useLocale();
  const capable = cars.filter((car) => car.has3d);
  const [selectedId, setSelectedId] = useState(capable[0]?.id ?? cars[0].id);
  const selected: Car = cars.find((car) => car.id === selectedId) ?? capable[0] ?? cars[0];
  return <div className="velocia-shell noise"><Navbar /><main className="route-page"><RouteHero eyebrow={t.galEyebrow} title={<>{t.galTitleBefore}<br /><em>{t.galTitleEm}</em></>} copy={t.galCopy} image={selected.images[0]} caption={t.galCaption} />
    <section className="route-section"><div className="eyebrow">{t.selectModel}</div><div className="gallery-picker">{capable.map((car) => <button key={car.id} className={car.id === selected.id ? 'active' : ''} type="button" onClick={() => setSelectedId(car.id)} data-testid={`button-select-3d-${car.id}`}>{car.brand} {car.model}</button>)}</div><div className="gallery-showcase"><aside className="gallery-side"><div className="eyebrow">{t.nowViewing}</div><h2>{selected.brand}<br /><em className="display">{selected.model}</em></h2><p className="route-section-copy">{selected.trim} · {selected.year}<br />{selected.horsepower} {t.hp} · {labelEngine(selected.engine, locale)}</p><p className="route-section-copy" style={{ marginTop: '1rem' }}>{t.galNote}</p><Link href={`/cars/${selected.id}`} className="btn-line" style={{ marginTop: '1.5rem' }}>{t.viewDetails} <ArrowRight size={14} /></Link></aside><Car3DViewer key={selected.id} car={selected} /></div></section>
  </main><Footer /></div>;
}

function FavoritesPage() {
  const { t } = useLocale();
  const { favorites, toggleFavorite } = useFavorites();
  const saved = cars.filter((car) => favorites.includes(car.id));
  return <div className="velocia-shell noise"><Navbar /><main className="route-page"><RouteHero eyebrow={t.favEyebrow} title={<>{t.favTitleBefore}<br /><em>{t.favTitleEm}</em></>} copy={t.favCopy} image={(saved[0] ?? cars[0]).images[0]} caption={t.favCaption} />
    <section className="route-section">{saved.length ? <motion.div className="car-grid" initial="hidden" animate="visible">{saved.map((car) => <CarCard key={car.id} car={car} favorite onFavorite={toggleFavorite} />)}</motion.div> : <div className="viewer"><div className="viewer-content"><Heart size={27} className="gold" /><h3>{t.garageWaiting}</h3><p>{t.garageHint}</p><Link href="/cars" className="btn-line">{t.browseCars} <ArrowRight size={14} /></Link></div></div>}</section>
  </main><Footer /></div>;
}

function Footer() {
  const { t } = useLocale();
  const signRef = useRef<HTMLDivElement>(null);
  useFooterSign(signRef);
  return (
    <footer className="footer">
      <div className="footer-top" data-reveal>
        <div className="footer-brand">
          <Logo />
          <p>{t.footerBlurb}</p>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button className="nav-icon" type="button" onClick={() => { window.location.href = 'mailto:info@xanox.net'; }} aria-label={t.emailXanox} data-testid="button-email"><Mail size={15} /></button>
            <a className="nav-icon" href="mailto:info@xanox.net" aria-label={t.contactXanox} data-testid="link-contact"><MessageCircle size={15} /></a>
          </div>
        </div>
        <div>
          <h4>{t.nav}</h4>
          <Link href="/inventory">{t.desk}</Link>
          <Link href="/cars">{t.buy}</Link>
          <Link href="/#brands">{t.brands}</Link>
          <Link href="/auctions">{t.auctions}</Link>
          <Link href="/gallery-3d">{t.gallery}</Link>
        </div>
        <div>
          <h4>XANOX</h4>
          <Link href="/how-it-works">{t.how}</Link>
          <Link href="/shipping">{t.shipping}</Link>
          <Link href="/about">{t.about}</Link>
        </div>
        <div>
          <h4>{t.visitRoom}</h4>
          <div className="footer-address"><MapPin size={12} /> {t.incheonKorea}</div>
          <a href="mailto:info@xanox.net">info@xanox.net</a>
          <a href="tel:+8281977008">+82-8197-7008</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 XANOX MOTORS</span>
        <span>{t.footerStreet} <ArrowRight size={12} style={{ display: 'inline', margin: '0 .4rem' }} /> {t.madeForTheDrive}</span>
      </div>
      <div className="footer-sign" ref={signRef} aria-hidden="true">
        <div className="footer-sign-word">
          {'XANOX'.split('').map((letter, index) => (
            <span className="footer-sign-letter" key={`${letter}-${index}`}>{letter}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}

function DeskDock() {
  const { t, locale, setLocale } = useLocale();
  const { currency, setCurrency } = useCurrency();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [note, setNote] = useState('');
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!note) return;
    const id = window.setTimeout(() => setNote(''), 2600);
    return () => window.clearTimeout(id);
  }, [note]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSheet(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSheet(false);
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const currencyOptions = [
    { value: 'KRW', label: 'KRW', hint: t.won },
    { value: 'USD', label: 'USD', hint: t.dollar },
    { value: 'AED', label: 'AED', hint: t.dirham },
  ];
  const localeOptions = [
    { value: 'en', label: 'EN', hint: t.langEnglish },
    { value: 'ko', label: '한국어', hint: t.langKorean },
    { value: 'ar', label: 'عربي', hint: t.langArabic },
  ];

  return (
    <aside
      ref={rootRef}
      className={`desk-dock${open ? ' is-open' : ''}${sheet ? ' is-sheet' : ''}`}
    >
      {sheet && (
        <div className="desk-dock-sheet" role="dialog" aria-label={t.settings}>
          <div className="eyebrow">{t.settings}</div>
          <div className="desk-dock-row">
            <span>{t.theme}</span>
            <div className="theme-control">
              <button type="button" className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')} aria-label={t.light}><Sun size={14} /></button>
              <button type="button" className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')} aria-label={t.dark}><Moon size={14} /></button>
            </div>
          </div>
          <div className="desk-dock-row">
            <span>{t.language}</span>
            <NavChoice label={t.language} value={locale} options={localeOptions} onChange={(next) => setLocale(next as Locale)} icon={<Globe2 size={13} strokeWidth={1.8} />} testId="select-language-dock" />
          </div>
          <div className="desk-dock-row">
            <span>{t.currency}</span>
            <NavChoice label={t.currency} value={currency} options={currencyOptions} onChange={(next) => setCurrency(next as Currency)} testId="select-currency-dock" />
          </div>
        </div>
      )}
      <div className="desk-dock-rail">
        <div className="desk-dock-actions">
          <button type="button" className={`desk-dock-btn${sheet ? ' is-on' : ''}`} aria-label={t.settings} title={t.settings} onClick={() => setSheet((next) => !next)} data-testid="button-dock-settings">
            <Settings size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className="desk-dock-btn"
            aria-label={t.switchTheme}
            title={t.switchTheme}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            data-testid="button-dock-switch"
          >
            {theme === 'dark' ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
          </button>
          <button
            type="button"
            className="desk-dock-btn is-power"
            aria-label={t.logout}
            title={t.logout}
            onClick={() => {
              setSheet(false);
              setOpen(false);
              setNote(t.signedOut);
            }}
            data-testid="button-dock-logout"
          >
            <Power size={18} strokeWidth={1.8} />
          </button>
        </div>
        <button
          type="button"
          className="desk-dock-handle"
          aria-expanded={open}
          aria-label={open ? t.dockClose : t.dockOpen}
          onClick={() => {
            setOpen((next) => !next);
            if (open) setSheet(false);
          }}
          data-testid="button-desk-dock"
        >
          <span className="desk-dock-caret" aria-hidden="true">
            {open ? <ChevronRight size={14} strokeWidth={2.2} /> : <ChevronLeft size={14} strokeWidth={2.2} />}
          </span>
          <User size={18} strokeWidth={1.7} />
        </button>
      </div>
      {note ? <div className="toast-note desk-dock-toast" role="status">{note}</div> : null}
    </aside>
  );
}

function AIBotWidget() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState(() => [
    { id: 'bot-welcome', role: 'bot', text: t.aiHello },
  ]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dummyReplies = [t.aiDummyA, t.aiDummyB, t.aiDummyC, t.aiDummyD];

  useEffect(() => {
    setMessages((current) => {
      if (current.length === 1 && current[0].id === 'bot-welcome') {
        return [{ id: 'bot-welcome', role: 'bot', text: t.aiHello }];
      }
      return current;
    });
  }, [t.aiHello]);

  useEffect(() => {
    const node = bodyRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages, typing, open]);

  const handleSend = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || typing) return;

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text: trimmed },
    ]);
    setInput('');
    setTyping(true);

    window.setTimeout(() => {
      setMessages((current) => {
        const bots = current.filter((message) => message.role === 'bot').length;
        return [
          ...current,
          { id: `bot-${Date.now()}`, role: 'bot', text: dummyReplies[bots % dummyReplies.length] },
        ];
      });
      setTyping(false);
    }, 1100);
  };

  return (
    <div className="ai-bot-widget">
      <AnimatePresence mode="wait" initial={false}>
        {!open ? (
          <motion.button
            key="launch"
            type="button"
            className="ai-bot-launch"
            onClick={() => setOpen(true)}
            aria-label={t.aiOpen}
            initial={{ opacity: 0, scale: .86, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: .9, y: 8 }}
            transition={{ duration: .35, ease: [.22, 1, .36, 1] }}
          >
            <Sparkles size={15} />
            <span>XANOX AI</span>
          </motion.button>
        ) : (
          <motion.div
            key="panel"
            className="ai-bot-panel"
            role="dialog"
            aria-label={t.aiChat}
            initial={{ opacity: 0, y: 22, scale: .96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: .97 }}
            transition={{ duration: .42, ease: [.22, 1, .36, 1] }}
          >
            <div className="ai-bot-header">
              <div className="ai-bot-title">
                <Sparkles size={14} />
                <span>XANOX AI</span>
              </div>
              <button type="button" className="ai-bot-close" onClick={() => setOpen(false)} aria-label={t.aiClose}>
                <X size={14} />
              </button>
            </div>

            <div className="ai-bot-body" ref={bodyRef}>
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    className={`ai-chat-message ${message.role}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: .38, ease: [.22, 1, .36, 1] }}
                  >
                    {message.text}
                  </motion.div>
                ))}
              </AnimatePresence>
              {typing && (
                <motion.div
                  className="ai-chat-message bot ai-typing"
                  aria-label={t.aiTyping}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <i /><i /><i />
                </motion.div>
              )}
            </div>

            <form className="ai-chat-input" onSubmit={handleSend}>
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t.aiPlaceholder}
                aria-label={t.aiAsk}
              />
              <button type="submit" aria-label={t.aiSend}>
                <ArrowRight size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const car = cars.find((item) => item.id === id);
  const gallery = useCarGallery(car);
  const { favorites, toggleFavorite } = useFavorites();
  const { currency } = useCurrency();
  const { t, locale } = useLocale();
  const [imageIndex, setImageIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [toast, setToast] = useState('');
  const [galleryPaused, setGalleryPaused] = useState(false);
  const [viewingOpen, setViewingOpen] = useState(false);
  const galleryTiltRef = usePointerTilt<HTMLDivElement>(6);

  useEffect(() => {
    setImageIndex(0);
    scrollPageToTop();
  }, [car?.id]);

  useEffect(() => {
    if (gallery.length === 0) return;
    setImageIndex((index) => Math.min(index, gallery.length - 1));
  }, [gallery.length]);

  useEffect(() => {
    if (!car || galleryPaused || lightbox) return;
    const count = Math.max(gallery.length, 1);
    if (count < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => {
      setImageIndex((index) => (index + 1) % count);
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [car, imageIndex, gallery.length, lightbox, galleryPaused]);

  if (!car) return <NotFound />;

  const shots = gallery.length ? gallery : [{ url: car.images[0], angle: 'angleFrontQ' }];
  const active = shots[imageIndex] ?? shots[0];
  const favorite = favorites.includes(car.id);
  const activeAngle = labelAngle(t, active.angle);
  const similar = cars
    .filter((item) => item.id !== car.id && (item.bodyType === car.bodyType || item.brand === car.brand))
    .slice(0, 3);

  return (
    <div className="velocia-shell noise">
      <Navbar />
      <main className="detail-page">
        <div className="detail-wrap">
          <Link href="/#discover" className="detail-crumb" data-testid="link-back-collection">
            <ArrowLeft size={13} /> {t.backCollection}
          </Link>
          <motion.div className="detail-hero" initial="hidden" animate="visible" variants={reveal}>
            <div>
              <div className="gallery-stage">
              <div
                className="gallery-main tilt-3d"
                ref={galleryTiltRef}
                onPointerEnter={() => setGalleryPaused(true)}
                onPointerLeave={() => setGalleryPaused(false)}
              >
                <div className="gallery-clip">
                  <AnimatePresence initial={false}>
                    <motion.div
                      className="gallery-slide"
                      key={`${car.id}-${active.url}-${imageIndex}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.35, ease: [0.22, 0.8, 0.25, 1] }}
                    >
                      <SafeImage src={active.url} alt={`${car.brand} ${car.model} ${activeAngle}`} width={960} sizes="(max-width: 900px) 100vw, 680px" loading="eager" />
                    </motion.div>
                  </AnimatePresence>
                  <div className="gallery-texture" aria-hidden="true" />
                  <span className="tilt-shine" aria-hidden="true" />
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    className="gallery-angle"
                    key={activeAngle}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.45 }}
                  >
                    {activeAngle}
                  </motion.span>
                </AnimatePresence>
                <div className="gallery-controls">
                  <button className="nav-icon" type="button" onClick={() => setImageIndex((index) => (index + shots.length - 1) % shots.length)} aria-label={t.prevImage} data-testid="button-gallery-previous"><ArrowLeft size={15} /></button>
                  <button className="nav-icon" type="button" onClick={() => setLightbox(true)} aria-label={t.openLightbox} data-testid="button-open-lightbox"><ExternalLink size={14} /></button>
                  <button className="nav-icon" type="button" onClick={() => setImageIndex((index) => (index + 1) % shots.length)} aria-label={t.nextImage} data-testid="button-gallery-next"><ArrowRight size={15} /></button>
                </div>
              </div>
              <div className="gallery-plinth" aria-hidden="true" />
              </div>
              <div className="gallery-thumbs">
                {shots.map((shot, index) => (
                  <button
                    className={`gallery-thumb ${index === imageIndex ? 'active' : ''}`}
                    key={`${shot.url}-${index}`}
                    type="button"
                    onClick={() => setImageIndex(index)}
                    aria-label={tx(t.viewImage, { n: index + 1 })}
                  >
                    <SafeImage src={shot.url} alt="" width={160} sizes="88px" loading={index < 3 ? 'eager' : 'lazy'} />
                    <span>{labelAngle(t, shot.angle)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="detail-info">
              <div className="eyebrow">{labelState(t, car.state)} / {labelLocation(t, car.location)}</div>
              <h1>{car.brand}<br /><em className="display">{car.model}</em></h1>
              <div className="sub">{car.trim} · {car.year}</div>
              <div className="detail-price">{formatDisplayPrice(car.price, currency)}</div>
              <div className="detail-actions">
                <button className="btn-gold" type="button" onClick={() => setViewingOpen(true)} data-testid="button-request-concierge">{t.requestViewing} <CalendarDays size={14} /></button>
                <button className={`btn-line ${favorite ? 'gold' : ''}`} type="button" onClick={() => toggleFavorite(car.id)} data-testid="button-detail-favorite">
                  <Heart size={14} fill={favorite ? 'currentColor' : 'none'} /> {favorite ? t.saved : t.saveCar}
                </button>
              </div>
              <div className="detail-stats">
                <div><span>{t.engine}</span><strong>{labelEngine(car.engine, locale)}</strong></div>
                <div><span>{t.power}</span><strong>{car.horsepower} {t.hp}</strong></div>
                <div><span>{t.mileage}</span><strong>{car.mileage}</strong></div>
                <div><span>{t.drivetrain}</span><strong>{labelDrivetrain(t, car.drivetrain)}</strong></div>
              </div>
            </div>
          </motion.div>
          <section className="detail-block">
            <SectionHeading eyebrow={t.tactileEyebrow} title={t.tactileTitle} copy={t.tactileCopy} />
            <Car3DViewer key={car.id} car={car} />
          </section>
          <div className="detail-sections">
            <section>
              <div className="eyebrow">{t.overview}</div>
              <h2>{t.longWay}</h2>
              <p>{carStory(car, locale).description}</p>
              <p>{t.overviewExtra}</p>
            </section>
            <section>
              <div className="eyebrow">{t.specification}</div>
              <h2>{t.everythingPlace}</h2>
              <ul className="feature-list">{carStory(car, locale).features.map((feature) => <li key={feature}><Check size={14} /> {feature}</li>)}</ul>
              <div className="detail-inspected">
                <div className="inspect-seal" aria-hidden="true"><span>XANOX</span><em>{t.inspectedBadge}</em></div>
                <ShieldCheck className="gold" size={19} />
                <div>
                  <strong>{t.inspectedBadge}</strong>
                  <p>{tx(t.inspectedAt, { place: labelLocation(t, car.location) })}</p>
                </div>
              </div>
            </section>
          </div>
          <InspectionBoard car={car} />
          <ExportQuote car={car} formatMoney={(price) => formatDisplayPrice(price, currency)} />
          {similar.length > 0 && (
            <section className="detail-block">
              <div className="eyebrow">{t.alsoInRoom}</div>
              <h2 className="detail-room-title">{t.alsoInRoomCopy}</h2>
              <div className="car-grid" style={{ marginTop: '1.4rem' }}>
                {similar.map((item) => (
                  <CarCard key={item.id} car={item} favorite={favorites.includes(item.id)} onFavorite={toggleFavorite} />
                ))}
              </div>
            </section>
          )}
          <section className="detail-block">
            <div className="eyebrow">{t.theRoom}</div>
            <h2 className="detail-room-title">{tx(t.availableIn, { place: labelLocation(t, car.location) })}</h2>
            <p className="detail-room-copy">{t.privateViewings}</p>
          </section>
        </div>
      </main>
      <Footer />
      {lightbox && (
        <div className="lightbox" role="dialog" aria-label={t.lightboxLabel} onClick={() => setLightbox(false)}>
          <button className="nav-icon lightbox-close" type="button" onClick={() => setLightbox(false)} aria-label={t.closeLightbox} data-testid="button-close-lightbox"><X /></button>
          <SafeImage src={active.url} alt={tx(t.imageEnlarged, { car: `${car.brand} ${car.model}`, angle: activeAngle })} width={1280} sizes="100vw" loading="eager" />
        </div>
      )}
      <ViewingDesk
        car={car}
        open={viewingOpen}
        onClose={() => setViewingOpen(false)}
        onSent={() => setToast(t.conciergeToast)}
      />
      {toast && <div className="toast-note" role="status" data-testid="status-detail-toast">{toast}</div>}
    </div>
  );
}

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    const stayOnHomeHash = location === '/' && Boolean(window.location.hash);
    if (!stayOnHomeHash && window.location.hash) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
    }
    if (stayOnHomeHash) return;
    scrollPageToTop();
    const later = window.setTimeout(scrollPageToTop, 80);
    return () => window.clearTimeout(later);
  }, [location]);

  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/" component={Home} />
    <Route path="/inventory" component={InventoryPage} />
    <Route path="/cars" component={BuyCarsPage} />
    <Route path="/cars/:id" component={DetailPage} />
    <Route path="/auctions" component={AuctionsPage} />
    <Route path="/how-it-works" component={HowItWorksPage} />
    <Route path="/shipping" component={ShippingPage} />
    <Route path="/about" component={AboutPage} />
    <Route path="/gallery-3d" component={Gallery3DPage} />
    <Route path="/favorites" component={FavoritesPage} />
    <Route component={NotFound} />
  </Switch></ErrorBoundary>;
}

function App() {
  useSmoothScroll();
  return <QueryClientProvider client={queryClient}><ThemeProvider><LocaleProvider><CurrencyProvider><TooltipProvider><MotionConfig reducedMotion="user"><Router /><EntranceLoader /><DeskDock /><AIBotWidget /><Toaster /></MotionConfig></TooltipProvider></CurrencyProvider></LocaleProvider></ThemeProvider></QueryClientProvider>;
}

export default App;