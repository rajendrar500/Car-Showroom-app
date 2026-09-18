import { useState } from 'react';
import type { Car } from '@/data/cars';
import { INSPECT_ZONES, inspectScores, type InspectZone } from '@/lib/inspection';
import { useLocale } from '@/locale';

const PINS: { id: InspectZone; x: number; y: number }[] = [
  { id: 'paint', x: 48, y: 28 },
  { id: 'glass', x: 62, y: 36 },
  { id: 'cabin', x: 44, y: 46 },
  { id: 'power', x: 22, y: 48 },
  { id: 'underside', x: 50, y: 68 },
  { id: 'tyres', x: 78, y: 62 },
];

export function InspectionBoard({ car }: { car: Car }) {
  const { t } = useLocale();
  const report = inspectScores(car);
  const [active, setActive] = useState<InspectZone>('paint');
  const zoneLabel: Record<InspectZone, string> = {
    paint: t.inspectZonePaint,
    glass: t.inspectZoneGlass,
    cabin: t.inspectZoneCabin,
    power: t.inspectZonePower,
    underside: t.inspectZoneUnderside,
    tyres: t.inspectZoneTyres,
  };
  const zoneNote: Record<InspectZone, string> = {
    paint: t.inspectNotePaint,
    glass: t.inspectNoteGlass,
    cabin: t.inspectNoteCabin,
    power: t.inspectNotePower,
    underside: t.inspectNoteUnderside,
    tyres: t.inspectNoteTyres,
  };

  return (
    <section className="inspect-board" data-testid="inspect-board">
      <div className="inspect-board-copy">
        <div className="eyebrow">{t.inspectEyebrow}</div>
        <h2>{t.inspectTitle}</h2>
        <p>{t.inspectCopy}</p>
        <div className="inspect-grade">
          <span>{t.inspectGrade}</span>
          <strong>{report.grade}</strong>
          <em>{report.average}/100 · {t.inspectOverall}</em>
        </div>
      </div>
      <div className="inspect-stage">
        <svg className="inspect-car" viewBox="0 0 320 180" aria-hidden="true">
          <ellipse cx="160" cy="158" rx="92" ry="10" fill="rgba(214,171,103,.16)" />
          <path d="M54 108c8-28 28-46 72-52 18-22 52-28 86-18 22 6 38 22 46 42 18 4 28 16 28 28 0 14-12 24-32 24H78c-18 0-32-8-32-22 0-4 2-8 8-10z" fill="none" stroke="rgba(214,171,103,.55)" strokeWidth="1.4" />
          <path d="M118 64c22-8 48-8 70 2 6 12 8 22 4 34H122c-6-10-8-22-4-36z" fill="rgba(214,171,103,.08)" stroke="rgba(214,171,103,.35)" strokeWidth="1" />
          <circle cx="96" cy="132" r="16" fill="none" stroke="rgba(231,224,209,.28)" strokeWidth="3" />
          <circle cx="228" cy="132" r="16" fill="none" stroke="rgba(231,224,209,.28)" strokeWidth="3" />
        </svg>
        {PINS.map((pin) => (
          <button
            key={pin.id}
            type="button"
            className={`inspect-pin ${active === pin.id ? 'is-active' : ''}`}
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            onClick={() => setActive(pin.id)}
            aria-pressed={active === pin.id}
            data-testid={`button-inspect-${pin.id}`}
          >
            <b>{report.scores[pin.id]}</b>
            <span>{zoneLabel[pin.id]}</span>
          </button>
        ))}
      </div>
      <aside className="inspect-note">
        <div className="eyebrow">{zoneLabel[active]}</div>
        <strong>{report.scores[active]}/100</strong>
        <p>{zoneNote[active]}</p>
        <ul>
          {INSPECT_ZONES.map((zone) => (
            <li key={zone}>
              <button type="button" className={zone === active ? 'is-active' : ''} onClick={() => setActive(zone)}>
                {zoneLabel[zone]}
                <em>{report.scores[zone]}</em>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}
