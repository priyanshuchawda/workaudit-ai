use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    env,
    io::{Read, Write},
    net::{TcpStream, ToSocketAddrs},
    time::Duration,
};

const MISSING_MESSAGE: &str = "Local agent sidecar binary is not configured yet.";
const NOT_RUNNING_MESSAGE: &str = "Local agent sidecar is not running.";
const SIDECAR_URL_ENV: &str = "WORKTRACE_SIDECAR_URL";
const HTTP_TIMEOUT: Duration = Duration::from_secs(2);
const REDACTION_TOKEN: &str = "[REDACTED]";
const SECRET_FRAGMENTS: &[&str] = &[
    "OPENAI_API_KEY=sk-test",
    "GITHUB_TOKEN=ghp_test",
    "AWS_SECRET_ACCESS_KEY=test",
    "password=mysecret",
    "email@example.com",
    "+91 9876543210",
    "-----BEGIN PRIVATE KEY-----",
    "sk-test",
    "ghp_test",
    "mysecret",
];

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum SidecarStatus {
    Healthy,
    Unhealthy,
    Missing,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarHealth {
    pub status: SidecarStatus,
    pub app_version: Option<String>,
    pub schema_version: Option<String>,
    pub message: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum SessionEventsStatus {
    Available,
    Unavailable,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionEventsResult {
    pub status: SessionEventsStatus,
    pub events: Vec<SessionTimelineEvent>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionTimelineEvent {
    pub id: String,
    pub timestamp: String,
    pub app: String,
    pub window_title: String,
    pub source: String,
    #[serde(rename = "type")]
    pub event_type: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RecorderControlStatus {
    Available,
    Unavailable,
}

#[derive(Clone, Debug, Eq, PartialEq, Deserialize, Serialize)]
#[serde(rename_all(serialize = "camelCase", deserialize = "snake_case"))]
pub struct RecorderSession {
    pub id: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub status: String,
    pub title: Option<String>,
    pub storage_path: Option<String>,
    pub privacy_mode: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecorderControlResult {
    pub status: RecorderControlStatus,
    pub message: String,
    pub session: Option<RecorderSession>,
}

#[derive(Debug, Deserialize)]
struct SidecarEventsResponse {
    events: Vec<SidecarRawEvent>,
}

#[derive(Debug, Deserialize)]
struct SidecarRawEvent {
    id: String,
    timestamp: String,
    source: String,
    #[serde(rename = "type")]
    event_type: String,
    metadata: Value,
}

#[derive(Clone, Debug)]
pub struct SidecarService;

impl SidecarService {
    pub fn health(&self) -> SidecarHealth {
        missing_health(MISSING_MESSAGE)
    }

    pub fn start(&self) -> SidecarHealth {
        missing_health(MISSING_MESSAGE)
    }

    pub fn stop(&self) -> SidecarHealth {
        missing_health(NOT_RUNNING_MESSAGE)
    }

    pub fn events(&self, session_id: String) -> SessionEventsResult {
        let Ok(base_url) = env::var(SIDECAR_URL_ENV) else {
            return unavailable_events();
        };

        self.events_from_base_url(session_id, &base_url)
    }

    pub fn start_recording_session(
        &self,
        session_id: String,
        started_at: String,
        title: Option<String>,
        privacy_mode: String,
    ) -> RecorderControlResult {
        let Ok(base_url) = env::var(SIDECAR_URL_ENV) else {
            return unavailable_recorder_control();
        };

        self.start_recording_session_from_base_url(
            session_id,
            started_at,
            title,
            privacy_mode,
            &base_url,
        )
    }

    pub fn start_recording_session_from_base_url(
        &self,
        session_id: String,
        started_at: String,
        title: Option<String>,
        privacy_mode: String,
        base_url: &str,
    ) -> RecorderControlResult {
        if session_id.trim().is_empty()
            || started_at.trim().is_empty()
            || privacy_mode.trim().is_empty()
        {
            return unavailable_recorder_control();
        }

        self.post_session_control(
            base_url,
            "/sessions/start".to_string(),
            json!({
                "session_id": session_id,
                "started_at": started_at,
                "title": title,
                "privacy_mode": privacy_mode,
            }),
            "Recording session started.",
        )
    }

    pub fn pause_recording_session(
        &self,
        session_id: String,
        paused_at: String,
    ) -> RecorderControlResult {
        let Ok(base_url) = env::var(SIDECAR_URL_ENV) else {
            return unavailable_recorder_control();
        };

        self.pause_recording_session_from_base_url(session_id, paused_at, &base_url)
    }

    pub fn pause_recording_session_from_base_url(
        &self,
        session_id: String,
        paused_at: String,
        base_url: &str,
    ) -> RecorderControlResult {
        if session_id.trim().is_empty() || paused_at.trim().is_empty() {
            return unavailable_recorder_control();
        }

        self.post_session_control(
            base_url,
            format!("/sessions/{}/pause", encode_path_segment(&session_id)),
            json!({ "paused_at": paused_at }),
            "Recording session paused.",
        )
    }

    pub fn resume_recording_session(
        &self,
        session_id: String,
        resumed_at: String,
    ) -> RecorderControlResult {
        let Ok(base_url) = env::var(SIDECAR_URL_ENV) else {
            return unavailable_recorder_control();
        };

        self.resume_recording_session_from_base_url(session_id, resumed_at, &base_url)
    }

    pub fn resume_recording_session_from_base_url(
        &self,
        session_id: String,
        resumed_at: String,
        base_url: &str,
    ) -> RecorderControlResult {
        if session_id.trim().is_empty() || resumed_at.trim().is_empty() {
            return unavailable_recorder_control();
        }

        self.post_session_control(
            base_url,
            format!("/sessions/{}/resume", encode_path_segment(&session_id)),
            json!({ "resumed_at": resumed_at }),
            "Recording session resumed.",
        )
    }

    pub fn stop_recording_session(
        &self,
        session_id: String,
        stopped_at: String,
    ) -> RecorderControlResult {
        let Ok(base_url) = env::var(SIDECAR_URL_ENV) else {
            return unavailable_recorder_control();
        };

        self.stop_recording_session_from_base_url(session_id, stopped_at, &base_url)
    }

    pub fn stop_recording_session_from_base_url(
        &self,
        session_id: String,
        stopped_at: String,
        base_url: &str,
    ) -> RecorderControlResult {
        if session_id.trim().is_empty() || stopped_at.trim().is_empty() {
            return unavailable_recorder_control();
        }

        self.post_session_control(
            base_url,
            format!("/sessions/{}/stop", encode_path_segment(&session_id)),
            json!({ "stopped_at": stopped_at }),
            "Recording session stopped.",
        )
    }

    pub fn events_from_base_url(&self, session_id: String, base_url: &str) -> SessionEventsResult {
        if session_id.trim().is_empty() {
            return unavailable_events();
        }

        let Some(endpoint) = LocalHttpEndpoint::parse(base_url) else {
            return unavailable_events();
        };

        let path = format!("/sessions/{}/events", encode_path_segment(&session_id));
        let Ok(body) = request_local_json(&endpoint, "GET", &path, None) else {
            return unavailable_events();
        };

        let Ok(response) = serde_json::from_str::<SidecarEventsResponse>(&body) else {
            return unavailable_events();
        };

        SessionEventsResult {
            status: SessionEventsStatus::Available,
            events: response
                .events
                .into_iter()
                .filter(is_timeline_event)
                .map(SessionTimelineEvent::from)
                .collect(),
        }
    }

    fn post_session_control(
        &self,
        base_url: &str,
        path: String,
        body: Value,
        message: &str,
    ) -> RecorderControlResult {
        let Some(endpoint) = LocalHttpEndpoint::parse(base_url) else {
            return unavailable_recorder_control();
        };
        let Ok(body_text) = request_local_json(&endpoint, "POST", &path, Some(body)) else {
            return unavailable_recorder_control();
        };
        let Ok(session) = serde_json::from_str::<RecorderSession>(&body_text) else {
            return unavailable_recorder_control();
        };

        RecorderControlResult {
            status: RecorderControlStatus::Available,
            message: message.to_string(),
            session: Some(session.redacted()),
        }
    }
}

fn missing_health(message: &str) -> SidecarHealth {
    SidecarHealth {
        status: SidecarStatus::Missing,
        app_version: None,
        schema_version: None,
        message: message.to_string(),
    }
}

fn unavailable_events() -> SessionEventsResult {
    SessionEventsResult {
        status: SessionEventsStatus::Unavailable,
        events: Vec::new(),
    }
}

fn unavailable_recorder_control() -> RecorderControlResult {
    RecorderControlResult {
        status: RecorderControlStatus::Unavailable,
        message: "Recorder sidecar bridge is unavailable.".to_string(),
        session: None,
    }
}

impl RecorderSession {
    fn redacted(self) -> Self {
        Self {
            id: redact_text(&self.id),
            started_at: redact_text(&self.started_at),
            ended_at: self.ended_at.map(|ended_at| redact_text(&ended_at)),
            status: redact_text(&self.status),
            title: self.title.map(|title| redact_text(&title)),
            storage_path: self.storage_path.map(|path| redact_text(&path)),
            privacy_mode: redact_text(&self.privacy_mode),
        }
    }
}

impl From<SidecarRawEvent> for SessionTimelineEvent {
    fn from(event: SidecarRawEvent) -> Self {
        let (app, window_title) = timeline_display_text(&event);

        Self {
            id: redact_text(&event.id),
            timestamp: redact_text(&event.timestamp),
            app,
            window_title,
            source: event.source,
            event_type: event.event_type,
        }
    }
}

fn is_timeline_event(event: &SidecarRawEvent) -> bool {
    matches!(
        (event.source.as_str(), event.event_type.as_str()),
        ("active_window", "active_window_changed")
            | ("file_watcher", "file_changed")
            | ("terminal_command_detector", "terminal_command")
    )
}

fn timeline_display_text(event: &SidecarRawEvent) -> (String, String) {
    if event.source == "terminal_command_detector" && event.event_type == "terminal_command" {
        let command = event
            .metadata
            .get("command")
            .and_then(Value::as_str)
            .unwrap_or("unknown command");
        let shell = event
            .metadata
            .get("shell")
            .and_then(Value::as_str)
            .unwrap_or("terminal");
        let exit_code = event
            .metadata
            .get("exit_code")
            .and_then(Value::as_i64)
            .map(|code| format!(" exit {code}"))
            .unwrap_or_default();
        return (
            "Terminal command".to_string(),
            redact_text(&format!("{shell}{exit_code}: {command}")),
        );
    }

    if event.source == "file_watcher" && event.event_type == "file_changed" {
        let operation = event
            .metadata
            .get("operation")
            .and_then(Value::as_str)
            .unwrap_or("changed");
        let path = event
            .metadata
            .get("path")
            .and_then(Value::as_str)
            .unwrap_or("unknown path");
        return (
            "File change".to_string(),
            redact_text(&format!("{operation} {path}")),
        );
    }

    let app = event
        .metadata
        .get("app")
        .and_then(Value::as_str)
        .unwrap_or("Unknown app");
    let window_title = event
        .metadata
        .get("window_title")
        .and_then(Value::as_str)
        .unwrap_or("Untitled window");
    (redact_text(app), redact_text(window_title))
}

#[derive(Debug)]
struct LocalHttpEndpoint {
    host: String,
    port: u16,
}

impl LocalHttpEndpoint {
    fn parse(base_url: &str) -> Option<Self> {
        let without_scheme = base_url.strip_prefix("http://")?;
        let authority = without_scheme.split('/').next()?.trim();
        let (host, port_text) = authority.rsplit_once(':')?;
        if host != "127.0.0.1" && host != "localhost" {
            return None;
        }
        let port = port_text.parse::<u16>().ok()?;
        Some(Self {
            host: host.to_string(),
            port,
        })
    }
}

fn request_local_json(
    endpoint: &LocalHttpEndpoint,
    method: &str,
    path: &str,
    body: Option<Value>,
) -> Result<String, ()> {
    let address = (endpoint.host.as_str(), endpoint.port)
        .to_socket_addrs()
        .map_err(|_| ())?
        .next()
        .ok_or(())?;
    let mut stream = TcpStream::connect_timeout(&address, HTTP_TIMEOUT).map_err(|_| ())?;
    stream
        .set_read_timeout(Some(HTTP_TIMEOUT))
        .map_err(|_| ())?;
    stream
        .set_write_timeout(Some(HTTP_TIMEOUT))
        .map_err(|_| ())?;
    let body_text = body.map(|value| value.to_string()).unwrap_or_default();
    let request = if body_text.is_empty() {
        format!(
            "{method} {path} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\nAccept: application/json\r\n\r\n",
            endpoint.host
        )
    } else {
        format!(
            "{method} {path} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\nAccept: application/json\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}",
            endpoint.host,
            body_text.len(),
            body_text
        )
    };
    stream.write_all(request.as_bytes()).map_err(|_| ())?;

    let mut response = String::new();
    stream.read_to_string(&mut response).map_err(|_| ())?;
    if !response.starts_with("HTTP/1.1 200") && !response.starts_with("HTTP/1.0 200") {
        return Err(());
    }

    response
        .split_once("\r\n\r\n")
        .map(|(_, body)| body.to_string())
        .ok_or(())
}

fn encode_path_segment(value: &str) -> String {
    value
        .bytes()
        .map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' => (byte as char).to_string(),
            _ => format!("%{byte:02X}"),
        })
        .collect()
}

fn redact_text(value: &str) -> String {
    let mut redacted = value.to_string();
    for secret in SECRET_FRAGMENTS {
        redacted = redacted.replace(secret, REDACTION_TOKEN);
    }
    redacted
}
