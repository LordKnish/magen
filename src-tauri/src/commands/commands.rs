use tauri::{AppHandle, Emitter, State};
use tauri_plugin_store::StoreExt;
use tauri_plugin_autostart::ManagerExt;
use crate::state::{AppState, ConnectionStatus};
use crate::models::alert::{Alert, AlertType, AlertState, HistoricalAlert};
use crate::models::city::{City, Zone};
use crate::models::settings::Settings;
use crate::models::profile::AlertProfile;
use crate::error::AppError;

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<Settings, AppError> {
    Ok(state.settings.read().await.clone())
}

#[tauri::command]
pub async fn save_settings(
    app: AppHandle,
    settings: Settings,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    *state.settings.write().await = settings.clone();

    // Persist to disk via tauri-plugin-store
    let store = app.store("settings.json")
        .map_err(|e| AppError::Settings(format!("Failed to open store: {}", e)))?;
    let value = serde_json::to_value(&settings)?;
    store.set("settings", value);
    // auto_save is enabled by default, so no explicit save() needed

    // Toggle autostart based on settings
    let autolaunch = app.autolaunch();
    if settings.auto_start {
        let _ = autolaunch.enable();
    } else {
        let _ = autolaunch.disable();
    }

    Ok(())
}

#[tauri::command]
pub async fn get_alert_history(state: State<'_, AppState>) -> Result<Vec<Alert>, AppError> {
    Ok(state.alert_history.read().await.clone())
}

#[tauri::command]
pub async fn get_active_alerts(state: State<'_, AppState>) -> Result<Vec<Alert>, AppError> {
    Ok(state.active_alerts.read().await.clone())
}

#[tauri::command]
pub async fn get_connection_status(state: State<'_, AppState>) -> Result<ConnectionStatus, AppError> {
    Ok(state.connection_status.read().await.clone())
}

#[tauri::command]
pub async fn test_alert(app: AppHandle, state: State<'_, AppState>) -> Result<(), AppError> {
    let now = chrono::Utc::now().timestamp();
    let alert = Alert {
        id: format!("test-{}", now),
        alert_type: AlertType::Missiles,
        state: AlertState::Active,
        cities: vec!["\u{05ea}\u{05dc} \u{05d0}\u{05d1}\u{05d9}\u{05d1} - \u{05de}\u{05d6}\u{05e8}\u{05d7}".to_string()],
        title: Some("Test Alert".to_string()),
        timestamp: now,
        expires_at: now + 90,
    };

    state.active_alerts.write().await.push(alert.clone());
    let mut history = state.alert_history.write().await;
    history.insert(0, alert.clone());
    if history.len() > 100 { history.truncate(100); }
    drop(history);

    let lang = state.settings.read().await.language.clone();
    crate::services::notification::send_notification(&app, &alert, &state.cities, &lang);
    let _ = app.emit("new-alert", &alert);
    Ok(())
}

#[tauri::command]
pub async fn preview_profile_alert(
    app: AppHandle,
    cities: Vec<String>,
    alert_type: String,
    do_notify: bool,
    do_sound: bool,
    do_overlay: bool,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    if cities.is_empty() {
        return Err(AppError::Settings("No cities selected".into()));
    }

    let settings = state.settings.read().await;
    let lang = settings.language.clone();
    let repeat = settings.sound_repeat.clone();
    drop(settings);

    let parsed_type = AlertType::from_category(&alert_type);
    let now = chrono::Utc::now().timestamp();
    let preview_cities: Vec<String> = cities.iter().take(5).cloned().collect();

    let alert = Alert {
        id: format!("preview-{}", now),
        alert_type: parsed_type,
        state: AlertState::Active,
        cities: preview_cities,
        title: Some("Preview Alert".to_string()),
        timestamp: now,
        expires_at: now + 15,
    };

    state.active_alerts.write().await.push(alert.clone());
    let _ = app.emit("new-alert", &alert);

    if do_notify {
        crate::services::notification::send_notification(&app, &alert, &state.cities, &lang);
    }
    if do_overlay {
        crate::overlay::show_overlay(&app, &[alert.clone()]);
    }
    if do_sound {
        crate::services::sound::play_alert_sound(
            &alert.alert_type, &alert.state, &lang, &repeat,
        );
    }

    Ok(())
}

#[tauri::command]
pub async fn search_cities(query: String, state: State<'_, AppState>) -> Result<Vec<City>, AppError> {
    let q = query.to_lowercase();
    let results: Vec<City> = state.cities.iter()
        .filter(|c| {
            c.value.to_lowercase().contains(&q)
                || c.name.to_lowercase().contains(&q)
                || c.name_en.to_lowercase().contains(&q)
                || c.name_ru.to_lowercase().contains(&q)
                || c.zone.to_lowercase().contains(&q)
                || c.zone_en.to_lowercase().contains(&q)
        })
        .cloned()
        .collect();
    Ok(results)
}

#[tauri::command]
pub async fn get_polygons() -> Result<serde_json::Value, AppError> {
    let bytes = include_bytes!("../../resources/polygons.json");
    serde_json::from_slice(bytes).map_err(|e| AppError::Api(format!("Failed to parse polygons.json: {}", e)))
}

const HISTORICAL_URL: &str = "https://www.tzevaadom.co.il/static/historical/all.json";

#[tauri::command]
pub async fn fetch_historical_alerts(state: State<'_, AppState>) -> Result<Vec<HistoricalAlert>, AppError> {
    let proxy = state.settings.read().await.proxy_url.clone();
    let client = crate::services::poller::build_client(proxy.as_deref())?;
    let response = client.get(HISTORICAL_URL).send().await?;
    if !response.status().is_success() {
        return Err(AppError::Api(format!("HTTP {}", response.status())));
    }
    let raw: Vec<(i64, u8, Vec<String>, i64)> = response.json().await
        .map_err(|e| AppError::Api(format!("Failed to parse historical data: {}", e)))?;
    let alerts: Vec<HistoricalAlert> = raw.into_iter().map(|(id, category, towns, ts)| {
        HistoricalAlert { id, category, towns, timestamp: ts }
    }).collect();
    Ok(alerts)
}

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
    settings.selected_cities = settings.all_monitored_cities();

    let store = app.store("settings.json")
        .map_err(|e| AppError::Settings(format!("Failed to open store: {}", e)))?;
    let value = serde_json::to_value(&*settings)?;
    store.set("settings", value);
    Ok(())
}

#[tauri::command]
pub async fn get_all_zones(state: State<'_, AppState>) -> Result<Vec<Zone>, AppError> {
    let mut zone_map: std::collections::HashMap<String, Vec<City>> = std::collections::HashMap::new();
    for city in &state.cities {
        zone_map.entry(city.zone.clone()).or_default().push(city.clone());
    }
    let zones: Vec<Zone> = zone_map.into_iter().map(|(name, cities)| {
        let zone_en = cities.first().map(|c| c.zone_en.clone()).unwrap_or_default();
        let zone_ru = cities.first().map(|c| c.zone_ru.clone()).unwrap_or_default();
        Zone { name, name_en: zone_en, name_ru: zone_ru, cities }
    }).collect();
    Ok(zones)
}
