import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface HistoricalAlert {
  id: number;
  category: number;
  towns: string[];
  timestamp: number;
}

const CATEGORY_TO_TYPE: Record<number, string> = {
  0: 'Missiles',
  2: 'TerroristInfiltration',
  5: 'HostileAircraftIntrusion',
};

export function categoryToAlertType(cat: number): string {
  return CATEGORY_TO_TYPE[cat] ?? 'Unknown';
}

interface HistoryStore {
  data: HistoricalAlert[] | null;
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  data: null,
  loading: false,
  error: null,
  fetch: async () => {
    if (get().data || get().loading) return;
    set({ loading: true, error: null });
    try {
      const alerts = await invoke<HistoricalAlert[]>('fetch_historical_alerts');
      alerts.sort((a, b) => b.timestamp - a.timestamp);
      set({ data: alerts, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
}));
