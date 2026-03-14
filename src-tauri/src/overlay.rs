use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, Emitter};
use tracing::{info, warn};
use crate::models::alert::Alert;

pub fn show_overlay(app: &AppHandle, alerts: &[Alert]) {
    let window = if let Some(w) = app.get_webview_window("overlay") {
        w
    } else {
        match WebviewWindowBuilder::new(app, "overlay", WebviewUrl::App("/overlay".into()))
            .title("Magen Alert")
            .inner_size(420.0, 350.0)
            .decorations(false)
            .transparent(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .center()
            .focused(true)
            .build()
        {
            Ok(w) => w,
            Err(e) => { warn!("Failed to create overlay window: {}", e); return; }
        }
    };
    let _ = window.show();
    let _ = window.set_focus();
    let _ = app.emit_to("overlay", "overlay-alerts", alerts.to_vec());
    info!("Overlay shown with {} alerts", alerts.len());
}

pub fn hide_overlay(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("overlay") {
        let _ = window.hide();
    }
}
