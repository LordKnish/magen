import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface AlertProfile {
  id: string;
  name: string;
  color: string;
  cities: string[];
  alertTypes: string[];
  notify: boolean;
  sound: boolean;
  overlay: boolean;
  priority: number;
}

interface ProfileStore {
  profiles: AlertProfile[];
  load: () => Promise<void>;
  save: (profiles: AlertProfile[]) => Promise<void>;
  add: (profile: AlertProfile) => Promise<void>;
  update: (profile: AlertProfile) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profiles: [],
  load: async () => {
    try {
      const profiles = await invoke<AlertProfile[]>('get_profiles');
      set({ profiles });
    } catch { /* ignore */ }
  },
  save: async (profiles) => {
    await invoke('save_profiles', { profiles });
    set({ profiles });
  },
  add: async (profile) => {
    const profiles = [...get().profiles, profile];
    await get().save(profiles);
  },
  update: async (profile) => {
    const profiles = get().profiles.map(p => p.id === profile.id ? profile : p);
    await get().save(profiles);
  },
  remove: async (id) => {
    const profiles = get().profiles.filter(p => p.id !== id);
    await get().save(profiles);
  },
}));
