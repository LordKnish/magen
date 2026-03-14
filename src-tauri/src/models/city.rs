use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct City {
    pub id: u32,
    pub name: String,
    #[serde(default)] pub name_en: String,
    #[serde(default)] pub name_ru: String,
    #[serde(default)] pub name_ar: String,
    #[serde(default)] pub zone: String,
    #[serde(default)] pub zone_en: String,
    #[serde(default)] pub zone_ru: String,
    #[serde(default)] pub zone_ar: String,
    #[serde(default)] pub countdown: u32,
    #[serde(default)] pub lat: f64,
    #[serde(default)] pub lng: f64,
    #[serde(default)] pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Zone {
    pub name: String,
    pub name_en: String,
    pub name_ru: String,
    pub cities: Vec<City>,
}
