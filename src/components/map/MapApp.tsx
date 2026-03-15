import { useState, useEffect, useCallback, useRef } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useProfileStore } from '../../store/profileStore';
import { useAlertStore } from '../../store/alertStore';
import { isRtl, type Language } from '../../i18n';
import MapContainer, { type MapHandle } from './MapContainer';
import StatusOverlay from './StatusOverlay';
import ProfileOverlay from './ProfileOverlay';
import AlertBanner from './AlertBanner';
import TimelineBar from './TimelineBar';
import SettingsPanel from './SettingsPanel';

const langMap: Record<string, Language> = {
  Hebrew: 'he', English: 'en', Russian: 'ru',
};

export default function MapApp() {
  const { settings } = useSettingsStore();
  const loadProfiles = useProfileStore(s => s.load);
  const { activeAlerts } = useAlertStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewingTimestamp, setViewingTimestamp] = useState<number | null>(null);
  const mapRef = useRef<MapHandle>(null);
  const prevAlertCountRef = useRef(0);
  const lang = langMap[settings.language] ?? 'he';

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  // Fly to new active alerts when they appear
  useEffect(() => {
    const currentActive = activeAlerts.filter(a => a.state === 'Active');
    if (currentActive.length > prevAlertCountRef.current && currentActive.length > 0) {
      // New alert(s) appeared — fly to the most recent one's first city
      const newest = currentActive[currentActive.length - 1];
      if (newest.cities.length > 0) {
        // If viewing history, snap back to present first
        if (viewingTimestamp !== null) {
          setViewingTimestamp(null);
        }
        mapRef.current?.flyToCity(newest.cities[0]);
      }
    }
    prevAlertCountRef.current = currentActive.length;
  }, [activeAlerts, viewingTimestamp]);

  // Auto-snap back to present when a new alert matches a monitored city
  useEffect(() => {
    if (viewingTimestamp === null) return;
    const profiles = settings.profiles ?? [];
    const monitoredCities = new Set<string>();
    for (const p of profiles) {
      for (const c of p.cities) monitoredCities.add(c);
    }
    if (monitoredCities.size === 0) return;

    for (const alert of activeAlerts) {
      if (alert.state === 'Active') {
        for (const city of alert.cities) {
          if (monitoredCities.has(city)) {
            setViewingTimestamp(null);
            return;
          }
        }
      }
    }
  }, [activeAlerts, viewingTimestamp, settings.profiles]);

  const goToPresent = useCallback(() => {
    setViewingTimestamp(null);
    mapRef.current?.resetView();
  }, []);

  const flyToCity = useCallback((cityName: string) => {
    mapRef.current?.flyToCity(cityName);
  }, []);

  return (
    <div
      dir={isRtl(lang) ? 'rtl' : 'ltr'}
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      <MapContainer ref={mapRef} viewingTimestamp={viewingTimestamp} />
      <StatusOverlay lang={lang} />
      <ProfileOverlay onOpenSettings={() => setSettingsOpen(true)} />
      {viewingTimestamp === null && <AlertBanner lang={lang} />}
      <TimelineBar
        lang={lang}
        viewingTimestamp={viewingTimestamp}
        onScrub={setViewingTimestamp}
        onGoToPresent={goToPresent}
        onFlyToCity={flyToCity}
      />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} lang={lang} />
    </div>
  );
}
