use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;
use tracing::{info, warn};

use crate::models::alert::{Alert, AlertState, AlertType};
use crate::models::city::City;
use crate::models::settings::Language;

fn alert_type_label(t: &AlertType, lang: &Language) -> &'static str {
    match (t, lang) {
        // Hebrew
        (AlertType::Missiles, Language::Hebrew) => "התרעת רקטות",
        (AlertType::General, Language::Hebrew) => "התרעה כללית",
        (AlertType::EarthQuake, Language::Hebrew) => "רעידת אדמה",
        (AlertType::RadiologicalEvent, Language::Hebrew) => "אירוע רדיולוגי",
        (AlertType::Tsunami, Language::Hebrew) => "צונאמי",
        (AlertType::HostileAircraftIntrusion, Language::Hebrew) => "חדירת כלי טיס עוין",
        (AlertType::HazardousMaterials, Language::Hebrew) => "חומרים מסוכנים",
        (AlertType::NewsFlash, Language::Hebrew) => "מבזק חדשות",
        (AlertType::TerroristInfiltration, Language::Hebrew) => "חדירת מחבלים",

        // Russian
        (AlertType::Missiles, Language::Russian) => "Ракетная тревога",
        (AlertType::General, Language::Russian) => "Общая тревога",
        (AlertType::EarthQuake, Language::Russian) => "Землетрясение",
        (AlertType::RadiologicalEvent, Language::Russian) => "Радиологическое событие",
        (AlertType::Tsunami, Language::Russian) => "Цунами",
        (AlertType::HostileAircraftIntrusion, Language::Russian) => "Вторжение воздушного судна",
        (AlertType::HazardousMaterials, Language::Russian) => "Опасные материалы",
        (AlertType::NewsFlash, Language::Russian) => "Экстренные новости",
        (AlertType::TerroristInfiltration, Language::Russian) => "Проникновение террористов",

        // English (default)
        (AlertType::Missiles, _) => "Rocket Alert",
        (AlertType::General, _) => "General Alert",
        (AlertType::EarthQuake, _) => "Earthquake",
        (AlertType::RadiologicalEvent, _) => "Radiological Event",
        (AlertType::Tsunami, _) => "Tsunami",
        (AlertType::HostileAircraftIntrusion, _) => "Hostile Aircraft Intrusion",
        (AlertType::HazardousMaterials, _) => "Hazardous Materials",
        (AlertType::NewsFlash, _) => "News Flash",
        (AlertType::TerroristInfiltration, _) => "Terrorist Infiltration",

        // Drills (English only, all languages)
        (AlertType::MissilesDrill | AlertType::GeneralDrill, _) => "Drill",
        (AlertType::EarthQuakeDrill, _) => "Earthquake Drill",
        (AlertType::RadiologicalEventDrill, _) => "Radiological Drill",
        (AlertType::TsunamiDrill, _) => "Tsunami Drill",
        (AlertType::HostileAircraftIntrusionDrill, _) => "Aircraft Intrusion Drill",
        (AlertType::HazardousMaterialsDrill, _) => "Hazmat Drill",
        (AlertType::TerroristInfiltrationDrill, _) => "Infiltration Drill",
        (AlertType::Unknown, _) => "Alert",
    }
}

fn state_label(state: &AlertState, lang: &Language) -> &'static str {
    match (state, lang) {
        (AlertState::AllClear, Language::Hebrew) => "האירוע הסתיים",
        (AlertState::AllClear, Language::Russian) => "Отбой тревоги",
        (AlertState::AllClear, _) => "All Clear",
        (AlertState::EarlyWarning, Language::Hebrew) => "התרעה מוקדמת",
        (AlertState::EarlyWarning, Language::Russian) => "Раннее предупреждение",
        (AlertState::EarlyWarning, _) => "Early Warning",
        (AlertState::Active, _) => "",
    }
}

fn translate_city(hebrew_name: &str, cities_db: &[City], lang: &Language) -> String {
    match lang {
        Language::Hebrew => hebrew_name.to_string(),
        _ => {
            if let Some(city) = cities_db.iter().find(|c| c.name == hebrew_name || c.value == hebrew_name) {
                match lang {
                    Language::English => {
                        if city.name_en.is_empty() { hebrew_name.to_string() } else { city.name_en.clone() }
                    }
                    Language::Russian => {
                        if city.name_ru.is_empty() {
                            if city.name_en.is_empty() { hebrew_name.to_string() } else { city.name_en.clone() }
                        } else {
                            city.name_ru.clone()
                        }
                    }
                    Language::Hebrew => unreachable!(),
                }
            } else {
                hebrew_name.to_string()
            }
        }
    }
}

pub fn send_notification(app: &AppHandle, alert: &Alert, cities_db: &[City], lang: &Language) {
    let type_label = alert_type_label(&alert.alert_type, lang);

    let title = match alert.state {
        AlertState::Active => type_label.to_string(),
        _ => format!("{} — {}", state_label(&alert.state, lang), type_label),
    };

    let body = alert.cities.iter()
        .map(|c| translate_city(c, cities_db, lang))
        .collect::<Vec<_>>()
        .join(", ");

    match app.notification().builder()
        .title(&title)
        .body(&body)
        .show()
    {
        Ok(_) => info!("Notification sent: {}", title),
        Err(e) => warn!("Failed to send notification: {}", e),
    }
}
