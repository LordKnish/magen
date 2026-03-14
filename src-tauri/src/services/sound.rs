use rodio::{Decoder, OutputStream, Sink};
use std::io::Cursor;
use std::thread;
use tracing::warn;

use crate::models::alert::{AlertState, AlertType};
use crate::models::settings::{Language, SoundRepeat};

macro_rules! include_sound {
    ($path:expr) => {
        include_bytes!(concat!("../../resources/sounds/", $path))
    };
}

fn get_siren() -> &'static [u8] {
    include_sound!("alarmSound.mp3")
}

fn get_state_sound(state: &AlertState) -> Option<&'static [u8]> {
    match state {
        AlertState::EarlyWarning => Some(include_sound!("flash.mp3")),
        AlertState::AllClear => Some(include_sound!("update.mp3")),
        AlertState::Active => None,
    }
}

fn get_voice(alert_type: &AlertType, lang: &Language) -> Option<&'static [u8]> {
    match (alert_type, lang) {
        (AlertType::EarthQuake, Language::Hebrew) => Some(include_sound!("earthQuaqe-heb.mp3")),
        (AlertType::EarthQuake, Language::English) => Some(include_sound!("earthQuaqe-eng.mp3")),
        (AlertType::EarthQuake, Language::Russian) => Some(include_sound!("earthQuaqe-rus.mp3")),
        (AlertType::HazardousMaterials, Language::Hebrew) => Some(include_sound!("hazardousMaterials-heb.mp3")),
        (AlertType::HazardousMaterials, Language::English) => Some(include_sound!("hazardousMaterials-eng.mp3")),
        (AlertType::HazardousMaterials, Language::Russian) => Some(include_sound!("hazardousMaterials-rus.mp3")),
        (AlertType::HostileAircraftIntrusion, Language::Hebrew) => Some(include_sound!("hostileAircraftIntrusion-heb.mp3")),
        (AlertType::HostileAircraftIntrusion, Language::English) => Some(include_sound!("hostileAircraftIntrusion-eng.mp3")),
        (AlertType::HostileAircraftIntrusion, Language::Russian) => Some(include_sound!("hostileAircraftIntrusion-rus.mp3")),
        (AlertType::RadiologicalEvent, Language::Hebrew) => Some(include_sound!("radiologicalEvent-heb.mp3")),
        (AlertType::RadiologicalEvent, Language::English) => Some(include_sound!("radiologicalEvent-eng.mp3")),
        (AlertType::RadiologicalEvent, Language::Russian) => Some(include_sound!("radiologicalEvent-rus.mp3")),
        (AlertType::TerroristInfiltration, Language::Hebrew) => Some(include_sound!("terroristInfiltration-heb.mp3")),
        (AlertType::TerroristInfiltration, Language::English) => Some(include_sound!("terroristInfiltration-eng.mp3")),
        (AlertType::TerroristInfiltration, Language::Russian) => Some(include_sound!("terroristInfiltration-rus.mp3")),
        (AlertType::Tsunami, Language::Hebrew) => Some(include_sound!("tsunami-heb.mp3")),
        (AlertType::Tsunami, Language::English) => Some(include_sound!("tsunami-eng.mp3")),
        (AlertType::Tsunami, Language::Russian) => Some(include_sound!("tsunami-rus.mp3")),
        _ => None,
    }
}

pub fn play_alert_sound(alert_type: &AlertType, state: &AlertState, lang: &Language, repeat: &SoundRepeat) {
    if matches!(repeat, SoundRepeat::Off) {
        return;
    }

    let alert_type = alert_type.clone();
    let state = state.clone();
    let lang = lang.clone();
    let repeat = repeat.clone();

    thread::spawn(move || {
        let (_stream, stream_handle) = match OutputStream::try_default() {
            Ok(s) => s,
            Err(e) => {
                warn!("No audio device: {}", e);
                return;
            }
        };

        let sink = match Sink::try_new(&stream_handle) {
            Ok(s) => s,
            Err(e) => {
                warn!("Failed to create audio sink: {}", e);
                return;
            }
        };

        let times = match repeat {
            SoundRepeat::Once => 1,
            SoundRepeat::Twice => 2,
            SoundRepeat::Thrice => 3,
            SoundRepeat::Continuous => 10,
            SoundRepeat::Off => return,
        };

        for _ in 0..times {
            // Play state sound (early warning / all clear) OR siren
            if let Some(state_sound) = get_state_sound(&state) {
                if let Ok(source) = Decoder::new(Cursor::new(state_sound)) {
                    sink.append(source);
                }
            } else {
                // Active alert: play siren then voice
                if let Ok(source) = Decoder::new(Cursor::new(get_siren())) {
                    sink.append(source);
                }
                if let Some(voice) = get_voice(&alert_type, &lang) {
                    if let Ok(source) = Decoder::new(Cursor::new(voice)) {
                        sink.append(source);
                    }
                }
            }
        }

        sink.sleep_until_end();
    });
}
