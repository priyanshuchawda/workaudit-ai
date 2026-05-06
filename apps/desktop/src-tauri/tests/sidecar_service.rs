use worktrace_desktop_lib::services::sidecar::{SidecarService, SidecarStatus};

#[test]
fn default_sidecar_health_reports_missing_binary() {
    let service = SidecarService;

    let health = service.health();

    assert_eq!(health.status, SidecarStatus::Missing);
    assert_eq!(health.app_version, None);
    assert_eq!(health.schema_version, None);
    assert_eq!(
        health.message,
        "Local agent sidecar binary is not configured yet."
    );
}

#[test]
fn start_reports_safe_missing_sidecar_state() {
    let service = SidecarService;

    let health = service.start();

    assert_eq!(health.status, SidecarStatus::Missing);
    assert_eq!(
        health.message,
        "Local agent sidecar binary is not configured yet."
    );
}

#[test]
fn stop_reports_safe_missing_sidecar_state() {
    let service = SidecarService;

    let health = service.stop();

    assert_eq!(health.status, SidecarStatus::Missing);
    assert_eq!(health.message, "Local agent sidecar is not running.");
}
