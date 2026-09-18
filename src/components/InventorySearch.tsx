import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, ArrowRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import {
  EMPTY_QUERY,
  PRICE_BANDS,
  filterInventory,
  toInventorySearch,
  uniqueBodies,
  uniqueFuels,
  uniqueMakes,
  uniqueModels,
  uniqueYears,
  type InventoryQuery,
} from '@/lib/inventory';
import { labelBody, labelFuel, localeCopy } from '@/locale';

type Locale = 'en' | 'ko' | 'ar';

const deskCopy = {
  en: {
    make: 'Make',
    model: 'Model',
    year: 'Year',
    body: 'Body',
    fuel: 'Fuel',
    price: 'Price',
    anyMake: 'Any make',
    anyModel: 'Any model',
    anyYear: 'Any year',
    anyBody: 'Any body',
    anyFuel: 'Any fuel',
    anyPrice: 'Any price',
    searchAll: 'Search {n} vehicles',
    inRoom: '{n} in the room',
    lt15: 'Under 1.5 Cr',
    band1520: '1.5 — 2 Cr',
    band2030: '2 — 3 Cr',
    gt30: '3 Cr and above',
  },
  ko: {
    make: '제조사',
    model: '모델',
    year: '연식',
    body: '차체',
    fuel: '연료',
    price: '가격',
    anyMake: '모든 제조사',
    anyModel: '모든 모델',
    anyYear: '모든 연식',
    anyBody: '모든 차체',
    anyFuel: '모든 연료',
    anyPrice: '모든 가격',
    searchAll: '{n}대 검색',
    inRoom: '룸에 {n}대',
    lt15: '1.5 Cr 미만',
    band1520: '1.5 — 2 Cr',
    band2030: '2 — 3 Cr',
    gt30: '3 Cr 이상',
  },
  ar: {
    make: 'العلامة',
    model: 'الموديل',
    year: 'السنة',
    body: 'الهيكل',
    fuel: 'الوقود',
    price: 'السعر',
    anyMake: 'أي علامة',
    anyModel: 'أي موديل',
    anyYear: 'أي سنة',
    anyBody: 'أي هيكل',
    anyFuel: 'أي وقود',
    anyPrice: 'أي سعر',
    searchAll: 'ابحث في {n}',
    inRoom: '{n} في الغرفة',
    lt15: 'أقل من 1.5 Cr',
    band1520: '1.5 — 2 Cr',
    band2030: '2 — 3 Cr',
    gt30: '3 Cr فأكثر',
  },
} as const;

function DeskField({
  id,
  label,
  value,
  options,
  open,
  onToggle,
  onChange,
  testId,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ id: string; label: string }>;
  open: boolean;
  onToggle: (id: string) => void;
  onChange: (value: string) => void;
  testId: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.id === value)?.label ?? options[0]?.label ?? '';

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onToggle('');
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onToggle('');
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onToggle]);

  return (
    <div className={`desk-field${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="desk-field-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        data-testid={testId}
        onClick={() => onToggle(open ? '' : id)}
      >
        <span>
          <small>{label}</small>
          <strong>{current}</strong>
        </span>
        <ChevronDown className="desk-caret" size={14} strokeWidth={1.7} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            className="desk-menu"
            role="listbox"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: [0.22, 0.8, 0.25, 1] }}
          >
            {options.map((option) => {
              const active = option.id === value;
              return (
                <li key={option.id || 'any'}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={active ? 'is-active' : ''}
                    onClick={() => {
                      onChange(option.id);
                      onToggle('');
                    }}
                  >
                    <span>{option.label}</span>
                    {active ? <Check size={13} strokeWidth={2.4} /> : null}
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

export function InventorySearch({
  locale = 'en',
  initial = EMPTY_QUERY,
  compact = false,
}: {
  locale?: Locale;
  initial?: InventoryQuery;
  compact?: boolean;
}) {
  const [, setLocation] = useLocation();
  const copy = deskCopy[locale] ?? deskCopy.en;
  const [query, setQuery] = useState<InventoryQuery>(initial);
  const [openId, setOpenId] = useState('');

  useEffect(() => {
    setQuery(initial);
  }, [initial.make, initial.model, initial.year, initial.body, initial.fuel, initial.price]);

  const models = useMemo(() => uniqueModels(query.make), [query.make]);
  const matched = useMemo(() => filterInventory(query), [query]);

  const setField = (key: keyof InventoryQuery, value: string) => {
    setQuery((current) => {
      const next = { ...current, [key]: value };
      if (key === 'make' && value && !uniqueModels(value).includes(current.model)) next.model = '';
      return next;
    });
  };

  const priceLabel = (id: string) => {
    if (id === 'lt15') return copy.lt15;
    if (id === '15-20') return copy.band1520;
    if (id === '20-30') return copy.band2030;
    if (id === 'gt30') return copy.gt30;
    return copy.anyPrice;
  };

  const fields = [
    { id: 'make', label: copy.make, value: query.make, testId: 'desk-make', options: [{ id: '', label: copy.anyMake }, ...uniqueMakes().map((item) => ({ id: item, label: item }))] },
    { id: 'model', label: copy.model, value: query.model, testId: 'desk-model', options: [{ id: '', label: copy.anyModel }, ...models.map((item) => ({ id: item, label: item }))] },
    { id: 'year', label: copy.year, value: query.year, testId: 'desk-year', options: [{ id: '', label: copy.anyYear }, ...uniqueYears().map((item) => ({ id: item, label: item }))] },
    { id: 'body', label: copy.body, value: query.body, testId: 'desk-body', options: [{ id: '', label: copy.anyBody }, ...uniqueBodies().map((item) => ({ id: item, label: labelBody(localeCopy[locale], item) }))] },
    { id: 'fuel', label: copy.fuel, value: query.fuel, testId: 'desk-fuel', options: [{ id: '', label: copy.anyFuel }, ...uniqueFuels().map((item) => ({ id: item, label: labelFuel(localeCopy[locale], item) }))] },
    { id: 'price', label: copy.price, value: query.price, testId: 'desk-price', options: [{ id: '', label: copy.anyPrice }, ...PRICE_BANDS.map((band) => ({ id: band.id, label: priceLabel(band.id) }))] },
  ] as const;

  return (
    <form
      className={`inventory-desk${compact ? ' is-compact' : ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        setLocation(`/inventory${toInventorySearch(query)}`);
      }}
    >
      {fields.map((field) => (
        <DeskField
          key={field.id}
          id={field.id}
          label={field.label}
          value={field.value}
          options={[...field.options]}
          open={openId === field.id}
          onToggle={setOpenId}
          onChange={(value) => setField(field.id, value)}
          testId={field.testId}
        />
      ))}
      <div className="desk-actions">
        <span className="desk-count">{copy.inRoom.replace('{n}', String(matched.length))}</span>
        <button className="btn-gold desk-search" type="submit" data-testid="button-inventory-search">
          {copy.searchAll.replace('{n}', String(matched.length))}
          <ArrowRight size={14} strokeWidth={2.2} />
        </button>
      </div>
    </form>
  );
}
