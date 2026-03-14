import { CircleCheck } from 'lucide-react';
import { useAlertStore } from '../store/alertStore';
import { useSettingsStore } from '../store/settingsStore';
import { useCityStore } from '../store/cityStore';
import AlertCard from '../components/AlertCard';
import { type Language, t } from '../i18n';

export default function Dashboard({ lang }: { lang: Language }) {
  const { activeAlerts } = useAlertStore();
  const { settings } = useSettingsStore();
  const { cityDb } = useCityStore();
  const active = activeAlerts.filter((a) => a.state === 'Active');
  const earlyWarnings = activeAlerts.filter((a) => a.state === 'EarlyWarning');
  const allClears = activeAlerts.filter((a) => a.state === 'AllClear');
  const hasAlerts = active.length > 0 || earlyWarnings.length > 0;

  if (!hasAlerts && allClears.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="w-16 h-16 rounded-full bg-green-950 border-2 border-green-400 flex items-center justify-center mb-4">
          <CircleCheck size={28} className="text-green-400" />
        </div>
        <div className="text-xl font-bold mb-1">{t('status.allClear', lang)}</div>
        <div className="text-sm text-[var(--text-muted)]">{t('status.noAlerts', lang)}</div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full pb-2">
      {earlyWarnings.map((a) => (
        <AlertCard key={a.id} alert={a} userCities={settings.selectedCities} lang={lang} cityDb={cityDb} />
      ))}
      {active.map((a) => (
        <AlertCard key={a.id} alert={a} userCities={settings.selectedCities} lang={lang} cityDb={cityDb} />
      ))}
      {allClears.map((a) => (
        <AlertCard key={a.id} alert={a} userCities={settings.selectedCities} lang={lang} cityDb={cityDb} />
      ))}
    </div>
  );
}
