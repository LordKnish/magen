import { useState } from 'react';
import { X, Plus, Pencil, Trash2, Volume2, VolumeX, Monitor, MonitorOff, Bell, BellOff } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useProfileStore, type AlertProfile } from '../../store/profileStore';
import ProfileEditor from './ProfileEditor';
import { type Language, t } from '../../i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  lang: Language;
}

export default function SettingsPanel({ open, onClose, lang }: Props) {
  const { settings, save } = useSettingsStore();
  const { profiles, remove } = useProfileStore();
  const [editingProfile, setEditingProfile] = useState<AlertProfile | null | 'new'>(null);
  const [proxyInput, setProxyInput] = useState(settings.proxyUrl ?? '');

  if (!open) return null;

  if (editingProfile !== null) {
    return (
      <div
        className="absolute top-0 right-0 bottom-0 w-[380px] z-30 border-l backdrop-blur-xl flex flex-col"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <ProfileEditor
          profile={editingProfile === 'new' ? null : editingProfile}
          lang={lang}
          onClose={() => setEditingProfile(null)}
        />
      </div>
    );
  }

  return (
    <div
      className="absolute top-0 right-0 bottom-0 w-[380px] z-30 border-l backdrop-blur-xl flex flex-col"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-base font-bold">{t('nav.settings', lang)}</h2>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Alert Profiles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Alert Profiles</h3>
            <button
              onClick={() => setEditingProfile('new')}
              className="flex items-center gap-1 text-xs text-[var(--alert-info)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Plus size={14} /> Add
            </button>
          </div>
          <div className="space-y-2">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center gap-3 p-3 rounded-lg border"
                style={{
                  background: 'var(--bg-elevated)',
                  borderColor: 'var(--border)',
                  borderLeftWidth: '3px',
                  borderLeftColor: profile.color,
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{profile.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{profile.cities.length} cities</div>
                </div>
                <div className="flex items-center gap-1">
                  {profile.sound
                    ? <Volume2 size={14} className="text-[var(--alert-info)]" />
                    : <VolumeX size={14} className="text-[var(--text-muted)]" />}
                  {profile.overlay
                    ? <Monitor size={14} className="text-[var(--alert-info)]" />
                    : <MonitorOff size={14} className="text-[var(--text-muted)]" />}
                  {profile.notify
                    ? <Bell size={14} className="text-[var(--alert-info)]" />
                    : <BellOff size={14} className="text-[var(--text-muted)]" />}
                </div>
                <button
                  onClick={() => setEditingProfile(profile)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  title="Edit profile"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => remove(profile.id)}
                  className="text-[var(--text-muted)] hover:text-[var(--alert-critical)]"
                  title="Delete profile"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {profiles.length === 0 && (
              <div className="text-center py-6 text-sm text-[var(--text-muted)]">
                No profiles yet. Add one to start monitoring.
              </div>
            )}
          </div>
        </div>

        {/* General Settings */}
        <div>
          <h3 className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-3">General</h3>
          <div className="space-y-0">
            <SettingRow label={t('settings.language', lang)}>
              <select
                value={settings.language}
                onChange={e => save({ language: e.target.value as 'Hebrew' | 'English' | 'Russian' })}
                className="text-sm bg-[var(--bg-elevated)] border rounded-md px-2 py-1 text-[var(--text-primary)]"
                style={{ borderColor: 'var(--border)' }}
              >
                <option value="Hebrew">עברית</option>
                <option value="English">English</option>
                <option value="Russian">Русский</option>
              </select>
            </SettingRow>

            <SettingRow label={t('settings.soundRepeat', lang)}>
              <select
                value={settings.soundRepeat}
                onChange={e => save({ soundRepeat: e.target.value as 'Off' | 'Once' | 'Twice' | 'Thrice' | 'Continuous' })}
                className="text-sm bg-[var(--bg-elevated)] border rounded-md px-2 py-1 text-[var(--text-primary)]"
                style={{ borderColor: 'var(--border)' }}
              >
                <option value="Off">Off</option>
                <option value="Once">1x</option>
                <option value="Twice">2x</option>
                <option value="Thrice">3x</option>
                <option value="Continuous">Continuous</option>
              </select>
            </SettingRow>

            <ToggleRow label={t('settings.autoStart', lang)} checked={settings.autoStart} onChange={v => save({ autoStart: v })} />
            <ToggleRow label={t('settings.notifyAllClear', lang)} checked={settings.notifyAllClear} onChange={v => save({ notifyAllClear: v })} />
            <ToggleRow label={t('settings.notifyEarlyWarning', lang)} checked={settings.notifyEarlyWarning} onChange={v => save({ notifyEarlyWarning: v })} />
          </div>
        </div>

        {/* Proxy */}
        <div>
          <h3 className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-2">{t('settings.proxy', lang)}</h3>
          <input
            value={proxyInput}
            onChange={e => setProxyInput(e.target.value)}
            onBlur={() => save({ proxyUrl: proxyInput.trim() || null })}
            placeholder="socks5://127.0.0.1:1080"
            className="w-full px-3 py-2 text-sm rounded-md border bg-[var(--bg-elevated)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          <p className="text-[11px] text-[var(--text-muted)] mt-1">{t('settings.proxyHint', lang)}</p>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
      <span className="text-sm text-[var(--text-primary)]">{label}</span>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
      <span className="text-sm text-[var(--text-primary)]">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${checked ? 'bg-[var(--alert-info)]' : 'bg-white/10'}`}
      >
        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}
