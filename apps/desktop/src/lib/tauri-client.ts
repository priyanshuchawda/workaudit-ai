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

const SIDE_CAR_COMMANDS = {
  health: "get_sidecar_health",
  start: "start_sidecar",
  stop: "stop_sidecar",
  sessionEvents: "get_session_events",
  startRecordingSession: "start_recording_session",
  pauseRecordingSession: "pause_recording_session",
  resumeRecordingSession: "resume_recording_session",
  stopRecordingSession: "stop_recording_session",
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

async function invokeSidecarCommand(command: string): Promise<SidecarHealth> {
  try {
    return await invoke<SidecarHealth>(command);
  } catch {
    return UNHEALTHY_FALLBACK;
  }
}
