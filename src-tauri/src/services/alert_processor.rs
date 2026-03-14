use std::collections::HashMap;
use chrono::Utc;
use tracing::{info, debug};

use crate::models::alert::{Alert, AlertState, AlertType, OrefResponse};
use crate::models::city::City;

const DEDUP_WINDOW_SECS: i64 = 120;
const ALL_CLEAR_DURATION_SECS: i64 = 120;
const EARLY_WARNING_DURATION_SECS: i64 = 900;
const ACTIVE_FAILSAFE_SECS: i64 = 3600;

// Hebrew markers for newsFlash (cat 10) detection
const ALL_CLEAR_MARKER: &str = "\u{05D4}\u{05D0}\u{05D9}\u{05E8}\u{05D5}\u{05E2} \u{05D4}\u{05E1}\u{05EA}\u{05D9}\u{05D9}\u{05DD}";
const EARLY_WARNING_MARKER: &str = "\u{05D1}\u{05D3}\u{05E7}\u{05D5}\u{05EA} \u{05D4}\u{05E7}\u{05E8}\u{05D5}\u{05D1}\u{05D5}\u{05EA}";
const TEST_MARKER: &str = "\u{05D1}\u{05D3}\u{05D9}\u{05E7}\u{05D4}";

pub struct ProcessResult {
    pub new_alerts: Vec<Alert>,
    pub all_clear_zones: Vec<String>,
    pub early_warnings: Vec<Alert>,
}

#[allow(unused_variables)]
pub fn process_response(
    response: &OrefResponse,
    cities_db: &[City],
    dedup_cache: &mut HashMap<String, i64>,
    active_alerts: &[Alert],
) -> ProcessResult {
    let now = Utc::now().timestamp();
    let cat = response.cat.as_deref().unwrap_or("1");
    let title = response.title.as_deref().unwrap_or("");
    let data = response.data.as_deref().unwrap_or(&[]);
    let alert_id = response.id.as_deref().unwrap_or("");

    dedup_cache.retain(|_, expires| *expires > now);

    if title.contains(TEST_MARKER) {
        return ProcessResult { new_alerts: vec![], all_clear_zones: vec![], early_warnings: vec![] };
    }

    if cat == "10" {
        if title.contains(ALL_CLEAR_MARKER) {
            let zones = extract_zones(data, cities_db);
            info!("All-clear detected for zones: {:?}", zones);
            return ProcessResult { new_alerts: vec![], all_clear_zones: zones, early_warnings: vec![] };
        }

        if title.contains(EARLY_WARNING_MARKER) {
            let alerts = build_alerts(data, cat, alert_id, title, now, dedup_cache, AlertState::EarlyWarning, now + EARLY_WARNING_DURATION_SECS);
            info!("Early warning for {} cities", alerts.len());
            return ProcessResult { new_alerts: vec![], all_clear_zones: vec![], early_warnings: alerts };
        }
    }

    let alerts = build_alerts(data, cat, alert_id, title, now, dedup_cache, AlertState::Active, now + ACTIVE_FAILSAFE_SECS);
    ProcessResult { new_alerts: alerts, all_clear_zones: vec![], early_warnings: vec![] }
}

fn build_alerts(
    city_names: &[String],
    cat: &str,
    alert_id: &str,
    title: &str,
    now: i64,
    dedup_cache: &mut HashMap<String, i64>,
    state: AlertState,
    expires_at: i64,
) -> Vec<Alert> {
    let alert_type = AlertType::from_category(cat);
    let mut new_cities: Vec<String> = Vec::new();

    for city_name in city_names {
        if !alert_id.is_empty() {
            let id_key = format!("{}-{}", city_name, alert_id);
            if dedup_cache.contains_key(&id_key) {
                debug!("Skipping {} (already notified for alert {})", city_name, alert_id);
                continue;
            }
            dedup_cache.insert(id_key, now + DEDUP_WINDOW_SECS);
        }

        let time_key = format!("{}-throttle", city_name);
        if let Some(expires) = dedup_cache.get(&time_key) {
            if *expires > now {
                debug!("Skipping {} (throttled)", city_name);
                continue;
            }
        }
        dedup_cache.insert(time_key, now + DEDUP_WINDOW_SECS);

        new_cities.push(city_name.clone());
    }

    if new_cities.is_empty() {
        return vec![];
    }

    vec![Alert {
        id: format!("{}-{}-{}", cat, alert_id, now),
        alert_type,
        state,
        cities: new_cities,
        title: if title.is_empty() { None } else { Some(title.to_string()) },
        timestamp: now,
        expires_at,
    }]
}

fn extract_zones(city_names: &[String], cities_db: &[City]) -> Vec<String> {
    let mut zones: Vec<String> = city_names
        .iter()
        .filter_map(|name| {
            cities_db.iter()
                .find(|c| c.name == *name || c.value == *name)
                .map(|c| c.zone_en.clone())
        })
        .collect();
    zones.sort();
    zones.dedup();
    zones
}

pub fn apply_all_clear(active_alerts: &mut Vec<Alert>, zones: &[String], cities_db: &[City]) {
    let now = Utc::now().timestamp();
    let zones_lower: Vec<String> = zones.iter().map(|z| z.to_lowercase()).collect();

    let cleared_cities: std::collections::HashSet<String> = cities_db.iter()
        .filter(|c| zones_lower.contains(&c.zone_en.to_lowercase()))
        .map(|c| c.name.clone())
        .collect();

    for alert in active_alerts.iter_mut() {
        if alert.state == AlertState::Active || alert.state == AlertState::EarlyWarning {
            let has_cleared_city = alert.cities.iter().any(|c| cleared_cities.contains(c));
            if has_cleared_city {
                alert.state = AlertState::AllClear;
                alert.expires_at = now + ALL_CLEAR_DURATION_SECS;
            }
        }
    }
}

pub fn prune_expired(alerts: &mut Vec<Alert>) {
    let now = Utc::now().timestamp();
    alerts.retain(|a| a.expires_at > now);
}
