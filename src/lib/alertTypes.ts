import {
  Siren, AlertTriangle, Activity, Radiation, Waves,
  Plane, FlaskConical, ShieldAlert, Newspaper, GraduationCap, CircleCheck,
} from 'lucide-react';

export const ALERT_TYPE_CONFIG: Record<string, {
  color: string;
  icon: typeof Siren;
  labelKey: string;
}> = {
  Missiles: { color: '#ef4444', icon: Siren, labelKey: 'alert.missiles' },
  General: { color: '#6b7280', icon: AlertTriangle, labelKey: 'alert.general' },
  EarthQuake: { color: '#f59e0b', icon: Activity, labelKey: 'alert.earthQuake' },
  RadiologicalEvent: { color: '#a855f7', icon: Radiation, labelKey: 'alert.radiologicalEvent' },
  Tsunami: { color: '#3b82f6', icon: Waves, labelKey: 'alert.tsunami' },
  HostileAircraftIntrusion: { color: '#f97316', icon: Plane, labelKey: 'alert.hostileAircraftIntrusion' },
  HazardousMaterials: { color: '#eab308', icon: FlaskConical, labelKey: 'alert.hazardousMaterials' },
  NewsFlash: { color: '#64748b', icon: Newspaper, labelKey: 'alert.newsFlash' },
  TerroristInfiltration: { color: '#dc2626', icon: ShieldAlert, labelKey: 'alert.terroristInfiltration' },
  Unknown: { color: '#64748b', icon: AlertTriangle, labelKey: 'alert.unknown' },
};

export const STATE_COLORS: Record<string, string> = {
  Active: '#ef4444',
  EarlyWarning: '#f59e0b',
  AllClear: '#38bdf8',
};
