import { render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import App from "./App";
import {
  getSessionEvents,
  getSidecarHealth,
  startSidecar,
  stopSidecar,
  type SessionEventsResult,
  type SidecarHealth,
} from "./lib/tauri-client";

vi.mock("./lib/tauri-client", () => ({
  getSessionEvents: vi.fn(),
  getSidecarHealth: vi.fn(),
  startSidecar: vi.fn(),
  stopSidecar: vi.fn(),
}));

const missingSidecar: SidecarHealth = {
  status: "missing",
  appVersion: null,
  schemaVersion: null,
  message: "Local agent sidecar binary is not configured yet.",
};

const unhealthySidecar: SidecarHealth = {
  status: "unhealthy",
  appVersion: null,
  schemaVersion: null,
  message: "Could not reach the local sidecar command.",
};

const healthySidecar: SidecarHealth = {
  status: "healthy",
  appVersion: "0.0.0",
  schemaVersion: "001_initial.sql",
  message: "Local agent sidecar is healthy.",
};

const getSidecarHealthMock = vi.mocked(getSidecarHealth);
const getSessionEventsMock = vi.mocked(getSessionEvents);
const startSidecarMock = vi.mocked(startSidecar);
const stopSidecarMock = vi.mocked(stopSidecar);

beforeEach(() => {
  getSessionEventsMock.mockReset();
  getSessionEventsMock.mockResolvedValue({ status: "unavailable", events: [] });
  getSidecarHealthMock.mockReset();
  startSidecarMock.mockReset();
  stopSidecarMock.mockReset();
});

test("renders the WorkTrace desktop shell status panels", () => {
  getSidecarHealthMock.mockResolvedValue(missingSidecar);

  render(<App />);

  expect(screen.getByRole("heading", { name: "WorkTrace AI" })).toBeInTheDocument();
  expect(screen.getByText("Local-first desktop shell")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Recorder" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Local agent" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Privacy" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Evidence" })).toBeInTheDocument();
});

test("shows sidecar loading and missing states", async () => {
  getSidecarHealthMock.mockResolvedValue(missingSidecar);

  render(<App />);

  expect(screen.getByText("Checking sidecar")).toBeInTheDocument();
  expect(await screen.findByText("Missing sidecar")).toBeInTheDocument();
  expect(screen.getByText("Local agent sidecar binary is not configured yet.")).toBeInTheDocument();
});

test("shows safe unhealthy state when the Tauri client cannot reach Rust", async () => {
  getSidecarHealthMock.mockResolvedValue(unhealthySidecar);

  render(<App />);

  expect(await screen.findByText("Sidecar unhealthy")).toBeInTheDocument();
  expect(screen.getByText("Could not reach the local sidecar command.")).toBeInTheDocument();
});

test("shows healthy sidecar version details", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);

  render(<App />);

  expect(await screen.findByText("Sidecar healthy")).toBeInTheDocument();
  expect(screen.getByText("Local agent sidecar is healthy.")).toBeInTheDocument();
  expect(screen.getByText("App 0.0.0 / schema 001_initial.sql")).toBeInTheDocument();
});

test("shows ordered raw active window timeline changes", async () => {
  getSidecarHealthMock.mockResolvedValue(missingSidecar);

  render(<App />);

  const timeline = screen.getByRole("region", { name: "Raw timeline" });
  const items = within(timeline).getAllByRole("listitem");

  expect(items).toHaveLength(5);
  expect(items.map((item) => item.textContent)).toEqual([
    expect.stringContaining("09:14VS Codeactive_windowworkaudit-ai - App.tsx"),
    expect.stringContaining("09:16Chromeactive_windowIssue #9 - GitHub"),
    expect.stringContaining("09:19Windows Terminalactive_windowuv run --python 3.13 pytest"),
    expect.stringContaining("09:22VS Codeactive_windowraw_events_repository.py"),
    expect.stringContaining("09:24File Exploreractive_windowworktrace session folder"),
  ]);
});

test("shows real sidecar active-window events when available", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  const sidecarEvents: SessionEventsResult = {
    status: "available",
    events: [
      {
        id: "evt_live_002",
        timestamp: "2026-05-06T09:16:00+05:30",
        app: "Chrome",
        windowTitle: "Issue #51",
        source: "active_window",
        type: "active_window_changed",
      },
      {
        id: "evt_live_001",
        timestamp: "2026-05-06T09:14:00+05:30",
        app: "VS Code",
        windowTitle: "workaudit-ai - App.tsx",
        source: "active_window",
        type: "active_window_changed",
      },
    ],
  };
  getSessionEventsMock.mockResolvedValue(sidecarEvents);

  render(<App />);

  const timeline = await screen.findByRole("region", { name: "Raw timeline" });
  const items = within(timeline).getAllByRole("listitem");

  expect(within(timeline).getByText("Live sidecar events")).toBeInTheDocument();
  expect(items).toHaveLength(2);
  expect(items.map((item) => item.textContent)).toEqual([
    expect.stringContaining("09:14VS Codeactive_windowworkaudit-ai - App.tsx"),
    expect.stringContaining("09:16Chromeactive_windowIssue #51"),
  ]);
});

test("shows real sidecar file watcher events when available", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  const sidecarEvents: SessionEventsResult = {
    status: "available",
    events: [
      {
        id: "evt_file_001",
        timestamp: "2026-05-06T09:15:00+05:30",
        app: "File change",
        windowTitle: "modified C:/repo/src/app.py",
        source: "file_watcher",
        type: "file_changed",
      },
      {
        id: "evt_live_001",
        timestamp: "2026-05-06T09:14:00+05:30",
        app: "VS Code",
        windowTitle: "workaudit-ai - App.tsx",
        source: "active_window",
        type: "active_window_changed",
      },
    ],
  };
  getSessionEventsMock.mockResolvedValue(sidecarEvents);

  render(<App />);

  const timeline = await screen.findByRole("region", { name: "Raw timeline" });
  const items = within(timeline).getAllByRole("listitem");

  expect(items).toHaveLength(2);
  expect(items.map((item) => item.textContent)).toEqual([
    expect.stringContaining("09:14VS Codeactive_windowworkaudit-ai - App.tsx"),
    expect.stringContaining("09:15File changefile_watchermodified C:/repo/src/app.py"),
  ]);
});

test("shows safe missing-sidecar timeline state before falling back to fixtures", async () => {
  getSidecarHealthMock.mockResolvedValue(missingSidecar);
  getSessionEventsMock.mockResolvedValue({ status: "unavailable", events: [] });

  render(<App />);

  const timeline = await screen.findByRole("region", { name: "Raw timeline" });

  expect(within(timeline).getByText("Fixture fallback")).toBeInTheDocument();
  expect(
    within(timeline).getByText(
      "The local sidecar event stream is unavailable, so this preview is using deterministic fixture events.",
    ),
  ).toBeInTheDocument();
});

test("shows interrupted session recovery actions", async () => {
  getSidecarHealthMock.mockResolvedValue(missingSidecar);

  render(<App />);

  const recovery = screen.getByRole("region", { name: "Interrupted session recovery" });

  expect(within(recovery).getByText("Interrupted session found")).toBeInTheDocument();
  expect(within(recovery).getByText("Interrupted review")).toBeInTheDocument();
  expect(within(recovery).getByText("1 event preserved")).toBeInTheDocument();
  expect(within(recovery).getByRole("button", { name: "Review" })).toBeInTheDocument();
  expect(within(recovery).getByRole("button", { name: "Export" })).toBeInTheDocument();
  expect(within(recovery).getByRole("button", { name: "Delete" })).toBeInTheDocument();
});
