import { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAlertStore } from '../../store/alertStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useCityStore } from '../../store/cityStore';
import { useHistoryStore, categoryToAlertType } from '../../store/historyStore';
import { ALERT_TYPE_CONFIG } from '../../lib/alertTypes';
import { invoke } from '@tauri-apps/api/core';

type PolygonsData = Record<string, [number, number][]>;

// How long an alert is considered "active" when scrubbing history
const ALERT_DISPLAY_WINDOW = 300; // 5 minutes

export interface MapHandle {
  flyToCity: (cityName: string) => void;
  resetView: () => void;
}

interface Props {
  viewingTimestamp: number | null; // null = live mode
}

const MapContainer = forwardRef<MapHandle, Props>(function MapContainer({ viewingTimestamp }, ref) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const polygonsRef = useRef<PolygonsData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [polygonsLoaded, setPolygonsLoaded] = useState(false);
  const { activeAlerts } = useAlertStore();
  const { settings } = useSettingsStore();
  const { zones } = useCityStore();
  const { data: historyData } = useHistoryStore();

  const isLive = viewingTimestamp === null;

  // Build city id → value lookup
  const cityById = useMemo(() => {
    const lookup: Record<string, { value: string; zone: string }> = {};
    for (const zone of zones) {
      for (const city of zone.cities) {
        lookup[String(city.id)] = { value: city.value || city.name, zone: zone.name };
      }
    }
    return lookup;
  }, [zones]);

  // Historical alert cities at the scrubbed timestamp
  const historicalAlertCities = useMemo(() => {
    if (isLive || !historyData || viewingTimestamp === null) return new Set<string>();
    const cities = new Set<string>();
    for (const alert of historyData) {
      if (alert.timestamp >= viewingTimestamp - ALERT_DISPLAY_WINDOW &&
          alert.timestamp <= viewingTimestamp + ALERT_DISPLAY_WINDOW) {
        for (const town of alert.towns) cities.add(town);
      }
    }
    return cities;
  }, [isLive, viewingTimestamp, historyData]);

  // Historical alert colors by city
  const historicalAlertColors = useMemo(() => {
    if (isLive || !historyData || viewingTimestamp === null) return new Map<string, string>();
    const colors = new Map<string, string>();
    for (const alert of historyData) {
      if (alert.timestamp >= viewingTimestamp - ALERT_DISPLAY_WINDOW &&
          alert.timestamp <= viewingTimestamp + ALERT_DISPLAY_WINDOW) {
        const alertType = categoryToAlertType(alert.category);
        const config = ALERT_TYPE_CONFIG[alertType] ?? ALERT_TYPE_CONFIG.Unknown;
        for (const town of alert.towns) {
          if (!colors.has(town)) colors.set(town, config.color);
        }
      }
    }
    return colors;
  }, [isLive, viewingTimestamp, historyData]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          },
        },
        layers: [{
          id: 'carto-dark-layer',
          type: 'raster',
          source: 'carto-dark',
          minzoom: 0,
          maxzoom: 20,
        }],
      },
      center: [34.8, 31.5],
      zoom: 7,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.current.on('load', () => setLoaded(true));

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Load polygons once
  useEffect(() => {
    if (polygonsRef.current) return;
    (async () => {
      try {
        const res = await fetch('/polygons.json');
        polygonsRef.current = await res.json();
      } catch {
        polygonsRef.current = await invoke<PolygonsData>('get_polygons');
      }
      setPolygonsLoaded(true);
    })();
  }, []);

  // Update zone layers whenever state changes
  useEffect(() => {
    if (!map.current || !loaded || !polygonsRef.current) return;
    const m = map.current;
    const polygons = polygonsRef.current;

    // Live mode: active alerts + all-clear + monitored zones
    // Historical mode: only historical alert zones (no monitored)
    const liveAlertCities = new Set<string>();
    const allClearCities = new Set<string>();
    if (isLive) {
      for (const alert of activeAlerts) {
        if (alert.state === 'Active') {
          for (const city of alert.cities) liveAlertCities.add(city);
        } else if (alert.state === 'AllClear') {
          for (const city of alert.cities) allClearCities.add(city);
        }
      }
    }

    // Monitored cities + profile colors (only in live mode)
    const monitoredCities = new Set<string>();
    const cityProfileColor: Record<string, string> = {};
    if (isLive) {
      const profiles = settings.profiles ?? [];
      for (const profile of profiles) {
        for (const city of profile.cities) {
          monitoredCities.add(city);
          if (!cityProfileColor[city]) cityProfileColor[city] = profile.color;
        }
      }
      if (monitoredCities.size === 0) {
        for (const city of settings.selectedCities) monitoredCities.add(city);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const features: any[] = Object.entries(polygons).map(([id, coords]) => {
      const city = cityById[id];
      const cityValue = city?.value;

      let isAlert = false;
      let isAllClear = false;
      let isMonitored = false;
      let color = '#131B2E';

      if (isLive) {
        isAlert = cityValue ? liveAlertCities.has(cityValue) : false;
        isAllClear = cityValue ? allClearCities.has(cityValue) : false;
        isMonitored = cityValue ? monitoredCities.has(cityValue) : false;
        if (isAlert) {
          color = '#E10000';
        } else if (isAllClear) {
          color = '#00A64C';
        } else if (isMonitored) {
          color = cityProfileColor[cityValue!] ?? '#00A64C';
        }
      } else {
        // Historical mode — only show zones that had alerts at this time
        isAlert = cityValue ? historicalAlertCities.has(cityValue) : false;
        if (isAlert && cityValue) {
          color = historicalAlertColors.get(cityValue) ?? '#E10000';
        }
      }

      return {
        type: 'Feature',
        properties: { id, isAlert, isAllClear, isMonitored, color },
        geometry: {
          type: 'Polygon',
          coordinates: [coords.map(([lat, lng]: [number, number]) => [lng, lat])],
        },
      };
    });

    const geojson = { type: 'FeatureCollection', features };

    // Remove existing layers/source
    if (m.getLayer('zones-fill')) m.removeLayer('zones-fill');
    if (m.getLayer('zones-border')) m.removeLayer('zones-border');
    if (m.getSource('zones')) m.removeSource('zones');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    m.addSource('zones', { type: 'geojson', data: geojson as any });

    m.addLayer({
      id: 'zones-fill',
      type: 'fill',
      source: 'zones',
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': [
          'case',
          ['get', 'isAlert'], 0.4,
          ['get', 'isAllClear'], 0.25,
          ['get', 'isMonitored'], 0.10,
          0.05,
        ],
      },
    });

    m.addLayer({
      id: 'zones-border',
      type: 'line',
      source: 'zones',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': [
          'case',
          ['get', 'isAlert'], 2,
          ['get', 'isAllClear'], 1.5,
          ['get', 'isMonitored'], 1.5,
          0.5,
        ],
        'line-opacity': [
          'case',
          ['get', 'isAlert'], 0.4,
          ['get', 'isAllClear'], 0.25,
          ['get', 'isMonitored'], 0.10,
          0.05,
        ],
      },
    });
  }, [loaded, polygonsLoaded, zones, activeAlerts, settings.profiles, settings.selectedCities, isLive, historicalAlertCities, historicalAlertColors, cityById]);

  // Expose flyToCity to parent via ref
  useImperativeHandle(ref, () => ({
    flyToCity: (cityName: string) => {
      if (!map.current) return;
      for (const zone of zones) {
        for (const city of zone.cities) {
          const val = city.value || city.name;
          if (val === cityName || city.name === cityName) {
            if (city.lat && city.lng) {
              map.current.flyTo({
                center: [city.lng, city.lat],
                zoom: 11,
                duration: 1000,
              });
              return;
            }
          }
        }
      }
    },
    resetView: () => {
      if (!map.current) return;
      map.current.flyTo({
        center: [34.8, 31.5],
        zoom: 7,
        duration: 800,
      });
    },
  }), [zones]);

  return (
    <div
      ref={mapContainer}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--bg-base)',
      }}
    />
  );
});

export default MapContainer;
