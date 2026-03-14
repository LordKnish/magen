import { useState, useEffect } from 'react';
import { Siren, X } from 'lucide-react';
import SvgMap from './SvgMap';

interface Alert {
  id: string;
  alertType: string;
  state: string;
  cities: string[];
  title: string | null;
  timestamp: number;
  expiresAt: number;
}

interface Props {
  alerts: Alert[];
  onDismiss: () => void;
}

const ALERT_TYPE_LABELS: Record<string, { en: string; he: string; ru: string }> = {
  Missiles: { en: 'Rocket & Missile Attack', he: 'ירי רקטות וטילים', ru: 'Ракетная атака' },
  General: { en: 'General Alert', he: 'התרעה כללית', ru: 'Общая тревога' },
  EarthQuake: { en: 'Earthquake', he: 'רעידת אדמה', ru: 'Землетрясение' },
  RadiologicalEvent: { en: 'Radiological Event', he: 'אירוע רדיולוגי', ru: 'Радиологическое событие' },
  Tsunami: { en: 'Tsunami', he: 'צונמי', ru: 'Цунами' },
  HostileAircraftIntrusion: { en: 'Hostile Aircraft', he: 'חדירת כלי טיס עוין', ru: 'Вторжение воздушного судна' },
  HazardousMaterials: { en: 'Hazardous Materials', he: 'חומרים מסוכנים', ru: 'Опасные материалы' },
  TerroristInfiltration: { en: 'Infiltration Alert', he: 'חדירת מחבלים', ru: 'Проникновение террористов' },
};

const SAFETY_INSTRUCTIONS: Record<string, { en: string; he: string; ru: string }> = {
  Missiles: {
    en: 'Enter a protected space immediately. Stay for 10 minutes.',
    he: 'היכנסו למרחב מוגן מיד. שהו 10 דקות.',
    ru: 'Немедленно войдите в укрытие. Оставайтесь 10 минут.',
  },
  EarthQuake: {
    en: 'Drop, Cover, Hold On. Stay away from windows.',
    he: 'שכבו, התכסו, החזיקו. התרחקו מחלונות.',
    ru: 'Ложитесь, укройтесь, держитесь. Держитесь подальше от окон.',
  },
  default: {
    en: 'Follow Pikud HaOref instructions. Stay alert.',
    he: 'עקבו אחר הנחיות פיקוד העורף. הישארו ערניים.',
    ru: 'Следуйте инструкциям Пикуд а-Орэф. Будьте бдительны.',
  },
};

function getInstruction(alertType: string, lang: 'en' | 'he' | 'ru'): string {
  const instr = SAFETY_INSTRUCTIONS[alertType] ?? SAFETY_INSTRUCTIONS.default;
  return instr[lang] ?? instr.en;
}

function getAlertLabel(alertType: string, lang: 'en' | 'he' | 'ru'): string {
  const labels = ALERT_TYPE_LABELS[alertType];
  if (!labels) return alertType;
  return labels[lang] ?? labels.en;
}

export default function OverlayAlert({ alerts, onDismiss }: Props) {
  const [countdown, setCountdown] = useState(0);

  // Determine language from stored settings (default to en)
  const lang = 'en' as 'en' | 'he' | 'ru';

  // Get all unique cities and the primary alert type
  const allCities = [...new Set(alerts.flatMap((a) => a.cities))];
  const primaryType = alerts[0]?.alertType ?? 'Missiles';
  const totalCities = allCities.length;

  // Calculate shortest countdown from earliest expiring alert
  useEffect(() => {
    if (alerts.length === 0) return;

    const update = () => {
      const now = Date.now() / 1000;
      const minExpiry = Math.min(...alerts.map((a) => a.expiresAt));
      const remaining = Math.max(0, Math.round(minExpiry - now));
      setCountdown(remaining);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [alerts]);

  if (alerts.length === 0) return null;

  // Show up to 8 cities, then "N other cities also affected"
  const displayCities = allCities.slice(0, 8);
  const otherCount = totalCities - displayCities.length;

  return (
    <div
      dir={lang === 'he' ? 'rtl' : 'ltr'}
      className="h-screen w-screen flex flex-col bg-gray-950 text-white overflow-hidden select-none"
      style={{
        border: '3px solid #ef4444',
        boxShadow: '0 0 30px rgba(239, 68, 68, 0.5), inset 0 0 30px rgba(239, 68, 68, 0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-red-950/60 border-b border-red-800/50">
        <div className="flex items-center gap-2">
          <Siren size={22} className="text-red-400 animate-pulse" />
          <span className="font-black text-lg text-red-400 uppercase tracking-wider">
            {getAlertLabel(primaryType, lang)}
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex gap-3 px-4 py-3 overflow-hidden">
        {/* Left: SVG Map */}
        <div className="flex-shrink-0">
          <SvgMap highlightedZones={allCities} />
        </div>

        {/* Right: Cities + Countdown */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Countdown */}
          <div className="text-center mb-3">
            <div className="text-[10px] text-red-400 uppercase tracking-widest">Shelter Now</div>
            <div className="text-5xl font-black text-white leading-none">
              {countdown}<span className="text-lg text-red-400">s</span>
            </div>
          </div>

          {/* Cities list */}
          <div className="flex-1 overflow-y-auto space-y-1">
            {displayCities.map((city, i) => (
              <div
                key={i}
                className="px-2 py-1 rounded bg-red-950/40 border border-red-800/30 text-sm font-semibold"
              >
                {city}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="px-4 py-2 text-xs text-gray-300 bg-gray-900/60 border-t border-gray-800">
        {getInstruction(primaryType, lang)}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-800">
        {otherCount > 0 ? (
          <span>{otherCount} other cities also affected</span>
        ) : (
          <span />
        )}
        <span className="text-gray-600">Magen</span>
      </div>
    </div>
  );
}
