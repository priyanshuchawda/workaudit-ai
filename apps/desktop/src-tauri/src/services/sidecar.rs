use serde::Serialize;

const MISSING_MESSAGE: &str = "Local agent sidecar binary is not configured yet.";
const NOT_RUNNING_MESSAGE: &str = "Local agent sidecar is not running.";

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
}

fn missing_health(message: &str) -> SidecarHealth {
    SidecarHealth {
        status: SidecarStatus::Missing,
        app_version: None,
        schema_version: None,
        message: message.to_string(),
    }
}
