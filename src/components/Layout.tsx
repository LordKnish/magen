import { useState } from 'react';
import { LayoutDashboard, Map, Clock, Settings } from 'lucide-react';
import { useAlertStore } from '../store/alertStore';
import { useSettingsStore } from '../store/settingsStore';
import { t, isRtl, type Language } from '../i18n';
import Dashboard from '../views/Dashboard';
import MapView from '../views/MapView';
import History from '../views/History';
import SettingsView from '../views/Settings';
import StatusBadge from './StatusBadge';

const langMap: Record<string, Language> = {
  Hebrew: 'he', English: 'en', Russian: 'ru',
};

const tabs = [
  { id: 'dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { id: 'map', icon: Map, labelKey: 'nav.map' },
  { id: 'history', icon: Clock, labelKey: 'nav.history' },
  { id: 'settings', icon: Settings, labelKey: 'nav.settings' },
] as const;

export default function Layout() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const { connectionStatus, activeAlerts } = useAlertStore();
  const { settings } = useSettingsStore();
  const lang = langMap[settings.language] ?? 'he';
  const hasAlerts = activeAlerts.some((a) => a.state === 'Active');

  return (
    <div
      dir={isRtl(lang) ? 'rtl' : 'ltr'}
      className="flex flex-col h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]"
    >
      {/* Tab bar */}
      <div className={`flex border-b ${hasAlerts ? 'border-red-900/50 bg-red-950/20' : 'border-[var(--border)] bg-[var(--bg-secondary)]'}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-center text-xs flex flex-col items-center gap-1 transition-colors ${
                isActive
                  ? hasAlerts ? 'text-red-400 border-b-2 border-red-400' : 'text-green-400 border-b-2 border-green-400'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Icon size={16} />
              {t(tab.labelKey, lang)}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'dashboard' && <Dashboard lang={lang} />}
        {activeTab === 'map' && <MapView lang={lang} />}
        {activeTab === 'history' && <History lang={lang} />}
        {activeTab === 'settings' && <SettingsView lang={lang} />}
      </div>

      {/* Status bar */}
      <div className="flex border-t border-[var(--border)] px-4 py-2 gap-3 text-xs">
        <StatusBadge status={connectionStatus} lang={lang} />
        <span className="text-[var(--text-muted)]">
          {t('status.monitoring', lang)}: {settings.selectedCities.length} {t('status.cities', lang)}
        </span>
      </div>
    </div>
  );
}
