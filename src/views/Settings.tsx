import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import CityFilter from '../components/CityFilter';
import { type Language, t } from '../i18n';

interface Props {
  lang: Language;
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
      <span className="text-sm text-[var(--text-primary)]">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${
        checked ? 'bg-green-500' : 'bg-gray-600'
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors min-w-[100px] justify-between"
      >
        <span>{current?.label ?? value}</span>
        <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-md shadow-lg shadow-black/40 overflow-hidden min-w-[120px]">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                o.value === value
                  ? 'bg-green-500/10 text-green-400'
                  : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Settings({ lang }: Props) {
  const { settings, save } = useSettingsStore();
  const [proxyInput, setProxyInput] = useState(settings.proxyUrl ?? '');

  const languageOptions: { value: 'Hebrew' | 'English' | 'Russian'; label: string }[] = [
    { value: 'Hebrew', label: 'עברית' },
    { value: 'English', label: 'English' },
    { value: 'Russian', label: 'Русский' },
  ];

  const themeOptions: { value: 'Auto' | 'Light' | 'Dark'; label: string }[] = [
    { value: 'Auto', label: 'Auto' },
    { value: 'Light', label: 'Light' },
    { value: 'Dark', label: 'Dark' },
  ];

  const soundRepeatOptions: { value: 'Off' | 'Once' | 'Twice' | 'Thrice' | 'Continuous'; label: string }[] = [
    { value: 'Off', label: 'Off' },
    { value: 'Once', label: '1x' },
    { value: 'Twice', label: '2x' },
    { value: 'Thrice', label: '3x' },
    { value: 'Continuous', label: 'Continuous' },
  ];

  return (
    <div className="overflow-y-auto h-full p-4 space-y-6">
      {/* Language */}
      <SettingRow label={t('settings.language', lang)}>
        <Select
          value={settings.language}
          options={languageOptions}
          onChange={(v) => save({ language: v })}
        />
      </SettingRow>

      {/* Theme */}
      <SettingRow label={t('settings.theme', lang)}>
        <Select
          value={settings.theme}
          options={themeOptions}
          onChange={(v) => save({ theme: v })}
        />
      </SettingRow>

      {/* Sound Repeat */}
      <SettingRow label={t('settings.soundRepeat', lang)}>
        <Select
          value={settings.soundRepeat}
          options={soundRepeatOptions}
          onChange={(v) => save({ soundRepeat: v })}
        />
      </SettingRow>

      {/* Overlay Popup */}
      <SettingRow label={t('settings.overlay', lang)}>
        <Toggle
          checked={settings.overlayEnabled}
          onChange={(v) => save({ overlayEnabled: v })}
        />
      </SettingRow>

      {/* Auto Start */}
      <SettingRow label={t('settings.autoStart', lang)}>
        <Toggle
          checked={settings.autoStart}
          onChange={(v) => save({ autoStart: v })}
        />
      </SettingRow>

      {/* Notify All Clear */}
      <SettingRow label={t('settings.notifyAllClear', lang)}>
        <Toggle
          checked={settings.notifyAllClear}
          onChange={(v) => save({ notifyAllClear: v })}
        />
      </SettingRow>

      {/* Notify Early Warning */}
      <SettingRow label={t('settings.notifyEarlyWarning', lang)}>
        <Toggle
          checked={settings.notifyEarlyWarning}
          onChange={(v) => save({ notifyEarlyWarning: v })}
        />
      </SettingRow>

      {/* Proxy URL */}
      <div className="py-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-[var(--text-primary)]">{t('settings.proxy', lang)}</span>
        </div>
        <input
          type="text"
          value={proxyInput}
          onChange={(e) => setProxyInput(e.target.value)}
          onBlur={() => save({ proxyUrl: proxyInput.trim() || null })}
          placeholder="socks5://127.0.0.1:1080"
          className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-green-400/50"
        />
        <div className="text-[11px] text-[var(--text-muted)] mt-1">
          {t('settings.proxyHint', lang)}
        </div>
      </div>

      {/* Monitored Cities */}
      <div className="py-3">
        <div className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          {t('settings.cities', lang)}
        </div>
        <CityFilter
          selectedCities={settings.selectedCities}
          onChange={(cities) => save({ selectedCities: cities })}
          lang={lang}
        />
      </div>
    </div>
  );
}
