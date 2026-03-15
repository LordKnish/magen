import { useEffect, useState, useRef, useCallback } from 'react';
import { useHistoryStore, categoryToAlertType, type HistoricalAlert } from '../../store/historyStore';
import { ALERT_TYPE_CONFIG } from '../../lib/alertTypes';
import { type Language, t } from '../../i18n';
import { useCityStore } from '../../store/cityStore';

interface Props {
  lang: Language;
  viewingTimestamp: number | null;
  onScrub: (ts: number | null) => void;
  onGoToPresent: () => void;
  onFlyToCity: (cityName: string) => void;
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getCityName(
  hebrewName: string,
  lang: Language,
  cityDb: Record<string, { name_en: string; name_ru: string; countdown: number }>,
): string {
  const city = cityDb[hebrewName];
  if (!city) return hebrewName;
  if (lang === 'he') return hebrewName;
  if (lang === 'ru') return city.name_ru || city.name_en || hebrewName;
  return city.name_en || hebrewName;
}

const RANGES = [
  { label: '1h', seconds: 3600 },
  { label: '6h', seconds: 6 * 3600 },
  { label: '24h', seconds: 24 * 3600 },
  { label: '7d', seconds: 7 * 86400 },
  { label: '30d', seconds: 30 * 86400 },
];

export default function TimelineBar({ lang, viewingTimestamp, onScrub, onGoToPresent, onFlyToCity }: Props) {
  const { data, fetch: fetchHistory } = useHistoryStore();
  const { cityDb } = useCityStore();
  const [, setTick] = useState(0);
  const [rangeIdx, setRangeIdx] = useState(2); // default 24h
  const [selectedEvents, setSelectedEvents] = useState<HistoricalAlert[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Re-render every minute
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const range = RANGES[rangeIdx];
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - range.seconds;

  const recent = (data ?? []).filter(a => a.timestamp >= windowStart);
  const isLive = viewingTimestamp === null;

  // Convert mouse position to timestamp
  const posToTimestamp = useCallback((clientX: number): number => {
    if (!trackRef.current) return now;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.floor(windowStart + pct * (now - windowStart));
  }, [windowStart, now]);

  // Scrub on click
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (!trackRef.current) return;
    const ts = posToTimestamp(e.clientX);

    // If clicking near the end (last 2%), go to present
    const rect = trackRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    if (pct > 0.98) {
      onGoToPresent();
      setSelectedEvents([]);
      return;
    }

    onScrub(ts);

    // Find ALL events within a time window around the click
    const threshold = 0.03 * (now - windowStart);
    const nearby = recent.filter(event => Math.abs(event.timestamp - ts) < threshold);
    setSelectedEvents(nearby);
  }, [recent, windowStart, now, posToTimestamp, onScrub, onGoToPresent]);

  // Drag scrubbing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    const ts = posToTimestamp(e.clientX);
    onScrub(ts);

    const handleMove = (me: MouseEvent) => {
      const ts = posToTimestamp(me.clientX);
      onScrub(ts);
    };

    const handleUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [posToTimestamp, onScrub]);

  if (!data || data.length === 0) return null;

  // Scrubber position
  const scrubberPct = viewingTimestamp !== null
    ? Math.max(0, Math.min(100, ((viewingTimestamp - windowStart) / (now - windowStart)) * 100))
    : 100;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 border-t backdrop-blur-xl"
      style={{
        background: 'var(--bg-overlay)',
        borderColor: 'var(--border-default)',
      }}
    >
      {/* Historical mode banner */}
      {!isLive && (
        <div className="flex items-center justify-between px-4 py-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--alert-early)]" />
            <span className="text-xs font-semibold text-[var(--alert-early)]">
              Viewing: {formatDate(viewingTimestamp!)}
            </span>
          </div>
          <button
            onClick={() => { onGoToPresent(); setSelectedEvents([]); }}
            className="text-xs font-semibold text-[var(--alert-info)] hover:text-[var(--text-primary)] transition-colors px-2 py-0.5 rounded bg-white/5 hover:bg-white/10"
          >
            Back to Live
          </button>
        </div>
      )}

      {/* Selected events tooltip — shows ALL alerts at the scrubbed time */}
      {selectedEvents.length > 0 && (
        <div className="border-b max-h-[180px] overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-4 pt-2 pb-1">
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
              {selectedEvents.length} alert{selectedEvents.length !== 1 ? 's' : ''} at this time
            </span>
            <button
              onClick={() => setSelectedEvents([])}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
            >
              ✕
            </button>
          </div>
          {selectedEvents.map((event, i) => {
            const alertType = categoryToAlertType(event.category);
            const config = ALERT_TYPE_CONFIG[alertType] ?? ALERT_TYPE_CONFIG.Unknown;
            return (
              <div
                key={`${event.id}-${event.timestamp}-${i}`}
                className="px-4 py-1.5"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: config.color }}
                  />
                  <span className="text-xs font-bold" style={{ color: config.color }}>
                    {t(config.labelKey, lang)}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 pl-4">
                  {event.towns.map((town, j) => (
                    <button
                      key={j}
                      onClick={() => onFlyToCity(town)}
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline transition-colors cursor-pointer"
                    >
                      {getCityName(town, lang, cityDb)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-4 py-2.5">
        {/* Range selector */}
        <div className="flex items-center gap-1 mb-1.5">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => { setRangeIdx(i); setSelectedEvents([]); }}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                i === rangeIdx
                  ? 'bg-white/10 text-[var(--text-primary)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {r.label}
            </button>
          ))}
          <span className="text-[10px] text-[var(--text-muted)] ml-auto">
            {recent.length} alert{recent.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Timeline track */}
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] text-[var(--text-muted)] font-medium tabular-nums min-w-[36px]">
            {formatTime(windowStart)}
          </span>
          <div
            ref={trackRef}
            className="flex-1 h-4 relative select-none"
            style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
            onClick={handleTrackClick}
            onMouseDown={handleMouseDown}
          >
            {/* Track background */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-white/[0.06] rounded-sm" />

            {/* Event markers */}
            {recent.map((event, i) => {
              const pct = ((event.timestamp - windowStart) / (now - windowStart)) * 100;
              const alertType = categoryToAlertType(event.category);
              const config = ALERT_TYPE_CONFIG[alertType] ?? ALERT_TYPE_CONFIG.Unknown;
              const isSelected = selectedEvents.some(e => e.id === event.id && e.timestamp === event.timestamp);
              return (
                <div
                  key={`${event.id}-${i}`}
                  className="absolute rounded-sm pointer-events-none"
                  style={{
                    left: `${pct}%`,
                    top: isSelected ? '0px' : '3px',
                    width: isSelected ? '3px' : '2px',
                    height: isSelected ? '16px' : '10px',
                    background: config.color,
                    boxShadow: isSelected
                      ? `0 0 8px ${config.color}80`
                      : `0 0 3px ${config.color}40`,
                    zIndex: isSelected ? 2 : 1,
                  }}
                />
              );
            })}

            {/* Scrubber / Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 rounded-sm pointer-events-none"
              style={{
                left: `${scrubberPct}%`,
                background: isLive ? 'var(--text-primary)' : 'var(--alert-early)',
                boxShadow: isLive ? 'none' : '0 0 6px rgba(238, 192, 45, 0.5)',
                width: isLive ? '2px' : '3px',
              }}
            >
              {/* Scrubber handle (visible when not live) */}
              {!isLive && (
                <div
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2"
                  style={{
                    background: 'var(--bg-base)',
                    borderColor: 'var(--alert-early)',
                  }}
                />
              )}
            </div>
          </div>
          <button
            onClick={() => { onGoToPresent(); setSelectedEvents([]); }}
            className={`text-[10px] font-medium tabular-nums min-w-[28px] text-right transition-colors ${
              isLive ? 'text-[var(--text-muted)]' : 'text-[var(--alert-info)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isLive ? 'NOW' : 'LIVE'}
          </button>
        </div>
      </div>
    </div>
  );
}
