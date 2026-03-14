import { ALERT_TYPE_CONFIG, STATE_COLORS } from '../lib/alertTypes';
import CityList from './CityList';
import CountdownTimer from './CountdownTimer';
import { type Language, t } from '../i18n';

interface Alert {
  id: string;
  alertType: string;
  state: string;
  cities: string[];
  title: string | null;
  timestamp: number;
}

interface Props {
  alert: Alert;
  userCities: string[];
  lang: Language;
  cityDb: Record<string, { name_en: string; name_ru: string; countdown: number }>;
}

export default function AlertCard({ alert, userCities, lang, cityDb }: Props) {
  const config = ALERT_TYPE_CONFIG[alert.alertType] ?? ALERT_TYPE_CONFIG.Unknown;
  const stateColor = STATE_COLORS[alert.state] ?? STATE_COLORS.Active;
  const Icon = config.icon;
  const minCountdown = Math.min(
    ...alert.cities.map((c) => cityDb[c]?.countdown ?? 90)
  );

  return (
    <div
      className="mx-3 my-2 p-3 rounded-lg border-2"
      style={{
        borderColor: stateColor,
        backgroundColor: `${stateColor}10`,
        boxShadow: alert.state === 'Active' ? `0 0 15px ${stateColor}30` : undefined,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={20} color={stateColor} />
          <div>
            <div className="text-sm font-bold" style={{ color: stateColor }}>
              {t(config.labelKey, lang)}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {alert.cities.length} {t('status.cities', lang)}
            </div>
          </div>
        </div>
        {alert.state === 'Active' && <CountdownTimer seconds={minCountdown} lang={lang} />}
      </div>
      <CityList cities={alert.cities} userCities={userCities} lang={lang} cityDb={cityDb} />
    </div>
  );
}
