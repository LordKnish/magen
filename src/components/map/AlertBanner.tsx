import { useEffect, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { useAlertStore } from '../../store/alertStore';
import { ALERT_TYPE_CONFIG, STATE_COLORS } from '../../lib/alertTypes';
import { type Language, t } from '../../i18n';

export default function AlertBanner({ lang }: { lang: Language }) {
  const { activeAlerts } = useAlertStore();
  const [countdown, setCountdown] = useState<Record<string, number>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const counts: Record<string, number> = {};
      for (const alert of activeAlerts) {
        if (alert.state === 'Active') {
          const remaining = alert.expiresAt - now;
          if (remaining > 0) counts[alert.id] = remaining;
        }
      }
      setCountdown(counts);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeAlerts]);

  const visibleAlerts = activeAlerts.filter(a =>
    a.state === 'Active' || a.state === 'AllClear'
  ).slice(0, 3);

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-2 w-[360px] max-w-[calc(100vw-200px)]">
      {visibleAlerts.map((alert) => {
        const config = ALERT_TYPE_CONFIG[alert.alertType] ?? ALERT_TYPE_CONFIG.Unknown;
        const Icon = config.icon;
        const stateColor = STATE_COLORS[alert.state] ?? config.color;
        const isActive = alert.state === 'Active';
        const remaining = countdown[alert.id];

        return (
          <div
            key={alert.id}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-xl"
            style={{
              background: `${stateColor}15`,
              borderColor: `${stateColor}40`,
              animation: 'slideDown 300ms ease-out',
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${stateColor}25` }}
            >
              {alert.state === 'AllClear'
                ? <CircleCheck size={18} style={{ color: stateColor }} />
                : <Icon size={18} style={{ color: stateColor }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold" style={{ color: stateColor }}>
                {t(config.labelKey, lang)}
              </div>
              <div className="text-xs text-[var(--text-secondary)] truncate">
                {alert.cities.slice(0, 3).join(', ')}
                {alert.cities.length > 3 && ` +${alert.cities.length - 3}`}
              </div>
            </div>
            {isActive && remaining !== undefined && (
              <div className="text-2xl font-black tabular-nums" style={{ color: stateColor }}>
                {remaining}<span className="text-sm text-[var(--text-muted)]">s</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
