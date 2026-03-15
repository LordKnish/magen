import { Eye, Settings } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

interface Props {
  onOpenSettings: () => void;
}

export default function ProfileOverlay({ onOpenSettings }: Props) {
  const { settings } = useSettingsStore();
  const profiles = settings.profiles ?? [];

  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 items-end">
      {profiles.map((profile) => (
        <div
          key={profile.id}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border backdrop-blur-xl cursor-pointer hover:bg-white/5 transition-colors"
          style={{
            background: 'var(--bg-overlay)',
            borderColor: 'var(--border-default)',
          }}
        >
          <div
            className="w-2 h-2 rounded-sm"
            style={{ background: profile.color }}
          />
          <span className="text-[11px] font-medium text-[var(--text-primary)]">
            {profile.name}
          </span>
          <Eye size={12} className="text-[var(--text-muted)]" />
        </div>
      ))}

      <button
        onClick={onOpenSettings}
        className="flex items-center justify-center w-8 h-8 rounded-lg border backdrop-blur-xl hover:bg-white/5 transition-colors mt-1"
        style={{
          background: 'var(--bg-overlay)',
          borderColor: 'var(--border-default)',
        }}
      >
        <Settings size={16} className="text-[var(--text-secondary)]" />
      </button>
    </div>
  );
}
