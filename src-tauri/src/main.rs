#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use magen_lib::state::AppState;
use magen_lib::tray;
use magen_lib::commands::commands;
use tauri_plugin_autostart::MacosLauncher;

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
        ])
        .setup(|app| {
            tray::setup_tray(app)?;
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
