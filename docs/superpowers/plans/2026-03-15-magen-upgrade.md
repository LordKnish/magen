# Magen Upgrade Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Magen from a tabbed dashboard app into a map-centric real-time alert tool with multi-profile alert management.

**Architecture:** Replace Leaflet with MapLibre GL JS as a full-screen map. Remove tab navigation — everything overlays the map (status, profiles, timeline, settings panel). Add multi-profile alert system on the Rust backend, replacing the single `selectedCities` array with `Vec<AlertProfile>`. Frontend gets new Zustand profile store and overlay components.

**Tech Stack:** Tauri v2, Rust, React 19, TypeScript, MapLibre GL JS, Zustand, Tailwind CSS 4, Lucide React, Heebo font

---

## File Structure

### Files to Create
- `src/components/map/MapContainer.tsx` — MapLibre GL JS full-screen map with zone overlays and alert visualization
- `src/components/map/StatusOverlay.tsx` — top-left connection status pill
- `src/components/map/ProfileOverlay.tsx` — top-right profile pills with visibility toggles
- `src/components/map/TimelineBar.tsx` — bottom timeline scrubber with alert markers
- `src/components/map/AlertBanner.tsx` — slide-in alert notification banner (top center)
- `src/components/map/SettingsPanel.tsx` — slide-out settings panel from right edge
- `src/components/map/ProfileEditor.tsx` — create/edit alert profile form
- `src/components/map/MapApp.tsx` — orchestrates all map overlays into the main view
- `src/store/profileStore.ts` — Zustand store for alert profiles CRUD
- `src-tauri/src/models/profile.rs` — AlertProfile struct and related types

### Files to Modify
- `src/styles/globals.css` — new design system CSS variables (Heebo, oref colors)
- `src/lib/alertTypes.ts` — update colors to match oref palette
- `src/App.tsx` — replace Layout with MapApp
- `src/store/settingsStore.ts` — add profiles field, remove selectedCities
- `src/store/alertStore.ts` — add matchedProfiles to alerts
- `src/components/CityFilter.tsx` — update styling to new design system
- `src/views/Onboarding.tsx` — create first profile instead of selecting cities
- `src-tauri/src/models/settings.rs` — add profiles, migration from selectedCities
- `src-tauri/src/models/mod.rs` — add profile module
- `src-tauri/src/commands/commands.rs` — add profile CRUD commands
- `src-tauri/src/main.rs` — register new commands, update polling to check profiles
- `src-tauri/src/state.rs` — no changes needed (profiles live in Settings)
- `src-tauri/src/services/alert_processor.rs` — profile-aware alert matching
- `src-tauri/Cargo.toml` — add uuid dependency
- `package.json` — add maplibre-gl, remove leaflet/react-leaflet
- `src-tauri/tauri.conf.json` — update CSP for MapLibre tiles
- `vite.config.ts` — update if needed for MapLibre

### Files to Delete
- `src/views/MapView.tsx` — replaced by MapContainer
- `src/views/Dashboard.tsx` — merged into map overlays
- `src/views/History.tsx` — replaced by TimelineBar
- `src/views/Settings.tsx` — replaced by SettingsPanel
- `src/components/Layout.tsx` — no more tabs
- `src/components/AlertCard.tsx` — replaced by AlertBanner
- `src/components/CityList.tsx` — replaced by inline alert display
- `src/components/CountdownTimer.tsx` — integrated into AlertBanner
- `src/components/StatusBadge.tsx` — replaced by StatusOverlay

---

## Chunk 1: Design System + Dependencies

### Task 1: Update design system CSS variables and font

**Files:**
- Modify: `src/styles/globals.css`
- Modify: `src-tauri/tauri.conf.json` (CSP for new font)

- [ ] **Step 1: Update globals.css with new design system**

Replace existing CSS variables and font import:

```css
/* Heebo — same font as Pikud HaOref (oref.org.il) */
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap');

@import "tailwindcss";

:root {
  /* Surfaces — deep navy */
  --bg-base: #0C1220;
  --bg-surface: #131B2E;
  --bg-elevated: #1A2540;
  --bg-overlay: rgba(12, 18, 32, 0.92);

  /* Text */
  --text-primary: #E8ECF4;
  --text-secondary: #8B97B0;
  --text-muted: #4D5A73;

  /* Borders */
  --border: rgba(255, 255, 255, 0.08);
  --border-default: rgba(255, 255, 255, 0.1);

  /* Alert colors from Pikud HaOref */
  --alert-critical: #E10000;
  --alert-warning: #E89024;
  --alert-early: #EEC02D;
  --alert-info: #1D55D0;
  --alert-clear: #00A64C;

  /* Legacy compat — used in components not yet migrated */
  --bg-primary: var(--bg-base);
  --bg-secondary: var(--bg-surface);
  --bg-card: var(--bg-elevated);
  --accent-green: var(--alert-clear);
  --accent-red: var(--alert-critical);
  --accent-amber: var(--alert-warning);
  --accent-blue: var(--alert-info);
}

body {
  margin: 0;
  font-family: 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg-base);
  color: var(--text-primary);
}
```

Keep scrollbar styles and RTL support as-is.

- [ ] **Step 2: Verify the app still builds**

Run: `cd /home/bmoerdler/Documents/magen && npm run build`
Expected: Build succeeds (CSS variable aliases keep existing components working)

- [ ] **Step 3: Commit**

```bash
git add src/styles/globals.css
git commit -m "design: update CSS variables to Pikud HaOref palette with Heebo font"
```

### Task 2: Update alert type colors to oref palette

**Files:**
- Modify: `src/lib/alertTypes.ts`

- [ ] **Step 1: Update ALERT_TYPE_CONFIG colors**

```typescript
import {
  Siren, AlertTriangle, Activity, Radiation, Waves,
  Plane, FlaskConical, ShieldAlert, Newspaper, Radio,
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
  HostileAircraftIntrusion: { color: '#8B5CF6', icon: Plane, labelKey: 'alert.hostileAircraftIntrusion' },
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/alertTypes.ts
git commit -m "design: update alert colors to Pikud HaOref palette"
```

### Task 3: Swap Leaflet for MapLibre GL JS

**Files:**
- Modify: `package.json`
- Modify: `src-tauri/tauri.conf.json` (CSP)

- [ ] **Step 1: Remove Leaflet, add MapLibre**

Run:
```bash
cd /home/bmoerdler/Documents/magen
npm uninstall leaflet react-leaflet @types/leaflet
npm install maplibre-gl
```

- [ ] **Step 2: Update CSP in tauri.conf.json**

In the `security.csp` field, add MapLibre and CartoDB tile domains. Replace any existing leaflet/carto references:

```
"csp": "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://*.openstreetmap.org; connect-src 'self' https://www.oref.org.il https://*.basemaps.cartocdn.com https://www.tzevaadom.co.il https://fonts.googleapis.com https://fonts.gstatic.com; worker-src blob:;"
```

Note: MapLibre uses web workers (via blob: URLs) for rendering — `worker-src blob:` is required.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds. MapView.tsx will fail to import — that's expected, we'll replace it next.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src-tauri/tauri.conf.json
git commit -m "deps: replace leaflet with maplibre-gl"
```

---

## Chunk 2: Multi-Profile Backend (Rust)

### Task 4: Add AlertProfile model

**Files:**
- Create: `src-tauri/src/models/profile.rs`
- Modify: `src-tauri/src/models/mod.rs`

- [ ] **Step 1: Create profile model**

```rust
// src-tauri/src/models/profile.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlertProfile {
    pub id: String,
    pub name: String,
    pub color: String,
    pub cities: Vec<String>,
    pub alert_types: Vec<String>,   // e.g. ["Missiles", "EarthQuake"] — empty = all types
    pub notify: bool,
    pub sound: bool,
    pub overlay: bool,
    pub priority: u8,               // 1 = highest, 255 = lowest
}

impl AlertProfile {
    pub fn default_home(cities: Vec<String>) -> Self {
        Self {
            id: "home".to_string(),
            name: "Home".to_string(),
            color: "#E10000".to_string(),
            cities,
            alert_types: vec![],
            notify: true,
            sound: true,
            overlay: true,
            priority: 1,
        }
    }
}
```

- [ ] **Step 2: Add module to mod.rs**

Add `pub mod profile;` to `src-tauri/src/models/mod.rs`.

- [ ] **Step 3: Verify Rust builds**

Run: `cd /home/bmoerdler/Documents/magen/src-tauri && cargo check`
Expected: Compiles with no errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/models/profile.rs src-tauri/src/models/mod.rs
git commit -m "feat: add AlertProfile model"
```

### Task 5: Update Settings to include profiles with migration

**Files:**
- Modify: `src-tauri/src/models/settings.rs`

- [ ] **Step 1: Add profiles field to Settings**

Add `use crate::models::profile::AlertProfile;` at the top, then add the field to the struct:

```rust
pub profiles: Vec<AlertProfile>,
```

Update Default impl to include `profiles: Vec::new()`.

- [ ] **Step 2: Add migration method**

Add this impl block to Settings:

```rust
impl Settings {
    /// Migrate from old selectedCities to profiles format
    pub fn migrate_if_needed(&mut self) {
        if self.profiles.is_empty() && !self.selected_cities.is_empty() {
            self.profiles.push(AlertProfile::default_home(self.selected_cities.clone()));
        }
    }

    /// Get all monitored cities across all profiles
    pub fn all_monitored_cities(&self) -> Vec<String> {
        let mut cities: Vec<String> = self.profiles.iter()
            .flat_map(|p| p.cities.iter().cloned())
            .collect();
        cities.sort();
        cities.dedup();
        cities
    }
}
```

- [ ] **Step 3: Verify Rust builds**

Run: `cargo check`
Expected: Compiles. Existing save/load will auto-deserialize profiles as empty vec (serde default).

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/models/settings.rs
git commit -m "feat: add profiles to Settings with migration from selectedCities"
```

### Task 6: Add profile commands and update main.rs

**Files:**
- Modify: `src-tauri/src/commands/commands.rs`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Add profile CRUD commands**

Add to commands.rs:

```rust
use crate::models::profile::AlertProfile;

#[tauri::command]
pub async fn get_profiles(state: State<'_, AppState>) -> Result<Vec<AlertProfile>, AppError> {
    Ok(state.settings.read().await.profiles.clone())
}

#[tauri::command]
pub async fn save_profiles(
    app: AppHandle,
    profiles: Vec<AlertProfile>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let mut settings = state.settings.write().await;
    settings.profiles = profiles;

    // Also update selectedCities for backward compat
    settings.selected_cities = settings.all_monitored_cities();

    let store = app.store("settings.json")
        .map_err(|e| AppError::Settings(format!("Failed to open store: {}", e)))?;
    let value = serde_json::to_value(&*settings)?;
    store.set("settings", value);
    Ok(())
}
```

- [ ] **Step 2: Register commands in main.rs**

Add `commands::get_profiles` and `commands::save_profiles` to the `invoke_handler` array.

- [ ] **Step 3: Add migration call in main.rs setup**

After loading settings from store (line ~114-118), add:

```rust
if let Ok(store) = app.store("settings.json") {
    if let Some(val) = store.get("settings") {
        if let Ok(mut settings) = serde_json::from_value::<magen_lib::models::settings::Settings>(val) {
            settings.migrate_if_needed();
            let state = app.state::<AppState>();
            *state.settings.blocking_write() = settings;
        }
    }
}
```

- [ ] **Step 4: Verify Rust builds**

Run: `cargo check`

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/commands.rs src-tauri/src/main.rs
git commit -m "feat: add profile CRUD commands with migration"
```

### Task 7: Profile-aware alert matching

**Files:**
- Modify: `src-tauri/src/main.rs` (polling loop)

- [ ] **Step 1: Update polling loop to emit matched profiles**

In the polling loop in main.rs, after processing alerts, before emitting events, add profile matching. The current code at line ~49-56 processes `result.new_alerts`. Update to also check profiles:

After `for alert in &result.new_alerts {`, before sending notification, add profile matching logic:

```rust
// Check which profiles match this alert
let settings = state.settings.read().await;
let matched: Vec<String> = settings.profiles.iter()
    .filter(|p| {
        // Check if any alert city is in this profile's city list
        let city_match = alert.cities.iter().any(|c| p.cities.contains(c));
        // Check if alert type matches (empty = all types)
        let type_match = p.alert_types.is_empty() ||
            p.alert_types.contains(&format!("{:?}", alert.alert_type));
        city_match && type_match
    })
    .map(|p| p.id.clone())
    .collect();
drop(settings);

// Only notify if at least one profile matches, or if no profiles exist (backward compat)
let settings = state.settings.read().await;
let should_notify = matched.is_empty() && settings.profiles.is_empty() || !matched.is_empty();
let should_sound = settings.profiles.iter()
    .filter(|p| matched.contains(&p.id))
    .any(|p| p.sound);
let should_overlay = settings.profiles.iter()
    .filter(|p| matched.contains(&p.id))
    .any(|p| p.overlay);
drop(settings);
```

Use `should_notify`, `should_sound`, `should_overlay` to gate the existing notification/sound/overlay calls.

- [ ] **Step 2: Verify Rust builds**

Run: `cargo check`

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m "feat: profile-aware alert matching in polling loop"
```

---

## Chunk 3: Map-Centric Frontend

### Task 8: Create MapContainer component with MapLibre GL JS

**Files:**
- Create: `src/components/map/MapContainer.tsx`

- [ ] **Step 1: Create the MapContainer**

```typescript
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAlertStore } from '../../store/alertStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useCityStore } from '../../store/cityStore';
import { invoke } from '@tauri-apps/api/core';

type PolygonsData = Record<string, [number, number][]>;

export default function MapContainer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { activeAlerts } = useAlertStore();
  const { settings } = useSettingsStore();
  const { zones } = useCityStore();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          },
        },
        layers: [{
          id: 'carto-dark-layer',
          type: 'raster',
          source: 'carto-dark',
          minzoom: 0,
          maxzoom: 20,
        }],
      },
      center: [34.8, 31.5],
      zoom: 7,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.current.on('load', () => setLoaded(true));

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Load polygon data and add zone layers
  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;

    // Build city lookup from zones
    const cityById: Record<string, { value: string; zone: string }> = {};
    for (const zone of zones) {
      for (const city of zone.cities) {
        cityById[String(city.id)] = { value: city.value || city.name, zone: zone.name };
      }
    }

    // Get alert cities
    const alertCities = new Set<string>();
    for (const alert of activeAlerts) {
      if (alert.state === 'Active') {
        for (const city of alert.cities) alertCities.add(city);
      }
    }

    // Get monitored cities from all profiles
    const monitoredCities = new Set<string>();
    for (const profile of settings.profiles ?? []) {
      for (const city of profile.cities) monitoredCities.add(city);
    }
    // Fallback to selectedCities if no profiles
    if (monitoredCities.size === 0) {
      for (const city of settings.selectedCities) monitoredCities.add(city);
    }

    // Fetch polygons and build GeoJSON
    const loadPolygons = async () => {
      let polygons: PolygonsData;
      try {
        const res = await fetch('/polygons.json');
        polygons = await res.json();
      } catch {
        polygons = await invoke<PolygonsData>('get_polygons');
      }

      const features = Object.entries(polygons).map(([id, coords]) => {
        const city = cityById[id];
        const cityValue = city?.value;
        const isActive = cityValue ? alertCities.has(cityValue) : false;
        const isMonitored = cityValue ? monitoredCities.has(cityValue) : false;

        // Find matching profile color
        let profileColor: string | null = null;
        if (cityValue) {
          for (const profile of settings.profiles ?? []) {
            if (profile.cities.includes(cityValue)) {
              profileColor = profile.color;
              break;
            }
          }
        }

        return {
          type: 'Feature' as const,
          properties: { id, isActive, isMonitored, profileColor },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [coords.map(([lat, lng]) => [lng, lat])],
          },
        };
      });

      const geojson = { type: 'FeatureCollection' as const, features };

      // Remove existing layers/source if present
      if (m.getLayer('zones-fill')) m.removeLayer('zones-fill');
      if (m.getLayer('zones-border')) m.removeLayer('zones-border');
      if (m.getLayer('zones-active')) m.removeLayer('zones-active');
      if (m.getSource('zones')) m.removeSource('zones');

      m.addSource('zones', { type: 'geojson', data: geojson as any });

      // Base zone fill
      m.addLayer({
        id: 'zones-fill',
        type: 'fill',
        source: 'zones',
        paint: {
          'fill-color': [
            'case',
            ['get', 'isActive'], '#E10000',
            ['get', 'isMonitored'], ['coalesce', ['get', 'profileColor'], '#00A64C'],
            '#131B2E',
          ],
          'fill-opacity': [
            'case',
            ['get', 'isActive'], 0.3,
            ['get', 'isMonitored'], 0.12,
            0.15,
          ],
        },
      });

      // Zone borders
      m.addLayer({
        id: 'zones-border',
        type: 'line',
        source: 'zones',
        paint: {
          'line-color': [
            'case',
            ['get', 'isActive'], '#E10000',
            ['get', 'isMonitored'], ['coalesce', ['get', 'profileColor'], '#00A64C'],
            'rgba(255,255,255,0.06)',
          ],
          'line-width': [
            'case',
            ['get', 'isActive'], 2,
            ['get', 'isMonitored'], 1.5,
            0.5,
          ],
        },
      });
    };

    loadPolygons();
  }, [loaded, zones, activeAlerts, settings.profiles, settings.selectedCities]);

  return (
    <div
      ref={mapContainer}
      className="absolute inset-0"
      style={{ background: 'var(--bg-base)' }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/map/MapContainer.tsx
git commit -m "feat: add MapLibre GL JS MapContainer component"
```

### Task 9: Create overlay components

**Files:**
- Create: `src/components/map/StatusOverlay.tsx`
- Create: `src/components/map/ProfileOverlay.tsx`
- Create: `src/components/map/AlertBanner.tsx`
- Create: `src/components/map/TimelineBar.tsx`

- [ ] **Step 1: Create StatusOverlay**

```typescript
// src/components/map/StatusOverlay.tsx
import { Wifi, WifiOff, Globe } from 'lucide-react';
import { useAlertStore } from '../../store/alertStore';
import { t, type Language } from '../../i18n';

const STATUS_CONFIG = {
  Connected: { icon: Wifi, color: 'var(--alert-clear)', label: 'status.connected' },
  ConnectionIssue: { icon: Wifi, color: 'var(--alert-warning)', label: 'status.connectionIssue' },
  Disconnected: { icon: WifiOff, color: 'var(--text-muted)', label: 'status.disconnected' },
  GeoBlocked: { icon: Globe, color: 'var(--alert-early)', label: 'status.geoBlocked' },
} as const;

export default function StatusOverlay({ lang }: { lang: Language }) {
  const { connectionStatus, activeAlerts } = useAlertStore();
  const config = STATUS_CONFIG[connectionStatus];
  const Icon = config.icon;
  const activeCount = activeAlerts.filter(a => a.state === 'Active').length;

  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-xl"
        style={{
          background: 'var(--bg-overlay)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: config.color,
            boxShadow: `0 0 8px ${config.color}40`,
          }}
        />
        <Icon size={14} style={{ color: config.color }} />
        <span className="text-xs font-semibold" style={{ color: config.color }}>
          {t(config.label, lang)}
        </span>
      </div>

      {activeCount > 0 && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-xl"
          style={{
            background: 'rgba(225, 0, 0, 0.15)',
            borderColor: 'rgba(225, 0, 0, 0.3)',
          }}
        >
          <div className="w-2 h-2 rounded-full bg-[var(--alert-critical)] animate-pulse" />
          <span className="text-xs font-bold text-[var(--alert-critical)]">
            {activeCount} Active Alert{activeCount > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ProfileOverlay**

```typescript
// src/components/map/ProfileOverlay.tsx
import { Eye, EyeOff, Settings } from 'lucide-react';
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
```

- [ ] **Step 3: Create AlertBanner**

```typescript
// src/components/map/AlertBanner.tsx
import { useEffect, useState } from 'react';
import { Siren, CircleCheck } from 'lucide-react';
import { useAlertStore } from '../../store/alertStore';
import { ALERT_TYPE_CONFIG, STATE_COLORS } from '../../lib/alertTypes';
import { type Language, t } from '../../i18n';

export default function AlertBanner({ lang }: { lang: Language }) {
  const { activeAlerts } = useAlertStore();
  const [countdown, setCountdown] = useState<Record<string, number>>({});

  // Tick countdowns every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const counts: Record<string, number> = {};
      for (const alert of activeAlerts) {
        if (alert.state === 'Active') {
          const remaining = alert.expiresAt - now;
          if (remaining > 0) counts[alert.id] = remaining;
        }
      }
      setCountdown(counts);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeAlerts]);

  const visibleAlerts = activeAlerts.filter(a =>
    a.state === 'Active' || a.state === 'AllClear'
  ).slice(0, 3);

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-2 w-[360px] max-w-[calc(100vw-200px)]">
      {visibleAlerts.map((alert) => {
        const config = ALERT_TYPE_CONFIG[alert.alertType] ?? ALERT_TYPE_CONFIG.Unknown;
        const Icon = config.icon;
        const stateColor = STATE_COLORS[alert.state] ?? config.color;
        const isActive = alert.state === 'Active';
        const remaining = countdown[alert.id];

        return (
          <div
            key={alert.id}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-xl animate-[slideDown_300ms_ease-out]"
            style={{
              background: `${stateColor}15`,
              borderColor: `${stateColor}40`,
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${stateColor}25` }}
            >
              {alert.state === 'AllClear'
                ? <CircleCheck size={18} style={{ color: stateColor }} />
                : <Icon size={18} style={{ color: stateColor }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold" style={{ color: stateColor }}>
                {t(config.labelKey, lang)}
              </div>
              <div className="text-xs text-[var(--text-secondary)] truncate">
                {alert.cities.slice(0, 3).join(', ')}
                {alert.cities.length > 3 && ` +${alert.cities.length - 3}`}
              </div>
            </div>
            {isActive && remaining !== undefined && (
              <div className="text-2xl font-black tabular-nums" style={{ color: stateColor }}>
                {remaining}<span className="text-sm text-[var(--text-muted)]">s</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create TimelineBar**

```typescript
// src/components/map/TimelineBar.tsx
import { useEffect, useState } from 'react';
import { useHistoryStore, categoryToAlertType } from '../../store/historyStore';
import { ALERT_TYPE_CONFIG } from '../../lib/alertTypes';

export default function TimelineBar() {
  const { data, fetch: fetchHistory } = useHistoryStore();
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  if (!data || data.length === 0) return null;

  // Show last 24 hours
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - 24 * 3600;
  const recent = data.filter(a => a.timestamp >= windowStart);

  if (recent.length === 0) return null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 border-t backdrop-blur-xl px-4 py-2.5"
      style={{
        background: 'var(--bg-overlay)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-[10px] text-[var(--text-muted)] font-medium tabular-nums min-w-[36px]">
          {new Date(windowStart * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <div className="flex-1 h-1 bg-white/[0.06] rounded-sm relative">
          {recent.map((event, i) => {
            const pct = ((event.timestamp - windowStart) / (now - windowStart)) * 100;
            const alertType = categoryToAlertType(event.category);
            const config = ALERT_TYPE_CONFIG[alertType] ?? ALERT_TYPE_CONFIG.Unknown;
            return (
              <div
                key={`${event.id}-${i}`}
                className="absolute w-1 h-2.5 rounded-sm cursor-pointer transition-transform hover:scale-y-150"
                style={{
                  left: `${pct}%`,
                  top: '-3px',
                  background: config.color,
                  boxShadow: `0 0 4px ${config.color}60`,
                }}
                onMouseEnter={() => setHoveredEvent(i)}
                onMouseLeave={() => setHoveredEvent(null)}
                title={`${alertType} — ${event.towns.slice(0, 2).join(', ')}`}
              />
            );
          })}
          {/* Playhead */}
          <div className="absolute right-0 -top-1.5 w-0.5 h-4 bg-[var(--text-primary)] rounded-sm" />
        </div>
        <span className="text-[10px] text-[var(--text-muted)] font-medium tabular-nums min-w-[28px] text-right">
          NOW
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add slideDown animation to globals.css**

Add to globals.css:

```css
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/map/StatusOverlay.tsx src/components/map/ProfileOverlay.tsx src/components/map/AlertBanner.tsx src/components/map/TimelineBar.tsx src/styles/globals.css
git commit -m "feat: add map overlay components — status, profiles, alerts, timeline"
```

### Task 10: Create SettingsPanel and ProfileEditor

**Files:**
- Create: `src/components/map/SettingsPanel.tsx`
- Create: `src/components/map/ProfileEditor.tsx`
- Create: `src/store/profileStore.ts`

- [ ] **Step 1: Create profileStore**

```typescript
// src/store/profileStore.ts
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
  editing: AlertProfile | null;
  load: () => Promise<void>;
  save: (profiles: AlertProfile[]) => Promise<void>;
  add: (profile: AlertProfile) => Promise<void>;
  update: (profile: AlertProfile) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setEditing: (profile: AlertProfile | null) => void;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profiles: [],
  editing: null,
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
  setEditing: (profile) => set({ editing: profile }),
}));
```

- [ ] **Step 2: Create ProfileEditor component**

```typescript
// src/components/map/ProfileEditor.tsx
import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useProfileStore, type AlertProfile } from '../../store/profileStore';
import CityFilter from '../CityFilter';
import { type Language, t } from '../../i18n';

const PROFILE_COLORS = ['#E10000', '#1D55D0', '#E89024', '#00A64C', '#8B5CF6', '#3B82F6', '#BD0728', '#EAB308'];

interface Props {
  profile: AlertProfile | null; // null = new profile
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-bold">{isNew ? 'New Profile' : 'Edit Profile'}</h3>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
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

        {/* Color */}
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

        {/* Notification toggles */}
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

        {/* Priority */}
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

        {/* Cities */}
        <div>
          <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
            Cities ({cities.length} selected)
          </label>
          <CityFilter selectedCities={cities} onChange={setCities} lang={lang} />
        </div>
      </div>

      <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={handleSave}
          className="w-full py-2.5 rounded-lg font-bold text-sm text-white transition-colors"
          style={{ background: color }}
        >
          {isNew ? 'Create Profile' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create SettingsPanel**

```typescript
// src/components/map/SettingsPanel.tsx
import { useState } from 'react';
import { X, Plus, Pencil, Trash2, Volume2, VolumeX, Monitor, MonitorOff, Bell, BellOff, ChevronDown } from 'lucide-react';
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
      <div className="absolute top-0 right-0 bottom-0 w-[380px] z-30 border-l backdrop-blur-xl flex flex-col"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <ProfileEditor
          profile={editingProfile === 'new' ? null : editingProfile}
          lang={lang}
          onClose={() => setEditingProfile(null)}
        />
      </div>
    );
  }

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[380px] z-30 border-l backdrop-blur-xl flex flex-col"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      {/* Header */}
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
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => remove(profile.id)}
                  className="text-[var(--text-muted)] hover:text-[var(--alert-critical)]"
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
            {/* Language */}
            <SettingRow label={t('settings.language', lang)}>
              <select
                value={settings.language}
                onChange={e => save({ language: e.target.value as any })}
                className="text-sm bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-2 py-1 text-[var(--text-primary)]"
              >
                <option value="Hebrew">עברית</option>
                <option value="English">English</option>
                <option value="Russian">Русский</option>
              </select>
            </SettingRow>

            <SettingRow label={t('settings.soundRepeat', lang)}>
              <select
                value={settings.soundRepeat}
                onChange={e => save({ soundRepeat: e.target.value as any })}
                className="text-sm bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-2 py-1 text-[var(--text-primary)]"
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
```

- [ ] **Step 4: Commit**

```bash
git add src/store/profileStore.ts src/components/map/SettingsPanel.tsx src/components/map/ProfileEditor.tsx
git commit -m "feat: add settings panel with profile editor and profile store"
```

### Task 11: Create MapApp and wire everything together

**Files:**
- Create: `src/components/map/MapApp.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create MapApp orchestrator**

```typescript
// src/components/map/MapApp.tsx
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useProfileStore } from '../../store/profileStore';
import { isRtl, type Language } from '../../i18n';
import MapContainer from './MapContainer';
import StatusOverlay from './StatusOverlay';
import ProfileOverlay from './ProfileOverlay';
import AlertBanner from './AlertBanner';
import TimelineBar from './TimelineBar';
import SettingsPanel from './SettingsPanel';

const langMap: Record<string, Language> = {
  Hebrew: 'he', English: 'en', Russian: 'ru',
};

export default function MapApp() {
  const { settings } = useSettingsStore();
  const loadProfiles = useProfileStore(s => s.load);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const lang = langMap[settings.language] ?? 'he';

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  return (
    <div
      dir={isRtl(lang) ? 'rtl' : 'ltr'}
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      <MapContainer />
      <StatusOverlay lang={lang} />
      <ProfileOverlay onOpenSettings={() => setSettingsOpen(true)} />
      <AlertBanner lang={lang} />
      <TimelineBar />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} lang={lang} />
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx to use MapApp instead of Layout**

Replace the Layout import and usage:

```typescript
import { useEffect } from 'react';
import { useAlertStore } from './store/alertStore';
import { useSettingsStore } from './store/settingsStore';
import { useCityStore } from './store/cityStore';
import MapApp from './components/map/MapApp';
import Onboarding from './views/Onboarding';

export default function App() {
  const initAlerts = useAlertStore((s) => s.init);
  const loadSettings = useSettingsStore((s) => s.load);
  const loadCities = useCityStore((s) => s.load);
  const loading = useSettingsStore((s) => s.loading);
  const firstRunComplete = useSettingsStore((s) => s.settings.firstRunComplete);

  useEffect(() => {
    initAlerts();
    loadSettings();
    loadCities();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-base)' }}>
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }

  if (!firstRunComplete) {
    return <Onboarding />;
  }

  return <MapApp />;
}
```

- [ ] **Step 3: Update settingsStore to include profiles field**

Add `profiles` to the Settings interface and defaults:

```typescript
interface Settings {
  selectedCities: string[];
  profiles: AlertProfile[];
  // ... rest stays the same
}

// Add to imports:
import type { AlertProfile } from './profileStore';

// Add to defaultSettings:
profiles: [],
```

- [ ] **Step 4: Delete old view/component files**

```bash
rm src/views/MapView.tsx src/views/Dashboard.tsx src/views/Settings.tsx
rm src/components/Layout.tsx src/components/AlertCard.tsx src/components/CityList.tsx src/components/CountdownTimer.tsx src/components/StatusBadge.tsx
```

Keep `src/views/History.tsx` for now (TimelineBar uses historyStore but the full History view can be removed later once TimelineBar is verified working).

- [ ] **Step 5: Build and verify**

Run: `npm run build`
Expected: Build succeeds.

Run: `npm run tauri dev`
Expected: App opens showing full-screen dark map of Israel with status overlay, profile pills, and timeline.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: replace tabbed layout with map-centric UI

- Full-screen MapLibre GL JS map as primary view
- Floating overlays: status, profiles, alert banners, timeline
- Slide-out settings panel with profile management
- Remove old tab navigation and separate views"
```

---

## Chunk 4: Onboarding Update + Polish

### Task 12: Update onboarding to create first profile

**Files:**
- Modify: `src/views/Onboarding.tsx`

- [ ] **Step 1: Update onboarding flow**

Replace the cities step to create a profile instead. Change the `finish` function to save a profile instead of raw selectedCities:

In the `finish` function, replace:
```typescript
selectedCities,
```
with:
```typescript
selectedCities,
profiles: selectedCities.length > 0 ? [{
  id: 'home',
  name: lang === 'he' ? 'בית' : lang === 'ru' ? 'Дом' : 'Home',
  color: '#E10000',
  cities: selectedCities,
  alertTypes: [],
  notify: true,
  sound: soundEnabled,
  overlay: overlayEnabled,
  priority: 1,
}] : [],
```

Also update the `useSettingsStore.setState` fallback similarly.

- [ ] **Step 2: Update onboarding styling to new design system**

Replace green accent colors with oref blue (`var(--alert-info)`) for the continue/done buttons. Replace `bg-green-600` with a style using the blue accent:

```
style={{ background: 'var(--alert-info)' }}
```

Replace `text-green-400` references with `text-[var(--alert-info)]` where applicable.

- [ ] **Step 3: Build and verify**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/views/Onboarding.tsx
git commit -m "feat: onboarding creates first alert profile instead of raw city selection"
```

### Task 13: Final cleanup and verify

- [ ] **Step 1: Delete History.tsx if TimelineBar is working**

```bash
rm src/views/History.tsx
```

- [ ] **Step 2: Remove leaflet CSS import references if any remain**

Search for any `leaflet` imports:
```bash
grep -r "leaflet" src/
```
Remove any found.

- [ ] **Step 3: Verify full app with `npm run tauri dev`**

Test:
1. Fresh install (no settings) → onboarding flow creates a profile
2. Map loads with CartoDB Dark Matter tiles
3. Profile pills show in top-right
4. Settings panel opens/closes
5. Can create/edit/delete profiles
6. Test alert (if available) shows pulsing zone + alert banner
7. Timeline bar shows at bottom with historical events
8. Status overlay shows connection state

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: cleanup old views and leaflet references"
```
