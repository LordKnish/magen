import {
  Siren, AlertTriangle, Activity, Radiation, Waves,
  Plane, FlaskConical, ShieldAlert, Newspaper,
} from 'lucide-react';

export const ALERT_TYPE_CONFIG: Record<string, {
  color: string;
  icon: typeof Siren;
  labelKey: string;
}> = {
  Missiles: { color: '#E10000', icon: Siren, labelKey: 'alert.missiles' },
  General: { color: '#1D55D0', icon: AlertTriangle, labelKey: 'alert.general' },
  EarthQuake: { color: '#E89024', icon: Activity, labelKey: 'alert.earthQuake' },
  RadiologicalEvent: { color: '#8B5CF6', icon: Radiation, labelKey: 'alert.radiologicalEvent' },
  Tsunami: { color: '#3B82F6', icon: Waves, labelKey: 'alert.tsunami' },
  HostileAircraftIntrusion: { color: '#EEC02D', icon: Plane, labelKey: 'alert.hostileAircraftIntrusion' },
  HazardousMaterials: { color: '#EAB308', icon: FlaskConical, labelKey: 'alert.hazardousMaterials' },
  NewsFlash: { color: '#4D5A73', icon: Newspaper, labelKey: 'alert.newsFlash' },
  TerroristInfiltration: { color: '#BD0728', icon: ShieldAlert, labelKey: 'alert.terroristInfiltration' },
  Unknown: { color: '#4D5A73', icon: AlertTriangle, labelKey: 'alert.unknown' },
};

export const STATE_COLORS: Record<string, string> = {
  Active: '#E10000',
  EarlyWarning: '#EEC02D',
  AllClear: '#00A64C',
};
