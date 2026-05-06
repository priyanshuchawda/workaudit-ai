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
  source: "active_window";
  type: "active_window_changed";
};

export type SessionEventsResult =
  | { status: "available"; events: SessionTimelineEvent[] }
  | { status: "unavailable"; events: [] };

const SIDE_CAR_COMMANDS = {
  health: "get_sidecar_health",
  start: "start_sidecar",
  stop: "stop_sidecar",
  sessionEvents: "get_session_events",
} as const;

const UNHEALTHY_FALLBACK: SidecarHealth = {
  status: "unhealthy",
  appVersion: null,
  schemaVersion: null,
  message: "Could not reach the local sidecar command.",
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

async function invokeSidecarCommand(command: string): Promise<SidecarHealth> {
  try {
    return await invoke<SidecarHealth>(command);
  } catch {
    return UNHEALTHY_FALLBACK;
  }
}
