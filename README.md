# Magen

Desktop alert application for Pikud HaOref (Israel Home Front Command). Magen delivers real-time rocket and emergency alerts with native notifications, audio warnings, and a fullscreen overlay so you never miss a critical alert.

## Features

- **Real-time alerts** — polls the official Pikud HaOref API every few seconds
- **Native notifications** — OS-level notifications for every alert
- **Audio sirens** — plays siren sounds with configurable repeat (once, twice, continuous)
- **Fullscreen overlay** — always-on-top popup showing affected cities on an SVG map
- **Interactive map** — Leaflet-based map view with alert zone overlays
- **Alert history** — browse past alerts with type filtering
- **City selection** — choose which cities to monitor, grouped by zone
- **Multi-language** — Hebrew, English, and Russian UI
- **Themes** — Light, Dark, and Auto (system) themes
- **Minimize to tray** — closing the window hides to the system tray
- **Autostart** — optionally launch on system boot
- **Proxy support** — route traffic through HTTP or SOCKS proxy for geo-blocked regions
- **Persistent settings** — all preferences saved to disk

## Installation

### Download

Download the latest release for your platform from the [Releases](https://github.com/LordKnish/magen/releases) page.

### Build from source

#### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/)

#### Steps

```bash
# Clone the repository
git clone https://github.com/LordKnish/magen.git
cd magen

# Install frontend dependencies
npm install

# Build the application
npm run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Architecture

Magen is built with [Tauri v2](https://v2.tauri.app/), combining a Rust backend with a React + TypeScript frontend.

**Backend (Rust)**
- HTTP poller fetching alerts from the Pikud HaOref API
- Alert processor with deduplication, expiry, and all-clear detection
- Sound playback via rodio
- Native OS notifications via tauri-plugin-notification
- Settings persistence via tauri-plugin-store
- System tray with dynamic status icons

**Frontend (React + TypeScript)**
- Dashboard with active alert cards and countdown timers
- Settings panel with searchable city/zone selector
- Alert history view with filtering
- Interactive Leaflet map with alert zone polygons
- Fullscreen overlay popup window
- First-run onboarding wizard
- Zustand for state management, Tailwind CSS for styling

## Configuration

Open the Settings tab to configure:

- **Cities** — select which cities/zones to monitor
- **Language** — Hebrew, English, or Russian
- **Theme** — Light, Dark, or Auto
- **Sound repeat** — Off, Once, Twice, Thrice, or Continuous
- **Overlay** — enable/disable the fullscreen overlay popup
- **Autostart** — launch Magen on system boot
- **Proxy** — set an HTTP/SOCKS proxy URL (useful outside Israel)

## Disclaimer

Magen is an **unofficial** tool and is not affiliated with or endorsed by Pikud HaOref or the Israel Defense Forces. This software is provided as-is for informational purposes. **Always follow official guidance and instructions from Pikud HaOref.** Do not rely solely on this application for life-safety decisions.

## License

[MIT](LICENSE) -- Copyright 2026 LordKnish
