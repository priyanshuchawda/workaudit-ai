use crate::services::sidecar::{SessionEventsResult, SidecarHealth, SidecarService};

#[tauri::command]
pub fn get_sidecar_health() -> SidecarHealth {
    SidecarService.health()
}

#[tauri::command]
pub fn start_sidecar() -> SidecarHealth {
    SidecarService.start()
}

#[tauri::command]
pub fn stop_sidecar() -> SidecarHealth {
    SidecarService.stop()
}

#[tauri::command]
pub fn get_session_events(session_id: String) -> SessionEventsResult {
    SidecarService.events(session_id)
}
