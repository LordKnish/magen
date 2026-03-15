use serde::{Deserialize, Serialize};
use crate::models::profile::AlertProfile;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Language { Hebrew, English, Russian }
impl Default for Language { fn default() -> Self { Self::Hebrew } }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Theme { Auto, Light, Dark }
impl Default for Theme { fn default() -> Self { Self::Auto } }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SoundRepeat { Off, Once, Twice, Thrice, Continuous }
impl Default for SoundRepeat { fn default() -> Self { Self::Twice } }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub selected_cities: Vec<String>,
    #[serde(default)]
    pub profiles: Vec<AlertProfile>,
    pub language: Language,
    pub theme: Theme,
    pub sound_repeat: SoundRepeat,
    pub overlay_enabled: bool,
    pub auto_start: bool,
    pub proxy_url: Option<String>,
    pub notify_all_clear: bool,
    pub notify_early_warning: bool,
    pub show_all_clear: bool,
    pub show_early_warning: bool,
    pub first_run_complete: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            selected_cities: Vec::new(),
            profiles: Vec::new(),
            language: Language::default(),
            theme: Theme::default(), sound_repeat: SoundRepeat::default(),
            overlay_enabled: true, auto_start: false, proxy_url: None,
            notify_all_clear: true, notify_early_warning: true,
            show_all_clear: true, show_early_warning: true,
            first_run_complete: false,
        }
    }
}

impl Settings {
    /// Migrate from old selectedCities to profiles format
    pub fn migrate_if_needed(&mut self) {
        if self.profiles.is_empty() && !self.selected_cities.is_empty() {
            self.profiles.push(AlertProfile::default_home(self.selected_cities.clone()));
        }
    }

    /// Get all monitored cities across all profiles
    pub fn all_monitored_cities(&self) -> Vec<String> {
        let mut cities: Vec<String> = self.profiles.iter()
            .flat_map(|p| p.cities.iter().cloned())
            .collect();
        cities.sort();
        cities.dedup();
        cities
    }
}
