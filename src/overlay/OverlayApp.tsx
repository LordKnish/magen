import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import OverlayAlert from './OverlayAlert';

interface Alert {
  id: string;
  alertType: string;
  state: string;
  cities: string[];
  title: string | null;
  timestamp: number;
  expiresAt: number;
}

export default function OverlayApp() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const unlisten = listen<Alert[]>('overlay-alerts', (event) => {
      setAlerts(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleDismiss = async () => {
    setAlerts([]);
    try {
      const win = getCurrentWindow();
      await win.hide();
    } catch {
      // Window API may not be available in dev
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="h-screen w-screen bg-gray-950 flex items-center justify-center text-gray-600 text-sm">
        Waiting for alerts...
      </div>
    );
  }

  return <OverlayAlert alerts={alerts} onDismiss={handleDismiss} />;
}
