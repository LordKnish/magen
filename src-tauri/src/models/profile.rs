use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlertProfile {
    pub id: String,
    pub name: String,
    pub color: String,
    pub cities: Vec<String>,
    pub alert_types: Vec<String>,
    pub notify: bool,
    pub sound: bool,
    pub overlay: bool,
    pub priority: u8,
}

impl AlertProfile {
    pub fn default_home(cities: Vec<String>) -> Self {
        Self {
            id: "home".to_string(),
            name: "Home".to_string(),
            color: "#1D55D0".to_string(),
            cities,
            alert_types: vec![],
            notify: true,
            sound: true,
            overlay: true,
            priority: 1,
        }
    }
}
