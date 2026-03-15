import { create } from 'zustand';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

interface Alert {
  id: string;
  alertType: string;
  state: 'Active' | 'EarlyWarning' | 'AllClear';
  cities: string[];
  title: string | null;
  timestamp: number;
  expiresAt: number;
}

type ConnectionStatus = 'Connected' | 'ConnectionIssue' | 'Disconnected' | 'GeoBlocked';

interface AlertStore {
  activeAlerts: Alert[];
  alertHistory: Alert[];
  connectionStatus: ConnectionStatus;
  initialized: boolean;
  init: () => Promise<void>;
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  activeAlerts: [],
  alertHistory: [],
  connectionStatus: 'Disconnected',
  initialized: false,
  init: async () => {
    if (get().initialized) return;
    set({ initialized: true });

    // Subscribe to events first so we don't miss any
    await listen<Alert>('new-alert', (e) => {
      set((s) => ({
        activeAlerts: [...s.activeAlerts, e.payload],
        alertHistory: [e.payload, ...s.alertHistory].slice(0, 100),
      }));
    });

    await listen<Alert[]>('alerts-updated', (e) => {
      set({ activeAlerts: e.payload });
    });

    await listen<Alert>('early-warning', (e) => {
      set((s) => ({ activeAlerts: [...s.activeAlerts, e.payload] }));
    });

    await listen<ConnectionStatus>('connection-status-changed', (e) => {
      set({ connectionStatus: e.payload });
    });

    // Load initial state after listeners are set up
    try {
      const [active, history, status] = await Promise.all([
        invoke<Alert[]>('get_active_alerts'),
        invoke<Alert[]>('get_alert_history'),
        invoke<ConnectionStatus>('get_connection_status'),
      ]);
      set({ activeAlerts: active, alertHistory: history, connectionStatus: status });
    } catch { /* initial load failure is ok */ }

    // Poll connection status every 10s as fallback
    setInterval(async () => {
      try {
        const status = await invoke<ConnectionStatus>('get_connection_status');
        if (status !== get().connectionStatus) {
          set({ connectionStatus: status });
        }
      } catch { /* ignore */ }
    }, 10000);
  },
}));
