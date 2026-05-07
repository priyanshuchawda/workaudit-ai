use crate::services::sidecar::{
    RecorderControlResult, ScreenshotDeletionResult, SessionEventsResult, SessionExportResult,
    SessionFolderResult, SessionScreenshotsResult, SidecarHealth, SidecarService,
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

#[tauri::command]
pub fn export_session_markdown(session_id: String) -> SessionExportResult {
    SidecarService.export_session_markdown(session_id)
}

#[tauri::command]
pub fn export_session_raw_json(session_id: String) -> SessionExportResult {
    SidecarService.export_session_raw_json(session_id)
}

#[tauri::command]
pub fn get_session_folder(session_id: String) -> SessionFolderResult {
    SidecarService.session_folder(session_id)
}

#[tauri::command]
pub fn get_session_screenshots(session_id: String) -> SessionScreenshotsResult {
    SidecarService.session_screenshots(session_id)
}

#[tauri::command]
pub fn delete_session_screenshots(session_id: String) -> ScreenshotDeletionResult {
    SidecarService.delete_session_screenshots(session_id)
}
