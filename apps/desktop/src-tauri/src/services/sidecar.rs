use serde::{Deserialize, Serialize};
use serde_json::Value;
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

    pub fn events_from_base_url(&self, session_id: String, base_url: &str) -> SessionEventsResult {
        if session_id.trim().is_empty() {
            return unavailable_events();
        }

        let Some(endpoint) = LocalHttpEndpoint::parse(base_url) else {
            return unavailable_events();
        };

        let path = format!("/sessions/{}/events", encode_path_segment(&session_id));
        let Ok(body) = fetch_local_json(&endpoint, &path) else {
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

fn fetch_local_json(endpoint: &LocalHttpEndpoint, path: &str) -> Result<String, ()> {
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
    let request = format!(
        "GET {path} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\nAccept: application/json\r\n\r\n",
        endpoint.host
    );
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
