import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface City {
  id: number;
  name: string;
  name_en: string;
  name_ru: string;
  zone: string;
  zone_en: string;
  zone_ru: string;
  countdown: number;
  value: string;
}

interface Zone {
  name: string;
  name_en: string;
  name_ru: string;
  cities: City[];
}

export type CityDb = Record<string, { name_en: string; name_ru: string; countdown: number }>;

interface CityStore {
  zones: Zone[];
  cityDb: CityDb;
  loaded: boolean;
  load: () => Promise<void>;
}

export const useCityStore = create<CityStore>((set, get) => ({
  zones: [],
  cityDb: {},
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const zones = await invoke<Zone[]>('get_all_zones');
      const db: CityDb = {};
      for (const zone of zones) {
        for (const city of zone.cities) {
          const key = city.value || city.name;
          db[key] = {
            name_en: city.name_en,
            name_ru: city.name_ru,
            countdown: city.countdown,
          };
        }
      }
      set({ zones: zones.sort((a, b) => a.name.localeCompare(b.name)), cityDb: db, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));
