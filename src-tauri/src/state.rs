use std::collections::HashMap;
use tokio::sync::RwLock;
use crate::models::alert::Alert;
use crate::models::city::City;
use crate::models::settings::Settings;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ConnectionStatus { Connected, ConnectionIssue, Disconnected, GeoBlocked }

pub struct AppState {
    pub active_alerts: RwLock<Vec<Alert>>,
    pub alert_history: RwLock<Vec<Alert>>,
    pub connection_status: RwLock<ConnectionStatus>,
    pub settings: RwLock<Settings>,
    pub cities: Vec<City>,
    pub dedup_cache: RwLock<HashMap<String, i64>>,
}

impl AppState {
    pub fn new(cities: Vec<City>) -> Self {
        Self {
            active_alerts: RwLock::new(Vec::new()),
            alert_history: RwLock::new(Vec::new()),
            connection_status: RwLock::new(ConnectionStatus::Disconnected),
            settings: RwLock::new(Settings::default()),
            cities,
            dedup_cache: RwLock::new(HashMap::new()),
        }
    }
}
