#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, Emitter};
use tokio::time::{sleep, Duration};
use magen_lib::state::AppState;
use magen_lib::tray;
use magen_lib::commands::commands;
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_store::StoreExt;

async fn polling_loop(app: tauri::AppHandle) {
    use magen_lib::{state, services};
    let state = app.state::<magen_lib::state::AppState>();
    let proxy = state.settings.read().await.proxy_url.clone();
    let client = match services::poller::build_client(proxy.as_deref()) {
        Ok(c) => c,
        Err(e) => { tracing::error!("Failed to build HTTP client: {}", e); return; }
    };

    let mut backoff_secs: u64 = 0;

    loop {
        let has_active = !state.active_alerts.read().await.is_empty();
        let base_interval = if has_active { 2 } else { 5 };
        let interval = if backoff_secs > 0 { backoff_secs } else { base_interval };

        match services::poller::fetch_alerts(&client).await {
            Ok(Some(response)) => {
                backoff_secs = 0;
                let prev = state.connection_status.read().await.clone();
                *state.connection_status.write().await = state::ConnectionStatus::Connected;
                if !matches!(prev, state::ConnectionStatus::Connected) {
                    let _ = app.emit("connection-status-changed", state::ConnectionStatus::Connected);
                }

                let result = {
                    let mut dedup = state.dedup_cache.write().await;
                    let active = state.active_alerts.read().await;
                    services::alert_processor::process_response(&response, &state.cities, &mut dedup, &active)
                };

                if !result.all_clear_zones.is_empty() {
                    let mut active = state.active_alerts.write().await;
                    services::alert_processor::apply_all_clear(&mut active, &result.all_clear_zones, &state.cities);
                    let _ = app.emit("alerts-updated", active.clone());
                }

                for ew in &result.early_warnings {
                    state.active_alerts.write().await.push(ew.clone());
                    let _ = app.emit("early-warning", ew.clone());
                }

                for alert in &result.new_alerts {
                    state.active_alerts.write().await.push(alert.clone());
                    let mut history = state.alert_history.write().await;
                    history.insert(0, alert.clone());
                    if history.len() > 100 { history.truncate(100); }

                    // Profile-aware notification
                    let settings = state.settings.read().await;
                    let matched: Vec<String> = settings.profiles.iter()
                        .filter(|p| {
                            let city_match = alert.cities.iter().any(|c| p.cities.contains(c));
                            let type_match = p.alert_types.is_empty() ||
                                p.alert_types.contains(&format!("{:?}", alert.alert_type));
                            city_match && type_match
                        })
                        .map(|p| p.id.clone())
                        .collect();
                    let no_profiles = settings.profiles.is_empty();
                    let should_notify = no_profiles || matched.iter().any(|id| {
                        settings.profiles.iter().any(|p| p.id == *id && p.notify)
                    });
                    drop(settings);

                    if should_notify || no_profiles {
                        let s = state.settings.read().await;
                        let lang_for_notif = s.language.clone();
                        drop(s);
                        services::notification::send_notification(&app, alert, &state.cities, &lang_for_notif);
                    }

                    // Overlay popup
                    let settings2 = state.settings.read().await;
                    let should_overlay = no_profiles || matched.iter().any(|id| {
                        settings2.profiles.iter().any(|p| p.id == *id && p.overlay)
                    });
                    if (should_overlay || no_profiles) && settings2.overlay_enabled {
                        magen_lib::overlay::show_overlay(&app, &[alert.clone()]);
                    }

                    // Sound
                    let should_sound = no_profiles || matched.iter().any(|id| {
                        settings2.profiles.iter().any(|p| p.id == *id && p.sound)
                    });
                    if should_sound || no_profiles {
                        magen_lib::services::sound::play_alert_sound(
                            &alert.alert_type, &alert.state,
                            &settings2.language, &settings2.sound_repeat,
                        );
                    }
                    drop(settings2);

                    let _ = app.emit("new-alert", alert.clone());
                }
            }
            Ok(None) => {
                backoff_secs = 0;
                let prev = state.connection_status.read().await.clone();
                *state.connection_status.write().await = state::ConnectionStatus::Connected;
                if !matches!(prev, state::ConnectionStatus::Connected) {
                    let _ = app.emit("connection-status-changed", state::ConnectionStatus::Connected);
                }
            }
            Err(e) => {
                tracing::warn!("Poll error: {}", e);
                backoff_secs = (backoff_secs.max(5) * 2).min(30);
                let msg = e.to_string();
                if msg.contains("403") || msg.contains("geo") || msg.contains("error page") || msg.contains("errorpage") {
                    *state.connection_status.write().await = state::ConnectionStatus::GeoBlocked;
                } else {
                    *state.connection_status.write().await = state::ConnectionStatus::ConnectionIssue;
                }
                let status = state.connection_status.read().await.clone();
                let _ = app.emit("connection-status-changed", status);
            }
        }

        { let mut active = state.active_alerts.write().await; services::alert_processor::prune_expired(&mut active); }

        sleep(Duration::from_secs(interval)).await;
    }
}

fn main() {
    tracing_subscriber::fmt::init();

    let cities = load_cities();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec![])))
        .manage(AppState::new(cities))
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::save_settings,
            commands::get_alert_history,
            commands::get_active_alerts,
            commands::get_connection_status,
            commands::test_alert,
            commands::search_cities,
            commands::get_all_zones,
            commands::get_polygons,
            commands::fetch_historical_alerts,
            commands::get_profiles,
            commands::save_profiles,
            commands::preview_profile_alert,
        ])
        .setup(|app| {
            // Load persisted settings from store
            if let Ok(store) = app.store("settings.json") {
                if let Some(val) = store.get("settings") {
                    if let Ok(mut settings) = serde_json::from_value::<magen_lib::models::settings::Settings>(val) {
                        settings.migrate_if_needed();
                        let state = app.state::<AppState>();
                        *state.settings.blocking_write() = settings;
                    }
                }
            }

            tray::setup_tray(app)?;

            // Workaround: WebKitGTK + Vite dev server white screen on Wayland
            // See https://github.com/tauri-apps/tauri/issues/13885
            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.eval("setTimeout(() => window.location.reload(), 500)");
            }

            // Intercept window close -> minimize to tray instead of quit
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });
            }

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                polling_loop(handle).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error running magen");
}

fn load_cities() -> Vec<magen_lib::models::city::City> {
    let bytes = include_bytes!("../resources/cities.json");
    match serde_json::from_slice(bytes) {
        Ok(cities) => cities,
        Err(e) => {
            tracing::error!("Failed to parse embedded cities.json: {}", e);
            Vec::new()
        }
    }
}
