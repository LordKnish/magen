import { useState, useMemo, useCallback } from 'react';
import { Search, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useCityStore } from '../store/cityStore';
import { type Language, t } from '../i18n';

interface City {
  id: number;
  name: string;
  name_en: string;
  name_ru: string;
  zone: string;
  zone_en: string;
  zone_ru: string;
  countdown: number;
  value: string;
}

interface Zone {
  name: string;
  name_en: string;
  name_ru: string;
  cities: City[];
}

interface Props {
  selectedCities: string[];
  onChange: (cities: string[]) => void;
  lang: Language;
}

function getCityDisplayName(city: City, lang: Language): string {
  if (lang === 'he') return city.name;
  if (lang === 'ru') return city.name_ru || city.name_en || city.name;
  return city.name_en || city.name;
}

function getZoneDisplayName(zone: Zone, lang: Language): string {
  if (lang === 'he') return zone.name;
  if (lang === 'ru') return zone.name_ru || zone.name_en || zone.name;
  return zone.name_en || zone.name;
}

function getCityValue(city: City): string {
  return city.value || city.name;
}

export default function CityFilter({ selectedCities, onChange, lang }: Props) {
  const [search, setSearch] = useState('');
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const { zones, loaded } = useCityStore();

  const selectedSet = useMemo(() => new Set(selectedCities), [selectedCities]);

  const filteredZones = useMemo(() => {
    if (!search.trim()) return zones;
    const q = search.toLowerCase();
    return zones
      .map((zone) => ({
        ...zone,
        cities: zone.cities.filter((c) =>
          getCityDisplayName(c, lang).toLowerCase().includes(q) ||
          getZoneDisplayName(zone, lang).toLowerCase().includes(q)
        ),
      }))
      .filter((z) => z.cities.length > 0);
  }, [zones, search, lang]);

  const toggleCity = useCallback((cityValue: string) => {
    if (selectedSet.has(cityValue)) {
      onChange(selectedCities.filter((c) => c !== cityValue));
    } else {
      onChange([...selectedCities, cityValue]);
    }
  }, [selectedCities, selectedSet, onChange]);

  const toggleZone = useCallback((zone: Zone) => {
    const zoneValues = zone.cities.map(getCityValue);
    const allSelected = zoneValues.every((v) => selectedSet.has(v));
    if (allSelected) {
      onChange(selectedCities.filter((c) => !zoneValues.includes(c)));
    } else {
      const newSet = new Set([...selectedCities, ...zoneValues]);
      onChange([...newSet]);
    }
  }, [selectedCities, selectedSet, onChange]);

  const toggleExpanded = (zoneName: string) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneName)) next.delete(zoneName);
      else next.add(zoneName);
      return next;
    });
  };

  if (!loaded) {
    return <div className="text-sm text-[var(--text-muted)] py-4 text-center">Loading cities...</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('settings.citiesSearch', lang)}
          className="w-full pl-8 pr-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-green-400/50"
        />
      </div>

      <div className="text-xs text-[var(--text-muted)]">
        {selectedCities.length} selected
      </div>

      {/* Zone list */}
      <div className="max-h-64 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--bg-secondary)]">
        {filteredZones.map((zone) => {
          const zoneValues = zone.cities.map(getCityValue);
          const allSelected = zoneValues.every((v) => selectedSet.has(v));
          const someSelected = zoneValues.some((v) => selectedSet.has(v));
          const expanded = expandedZones.has(zone.name) || search.trim().length > 0;

          return (
            <div key={zone.name}>
              {/* Zone header */}
              <div
                className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-primary)] border-b border-[var(--border)] cursor-pointer hover:bg-white/5"
                onClick={() => toggleExpanded(zone.name)}
              >
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleZone(zone); }}
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    allSelected ? 'bg-green-500 border-green-500' : someSelected ? 'bg-green-500/30 border-green-500' : 'border-[var(--text-muted)]'
                  }`}
                >
                  {allSelected && <Check size={10} className="text-white" />}
                </button>
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  {getZoneDisplayName(zone, lang)}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] ml-auto">
                  {zoneValues.filter((v) => selectedSet.has(v)).length}/{zone.cities.length}
                </span>
              </div>

              {/* Cities */}
              {expanded && zone.cities.map((city) => {
                const val = getCityValue(city);
                const checked = selectedSet.has(val);
                return (
                  <div
                    key={city.id}
                    className="flex items-center gap-2 px-6 py-1.5 border-b border-white/5 cursor-pointer hover:bg-white/5"
                    onClick={() => toggleCity(val)}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                      checked ? 'bg-green-500 border-green-500' : 'border-[var(--text-muted)]'
                    }`}>
                      {checked && <Check size={8} className="text-white" />}
                    </div>
                    <span className="text-xs text-[var(--text-primary)]">{getCityDisplayName(city, lang)}</span>
                    <span className="text-[10px] text-[var(--text-muted)] ml-auto">{city.countdown}s</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
