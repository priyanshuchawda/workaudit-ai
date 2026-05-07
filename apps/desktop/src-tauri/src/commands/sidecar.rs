use crate::services::sidecar::{
    RecorderControlResult, SessionEventsResult, SidecarHealth, SidecarService,
};

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

#[tauri::command]
pub fn start_recording_session(
    session_id: String,
    started_at: String,
    title: Option<String>,
    privacy_mode: String,
) -> RecorderControlResult {
    SidecarService.start_recording_session(session_id, started_at, title, privacy_mode)
}

#[tauri::command]
pub fn pause_recording_session(session_id: String, paused_at: String) -> RecorderControlResult {
    SidecarService.pause_recording_session(session_id, paused_at)
}

#[tauri::command]
pub fn resume_recording_session(session_id: String, resumed_at: String) -> RecorderControlResult {
    SidecarService.resume_recording_session(session_id, resumed_at)
}

#[tauri::command]
pub fn stop_recording_session(session_id: String, stopped_at: String) -> RecorderControlResult {
    SidecarService.stop_recording_session(session_id, stopped_at)
}
