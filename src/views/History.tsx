import { useState, useMemo } from 'react';
import { Clock, Filter } from 'lucide-react';
import { useAlertStore } from '../store/alertStore';
import { useCityStore } from '../store/cityStore';
import { ALERT_TYPE_CONFIG } from '../lib/alertTypes';
import { type Language, t } from '../i18n';

interface Props {
  lang: Language;
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

function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp * 1000;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function History({ lang }: Props) {
  const { alertHistory } = useAlertStore();
  const { cityDb } = useCityStore();
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const alertTypes = useMemo(() => {
    const types = new Set(alertHistory.map((a) => a.alertType));
    return [...types];
  }, [alertHistory]);

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return alertHistory;
    return alertHistory.filter((a) => a.alertType === typeFilter);
  }, [alertHistory, typeFilter]);

  if (alertHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="w-14 h-14 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center mb-4">
          <Clock size={24} className="text-[var(--text-muted)]" />
        </div>
        <div className="text-sm text-[var(--text-muted)]">No alert history</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <Filter size={14} className="text-[var(--text-muted)]" />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-md px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-green-400/50"
        >
          <option value="all">All Types</option>
          {alertTypes.map((type) => {
            const config = ALERT_TYPE_CONFIG[type] ?? ALERT_TYPE_CONFIG.Unknown;
            return (
              <option key={type} value={type}>{t(config.labelKey, lang)}</option>
            );
          })}
        </select>
        <span className="text-[10px] text-[var(--text-muted)] ml-auto">
          {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((alert) => {
          const config = ALERT_TYPE_CONFIG[alert.alertType] ?? ALERT_TYPE_CONFIG.Unknown;
          const Icon = config.icon;
          const cityNames = alert.cities
            .slice(0, 5)
            .map((c) => getCityName(c, lang, cityDb));
          const remaining = alert.cities.length - 5;

          return (
            <div
              key={`${alert.id}-${alert.timestamp}`}
              className="px-4 py-3 border-b border-[var(--border)] hover:bg-white/5 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Type badge */}
                <div className="flex items-center gap-1.5 mt-0.5 flex-shrink-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: config.color }}
                  />
                  <Icon size={14} style={{ color: config.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold" style={{ color: config.color }}>
                      {t(config.labelKey, lang)}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">
                      {relativeTime(alert.timestamp)}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {cityNames.join(', ')}
                    {remaining > 0 && (
                      <span className="text-[var(--text-muted)]"> +{remaining} more</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
