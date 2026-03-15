# Magen Upgrade — Map-Centric UI + Multi-Profile Alerts

## Overview

Upgrade Magen from a tabbed dashboard app to a map-centric real-time alert tool with multi-profile alert management. Two major changes: (1) full-screen MapLibre GL JS map as the primary UI, (2) multi-profile alert system replacing the single city filter.

## Design System

### Colors (from Pikud HaOref)
- Surfaces: `#0C1220` base, `#131B2E` surface, `#1A2540` elevated, `rgba(12,18,32,0.92)` overlay
- Alert-critical: `#E10000` (missiles — oref red)
- Alert-warning: `#E89024` (pre-alert — oref orange)
- Alert-early: `#EEC02D` (early warning — oref yellow)
- Alert-info: `#1D55D0` (general — oref blue)
- Alert-clear: `#00A64C` (all clear — oref green)
- Type accents: UAV `#8B5CF6`, Infiltration `#BD0728`, Tsunami `#3B82F6`, Hazmat `#EAB308`

### Typography
- **Heebo** (same as oref.org.il) — weights 300-900, Hebrew + Latin
- Display: 28px/800, Heading: 20px/700, Body: 14px/400, Label: 11px/600, Countdown: 48px/900

### Icons
- Lucide React (already in deps)
- Alert states: `siren` (critical), `triangle-alert` (warning), `radio` (early), `info` (info), `circle-check` (clear)

### Map
- MapLibre GL JS with CartoDB Dark Matter raster tiles (no API key)
- Frosted-glass overlay panels (backdrop-filter: blur)

### Animation
- Idle: nothing moves, reassuring calm
- Critical: 1.5s pulsing ring, alert banner slide-in 300ms
- Warning: 2s opacity breathe
- Transitions: 150ms (hover/toggle), 250ms (panels), 300ms (alerts)

## Architecture Changes

### Frontend
- **Remove**: Tab navigation (Layout.tsx), Dashboard view, separate MapView, react-leaflet + leaflet deps
- **Add**: MapLibre GL JS, full-screen map as App root, floating overlay panels
- **Restructure**: Settings as slide-out panel over map, History as timeline bar on map

### New Components
- `MapContainer` — MapLibre GL JS map, full viewport
- `StatusOverlay` — top-left connection status pill
- `ProfileOverlay` — top-right profile pills with visibility toggle
- `TimelineBar` — bottom timeline scrubber with alert event markers
- `AlertBanner` — slide-in alert notification over map (top center)
- `SettingsPanel` — slide-out panel from right edge
- `ProfileEditor` — create/edit alert profiles (within settings)
- `CityFilter` — reuse existing pattern, adapted for profile context

### Backend (Rust)
- **New model**: `AlertProfile` with name, color, cities, alert types, notification settings, priority
- **Updated model**: `Settings` — replace `selectedCities` with `profiles: Vec<AlertProfile>`
- **Updated logic**: Alert processor checks all profiles, applies highest-priority matching behavior
- **New commands**: `create_profile`, `update_profile`, `delete_profile`, `get_profiles`
- **Migration**: Auto-migrate existing `selectedCities` into a default "Home" profile

### State Management (Zustand)
- **New store**: `profileStore` — CRUD for alert profiles, active profile state
- **Updated**: `alertStore` — alerts tagged with matching profile IDs
- **Updated**: `settingsStore` — profiles integrated into settings

### Data Flow
1. Backend polls API → gets alert with cities
2. For each alert, check against ALL profiles' city lists and alert type filters
3. Determine highest-priority matching profile's notification settings
4. Emit event with alert + matched profiles
5. Frontend receives → shows on map (zone color = profile color), triggers notifications per profile settings

## What to Keep
- Rust polling loop, dedup, expiry logic (works well)
- Sound system (rodio, embedded MP3s)
- Overlay popup window system
- Notification service
- cities.json + polygons.json data
- i18n system
- Onboarding flow (adapted for profiles instead of city filter)
- Tray icon system

## Phases
1. Design system + MapLibre integration (replace Leaflet, new colors/fonts)
2. Map-centric layout (remove tabs, floating panels, status overlay)
3. Multi-profile backend (Rust models, commands, migration)
4. Multi-profile frontend (profile store, editor UI, city filter per profile)
5. Timeline bar (history on map, scrubbing, replay)
6. Alert visualization on map (pulsing zones, shelter rings, alert banners)
7. Settings panel redesign (slide-out, profile management)
8. Onboarding flow update (profile creation instead of city selection)
