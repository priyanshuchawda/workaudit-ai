import { invoke } from "@tauri-apps/api/core";

export type SidecarStatus = "loading" | "healthy" | "unhealthy" | "missing";

export type SidecarHealth = {
  status: SidecarStatus;
  appVersion: string | null;
  schemaVersion: string | null;
  message: string;
};

export type SessionTimelineEvent = {
  id: string;
  timestamp: string;
  app: string;
  windowTitle: string;
  source: "active_window" | "file_watcher" | "terminal_command_detector";
  type: "active_window_changed" | "file_changed" | "terminal_command";
};

export type SessionEventsResult =
  | { status: "available"; events: SessionTimelineEvent[] }
  | { status: "unavailable"; events: [] };

export type RecorderSessionStatus = "recording" | "paused" | "stopped" | "interrupted";

export type RecorderSession = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  status: RecorderSessionStatus;
  title: string | null;
  storagePath: string | null;
  privacyMode: string;
};

export type RecorderControlResult =
  | { status: "available"; message: string; session: RecorderSession }
  | { status: "unavailable"; message: string; session: null };

export type StartRecordingSessionInput = {
  sessionId: string;
  startedAt: string;
  title: string | null;
  privacyMode: string;
};

export type PauseRecordingSessionInput = {
  sessionId: string;
  pausedAt: string;
};

export type ResumeRecordingSessionInput = {
  sessionId: string;
  resumedAt: string;
};

export type StopRecordingSessionInput = {
  sessionId: string;
  stoppedAt: string;
};

export type SessionExportPreview = {
  format: "markdown" | "raw_json" | string;
  path: string;
  preview: string;
  evidenceIds: string[];
};

export type SessionExportResult =
  | { status: "available"; message: string; export: SessionExportPreview }
  | { status: "unavailable"; message: string; export: null };

export type SessionFolderResult =
  | { status: "available"; message: string; path: string }
  | { status: "unavailable"; message: string; path: null };

export type SessionScreenshot = {
  id: string;
  sessionId: string;
  sourceEventId: string | null;
  timestamp: string;
  width: number;
  height: number;
  storedWidth: number;
  storedHeight: number;
  byteSize: number;
  contentHash: string;
  visualHash: string;
  storagePath: string;
};

export type SessionScreenshotsResult =
  | { status: "available"; message: string; screenshots: SessionScreenshot[] }
  | { status: "unavailable"; message: string; screenshots: [] };

export type ScreenshotDeletionResult =
  | {
      status: "available";
      message: string;
      deletedFiles: number;
      missingFiles: number;
      deletedRows: number;
    }
  | {
      status: "unavailable";
      message: string;
      deletedFiles: 0;
      missingFiles: 0;
      deletedRows: 0;
    };

export type SessionSummary = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  title: string | null;
  storagePath: string | null;
  privacyMode: string;
  eventCount: number;
  screenshotCount: number;
};

export type SessionListResult =
  | { status: "available"; message: string; sessions: SessionSummary[] }
  | { status: "unavailable"; message: string; sessions: [] };

export type SessionDeletionResult =
  | {
      status: "available";
      message: string;
      deletedSessionRows: number;
      deletedScreenshotFiles: number;
      missingScreenshotFiles: number;
      deletedScreenshotRows: number;
      removedArtifactRoot: boolean;
    }
  | {
      status: "unavailable";
      message: string;
      deletedSessionRows: 0;
      deletedScreenshotFiles: 0;
      missingScreenshotFiles: 0;
      deletedScreenshotRows: 0;
      removedArtifactRoot: false;
    };

const SIDE_CAR_COMMANDS = {
  health: "get_sidecar_health",
  start: "start_sidecar",
  stop: "stop_sidecar",
  sessionEvents: "get_session_events",
  startRecordingSession: "start_recording_session",
  pauseRecordingSession: "pause_recording_session",
  resumeRecordingSession: "resume_recording_session",
  stopRecordingSession: "stop_recording_session",
  exportSessionMarkdown: "export_session_markdown",
  exportSessionRawJson: "export_session_raw_json",
  sessionFolder: "get_session_folder",
  sessionScreenshots: "get_session_screenshots",
  deleteSessionScreenshots: "delete_session_screenshots",
  sessions: "get_sessions",
  deleteSession: "delete_session",
} as const;

const UNHEALTHY_FALLBACK: SidecarHealth = {
  status: "unhealthy",
  appVersion: null,
  schemaVersion: null,
  message: "Could not reach the local sidecar command.",
};

const RECORDER_CONTROL_FALLBACK: RecorderControlResult = {
  status: "unavailable",
  message: "Recorder sidecar bridge is unavailable.",
  session: null,
};

const SESSION_EXPORT_FALLBACK: SessionExportResult = {
  status: "unavailable",
  message: "Session export bridge is unavailable.",
  export: null,
};

const SESSION_FOLDER_FALLBACK: SessionFolderResult = {
  status: "unavailable",
  message: "Session folder bridge is unavailable.",
  path: null,
};

const SESSION_SCREENSHOTS_FALLBACK: SessionScreenshotsResult = {
  status: "unavailable",
  message: "Screenshot metadata bridge is unavailable.",
  screenshots: [],
};

const SCREENSHOT_DELETION_FALLBACK: ScreenshotDeletionResult = {
  status: "unavailable",
  message: "Screenshot delete bridge is unavailable.",
  deletedFiles: 0,
  missingFiles: 0,
  deletedRows: 0,
};

const SESSION_LIST_FALLBACK: SessionListResult = {
  status: "unavailable",
  message: "Session list bridge is unavailable.",
  sessions: [],
};

const SESSION_DELETION_FALLBACK: SessionDeletionResult = {
  status: "unavailable",
  message: "Session delete bridge is unavailable.",
  deletedSessionRows: 0,
  deletedScreenshotFiles: 0,
  missingScreenshotFiles: 0,
  deletedScreenshotRows: 0,
  removedArtifactRoot: false,
};

export async function getSidecarHealth(): Promise<SidecarHealth> {
  return invokeSidecarCommand(SIDE_CAR_COMMANDS.health);
}

export async function startSidecar(): Promise<SidecarHealth> {
  return invokeSidecarCommand(SIDE_CAR_COMMANDS.start);
}

export async function stopSidecar(): Promise<SidecarHealth> {
  return invokeSidecarCommand(SIDE_CAR_COMMANDS.stop);
}

export async function getSessionEvents(sessionId = "latest"): Promise<SessionEventsResult> {
  try {
    return await invoke<SessionEventsResult>(SIDE_CAR_COMMANDS.sessionEvents, { sessionId });
  } catch {
    return { status: "unavailable", events: [] };
  }
}

export async function startRecordingSession(
  input: StartRecordingSessionInput,
): Promise<RecorderControlResult> {
  try {
    return await invoke<RecorderControlResult>(SIDE_CAR_COMMANDS.startRecordingSession, input);
  } catch {
    return RECORDER_CONTROL_FALLBACK;
  }
}

export async function pauseRecordingSession(
  input: PauseRecordingSessionInput,
): Promise<RecorderControlResult> {
  try {
    return await invoke<RecorderControlResult>(SIDE_CAR_COMMANDS.pauseRecordingSession, input);
  } catch {
    return RECORDER_CONTROL_FALLBACK;
  }
}

export async function resumeRecordingSession(
  input: ResumeRecordingSessionInput,
): Promise<RecorderControlResult> {
  try {
    return await invoke<RecorderControlResult>(SIDE_CAR_COMMANDS.resumeRecordingSession, input);
  } catch {
    return RECORDER_CONTROL_FALLBACK;
  }
}

export async function stopRecordingSession(
  input: StopRecordingSessionInput,
): Promise<RecorderControlResult> {
  try {
    return await invoke<RecorderControlResult>(SIDE_CAR_COMMANDS.stopRecordingSession, input);
  } catch {
    return RECORDER_CONTROL_FALLBACK;
  }
}

export async function exportSessionMarkdown(sessionId: string): Promise<SessionExportResult> {
  try {
    return await invoke<SessionExportResult>(SIDE_CAR_COMMANDS.exportSessionMarkdown, {
      sessionId,
    });
  } catch {
    return SESSION_EXPORT_FALLBACK;
  }
}

export async function exportSessionRawJson(sessionId: string): Promise<SessionExportResult> {
  try {
    return await invoke<SessionExportResult>(SIDE_CAR_COMMANDS.exportSessionRawJson, {
      sessionId,
    });
  } catch {
    return SESSION_EXPORT_FALLBACK;
  }
}

export async function getSessionFolder(sessionId: string): Promise<SessionFolderResult> {
  try {
    return await invoke<SessionFolderResult>(SIDE_CAR_COMMANDS.sessionFolder, { sessionId });
  } catch {
    return SESSION_FOLDER_FALLBACK;
  }
}

export async function getSessionScreenshots(
  sessionId: string,
): Promise<SessionScreenshotsResult> {
  try {
    return await invoke<SessionScreenshotsResult>(SIDE_CAR_COMMANDS.sessionScreenshots, {
      sessionId,
    });
  } catch {
    return SESSION_SCREENSHOTS_FALLBACK;
  }
}

export async function deleteSessionScreenshots(
  sessionId: string,
): Promise<ScreenshotDeletionResult> {
  try {
    return await invoke<ScreenshotDeletionResult>(SIDE_CAR_COMMANDS.deleteSessionScreenshots, {
      sessionId,
    });
  } catch {
    return SCREENSHOT_DELETION_FALLBACK;
  }
}

export async function getSessions(): Promise<SessionListResult> {
  try {
    return await invoke<SessionListResult>(SIDE_CAR_COMMANDS.sessions);
  } catch {
    return SESSION_LIST_FALLBACK;
  }
}

export async function deleteSession(sessionId: string): Promise<SessionDeletionResult> {
  try {
    return await invoke<SessionDeletionResult>(SIDE_CAR_COMMANDS.deleteSession, { sessionId });
  } catch {
    return SESSION_DELETION_FALLBACK;
  }
}

async function invokeSidecarCommand(command: string): Promise<SidecarHealth> {
  try {
    return await invoke<SidecarHealth>(command);
  } catch {
    return UNHEALTHY_FALLBACK;
  }
}
