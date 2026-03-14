#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, Emitter};
use tokio::time::{sleep, Duration};
use magen_lib::state::AppState;
use magen_lib::tray;
use magen_lib::commands::commands;
use tauri_plugin_autostart::MacosLauncher;

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
                *state.connection_status.write().await = state::ConnectionStatus::Connected;

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
                    services::notification::send_notification(&app, alert);
                    let _ = app.emit("new-alert", alert.clone());
                }
            }
            Ok(None) => {
                backoff_secs = 0;
                *state.connection_status.write().await = state::ConnectionStatus::Connected;
            }
            Err(e) => {
                tracing::warn!("Poll error: {}", e);
                backoff_secs = (backoff_secs.max(5) * 2).min(30);
                let msg = e.to_string();
                if msg.contains("403") || msg.contains("geo") {
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
        ])
        .setup(|app| {
            tray::setup_tray(app)?;
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
