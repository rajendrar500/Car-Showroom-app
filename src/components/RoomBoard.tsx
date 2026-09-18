import { useEffect, useState } from 'react';
import { Clock3, MapPin } from 'lucide-react';
import { Link } from 'wouter';
import { tx, useLocale } from '@/locale';
import { FlipDigits } from '@/components/FlipDigits';

const SEOUL = 'Asia/Seoul';

function seoulParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SEOUL,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const hour = Number(pick('hour'));
  return {
    clock: `${pick('hour')}:${pick('minute')}:${pick('second')}`,
    date: `${pick('weekday')} ${pick('day')} ${pick('month')}`,
    open: hour >= 10 && hour < 19,
  };
}

export function RoomBoard({ liveLots }: { liveLots: number }) {
  const { t } = useLocale();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  const { clock, date, open } = seoulParts(now);

  return (
    <section className="section-pad room-board-wrap" data-reveal>
      <div className="room-board">
        <div className="room-board-copy">
          <div className="eyebrow">{t.roomBoardEyebrow}</div>
          <h2>{t.roomBoardTitle}</h2>
          <p>{t.roomBoardCopy}</p>
          <div className="room-board-meta">
            <span className={`room-status ${open ? 'is-open' : ''}`}>
              <i /> {open ? t.roomOpen : t.roomClosed}
            </span>
            <span><MapPin size={13} /> {t.incheonKorea}</span>
            <span>{t.roomHours}</span>
          </div>
        </div>
        <div className="room-board-clock">
          <div className="room-clock-label"><Clock3 size={13} /> {t.roomTime}</div>
          <FlipDigits value={clock} label={t.roomTime} />
          <div className="room-clock-date">{date} · KST</div>
          <div className="room-clock-stats">
            <strong>{tx(t.roomLiveLots, { n: liveLots })}</strong>
            <Link href="/auctions">{t.liveAuctions}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
