import { useState } from 'react';
import { X, Play } from 'lucide-react';
import { useProfileStore, type AlertProfile } from '../../store/profileStore';
import { invoke } from '@tauri-apps/api/core';
import CityFilter from '../CityFilter';
import { type Language, t } from '../../i18n';
import { ALERT_TYPE_CONFIG } from '../../lib/alertTypes';

const PROFILE_COLORS = ['#1D55D0', '#00A64C', '#E89024', '#8B5CF6', '#3B82F6', '#EAB308', '#BD0728', '#E10000'];

// Category codes matching AlertType::from_category in Rust
const ALERT_TYPES = [
  { cat: '1', key: 'Missiles' },
  { cat: '6', key: 'HostileAircraftIntrusion' },
  { cat: '3', key: 'EarthQuake' },
  { cat: '13', key: 'TerroristInfiltration' },
  { cat: '5', key: 'Tsunami' },
  { cat: '7', key: 'HazardousMaterials' },
  { cat: '4', key: 'RadiologicalEvent' },
  { cat: '2', key: 'General' },
];

interface Props {
  profile: AlertProfile | null;
  lang: Language;
  onClose: () => void;
}

export default function ProfileEditor({ profile, lang, onClose }: Props) {
  const { add, update } = useProfileStore();
  const isNew = !profile;
  const [name, setName] = useState(profile?.name ?? '');
  const [color, setColor] = useState(profile?.color ?? PROFILE_COLORS[0]);
  const [cities, setCities] = useState<string[]>(profile?.cities ?? []);
  const [notify, setNotify] = useState(profile?.notify ?? true);
  const [sound, setSound] = useState(profile?.sound ?? true);
  const [overlay, setOverlay] = useState(profile?.overlay ?? true);
  const [priority, setPriority] = useState(profile?.priority ?? 1);
  const [testType, setTestType] = useState('1'); // Missiles by default
  const [testing, setTesting] = useState(false);

  const handleSave = async () => {
    const p: AlertProfile = {
      id: profile?.id ?? `profile-${Date.now()}`,
      name: name || 'Unnamed',
      color,
      cities,
      alertTypes: [],
      notify,
      sound,
      overlay,
      priority,
    };
    if (isNew) await add(p);
    else await update(p);
    onClose();
  };

  const handleTest = async () => {
    if (cities.length === 0 || testing) return;
    setTesting(true);
    try {
      await invoke('preview_profile_alert', {
        cities,
        alertType: testType,
        doNotify: notify,
        doSound: sound,
        doOverlay: overlay,
      });
    } catch (e) {
      console.error('Preview failed:', e);
    }
    setTimeout(() => setTesting(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-bold">{isNew ? 'New Profile' : 'Edit Profile'}</h3>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Home, Sister in Haifa"
            className="w-full px-3 py-2 text-sm rounded-md border bg-[var(--bg-surface)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div>
          <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Color</label>
          <div className="flex gap-2">
            {PROFILE_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-md border-2 transition-all"
                style={{
                  background: c,
                  borderColor: c === color ? 'white' : 'transparent',
                  transform: c === color ? 'scale(1.1)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Notifications</label>
          {[
            { label: 'Desktop notification', value: notify, set: setNotify },
            { label: 'Sound alert', value: sound, set: setSound },
            { label: 'Popup overlay', value: overlay, set: setOverlay },
          ].map(({ label, value, set }) => (
            <div key={label} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-[var(--text-primary)]">{label}</span>
              <button
                onClick={() => set(!value)}
                className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${value ? 'bg-[var(--alert-info)]' : 'bg-white/10'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>

        <div>
          <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Priority</label>
          <div className="flex gap-2">
            {[1, 2, 3].map(p => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${p === priority ? 'bg-[var(--alert-info)] border-[var(--alert-info)] text-white' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}
              >
                {p === 1 ? 'High' : p === 2 ? 'Medium' : 'Low'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
            Cities ({cities.length} selected)
          </label>
          <CityFilter selectedCities={cities} onChange={setCities} lang={lang} />
        </div>

        {/* Test Alert */}
        {!isNew && cities.length > 0 && (
          <div
            className="rounded-lg border p-3 space-y-3"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-base)' }}
          >
            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold block">
              Preview Alert
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALERT_TYPES.map(({ cat, key }) => {
                const config = ALERT_TYPE_CONFIG[key];
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <button
                    key={cat}
                    onClick={() => setTestType(cat)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border transition-all ${
                      cat === testType
                        ? 'border-transparent text-white font-semibold'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                    style={cat === testType ? { background: config.color } : undefined}
                  >
                    <Icon size={12} />
                    {t(config.labelKey, lang)}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleTest}
              disabled={testing}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all border ${
                testing
                  ? 'opacity-50 cursor-not-allowed border-[var(--border)] text-[var(--text-muted)]'
                  : 'border-[var(--alert-warning)] text-[var(--alert-warning)] hover:bg-[var(--alert-warning)] hover:text-white'
              }`}
            >
              <Play size={14} />
              {testing ? 'Alert sent...' : 'Send Test Alert'}
            </button>
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              Sends a 15-second preview using up to 5 cities from this profile.
              Notification, sound, and overlay will fire based on the toggles above.
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={handleSave}
          className="w-full py-2.5 rounded-lg font-bold text-sm text-white transition-colors hover:opacity-90"
          style={{ background: color }}
        >
          {isNew ? 'Create Profile' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
