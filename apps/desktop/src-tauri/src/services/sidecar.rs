use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    env,
    io::{Read, Write},
    net::{TcpStream, ToSocketAddrs},
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{Mutex, OnceLock},
    time::Duration,
};

const MISSING_MESSAGE: &str = "Local agent sidecar binary is not configured yet.";
const NOT_RUNNING_MESSAGE: &str = "Local agent sidecar is not running.";
const SIDECAR_URL_ENV: &str = "WORKTRACE_SIDECAR_URL";
const SIDECAR_PORT_ENV: &str = "WORKTRACE_SIDECAR_PORT";
const SIDECAR_BIN_ENV: &str = "WORKTRACE_SIDECAR_BIN";
const SIDECAR_ARGS_ENV: &str = "WORKTRACE_SIDECAR_ARGS";
const DEFAULT_SIDECAR_PORT: u16 = 8765;
#[cfg(windows)]
const BUNDLED_SIDECAR_NAME: &str = "worktrace-local-agent.exe";
#[cfg(not(windows))]
const BUNDLED_SIDECAR_NAME: &str = "worktrace-local-agent";
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

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum SessionExportStatus {
    Available,
    Unavailable,
}

#[derive(Clone, Debug, Eq, PartialEq, Deserialize, Serialize)]
#[serde(rename_all(serialize = "camelCase", deserialize = "snake_case"))]
pub struct SessionExportPreview {
    pub format: String,
    pub path: String,
    pub preview: String,
    pub evidence_ids: Vec<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionExportResult {
    pub status: SessionExportStatus,
    pub message: String,
    pub export: Option<SessionExportPreview>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum SessionFolderStatus {
    Available,
    Unavailable,
}

#[derive(Clone, Debug, Eq, PartialEq, Deserialize)]
struct SidecarSessionFolderResponse {
    path: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionFolderResult {
    pub status: SessionFolderStatus,
    pub message: String,
    pub path: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum SessionScreenshotsStatus {
    Available,
    Unavailable,
}

#[derive(Clone, Debug, Eq, PartialEq, Deserialize, Serialize)]
#[serde(rename_all(serialize = "camelCase", deserialize = "snake_case"))]
pub struct SessionScreenshot {
    pub id: String,
    pub session_id: String,
    pub source_event_id: Option<String>,
    pub timestamp: String,
    pub width: i64,
    pub height: i64,
    pub stored_width: i64,
    pub stored_height: i64,
    pub byte_size: i64,
    pub content_hash: String,
    pub visual_hash: String,
    pub storage_path: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionScreenshotsResult {
    pub status: SessionScreenshotsStatus,
    pub message: String,
    pub screenshots: Vec<SessionScreenshot>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ScreenshotDeletionStatus {
    Available,
    Unavailable,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all(serialize = "camelCase", deserialize = "snake_case"))]
pub struct ScreenshotDeletionResult {
    pub status: ScreenshotDeletionStatus,
    pub message: String,
    pub deleted_files: i64,
    pub missing_files: i64,
    pub deleted_rows: i64,
}

#[derive(Debug, Deserialize)]
struct SidecarScreenshotsResponse {
    screenshots: Vec<SessionScreenshot>,
}

#[derive(Debug, Deserialize)]
struct SidecarScreenshotDeletionResponse {
    deleted_files: i64,
    missing_files: i64,
    deleted_rows: i64,
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

#[derive(Debug, Deserialize)]
struct SidecarHealthResponse {
    app_version: String,
    schema_version: String,
    status: String,
}

#[derive(Clone, Debug)]
pub struct SidecarService;

impl SidecarService {
    pub fn health(&self) -> SidecarHealth {
        let Some(base_url) = configured_base_url() else {
            return missing_health(MISSING_MESSAGE);
        };

        self.health_from_base_url(&base_url)
    }

    pub fn start(&self) -> SidecarHealth {
        let Some(base_url) = configured_base_url() else {
            return missing_health(MISSING_MESSAGE);
        };

        let health = self.health_from_base_url(&base_url);
        if health.status == SidecarStatus::Healthy {
            return health;
        }

        let Some(binary_path) = configured_sidecar_binary() else {
            return missing_health(MISSING_MESSAGE);
        };

        start_managed_sidecar(binary_path)
    }

    pub fn stop(&self) -> SidecarHealth {
        if stop_managed_sidecar() {
            return missing_health("Local agent sidecar was stopped.");
        }

        missing_health(NOT_RUNNING_MESSAGE)
    }

    pub fn events(&self, session_id: String) -> SessionEventsResult {
        let Some(base_url) = configured_base_url() else {
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
        let Some(base_url) = configured_base_url() else {
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
        let Some(base_url) = configured_base_url() else {
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
        let Some(base_url) = configured_base_url() else {
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
        let Some(base_url) = configured_base_url() else {
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

    pub fn export_session_markdown(&self, session_id: String) -> SessionExportResult {
        let Some(base_url) = configured_base_url() else {
            return unavailable_export();
        };

        self.export_session_markdown_from_base_url(session_id, &base_url)
    }

    pub fn export_session_markdown_from_base_url(
        &self,
        session_id: String,
        base_url: &str,
    ) -> SessionExportResult {
        self.export_session_from_base_url(
            session_id,
            base_url,
            "markdown",
            "Markdown export generated.",
        )
    }

    pub fn export_session_raw_json(&self, session_id: String) -> SessionExportResult {
        let Some(base_url) = configured_base_url() else {
            return unavailable_export();
        };

        self.export_session_raw_json_from_base_url(session_id, &base_url)
    }

    pub fn export_session_raw_json_from_base_url(
        &self,
        session_id: String,
        base_url: &str,
    ) -> SessionExportResult {
        self.export_session_from_base_url(
            session_id,
            base_url,
            "raw-json",
            "Raw JSON export generated.",
        )
    }

    pub fn session_folder(&self, session_id: String) -> SessionFolderResult {
        let Some(base_url) = configured_base_url() else {
            return unavailable_folder();
        };

        self.session_folder_from_base_url(session_id, &base_url)
    }

    pub fn session_screenshots(&self, session_id: String) -> SessionScreenshotsResult {
        let Some(base_url) = configured_base_url() else {
            return unavailable_screenshots();
        };

        self.session_screenshots_from_base_url(session_id, &base_url)
    }

    pub fn session_screenshots_from_base_url(
        &self,
        session_id: String,
        base_url: &str,
    ) -> SessionScreenshotsResult {
        if session_id.trim().is_empty() {
            return unavailable_screenshots();
        }

        let Some(endpoint) = LocalHttpEndpoint::parse(base_url) else {
            return unavailable_screenshots();
        };
        let path = format!("/sessions/{}/screenshots", encode_path_segment(&session_id));
        let Ok(body_text) = request_local_json(&endpoint, "GET", &path, None) else {
            return unavailable_screenshots();
        };
        let Ok(response) = serde_json::from_str::<SidecarScreenshotsResponse>(&body_text) else {
            return unavailable_screenshots();
        };

        SessionScreenshotsResult {
            status: SessionScreenshotsStatus::Available,
            message: "Screenshot metadata loaded.".to_string(),
            screenshots: response
                .screenshots
                .into_iter()
                .map(SessionScreenshot::redacted)
                .collect(),
        }
    }

    pub fn delete_session_screenshots(&self, session_id: String) -> ScreenshotDeletionResult {
        let Some(base_url) = configured_base_url() else {
            return unavailable_screenshot_deletion();
        };

        self.delete_session_screenshots_from_base_url(session_id, &base_url)
    }

    pub fn delete_session_screenshots_from_base_url(
        &self,
        session_id: String,
        base_url: &str,
    ) -> ScreenshotDeletionResult {
        if session_id.trim().is_empty() {
            return unavailable_screenshot_deletion();
        }

        let Some(endpoint) = LocalHttpEndpoint::parse(base_url) else {
            return unavailable_screenshot_deletion();
        };
        let path = format!("/sessions/{}/screenshots", encode_path_segment(&session_id));
        let Ok(body_text) = request_local_json(&endpoint, "DELETE", &path, None) else {
            return unavailable_screenshot_deletion();
        };
        let Ok(response) = serde_json::from_str::<SidecarScreenshotDeletionResponse>(&body_text)
        else {
            return unavailable_screenshot_deletion();
        };

        ScreenshotDeletionResult {
            status: ScreenshotDeletionStatus::Available,
            message: "Screenshots deleted.".to_string(),
            deleted_files: response.deleted_files,
            missing_files: response.missing_files,
            deleted_rows: response.deleted_rows,
        }
    }

    pub fn session_folder_from_base_url(
        &self,
        session_id: String,
        base_url: &str,
    ) -> SessionFolderResult {
        if session_id.trim().is_empty() {
            return unavailable_folder();
        }

        let Some(endpoint) = LocalHttpEndpoint::parse(base_url) else {
            return unavailable_folder();
        };
        let path = format!("/sessions/{}/folder", encode_path_segment(&session_id));
        let Ok(body_text) = request_local_json(&endpoint, "GET", &path, None) else {
            return unavailable_folder();
        };
        let Ok(folder) = serde_json::from_str::<SidecarSessionFolderResponse>(&body_text) else {
            return unavailable_folder();
        };

        SessionFolderResult {
            status: SessionFolderStatus::Available,
            message: "Session folder is available.".to_string(),
            path: Some(redact_text(&folder.path)),
        }
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

    pub fn health_from_base_url(&self, base_url: &str) -> SidecarHealth {
        let Some(endpoint) = LocalHttpEndpoint::parse(base_url) else {
            return unhealthy_health("Local agent sidecar URL must use localhost.");
        };
        let Ok(body) = request_local_json(&endpoint, "GET", "/health", None) else {
            return unhealthy_health("Local agent sidecar health check failed.");
        };
        let Ok(response) = serde_json::from_str::<SidecarHealthResponse>(&body) else {
            return unhealthy_health("Local agent sidecar health response was invalid.");
        };
        if response.status != "ok" {
            return unhealthy_health("Local agent sidecar reported unhealthy status.");
        }

        SidecarHealth {
            status: SidecarStatus::Healthy,
            app_version: Some(redact_text(&response.app_version)),
            schema_version: Some(redact_text(&response.schema_version)),
            message: "Local agent sidecar is healthy.".to_string(),
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

    fn export_session_from_base_url(
        &self,
        session_id: String,
        base_url: &str,
        format_path: &str,
        message: &str,
    ) -> SessionExportResult {
        if session_id.trim().is_empty() {
            return unavailable_export();
        }

        let Some(endpoint) = LocalHttpEndpoint::parse(base_url) else {
            return unavailable_export();
        };
        let path = format!(
            "/sessions/{}/exports/{}",
            encode_path_segment(&session_id),
            format_path
        );
        let Ok(body_text) = request_local_json(&endpoint, "POST", &path, None) else {
            return unavailable_export();
        };
        let Ok(export) = serde_json::from_str::<SessionExportPreview>(&body_text) else {
            return unavailable_export();
        };

        SessionExportResult {
            status: SessionExportStatus::Available,
            message: message.to_string(),
            export: Some(export.redacted()),
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

fn unhealthy_health(message: &str) -> SidecarHealth {
    SidecarHealth {
        status: SidecarStatus::Unhealthy,
        app_version: None,
        schema_version: None,
        message: message.to_string(),
    }
}

fn starting_health() -> SidecarHealth {
    SidecarHealth {
        status: SidecarStatus::Unhealthy,
        app_version: None,
        schema_version: None,
        message: "Local agent sidecar process started; health check is still pending.".to_string(),
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

fn unavailable_export() -> SessionExportResult {
    SessionExportResult {
        status: SessionExportStatus::Unavailable,
        message: "Session export bridge is unavailable.".to_string(),
        export: None,
    }
}

fn unavailable_folder() -> SessionFolderResult {
    SessionFolderResult {
        status: SessionFolderStatus::Unavailable,
        message: "Session folder bridge is unavailable.".to_string(),
        path: None,
    }
}

fn unavailable_screenshots() -> SessionScreenshotsResult {
    SessionScreenshotsResult {
        status: SessionScreenshotsStatus::Unavailable,
        message: "Screenshot metadata bridge is unavailable.".to_string(),
        screenshots: Vec::new(),
    }
}

fn unavailable_screenshot_deletion() -> ScreenshotDeletionResult {
    ScreenshotDeletionResult {
        status: ScreenshotDeletionStatus::Unavailable,
        message: "Screenshot delete bridge is unavailable.".to_string(),
        deleted_files: 0,
        missing_files: 0,
        deleted_rows: 0,
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

impl SessionExportPreview {
    fn redacted(self) -> Self {
        Self {
            format: redact_text(&self.format),
            path: redact_text(&self.path),
            preview: redact_text(&self.preview),
            evidence_ids: self
                .evidence_ids
                .into_iter()
                .map(|evidence_id| redact_text(&evidence_id))
                .collect(),
        }
    }
}

impl SessionScreenshot {
    fn redacted(self) -> Self {
        Self {
            id: redact_text(&self.id),
            session_id: redact_text(&self.session_id),
            source_event_id: self
                .source_event_id
                .map(|source_event_id| redact_text(&source_event_id)),
            timestamp: redact_text(&self.timestamp),
            width: self.width,
            height: self.height,
            stored_width: self.stored_width,
            stored_height: self.stored_height,
            byte_size: self.byte_size,
            content_hash: redact_text(&self.content_hash),
            visual_hash: redact_text(&self.visual_hash),
            storage_path: redact_text(&self.storage_path),
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

fn configured_base_url() -> Option<String> {
    if let Ok(base_url) = env::var(SIDECAR_URL_ENV) {
        if LocalHttpEndpoint::parse(&base_url).is_some() {
            return Some(base_url);
        }
        return None;
    }

    let port = configured_sidecar_port()?;
    Some(format!("http://127.0.0.1:{port}"))
}

fn configured_sidecar_port() -> Option<u16> {
    if let Ok(port) = env::var(SIDECAR_PORT_ENV) {
        return port.parse::<u16>().ok();
    }
    if configured_sidecar_binary().is_some() {
        return Some(DEFAULT_SIDECAR_PORT);
    }
    None
}

fn configured_sidecar_binary() -> Option<PathBuf> {
    if let Ok(path) = env::var(SIDECAR_BIN_ENV) {
        let path = PathBuf::from(path);
        if path.is_file() {
            return Some(path);
        }
    }

    bundled_sidecar_binary()
}

fn bundled_sidecar_binary() -> Option<PathBuf> {
    let app_dir = env::current_exe().ok()?.parent()?.to_path_buf();
    let candidates = [
        app_dir.join("sidecars").join(BUNDLED_SIDECAR_NAME),
        app_dir.join(BUNDLED_SIDECAR_NAME),
    ];

    candidates.into_iter().find(|candidate| candidate.is_file())
}

fn start_managed_sidecar(binary_path: PathBuf) -> SidecarHealth {
    let process_lock = managed_sidecar_process();
    let Ok(mut process) = process_lock.lock() else {
        return unhealthy_health("Local agent sidecar process state is unavailable.");
    };

    if let Some(child) = process.as_mut() {
        match child.try_wait() {
            Ok(None) => return starting_health(),
            Ok(Some(_)) | Err(_) => {
                *process = None;
            }
        }
    }

    let mut command = Command::new(binary_path);
    command
        .args(configured_sidecar_args())
        .env("WORKTRACE_SIDECAR_HOST", "127.0.0.1")
        .env(
            "WORKTRACE_SIDECAR_PORT",
            configured_sidecar_port()
                .unwrap_or(DEFAULT_SIDECAR_PORT)
                .to_string(),
        )
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    let Ok(child) = command.spawn() else {
        return unhealthy_health("Local agent sidecar process could not be started.");
    };

    *process = Some(child);
    starting_health()
}

fn stop_managed_sidecar() -> bool {
    let process_lock = managed_sidecar_process();
    let Ok(mut process) = process_lock.lock() else {
        return false;
    };
    let Some(mut child) = process.take() else {
        return false;
    };

    let _ = child.kill();
    let _ = child.wait();
    true
}

fn managed_sidecar_process() -> &'static Mutex<Option<Child>> {
    static PROCESS: OnceLock<Mutex<Option<Child>>> = OnceLock::new();
    PROCESS.get_or_init(|| Mutex::new(None))
}

fn configured_sidecar_args() -> Vec<String> {
    env::var(SIDECAR_ARGS_ENV)
        .ok()
        .map(|args| args.split_whitespace().map(str::to_string).collect())
        .unwrap_or_default()
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
