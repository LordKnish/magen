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

// Custom green marker via SVG data URI
const greenMarkerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
  <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#4ade80" stroke="#1a3a2a" stroke-width="1.5"/>
  <circle cx="12" cy="11" r="4" fill="#0a0f1a"/>
</svg>`)}`;

const greenIcon = new L.Icon({
  iconUrl: greenMarkerSvg,
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -36],
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
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke<PolygonsData>('get_polygons').then(setPolygons).catch(() => {});
        });
      });
  }, []);

  // Build zone lookup
  const zoneMap = useMemo(() => {
    const map: Record<string, { name: string; name_en: string; name_ru: string }> = {};
    for (const zone of zones) {
      map[zone.name] = { name: zone.name, name_en: zone.name_en, name_ru: zone.name_ru };
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

  // Build city ID lookup
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

  const getCityDisplayName = (city: { name: string; name_en: string; name_ru: string }): string => {
    if (lang === 'he') return city.name;
    if (lang === 'ru') return city.name_ru || city.name_en || city.name;
    return city.name_en || city.name;
  };

  const getZoneDisplayName = (zoneName: string): string => {
    const zone = zoneMap[zoneName];
    if (!zone) return zoneName;
    return getCityDisplayName(zone);
  };

  // Build GeoJSON features from polygons — matched per-city by ID
  const geoJsonData = useMemo(() => {
    if (!polygons) return null;
    const selectedSet = new Set(settings.selectedCities);

    const features = Object.entries(polygons).map(([id, coords]) => {
      const city = cityIdMap[id];
      const cityValue = city?.value;

      return {
        type: 'Feature' as const,
        properties: {
          id,
          zoneName: city?.zone ?? null,
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

    return { type: 'FeatureCollection' as const, features };
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
            markers.push({ lat, lng, name: getCityDisplayName(city), countdown: city.countdown });
          }
        }
      }
    }
    return markers;
  }, [zones, settings.selectedCities, lang]);

  return (
    <div className="h-full w-full relative">
      <style>{`
        .leaflet-marker-green {
          filter: hue-rotate(120deg);
        }
        @keyframes magen-pulse {
          0%, 100% { fill-opacity: 0.45; stroke-opacity: 1; }
          50% { fill-opacity: 0.15; stroke-opacity: 0.5; }
        }
        .magen-zone-alert {
          animation: magen-pulse 1.5s ease-in-out infinite;
        }
        .leaflet-container {
          background: #0a0f1a !important;
        }
        /* Override Leaflet popup to match Magen design */
        .leaflet-popup-content-wrapper {
          background: #111827 !important;
          border: 1px solid #1e2d3d !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
          color: #e2e8f0 !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans Hebrew', sans-serif !important;
          font-size: 13px !important;
          line-height: 1.4 !important;
        }
        .leaflet-popup-tip {
          background: #111827 !important;
          border: 1px solid #1e2d3d !important;
          box-shadow: none !important;
        }
        .leaflet-popup-close-button {
          color: #64748b !important;
          font-size: 18px !important;
          padding: 4px 8px !important;
        }
        .leaflet-popup-close-button:hover {
          color: #e2e8f0 !important;
        }
        /* Attribution */
        .leaflet-control-attribution {
          background: rgba(10,15,26,0.8) !important;
          color: #64748b !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a {
          color: #94a3b8 !important;
        }
        /* Zoom controls */
        .leaflet-control-zoom a {
          background: #111827 !important;
          color: #e2e8f0 !important;
          border-color: #1e2d3d !important;
        }
        .leaflet-control-zoom a:hover {
          background: #1e2d3d !important;
        }
      `}</style>
      <MapContainer
        center={[31.5, 34.8]}
        zoom={7}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
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
                  className: 'magen-zone-alert',
                };
              }
              if (isSelected) {
                return {
                  color: '#4ade80',
                  weight: 1.5,
                  fillColor: '#4ade80',
                  fillOpacity: 0.15,
                  className: '',
                };
              }
              return {
                color: '#1e2d3d',
                weight: 0.5,
                fillColor: '#0d1117',
                fillOpacity: 0.25,
                className: '',
              };
            }}
            onEachFeature={(feature, layer) => {
              const polyId = feature.properties?.id;
              if (!polyId || !cityIdMap[polyId]) return;

              const cityInfo = cityIdMap[polyId];
              const isActive = feature.properties?.isActive;
              const isSelected = feature.properties?.isSelected;
              const zoneName = feature.properties?.zoneName;
              const cityName = getCityDisplayName(cityInfo);
              const zoneDisplayName = zoneName ? getZoneDisplayName(zoneName) : '';

              // Status badge
              let statusHtml = '';
              if (isActive) {
                statusHtml = `<span style="display:inline-block;background:#ef4444;color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:6px;letter-spacing:0.5px;">ALERT</span>`;
              } else if (isSelected) {
                statusHtml = `<span style="display:inline-block;background:#4ade8020;color:#4ade80;font-size:10px;font-weight:600;padding:1px 6px;border-radius:4px;margin-left:6px;border:1px solid #4ade8040;">MONITORED</span>`;
              }

              layer.bindPopup(`
                <div style="padding:12px 14px;min-width:160px;">
                  <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;">
                    <span style="font-size:14px;font-weight:700;color:#e2e8f0;">${cityName}</span>
                    ${statusHtml}
                  </div>
                  <div style="font-size:11px;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${zoneDisplayName}</div>
                  <div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:#0a0f1a;border-radius:6px;border:1px solid #1e2d3d;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span style="font-size:12px;color:#94a3b8;">${t('alert.shelter', lang)}</span>
                    <span style="font-size:14px;font-weight:800;color:#e2e8f0;margin-left:auto;">${cityInfo.countdown}<span style="font-size:11px;color:#64748b;">s</span></span>
                  </div>
                </div>
              `, { className: 'magen-popup' });
            }}
          />
        )}

        {selectedCityMarkers.map((m, i) => (
          <Marker key={i} position={[m.lat, m.lng]} icon={greenIcon}>
            <Popup>
              <div style={{ padding: '10px 12px', minWidth: '120px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>{m.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: '#0a0f1a', borderRadius: '6px', border: '1px solid #1e2d3d' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{t('alert.shelter', lang)}</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#e2e8f0', marginLeft: 'auto' }}>{m.countdown}<span style={{ fontSize: '11px', color: '#64748b' }}>s</span></span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {!polygons && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-[1000]">
          <div className="text-[var(--text-muted)] text-sm animate-pulse">Loading map data...</div>
        </div>
      )}
    </div>
  );
}
