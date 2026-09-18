import { useState, type FormEvent } from 'react';
import { MessageCircle, Ship, X } from 'lucide-react';
import type { Car } from '@/data/cars';
import { EXPORT_PORTS, quoteExport } from '@/lib/exportQuote';
import { tx, useLocale } from '@/locale';

const WA_DESK = '8281977008';

export function ExportQuote({
  car,
  formatMoney,
}: {
  car: Car;
  formatMoney: (price: number) => string;
}) {
  const { t } = useLocale();
  const [port, setPort] = useState<(typeof EXPORT_PORTS)[number]['id']>('jebel-ali');
  const quote = quoteExport(car.price, port);
  const portLabel = {
    incheon: t.portIncheon,
    'jebel-ali': t.portJebelAli,
    jeddah: t.portJeddah,
    doha: t.portDoha,
  }[port];

  const waHref = `https://wa.me/${WA_DESK}?text=${encodeURIComponent(
    tx(t.whatsappMessage, { car: `${car.brand} ${car.model}`, port: portLabel, total: formatMoney(quote.total) }),
  )}`;

  const rows = [
    [t.quoteAsking, car.price],
    [t.quoteInland, quote.inland],
    [t.quoteOcean, quote.ocean],
    [t.quoteDocs, quote.docs],
    [t.quoteFee, quote.fee],
  ] as const;

  return (
    <section className="export-quote" data-testid="export-quote">
      <div className="export-quote-copy">
        <div className="eyebrow">{t.exportQuoteEyebrow}</div>
        <h2>{t.exportQuoteTitle}</h2>
        <p>{t.exportQuoteCopy}</p>
        <label className="export-port">
          <span>{t.exportPort}</span>
          <select value={port} onChange={(event) => setPort(event.target.value as typeof port)} data-testid="select-export-port">
            {EXPORT_PORTS.map((item) => (
              <option key={item.id} value={item.id}>
                {{
                  incheon: t.portIncheon,
                  'jebel-ali': t.portJebelAli,
                  jeddah: t.portJeddah,
                  doha: t.portDoha,
                }[item.id]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="export-ledger">
        <div className="export-ledger-mark"><Ship size={16} /> {portLabel}</div>
        {rows.map(([label, amount]) => (
          <div className="export-row" key={label}>
            <span>{label}</span>
            <strong>{formatMoney(amount)}</strong>
          </div>
        ))}
        <div className="export-row export-total">
          <span>{t.quoteLanded}</span>
          <strong>{formatMoney(quote.total)}</strong>
        </div>
        <p className="export-note">{t.quoteNote}</p>
        <a className="btn-gold export-wa" href={waHref} target="_blank" rel="noreferrer" data-testid="link-whatsapp-desk">
          <MessageCircle size={14} /> {t.whatsappCar}
        </a>
      </div>
    </section>
  );
}

export function ViewingDesk({
  car,
  open,
  onClose,
  onSent,
}: {
  car: Car;
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [when, setWhen] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSent();
    setName('');
    setPhone('');
    setWhen('');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="viewing-desk" role="dialog" aria-label={t.viewingTitle} onClick={onClose}>
      <form className="viewing-card" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <button className="nav-icon viewing-close" type="button" onClick={onClose} aria-label={t.viewingClose}>
          <X size={14} />
        </button>
        <div className="eyebrow">{t.theRoom}</div>
        <h3>{t.viewingTitle}</h3>
        <p>{tx(t.viewingCopy, { car: `${car.brand} ${car.model}` })}</p>
        <label>
          <span>{t.viewingName}</span>
          <input value={name} onChange={(event) => setName(event.target.value)} required data-testid="input-viewing-name" />
        </label>
        <label>
          <span>{t.viewingPhone}</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} required data-testid="input-viewing-phone" />
        </label>
        <label>
          <span>{t.viewingWhen}</span>
          <input value={when} onChange={(event) => setWhen(event.target.value)} placeholder={t.viewingWhenHint} data-testid="input-viewing-when" />
        </label>
        <button className="btn-gold" type="submit" data-testid="button-send-viewing">{t.viewingSubmit}</button>
      </form>
    </div>
  );
}
