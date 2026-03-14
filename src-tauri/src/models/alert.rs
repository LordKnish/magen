use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum AlertType {
    Missiles, General, EarthQuake, RadiologicalEvent, Tsunami,
    HostileAircraftIntrusion, HazardousMaterials, NewsFlash,
    TerroristInfiltration, MissilesDrill, GeneralDrill,
    EarthQuakeDrill, RadiologicalEventDrill, TsunamiDrill,
    HostileAircraftIntrusionDrill, HazardousMaterialsDrill,
    TerroristInfiltrationDrill, Unknown,
}

impl AlertType {
    pub fn from_category(cat: &str) -> Self {
        match cat {
            "1" => Self::Missiles, "2" => Self::General, "3" => Self::EarthQuake,
            "4" => Self::RadiologicalEvent, "5" => Self::Tsunami,
            "6" => Self::HostileAircraftIntrusion, "7" => Self::HazardousMaterials,
            "10" => Self::NewsFlash, "13" => Self::TerroristInfiltration,
            "101" => Self::MissilesDrill, "102" => Self::GeneralDrill,
            "103" => Self::EarthQuakeDrill, "104" => Self::RadiologicalEventDrill,
            "105" => Self::TsunamiDrill, "106" => Self::HostileAircraftIntrusionDrill,
            "107" => Self::HazardousMaterialsDrill, "113" => Self::TerroristInfiltrationDrill,
            _ => Self::Unknown,
        }
    }

    pub fn is_drill(&self) -> bool {
        matches!(self, Self::MissilesDrill | Self::GeneralDrill | Self::EarthQuakeDrill
            | Self::RadiologicalEventDrill | Self::TsunamiDrill
            | Self::HostileAircraftIntrusionDrill | Self::HazardousMaterialsDrill
            | Self::TerroristInfiltrationDrill)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum AlertState { Active, EarlyWarning, AllClear }

/// Raw API response from oref.org.il
#[derive(Debug, Deserialize)]
pub struct OrefResponse {
    pub id: Option<String>,
    pub cat: Option<String>,
    pub title: Option<String>,
    pub data: Option<Vec<String>>,
}

/// Processed alert for internal use and frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Alert {
    pub id: String,
    pub alert_type: AlertType,
    pub state: AlertState,
    pub cities: Vec<String>,
    pub title: Option<String>,
    pub timestamp: i64,
    pub expires_at: i64,
}
