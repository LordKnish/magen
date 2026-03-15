import { Wifi, WifiOff, Globe } from 'lucide-react';
import { useAlertStore } from '../../store/alertStore';
import { t, type Language } from '../../i18n';

const STATUS_CONFIG = {
  Connected: { icon: Wifi, color: 'var(--alert-clear)', label: 'status.connected' },
  ConnectionIssue: { icon: Wifi, color: 'var(--alert-warning)', label: 'status.connectionIssue' },
  Disconnected: { icon: WifiOff, color: 'var(--text-muted)', label: 'status.disconnected' },
  GeoBlocked: { icon: Globe, color: 'var(--alert-early)', label: 'status.geoBlocked' },
} as const;

export default function StatusOverlay({ lang }: { lang: Language }) {
  const { connectionStatus, activeAlerts } = useAlertStore();
  const config = STATUS_CONFIG[connectionStatus] ?? STATUS_CONFIG.Disconnected;
  const Icon = config.icon;
  const activeCount = activeAlerts.filter(a => a.state === 'Active').length;

  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-xl"
        style={{
          background: 'var(--bg-overlay)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: config.color,
            boxShadow: `0 0 8px currentColor`,
            opacity: 0.8,
          }}
        />
        <Icon size={14} style={{ color: config.color }} />
        <span className="text-xs font-semibold" style={{ color: config.color }}>
          {t(config.label, lang)}
        </span>
      </div>

      {activeCount > 0 && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-xl"
          style={{
            background: 'rgba(225, 0, 0, 0.15)',
            borderColor: 'rgba(225, 0, 0, 0.3)',
          }}
        >
          <div className="w-2 h-2 rounded-full bg-[var(--alert-critical)] animate-pulse" />
          <span className="text-xs font-bold text-[var(--alert-critical)]">
            {activeCount} Active Alert{activeCount > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
