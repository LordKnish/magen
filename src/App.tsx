import { useEffect } from 'react';
import { useAlertStore } from './store/alertStore';
import { useSettingsStore } from './store/settingsStore';
import { useCityStore } from './store/cityStore';
import Layout from './components/Layout';
import Onboarding from './views/Onboarding';

export default function App() {
  const initAlerts = useAlertStore((s) => s.init);
  const loadSettings = useSettingsStore((s) => s.load);
  const loadCities = useCityStore((s) => s.load);
  const loading = useSettingsStore((s) => s.loading);
  const firstRunComplete = useSettingsStore((s) => s.settings.firstRunComplete);

  useEffect(() => {
    initAlerts();
    loadSettings();
    loadCities();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }

  if (!firstRunComplete) {
    return <Onboarding />;
  }

  return <Layout />;
}
