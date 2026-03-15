import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { AlertProfile } from './profileStore';

interface Settings {
  selectedCities: string[];
  profiles: AlertProfile[];
  language: 'Hebrew' | 'English' | 'Russian';
  theme: 'Auto' | 'Light' | 'Dark';
  soundRepeat: 'Off' | 'Once' | 'Twice' | 'Thrice' | 'Continuous';
  overlayEnabled: boolean;
  autoStart: boolean;
  proxyUrl: string | null;
  notifyAllClear: boolean;
  notifyEarlyWarning: boolean;
  showAllClear: boolean;
  showEarlyWarning: boolean;
  firstRunComplete: boolean;
}

interface SettingsStore {
  settings: Settings;
  loading: boolean;
  load: () => Promise<void>;
  save: (settings: Partial<Settings>) => Promise<void>;
}

const defaultSettings: Settings = {
  selectedCities: [],
  profiles: [],
  language: 'Hebrew',
  theme: 'Auto',
  soundRepeat: 'Twice',
  overlayEnabled: true,
  autoStart: false,
  proxyUrl: null,
  notifyAllClear: true,
  notifyEarlyWarning: true,
  showAllClear: true,
  showEarlyWarning: true,
  firstRunComplete: false,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  loading: true,
  load: async () => {
    try {
      const settings = await invoke<Settings>('get_settings');
      set({ settings: { ...defaultSettings, ...settings }, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  save: async (partial) => {
    const merged = { ...get().settings, ...partial };
    await invoke('save_settings', { settings: merged });
    set({ settings: merged });
  },
}));
