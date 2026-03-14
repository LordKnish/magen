use tauri::{AppHandle, State};
use tauri_plugin_store::StoreExt;
use crate::state::{AppState, ConnectionStatus};
use crate::models::alert::Alert;
use crate::models::city::{City, Zone};
use crate::models::settings::Settings;
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
pub async fn test_alert() -> Result<(), AppError> {
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
