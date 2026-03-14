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

  // Build GeoJSON features from polygons
  const geoJsonData = useMemo(() => {
    if (!polygons) return null;

    const features = Object.entries(polygons).map(([id, coords]) => {
      // Find which zone this polygon belongs to by bounding box overlap with city positions
      let matchedZone: string | null = null;
      const lats = coords.map((c) => c[0]);
      const lngs = coords.map((c) => c[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      for (const zone of zones) {
        for (const city of zone.cities) {
          const cityLat = city.lat ?? 0;
          const cityLng = city.lng ?? 0;
          if (cityLat === 0 && cityLng === 0) continue;
          if (cityLat >= minLat && cityLat <= maxLat && cityLng >= minLng && cityLng <= maxLng) {
            matchedZone = zone.name;
            break;
          }
        }
        if (matchedZone) break;
      }

      return {
        type: 'Feature' as const,
        properties: {
          id,
          zoneName: matchedZone,
          isActive: matchedZone ? activeZoneNames.has(matchedZone) : false,
          isSelected: matchedZone ? selectedZoneNames.has(matchedZone) : false,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [coords.map(([lat, lng]) => [lng, lat])], // GeoJSON uses [lng, lat]
        },
      };
    });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [polygons, zones, activeZoneNames, selectedZoneNames]);

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
            key={`${activeZoneNames.size}-${selectedZoneNames.size}`}
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
                color: '#2a3540',
                weight: 0.3,
                fillColor: '#1a2028',
                fillOpacity: 0.15,
                className: '',
              };
            }}
            onEachFeature={(feature, layer) => {
              const zoneName = feature.properties?.zoneName;
              if (zoneName) {
                const displayName = getZoneDisplayName(zoneName);
                const cities = getZoneCityList(zoneName);
                const countdown = getZoneMinCountdown(zoneName);
                const isActive = feature.properties?.isActive;
                const cityListHtml = cities.slice(0, 10).map((c) => `<li>${c}</li>`).join('');
                const moreCount = cities.length > 10 ? `<li>...+${cities.length - 10} more</li>` : '';

                layer.bindPopup(`
                  <div style="min-width: 150px;">
                    <strong>${displayName}</strong>
                    ${isActive ? '<span style="color: #ef4444; margin-left: 8px;">ACTIVE</span>' : ''}
                    <br/>
                    <small>${t('alert.shelter', lang)}: ${countdown}s</small>
                    <ul style="margin: 4px 0; padding-left: 16px; font-size: 12px;">
                      ${cityListHtml}${moreCount}
                    </ul>
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
