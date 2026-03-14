use tracing::info;
use crate::models::alert::{AlertType, AlertState};
use crate::models::settings::{Language, SoundRepeat};

#[allow(unused_variables)]
pub fn play_alert_sound(alert_type: &AlertType, state: &AlertState, lang: &Language, repeat: &SoundRepeat) {
    info!("Would play alert sound");
}
