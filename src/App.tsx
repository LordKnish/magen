import { useEffect } from 'react';
import { useAlertStore } from './store/alertStore';
import { useSettingsStore } from './store/settingsStore';
import Layout from './components/Layout';

export default function App() {
  const initAlerts = useAlertStore((s) => s.init);
  const loadSettings = useSettingsStore((s) => s.load);
  const loading = useSettingsStore((s) => s.loading);

  useEffect(() => {
    initAlerts();
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }

  return <Layout />;
}
