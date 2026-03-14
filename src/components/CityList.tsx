import { type Language, t } from '../i18n';

interface Props {
  cities: string[];
  userCities: string[];
  lang: Language;
  cityDb: Record<string, { name_en: string; name_ru: string; countdown: number }>;
}

function getCityName(hebrewName: string, lang: Language, cityDb: Props['cityDb']): string {
  const city = cityDb[hebrewName];
  if (!city) return hebrewName;
  if (lang === 'he') return hebrewName;
  if (lang === 'ru') return city.name_ru || city.name_en || hebrewName;
  return city.name_en || hebrewName;
}

export default function CityList({ cities, userCities, lang, cityDb }: Props) {
  const yours = cities.filter((c) => userCities.includes(c));
  const others = cities.filter((c) => !userCities.includes(c));

  return (
    <div className="bg-black/20 rounded-md max-h-48 overflow-y-auto">
      {yours.length > 0 && (
        <>
          <div className="px-3 py-1.5 bg-red-950/50 text-[10px] text-red-400 uppercase tracking-wider sticky top-0">
            {t('alert.yourCities', lang)}
          </div>
          {yours.map((city) => (
            <div key={city} className="px-3 py-1.5 border-b border-white/5 flex justify-between bg-red-950/20">
              <span className="text-sm text-red-300 font-semibold">{getCityName(city, lang, cityDb)}</span>
              <span className="text-xs text-red-400/60">{cityDb[city]?.countdown ?? '?'}s</span>
            </div>
          ))}
        </>
      )}
      {others.length > 0 && (
        <>
          <div className="px-3 py-1.5 bg-black/30 text-[10px] text-[var(--text-muted)] uppercase tracking-wider sticky top-0">
            {t('alert.allAffected', lang)}
          </div>
          {others.map((city) => (
            <div key={city} className="px-3 py-1.5 border-b border-white/5 flex justify-between">
              <span className="text-xs text-[var(--text-secondary)]">{getCityName(city, lang, cityDb)}</span>
              <span className="text-xs text-[var(--text-muted)]">{cityDb[city]?.countdown ?? '?'}s</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
