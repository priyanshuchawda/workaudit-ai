use std::{
    io::{Read, Write},
    net::TcpListener,
    thread,
};
use worktrace_desktop_lib::commands::sidecar::{
    get_session_events, pause_recording_session, resume_recording_session, start_recording_session,
    stop_recording_session,
};
use worktrace_desktop_lib::services::sidecar::{
    RecorderControlStatus, SessionEventsStatus, SidecarService, SidecarStatus,
};

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

#[test]
fn events_report_safe_unavailable_state_when_bridge_is_missing() {
    let service = SidecarService;

    let result = service.events("latest".to_string());

    assert_eq!(result.status, SessionEventsStatus::Unavailable);
    assert!(result.events.is_empty());
}

#[test]
fn command_exposes_safe_session_events_fallback() {
    let result = get_session_events("latest".to_string());

    assert_eq!(result.status, SessionEventsStatus::Unavailable);
    assert!(result.events.is_empty());
}

#[test]
fn recorder_control_commands_return_safe_unavailable_state_when_bridge_is_missing() {
    let start = start_recording_session(
        "sess_control_001".to_string(),
        "2026-05-06T09:14:00+05:30".to_string(),
        Some("Desktop control".to_string()),
        "standard".to_string(),
    );
    let pause = pause_recording_session(
        "sess_control_001".to_string(),
        "2026-05-06T09:15:00+05:30".to_string(),
    );
    let resume = resume_recording_session(
        "sess_control_001".to_string(),
        "2026-05-06T09:16:00+05:30".to_string(),
    );
    let stop = stop_recording_session(
        "sess_control_001".to_string(),
        "2026-05-06T09:17:00+05:30".to_string(),
    );

    assert_eq!(start.status, RecorderControlStatus::Unavailable);
    assert_eq!(pause.status, RecorderControlStatus::Unavailable);
    assert_eq!(resume.status, RecorderControlStatus::Unavailable);
    assert_eq!(stop.status, RecorderControlStatus::Unavailable);
    assert!(start.session.is_none());
}

#[test]
fn recorder_controls_post_to_local_sidecar_and_return_session_state() {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind local test server");
    let port = listener.local_addr().expect("read local addr").port();
    let handle = thread::spawn(move || {
        let expected_paths = [
            "POST /sessions/start HTTP/1.1",
            "POST /sessions/sess_control_001/pause HTTP/1.1",
            "POST /sessions/sess_control_001/resume HTTP/1.1",
            "POST /sessions/sess_control_001/stop HTTP/1.1",
        ];
        let statuses = ["recording", "paused", "recording", "stopped"];

        for (index, expected_path) in expected_paths.iter().enumerate() {
            let (mut stream, _) = listener.accept().expect("accept sidecar request");
            let mut request = [0_u8; 2048];
            let read_count = stream.read(&mut request).expect("read sidecar request");
            let request_text = String::from_utf8_lossy(&request[..read_count]);
            assert!(request_text.starts_with(expected_path));
            assert!(request_text.contains("Content-Type: application/json"));

            let body = format!(
                r#"{{"id":"sess_control_001","started_at":"2026-05-06T09:14:00+05:30","ended_at":null,"status":"{}","title":"Desktop control","storage_path":null,"privacy_mode":"standard"}}"#,
                statuses[index]
            );
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            stream
                .write_all(response.as_bytes())
                .expect("write response");
        }
    });

    let service = SidecarService;
    let base_url = format!("http://127.0.0.1:{port}");
    let start = service.start_recording_session_from_base_url(
        "sess_control_001".to_string(),
        "2026-05-06T09:14:00+05:30".to_string(),
        Some("Desktop control".to_string()),
        "standard".to_string(),
        &base_url,
    );
    let pause = service.pause_recording_session_from_base_url(
        "sess_control_001".to_string(),
        "2026-05-06T09:15:00+05:30".to_string(),
        &base_url,
    );
    let resume = service.resume_recording_session_from_base_url(
        "sess_control_001".to_string(),
        "2026-05-06T09:16:00+05:30".to_string(),
        &base_url,
    );
    let stop = service.stop_recording_session_from_base_url(
        "sess_control_001".to_string(),
        "2026-05-06T09:17:00+05:30".to_string(),
        &base_url,
    );
    handle.join().expect("join local server");

    assert_eq!(start.status, RecorderControlStatus::Available);
    assert_eq!(
        start.session.as_ref().expect("start session").status,
        "recording"
    );
    assert_eq!(
        pause.session.as_ref().expect("pause session").status,
        "paused"
    );
    assert_eq!(
        resume.session.as_ref().expect("resume session").status,
        "recording"
    );
    assert_eq!(
        stop.session.as_ref().expect("stop session").status,
        "stopped"
    );
}

#[test]
fn events_load_timeline_events_from_local_sidecar() {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind local test server");
    let port = listener.local_addr().expect("read local addr").port();
    let handle = thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("accept sidecar request");
        let mut request = [0_u8; 1024];
        let read_count = stream.read(&mut request).expect("read sidecar request");
        let request_text = String::from_utf8_lossy(&request[..read_count]);
        assert!(request_text.starts_with("GET /sessions/sess_bridge_001/events HTTP/1.1"));

        let body = r#"{"events":[{"id":"evt_live_001","session_id":"sess_bridge_001","timestamp":"2026-05-06T09:14:00+05:30","source":"active_window","type":"active_window_changed","privacy_level":"safe","confidence":0.98,"metadata":{"app":"VS Code","window_title":"workaudit-ai GITHUB_TOKEN=ghp_test","process_name":"Code.exe"}},{"id":"evt_file_001","session_id":"sess_bridge_001","timestamp":"2026-05-06T09:15:00+05:30","source":"file_watcher","type":"file_changed","privacy_level":"safe","confidence":1.0,"metadata":{"path":"C:/repo/src/app.py","operation":"modified","file_name":"app.py","extension":".py"}},{"id":"evt_terminal_001","session_id":"sess_bridge_001","timestamp":"2026-05-06T09:16:00+05:30","source":"terminal_command_detector","type":"terminal_command","privacy_level":"redacted","confidence":1.0,"metadata":{"command":"pnpm test --token [REDACTED]","shell":"powershell","exit_code":1,"command_hash":"hash-terminal"}}]}"#;
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
        );
        stream
            .write_all(response.as_bytes())
            .expect("write response");
    });

    let service = SidecarService;
    let result = service.events_from_base_url(
        "sess_bridge_001".to_string(),
        &format!("http://127.0.0.1:{port}"),
    );
    handle.join().expect("join local server");

    assert_eq!(result.status, SessionEventsStatus::Available);
    assert_eq!(result.events.len(), 3);
    assert_eq!(result.events[0].app, "VS Code");
    assert_eq!(result.events[0].window_title, "workaudit-ai [REDACTED]");
    assert_eq!(result.events[1].app, "File change");
    assert_eq!(result.events[1].window_title, "modified C:/repo/src/app.py");
    assert_eq!(result.events[1].source, "file_watcher");
    assert_eq!(result.events[1].event_type, "file_changed");
    assert_eq!(result.events[2].app, "Terminal command");
    assert_eq!(
        result.events[2].window_title,
        "powershell exit 1: pnpm test --token [REDACTED]"
    );
    assert_eq!(result.events[2].source, "terminal_command_detector");
    assert_eq!(result.events[2].event_type, "terminal_command");
}

#[test]
fn events_allow_latest_session_lookup_through_sidecar() {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind local test server");
    let port = listener.local_addr().expect("read local addr").port();
    let handle = thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("accept sidecar request");
        let mut request = [0_u8; 1024];
        let read_count = stream.read(&mut request).expect("read sidecar request");
        let request_text = String::from_utf8_lossy(&request[..read_count]);
        assert!(request_text.starts_with("GET /sessions/latest/events HTTP/1.1"));

        let body = r#"{"events":[]}"#;
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
        );
        stream
            .write_all(response.as_bytes())
            .expect("write response");
    });

    let service = SidecarService;
    let result =
        service.events_from_base_url("latest".to_string(), &format!("http://127.0.0.1:{port}"));
    handle.join().expect("join local server");

    assert_eq!(result.status, SessionEventsStatus::Available);
    assert!(result.events.is_empty());
}
