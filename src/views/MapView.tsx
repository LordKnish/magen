import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAlertStore } from '../store/alertStore';
import { useSettingsStore } from '../store/settingsStore';
import { useCityStore } from '../store/cityStore';
import { t, type Language } from '../i18n';

// Fix default marker icon paths for bundled Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type PolygonsData = Record<string, [number, number][]>;

const greenIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'leaflet-marker-green',
});

export default function MapView({ lang }: { lang: Language }) {
  const [polygons, setPolygons] = useState<PolygonsData | null>(null);
  const { activeAlerts } = useAlertStore();
  const { settings } = useSettingsStore();
  const { zones } = useCityStore();

  useEffect(() => {
    fetch('/polygons.json')
      .then((r) => r.json())
      .then((data: PolygonsData) => setPolygons(data))
      .catch(() => {
        // Fallback: try Tauri command
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke<PolygonsData>('get_polygons').then(setPolygons).catch(() => {});
        });
      });
  }, []);

  // Build zone lookup
  const zoneMap = useMemo(() => {
    const map: Record<string, { name: string; name_en: string; name_ru: string; cities: Array<{ name: string; name_en: string; name_ru: string; countdown: number; lat: number; lng: number; value: string }> }> = {};
    for (const zone of zones) {
      map[zone.name] = {
        name: zone.name,
        name_en: zone.name_en,
        name_ru: zone.name_ru,
        cities: zone.cities.map((c) => ({
          name: c.name,
          name_en: c.name_en,
          name_ru: c.name_ru,
          countdown: c.countdown,
          lat: c.lat ?? 0,
          lng: c.lng ?? 0,
          value: c.value || c.name,
        })),
      };
    }
    return map;
  }, [zones]);

  // Get active alert city names
  const alertCitySet = useMemo(() => {
    const s = new Set<string>();
    for (const alert of activeAlerts) {
      if (alert.state === 'Active') {
        for (const city of alert.cities) s.add(city);
      }
    }
    return s;
  }, [activeAlerts]);

  // Find which zones are actively alerting
  const activeZoneNames = useMemo(() => {
    const names = new Set<string>();
    for (const zone of zones) {
      const hasAlert = zone.cities.some((c) => alertCitySet.has(c.value || c.name));
      if (hasAlert) {
        names.add(zone.name);
      }
    }
    return names;
  }, [zones, alertCitySet]);

  // Find which zones contain the user's selected cities
  const selectedZoneNames = useMemo(() => {
    const selectedSet = new Set(settings.selectedCities);
    const names = new Set<string>();
    for (const zone of zones) {
      const hasSelected = zone.cities.some((c) => selectedSet.has(c.value || c.name));
      if (hasSelected) {
        names.add(zone.name);
      }
    }
    return names;
  }, [zones, settings.selectedCities]);

  // Build city ID lookup maps
  const cityIdMap = useMemo(() => {
    const byId: Record<string, { name: string; name_en: string; name_ru: string; value: string; zone: string; countdown: number }> = {};
    for (const zone of zones) {
      for (const city of zone.cities) {
        byId[String(city.id)] = {
          name: city.name,
          name_en: city.name_en,
          name_ru: city.name_ru,
          value: city.value || city.name,
          zone: zone.name,
          countdown: city.countdown,
        };
      }
    }
    return byId;
  }, [zones]);

  // Build GeoJSON features from polygons — matched per-city by ID
  const geoJsonData = useMemo(() => {
    if (!polygons) return null;
    const selectedSet = new Set(settings.selectedCities);

    const features = Object.entries(polygons).map(([id, coords]) => {
      const city = cityIdMap[id];
      const cityValue = city?.value;
      const zoneName = city?.zone ?? null;

      return {
        type: 'Feature' as const,
        properties: {
          id,
          zoneName,
          cityValue,
          isActive: cityValue ? alertCitySet.has(cityValue) : false,
          isSelected: cityValue ? selectedSet.has(cityValue) : false,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [coords.map(([lat, lng]) => [lng, lat])],
        },
      };
    });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [polygons, cityIdMap, alertCitySet, settings.selectedCities]);

  // Selected city markers
  const selectedCityMarkers = useMemo(() => {
    const markers: Array<{ lat: number; lng: number; name: string; countdown: number }> = [];
    const selectedSet = new Set(settings.selectedCities);
    for (const zone of zones) {
      for (const city of zone.cities) {
        const val = city.value || city.name;
        if (selectedSet.has(val)) {
          const lat = city.lat ?? 0;
          const lng = city.lng ?? 0;
          if (lat !== 0 && lng !== 0) {
            const displayName = lang === 'he' ? city.name : lang === 'ru' ? (city.name_ru || city.name_en || city.name) : (city.name_en || city.name);
            markers.push({ lat, lng, name: displayName, countdown: city.countdown });
          }
        }
      }
    }
    return markers;
  }, [zones, settings.selectedCities, lang]);

  const getZoneDisplayName = (zoneName: string): string => {
    const zone = zoneMap[zoneName];
    if (!zone) return zoneName;
    if (lang === 'he') return zone.name;
    if (lang === 'ru') return zone.name_ru || zone.name_en || zone.name;
    return zone.name_en || zone.name;
  };

  const getZoneCityList = (zoneName: string): string[] => {
    const zone = zoneMap[zoneName];
    if (!zone) return [];
    return zone.cities.map((c) => {
      if (lang === 'he') return c.name;
      if (lang === 'ru') return c.name_ru || c.name_en || c.name;
      return c.name_en || c.name;
    });
  };

  const getZoneMinCountdown = (zoneName: string): number => {
    const zone = zoneMap[zoneName];
    if (!zone) return 0;
    return Math.min(...zone.cities.map((c) => c.countdown));
  };

  return (
    <div className="h-full w-full relative">
      <style>{`
        .leaflet-marker-green {
          filter: hue-rotate(120deg);
        }
        @keyframes pulse-red {
          0%, 100% { fill-opacity: 0.5; }
          50% { fill-opacity: 0.2; }
        }
        .alert-zone-active {
          animation: pulse-red 1.5s ease-in-out infinite;
        }
        .leaflet-container {
          background: var(--bg-primary) !important;
        }
      `}</style>
      <MapContainer
        center={[31.5, 34.8]}
        zoom={7}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {geoJsonData && (
          <GeoJSON
            key={`${alertCitySet.size}-${settings.selectedCities.length}`}
            data={geoJsonData as GeoJSON.FeatureCollection}
            style={(feature) => {
              const isActive = feature?.properties?.isActive;
              const isSelected = feature?.properties?.isSelected;
              if (isActive) {
                return {
                  color: '#ef4444',
                  weight: 2,
                  fillColor: '#ef4444',
                  fillOpacity: 0.4,
                  className: 'alert-zone-active',
                };
              }
              if (isSelected) {
                return {
                  color: '#4ade80',
                  weight: 1.5,
                  fillColor: '#1a3a2a',
                  fillOpacity: 0.35,
                  className: '',
                };
              }
              return {
                color: '#3a4a58',
                weight: 0.5,
                fillColor: '#1e2a35',
                fillOpacity: 0.3,
                className: '',
              };
            }}
            onEachFeature={(feature, layer) => {
              const polyId = feature.properties?.id;
              const zoneName = feature.properties?.zoneName;
              const isActive = feature.properties?.isActive;
              const isSelected = feature.properties?.isSelected;

              if (polyId && cityIdMap[polyId]) {
                const cityInfo = cityIdMap[polyId];
                const cityDisplay = lang === 'he' ? cityInfo.name
                  : lang === 'ru' ? (cityInfo.name_ru || cityInfo.name_en || cityInfo.name)
                  : (cityInfo.name_en || cityInfo.name);
                const zoneDisplay = zoneName ? getZoneDisplayName(zoneName) : '';

                layer.bindPopup(`
                  <div style="min-width: 140px; font-family: system-ui, sans-serif;">
                    <div style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">
                      ${cityDisplay}
                      ${isActive ? '<span style="color: #ef4444; font-size: 12px;"> ⚠ ALERT</span>' : ''}
                      ${isSelected ? '<span style="color: #4ade80; font-size: 12px;"> ✓ Monitored</span>' : ''}
                    </div>
                    <div style="font-size: 11px; color: #888; margin-bottom: 2px;">${zoneDisplay}</div>
                    <div style="font-size: 12px;">${t('alert.shelter', lang)}: <strong>${cityInfo.countdown}s</strong></div>
                  </div>
                `);
              }
            }}
          />
        )}

        {selectedCityMarkers.map((m, i) => (
          <Marker key={i} position={[m.lat, m.lng]} icon={greenIcon}>
            <Popup>
              <strong>{m.name}</strong><br />
              {t('alert.shelter', lang)}: {m.countdown}s
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {!polygons && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-[1000]">
          <div className="text-[var(--text-muted)] text-sm">{t('nav.map', lang)}...</div>
        </div>
      )}
    </div>
  );
}
