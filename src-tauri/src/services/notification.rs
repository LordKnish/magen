use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;
use tracing::{info, warn};

use crate::models::alert::{Alert, AlertState, AlertType};

fn alert_type_label(t: &AlertType) -> &str {
    match t {
        AlertType::Missiles => "Rocket Alert",
        AlertType::General => "General Alert",
        AlertType::EarthQuake => "Earthquake",
        AlertType::RadiologicalEvent => "Radiological Event",
        AlertType::Tsunami => "Tsunami",
        AlertType::HostileAircraftIntrusion => "Hostile Aircraft Intrusion",
        AlertType::HazardousMaterials => "Hazardous Materials",
        AlertType::NewsFlash => "News Flash",
        AlertType::TerroristInfiltration => "Terrorist Infiltration",
        AlertType::MissilesDrill | AlertType::GeneralDrill => "Drill",
        AlertType::EarthQuakeDrill => "Earthquake Drill",
        AlertType::RadiologicalEventDrill => "Radiological Drill",
        AlertType::TsunamiDrill => "Tsunami Drill",
        AlertType::HostileAircraftIntrusionDrill => "Aircraft Intrusion Drill",
        AlertType::HazardousMaterialsDrill => "Hazmat Drill",
        AlertType::TerroristInfiltrationDrill => "Infiltration Drill",
        AlertType::Unknown => "Alert",
    }
}

pub fn send_notification(app: &AppHandle, alert: &Alert) {
    let title = match alert.state {
        AlertState::AllClear => format!("All Clear — {}", alert_type_label(&alert.alert_type)),
        AlertState::EarlyWarning => format!("Early Warning — {}", alert_type_label(&alert.alert_type)),
        AlertState::Active => alert_type_label(&alert.alert_type).to_string(),
    };

    let body = alert.cities.join(", ");

    match app.notification().builder()
        .title(&title)
        .body(&body)
        .show()
    {
        Ok(_) => info!("Notification sent: {}", title),
        Err(e) => warn!("Failed to send notification: {}", e),
    }
}
