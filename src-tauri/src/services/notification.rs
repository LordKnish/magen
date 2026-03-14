use tauri::AppHandle;
use tracing::info;
use crate::models::alert::Alert;

#[allow(unused_variables)]
pub fn send_notification(app: &AppHandle, alert: &Alert) {
    info!("Would send notification for {:?} alert: {:?}", alert.alert_type, alert.cities);
}
