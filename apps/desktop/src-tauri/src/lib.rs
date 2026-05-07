pub mod commands;
pub mod services;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::sidecar::get_sidecar_health,
            commands::sidecar::get_session_events,
            commands::sidecar::pause_recording_session,
            commands::sidecar::resume_recording_session,
            commands::sidecar::start_recording_session,
            commands::sidecar::start_sidecar,
            commands::sidecar::stop_recording_session,
            commands::sidecar::stop_sidecar
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
