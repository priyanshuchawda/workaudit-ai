import { invoke } from "@tauri-apps/api/core";

export type SidecarStatus = "loading" | "healthy" | "unhealthy" | "missing";

export type SidecarHealth = {
  status: SidecarStatus;
  appVersion: string | null;
  schemaVersion: string | null;
  message: string;
};

const SIDE_CAR_COMMANDS = {
  health: "get_sidecar_health",
  start: "start_sidecar",
  stop: "stop_sidecar",
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

async function invokeSidecarCommand(command: string): Promise<SidecarHealth> {
  try {
    return await invoke<SidecarHealth>(command);
  } catch {
    return UNHEALTHY_FALLBACK;
  }
}
