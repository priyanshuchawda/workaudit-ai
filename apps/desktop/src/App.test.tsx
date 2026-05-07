import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import App from "./App";
import {
  cancelAiReport,
  deleteSession,
  deleteSessionScreenshots,
  exportSessionMarkdown,
  exportSessionRawJson,
  generateAiReport,
  getAiReportStatus,
  getSessionEvents,
  getSessionFolder,
  getSessionScreenshots,
  getSessions,
  getSidecarHealth,
  pauseRecordingSession,
  resumeRecordingSession,
  startRecordingSession,
  startSidecar,
  stopRecordingSession,
  stopSidecar,
  type AiReportResult,
  type RecorderControlResult,
  type ScreenshotDeletionResult,
  type SessionDeletionResult,
  type SessionExportResult,
  type SessionEventsResult,
  type SessionFolderResult,
  type SessionListResult,
  type SessionScreenshotsResult,
  type SidecarHealth,
} from "./lib/tauri-client";

vi.mock("./lib/tauri-client", () => ({
  cancelAiReport: vi.fn(),
  deleteSession: vi.fn(),
  deleteSessionScreenshots: vi.fn(),
  exportSessionMarkdown: vi.fn(),
  exportSessionRawJson: vi.fn(),
  generateAiReport: vi.fn(),
  getAiReportStatus: vi.fn(),
  getSessionEvents: vi.fn(),
  getSessionFolder: vi.fn(),
  getSessionScreenshots: vi.fn(),
  getSessions: vi.fn(),
  getSidecarHealth: vi.fn(),
  pauseRecordingSession: vi.fn(),
  resumeRecordingSession: vi.fn(),
  startRecordingSession: vi.fn(),
  startSidecar: vi.fn(),
  stopRecordingSession: vi.fn(),
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
const getAiReportStatusMock = vi.mocked(getAiReportStatus);
const generateAiReportMock = vi.mocked(generateAiReport);
const cancelAiReportMock = vi.mocked(cancelAiReport);
const getSessionEventsMock = vi.mocked(getSessionEvents);
const getSessionScreenshotsMock = vi.mocked(getSessionScreenshots);
const deleteSessionScreenshotsMock = vi.mocked(deleteSessionScreenshots);
const getSessionsMock = vi.mocked(getSessions);
const deleteSessionMock = vi.mocked(deleteSession);
const exportSessionMarkdownMock = vi.mocked(exportSessionMarkdown);
const exportSessionRawJsonMock = vi.mocked(exportSessionRawJson);
const getSessionFolderMock = vi.mocked(getSessionFolder);
const startRecordingSessionMock = vi.mocked(startRecordingSession);
const pauseRecordingSessionMock = vi.mocked(pauseRecordingSession);
const resumeRecordingSessionMock = vi.mocked(resumeRecordingSession);
const stopRecordingSessionMock = vi.mocked(stopRecordingSession);
const startSidecarMock = vi.mocked(startSidecar);
const stopSidecarMock = vi.mocked(stopSidecar);

const recordingControl: RecorderControlResult = {
  status: "available",
  message: "Recording session started.",
  session: {
    id: "sess_desktop_001",
    startedAt: "2026-05-06T09:14:00+05:30",
    endedAt: null,
    status: "recording",
    title: "Desktop recording",
    storagePath: null,
    privacyMode: "standard",
  },
};

const pausedControl: RecorderControlResult = {
  ...recordingControl,
  message: "Recording session paused.",
  session: {
    ...recordingControl.session!,
    status: "paused",
  },
};

const stoppedControl: RecorderControlResult = {
  ...recordingControl,
  message: "Recording session stopped.",
  session: {
    ...recordingControl.session!,
    endedAt: "2026-05-06T09:17:00+05:30",
    status: "stopped",
  },
};

const markdownExport: SessionExportResult = {
  status: "available",
  message: "Markdown export generated.",
  export: {
    format: "markdown",
    path: "C:/WorkTrace/sessions/sess_live_001/exports/session.md",
    preview:
      "# WorkTrace Session Export\n\nDeterministic export generated from local session evidence. No LLM was used.\n\nEvidence: evt_live_001",
    evidenceIds: ["evt_live_001"],
  },
};

const rawJsonExport: SessionExportResult = {
  status: "available",
  message: "Raw JSON export generated.",
  export: {
    format: "raw_json",
    path: "C:/WorkTrace/sessions/sess_live_001/exports/session.raw.json",
    preview: '{\n  "events": [\n    { "id": "evt_live_001" }\n  ]\n}',
    evidenceIds: ["evt_live_001"],
  },
};

const folderResult: SessionFolderResult = {
  status: "available",
  message: "Session folder is available.",
  path: "C:/WorkTrace/sessions/sess_live_001",
};

const readyAiReportStatus: AiReportResult = {
  status: "ready",
  message: "Local AI report runtime is ready.",
  canGenerate: true,
  report: null,
  evidenceIds: [],
  modelName: "fake-local-report-model",
  modelVersion: "fake-v1",
  runtimeMs: null,
  inputHash: null,
  generatedAt: null,
};

const completeAiReport: AiReportResult = {
  status: "complete",
  message: "Local AI report generated.",
  canGenerate: true,
  report: {
    sessionId: "sess_live_001",
    sessionTitle: "AI report UI fixture",
    summary: {
      text: "Tests ran successfully.",
      evidenceEventIds: ["evt_ai_ui_001"],
    },
    timeline: [],
    blockers: [],
    repeatedActions: [],
    importantFiles: [],
    commands: [
      {
        command: "pnpm test",
        evidenceEventIds: ["evt_ai_ui_001"],
      },
    ],
    workflowSteps: [],
    confidence: 0.8,
    knownEvidenceEventIds: ["evt_ai_ui_001"],
  },
  evidenceIds: ["evt_ai_ui_001"],
  modelName: "fake-local-report-model",
  modelVersion: "fake-v1",
  runtimeMs: 42,
  inputHash: "sha256:fake-input-hash",
  generatedAt: "2026-05-06T09:15:10+05:30",
};

const screenshotMetadata: SessionScreenshotsResult = {
  status: "available",
  message: "Screenshot metadata loaded.",
  screenshots: [
    {
      id: "shot_001",
      sessionId: "sess_live_001",
      sourceEventId: "evt_screen_001",
      timestamp: "2026-05-06T09:14:10+05:30",
      width: 1920,
      height: 1080,
      storedWidth: 960,
      storedHeight: 540,
      byteSize: 12345,
      contentHash: "content_hash_001",
      visualHash: "visual_hash_001",
      storagePath: "screenshots/shot_001.png",
    },
  ],
};

const screenshotDeletion: ScreenshotDeletionResult = {
  status: "available",
  message: "Screenshots deleted.",
  deletedFiles: 1,
  missingFiles: 0,
  deletedRows: 1,
};

beforeEach(() => {
  getAiReportStatusMock.mockReset();
  getAiReportStatusMock.mockResolvedValue({
    status: "runtime_unavailable",
    message: "Local AI report runtime is unavailable. Recording, timeline, and export continue.",
    canGenerate: false,
    report: null,
    evidenceIds: [],
    modelName: null,
    modelVersion: null,
    runtimeMs: null,
    inputHash: null,
    generatedAt: null,
  });
  generateAiReportMock.mockReset();
  generateAiReportMock.mockResolvedValue({
    status: "runtime_unavailable",
    message: "Local AI report runtime is unavailable. Recording, timeline, and export continue.",
    canGenerate: false,
    report: null,
    evidenceIds: [],
    modelName: null,
    modelVersion: null,
    runtimeMs: null,
    inputHash: null,
    generatedAt: null,
  });
  cancelAiReportMock.mockReset();
  cancelAiReportMock.mockResolvedValue({
    status: "cancelled",
    message: "Local AI report generation cancelled.",
    canGenerate: true,
    report: null,
    evidenceIds: [],
    modelName: null,
    modelVersion: null,
    runtimeMs: null,
    inputHash: null,
    generatedAt: null,
  });
  getSessionEventsMock.mockReset();
  getSessionEventsMock.mockResolvedValue({ status: "unavailable", events: [] });
  getSessionScreenshotsMock.mockReset();
  getSessionScreenshotsMock.mockResolvedValue({
    status: "unavailable",
    message: "Screenshot metadata bridge is unavailable.",
    screenshots: [],
  });
  deleteSessionScreenshotsMock.mockReset();
  deleteSessionScreenshotsMock.mockResolvedValue({
    status: "unavailable",
    message: "Screenshot delete bridge is unavailable.",
    deletedFiles: 0,
    missingFiles: 0,
    deletedRows: 0,
  });
  getSessionsMock.mockReset();
  getSessionsMock.mockResolvedValue({
    status: "unavailable",
    message: "Session list bridge is unavailable.",
    sessions: [],
  });
  deleteSessionMock.mockReset();
  deleteSessionMock.mockResolvedValue({
    status: "unavailable",
    message: "Session delete bridge is unavailable.",
    deletedSessionRows: 0,
    deletedScreenshotFiles: 0,
    missingScreenshotFiles: 0,
    deletedScreenshotRows: 0,
    removedArtifactRoot: false,
  });
  exportSessionMarkdownMock.mockReset();
  exportSessionMarkdownMock.mockResolvedValue({
    status: "unavailable",
    message: "Session export bridge is unavailable.",
    export: null,
  });
  exportSessionRawJsonMock.mockReset();
  exportSessionRawJsonMock.mockResolvedValue({
    status: "unavailable",
    message: "Session export bridge is unavailable.",
    export: null,
  });
  getSessionFolderMock.mockReset();
  getSessionFolderMock.mockResolvedValue({
    status: "unavailable",
    message: "Session folder bridge is unavailable.",
    path: null,
  });
  getSidecarHealthMock.mockReset();
  startRecordingSessionMock.mockReset();
  startRecordingSessionMock.mockResolvedValue({
    status: "unavailable",
    message: "Recorder sidecar bridge is unavailable.",
    session: null,
  });
  pauseRecordingSessionMock.mockReset();
  pauseRecordingSessionMock.mockResolvedValue({
    status: "unavailable",
    message: "Recorder sidecar bridge is unavailable.",
    session: null,
  });
  resumeRecordingSessionMock.mockReset();
  resumeRecordingSessionMock.mockResolvedValue({
    status: "unavailable",
    message: "Recorder sidecar bridge is unavailable.",
    session: null,
  });
  stopRecordingSessionMock.mockReset();
  stopRecordingSessionMock.mockResolvedValue({
    status: "unavailable",
    message: "Recorder sidecar bridge is unavailable.",
    session: null,
  });
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

test("shows real sidecar terminal command events when available", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  const sidecarEvents: SessionEventsResult = {
    status: "available",
    events: [
      {
        id: "evt_terminal_001",
        timestamp: "2026-05-06T09:16:00+05:30",
        app: "Terminal command",
        windowTitle: "powershell exit 1: pnpm test --token [REDACTED]",
        source: "terminal_command_detector",
        type: "terminal_command",
      },
    ],
  };
  getSessionEventsMock.mockResolvedValue(sidecarEvents);

  render(<App />);

  const timeline = await screen.findByRole("region", { name: "Raw timeline" });
  const items = within(timeline).getAllByRole("listitem");

  expect(items).toHaveLength(1);
  expect(items[0].textContent).toContain(
    "09:16Terminal commandterminal_command_detectorpowershell exit 1: pnpm test --token [REDACTED]",
  );
});

test("renders session dashboard surfaces with honest unavailable actions", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);

  render(<App />);

  expect(await screen.findByRole("region", { name: "Sessions" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Session detail" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Screenshot evidence" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Export and report review" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Privacy status" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete screenshots" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Export Markdown" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Export raw JSON" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Open session folder" })).toBeDisabled();
  expect(screen.getByText("Connect to a live sidecar session before reviewing screenshots.")).toBeInTheDocument();
  expect(screen.getByText("AI report unavailable")).toBeInTheDocument();
});

test("loads screenshot metadata and shows a safe preview for a live sidecar session", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  getSessionEventsMock.mockResolvedValue({
    status: "available",
    events: [
      {
        id: "evt_live_001",
        timestamp: "2026-05-06T09:14:00+05:30",
        app: "VS Code",
        windowTitle: "workaudit-ai - App.tsx",
        source: "active_window",
        type: "active_window_changed",
      },
    ],
  });
  getSessionScreenshotsMock.mockResolvedValue(screenshotMetadata);

  render(<App />);

  const screenshotPanel = await screen.findByRole("region", { name: "Screenshot evidence" });

  expect(await within(screenshotPanel).findByText("Screenshot metadata loaded.")).toBeInTheDocument();
  expect(getSessionScreenshotsMock).toHaveBeenCalledWith("latest");
  expect(within(screenshotPanel).getAllByText("shot_001").length).toBeGreaterThan(0);
  expect(within(screenshotPanel).getAllByText("evt_screen_001").length).toBeGreaterThan(0);
  expect(within(screenshotPanel).getByText("1920 x 1080 original")).toBeInTheDocument();
  expect(within(screenshotPanel).getByText("960 x 540 stored")).toBeInTheDocument();
  expect(within(screenshotPanel).getByText("screenshots/shot_001.png")).toBeInTheDocument();
  expect(within(screenshotPanel).getByText("No OCR or image text extraction has run.")).toBeInTheDocument();
});

test("deletes screenshots through the desktop bridge and shows deletion counts", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  getSessionEventsMock.mockResolvedValue({
    status: "available",
    events: [
      {
        id: "evt_live_001",
        timestamp: "2026-05-06T09:14:00+05:30",
        app: "VS Code",
        windowTitle: "workaudit-ai - App.tsx",
        source: "active_window",
        type: "active_window_changed",
      },
    ],
  });
  getSessionScreenshotsMock.mockResolvedValue(screenshotMetadata);
  deleteSessionScreenshotsMock.mockResolvedValue(screenshotDeletion);

  render(<App />);

  const screenshotPanel = await screen.findByRole("region", { name: "Screenshot evidence" });
  expect((await within(screenshotPanel).findAllByText("shot_001")).length).toBeGreaterThan(0);

  fireEvent.click(within(screenshotPanel).getByRole("button", { name: "Delete screenshots" }));

  expect(deleteSessionScreenshotsMock).toHaveBeenCalledWith("latest");
  expect(await within(screenshotPanel).findByText("Screenshots deleted.")).toBeInTheDocument();
  expect(within(screenshotPanel).getByText("1 row deleted")).toBeInTheDocument();
  expect(within(screenshotPanel).getByText("1 file deleted")).toBeInTheDocument();
  expect(within(screenshotPanel).getByText("No screenshot metadata for this session.")).toBeInTheDocument();
});

test("shows safe screenshot unavailable state for a live sidecar session", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  getSessionEventsMock.mockResolvedValue({
    status: "available",
    events: [
      {
        id: "evt_live_001",
        timestamp: "2026-05-06T09:14:00+05:30",
        app: "VS Code",
        windowTitle: "workaudit-ai - App.tsx",
        source: "active_window",
        type: "active_window_changed",
      },
    ],
  });
  getSessionScreenshotsMock.mockResolvedValue({
    status: "unavailable",
    message: "Screenshot metadata bridge is unavailable.",
    screenshots: [],
  });

  render(<App />);

  const screenshotPanel = await screen.findByRole("region", { name: "Screenshot evidence" });

  expect(await within(screenshotPanel).findByText("Screenshot metadata bridge is unavailable.")).toBeInTheDocument();
  expect(within(screenshotPanel).getByRole("button", { name: "Delete screenshots" })).toBeDisabled();
});

test("exports markdown and raw JSON previews for a live sidecar session", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  getSessionEventsMock.mockResolvedValue({
    status: "available",
    events: [
      {
        id: "evt_live_001",
        timestamp: "2026-05-06T09:14:00+05:30",
        app: "VS Code",
        windowTitle: "workaudit-ai - App.tsx",
        source: "active_window",
        type: "active_window_changed",
      },
    ],
  });
  exportSessionMarkdownMock.mockResolvedValue(markdownExport);
  exportSessionRawJsonMock.mockResolvedValue(rawJsonExport);
  getSessionFolderMock.mockResolvedValue(folderResult);

  render(<App />);

  const exportPanel = await screen.findByRole("region", { name: "Export and report review" });
  fireEvent.click(within(exportPanel).getByRole("button", { name: "Export Markdown" }));

  expect(exportSessionMarkdownMock).toHaveBeenCalledWith("latest");
  expect(await within(exportPanel).findByText("Markdown export generated.")).toBeInTheDocument();
  expect(within(exportPanel).getByText("evt_live_001")).toBeInTheDocument();
  expect(
    within(exportPanel).getByText(/Deterministic export generated from local session evidence/),
  ).toBeInTheDocument();

  fireEvent.click(within(exportPanel).getByRole("button", { name: "Export raw JSON" }));
  expect(exportSessionRawJsonMock).toHaveBeenCalledWith("latest");
  expect(await within(exportPanel).findByText("Raw JSON export generated.")).toBeInTheDocument();
  expect(within(exportPanel).getByText(/"events"/)).toBeInTheDocument();

  fireEvent.click(within(exportPanel).getByRole("button", { name: "Open session folder" }));
  expect(getSessionFolderMock).toHaveBeenCalledWith("latest");
  expect(await within(exportPanel).findByText("Session folder is available.")).toBeInTheDocument();
  expect(within(exportPanel).getByText("C:/WorkTrace/sessions/sess_live_001")).toBeInTheDocument();
  expect(within(exportPanel).getByText("AI report unavailable")).toBeInTheDocument();
});

test("shows safe export error state when the sidecar export bridge is unavailable", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  getSessionEventsMock.mockResolvedValue({
    status: "available",
    events: [
      {
        id: "evt_live_001",
        timestamp: "2026-05-06T09:14:00+05:30",
        app: "VS Code",
        windowTitle: "workaudit-ai - App.tsx",
        source: "active_window",
        type: "active_window_changed",
      },
    ],
  });
  exportSessionMarkdownMock.mockResolvedValue({
    status: "unavailable",
    message: "Session export bridge is unavailable.",
    export: null,
  });

  render(<App />);

  const exportPanel = await screen.findByRole("region", { name: "Export and report review" });
  fireEvent.click(within(exportPanel).getByRole("button", { name: "Export Markdown" }));

  expect(await within(exportPanel).findByText("Session export bridge is unavailable.")).toBeInTheDocument();
  expect(within(exportPanel).getByText("No export preview available yet.")).toBeInTheDocument();
});

test("shows model unavailable state and disables local AI report generation", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  getSessionEventsMock.mockResolvedValue({
    status: "available",
    events: [
      {
        id: "evt_live_001",
        timestamp: "2026-05-06T09:14:00+05:30",
        app: "VS Code",
        windowTitle: "workaudit-ai - App.tsx",
        source: "active_window",
        type: "active_window_changed",
      },
    ],
  });

  render(<App />);

  const exportPanel = await screen.findByRole("region", { name: "Export and report review" });

  await within(exportPanel).findByText(
    "Local AI report runtime is unavailable. Recording, timeline, and export continue.",
  );
  expect(getAiReportStatusMock).toHaveBeenCalledWith("latest");
  expect(within(exportPanel).getByRole("button", { name: "Generate local AI report" })).toBeDisabled();
});

test("generates a local AI report with evidence IDs and model metadata", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  getSessionEventsMock.mockResolvedValue({
    status: "available",
    events: [
      {
        id: "evt_ai_ui_001",
        timestamp: "2026-05-06T09:14:00+05:30",
        app: "Terminal command",
        windowTitle: "powershell: pnpm test",
        source: "terminal_command_detector",
        type: "terminal_command",
      },
    ],
  });
  getAiReportStatusMock.mockResolvedValue(readyAiReportStatus);
  generateAiReportMock.mockResolvedValue(completeAiReport);

  render(<App />);

  const exportPanel = await screen.findByRole("region", { name: "Export and report review" });
  await within(exportPanel).findByText("Local AI report runtime is ready.");
  fireEvent.click(await within(exportPanel).findByRole("button", { name: "Generate local AI report" }));

  expect(generateAiReportMock).toHaveBeenCalledWith("latest");
  expect(await within(exportPanel).findByText("Local AI report generated.")).toBeInTheDocument();
  expect(within(exportPanel).getByText("Tests ran successfully.")).toBeInTheDocument();
  expect(within(exportPanel).getAllByText("evt_ai_ui_001").length).toBeGreaterThan(0);
  expect(within(exportPanel).getByText("fake-local-report-model")).toBeInTheDocument();
  expect(within(exportPanel).getByText("42 ms")).toBeInTheDocument();
  expect(within(exportPanel).getByText("sha256:fake-input-hash")).toBeInTheDocument();
  expect(within(exportPanel).getByRole("button", { name: "Regenerate local AI report" })).toBeInTheDocument();
  expect(within(exportPanel).queryByText(/full prompt/i)).not.toBeInTheDocument();
});

test("shows failed safely state when local AI report validation fails", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  getSessionEventsMock.mockResolvedValue({
    status: "available",
    events: [
      {
        id: "evt_ai_ui_001",
        timestamp: "2026-05-06T09:14:00+05:30",
        app: "Terminal command",
        windowTitle: "powershell: pnpm test",
        source: "terminal_command_detector",
        type: "terminal_command",
      },
    ],
  });
  getAiReportStatusMock.mockResolvedValue(readyAiReportStatus);
  generateAiReportMock.mockResolvedValue({
    status: "failed_safely",
    message: "Local report output could not be validated after one retry.",
    canGenerate: true,
    report: null,
    evidenceIds: [],
    modelName: "fake-local-report-model",
    modelVersion: "fake-v1",
    runtimeMs: null,
    inputHash: "sha256:fake-input-hash",
    generatedAt: null,
  });

  render(<App />);

  const exportPanel = await screen.findByRole("region", { name: "Export and report review" });
  await within(exportPanel).findByText("Local AI report runtime is ready.");
  fireEvent.click(await within(exportPanel).findByRole("button", { name: "Generate local AI report" }));

  expect(
    await within(exportPanel).findByText("Local report output could not be validated after one retry."),
  ).toBeInTheDocument();
  expect(within(exportPanel).queryByText(/full prompt/i)).not.toBeInTheDocument();
});

test("cancels a running local AI report", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  getSessionEventsMock.mockResolvedValue({
    status: "available",
    events: [
      {
        id: "evt_ai_ui_001",
        timestamp: "2026-05-06T09:14:00+05:30",
        app: "Terminal command",
        windowTitle: "powershell: pnpm test",
        source: "terminal_command_detector",
        type: "terminal_command",
      },
    ],
  });
  getAiReportStatusMock.mockResolvedValue(readyAiReportStatus);
  generateAiReportMock.mockReturnValue(new Promise(() => undefined));

  render(<App />);

  const exportPanel = await screen.findByRole("region", { name: "Export and report review" });
  await within(exportPanel).findByText("Local AI report runtime is ready.");
  fireEvent.click(await within(exportPanel).findByRole("button", { name: "Generate local AI report" }));
  fireEvent.click(await within(exportPanel).findByRole("button", { name: "Cancel local AI report" }));

  expect(cancelAiReportMock).toHaveBeenCalledWith("latest");
  expect(await within(exportPanel).findByText("Local AI report generation cancelled.")).toBeInTheDocument();
});

test("does not generate a local AI report while recording is active", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  startRecordingSessionMock.mockResolvedValue(recordingControl);
  getAiReportStatusMock.mockResolvedValue(readyAiReportStatus);

  render(<App />);

  fireEvent.click(await screen.findByRole("button", { name: "Start recording" }));
  expect(await screen.findByText("Recording")).toBeInTheDocument();

  const exportPanel = screen.getByRole("region", { name: "Export and report review" });
  expect(within(exportPanel).getByRole("button", { name: "Generate local AI report" })).toBeDisabled();
  expect(generateAiReportMock).not.toHaveBeenCalled();
});

test("starts pauses resumes and stops a recorder session from the desktop controls", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  startRecordingSessionMock.mockResolvedValue(recordingControl);
  pauseRecordingSessionMock.mockResolvedValue(pausedControl);
  resumeRecordingSessionMock.mockResolvedValue(recordingControl);
  stopRecordingSessionMock.mockResolvedValue(stoppedControl);
  getSessionEventsMock
    .mockResolvedValueOnce({ status: "available", events: [] })
    .mockResolvedValue({
      status: "available",
      events: [
        {
          id: "evt_live_001",
          timestamp: "2026-05-06T09:14:00+05:30",
          app: "VS Code",
          windowTitle: "workaudit-ai - App.tsx",
          source: "active_window",
          type: "active_window_changed",
        },
      ],
    });

  render(<App />);

  expect(await screen.findByText("Recorder idle")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
  expect(await screen.findByText("Recording")).toBeInTheDocument();
  expect(screen.getByText("sess_desktop_001")).toBeInTheDocument();
  expect(screen.getByText("standard")).toBeInTheDocument();
  expect(screen.getByText("Recording session started.")).toBeInTheDocument();
  expect(startRecordingSessionMock).toHaveBeenCalledOnce();

  fireEvent.click(screen.getByRole("button", { name: "Pause recording" }));
  expect(await screen.findByText("Paused")).toBeInTheDocument();
  expect(screen.getByText("Recording session paused.")).toBeInTheDocument();
  expect(pauseRecordingSessionMock).toHaveBeenCalledWith({
    pausedAt: expect.any(String),
    sessionId: "sess_desktop_001",
  });

  fireEvent.click(screen.getByRole("button", { name: "Resume recording" }));
  expect(await screen.findByText("Recording")).toBeInTheDocument();
  expect(resumeRecordingSessionMock).toHaveBeenCalledWith({
    resumedAt: expect.any(String),
    sessionId: "sess_desktop_001",
  });

  fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
  expect(await screen.findByText("Stopped")).toBeInTheDocument();
  expect(screen.getByText("Recording session stopped.")).toBeInTheDocument();
  expect(stopRecordingSessionMock).toHaveBeenCalledWith({
    stoppedAt: expect.any(String),
    sessionId: "sess_desktop_001",
  });
  const recorderControls = screen.getByRole("article", { name: "Recorder controls" });
  expect(within(recorderControls).getByText("1")).toBeInTheDocument();
});

test("shows a safe recorder unavailable state when lifecycle bridge is missing", async () => {
  getSidecarHealthMock.mockResolvedValue(missingSidecar);
  startRecordingSessionMock.mockResolvedValue({
    status: "unavailable",
    message: "Recorder sidecar bridge is unavailable.",
    session: null,
  });

  render(<App />);

  fireEvent.click(await screen.findByRole("button", { name: "Start recording" }));

  expect(await screen.findByText("Recorder unavailable")).toBeInTheDocument();
  expect(screen.getByText("Recorder sidecar bridge is unavailable.")).toBeInTheDocument();
});

test("filters live raw timeline events by source", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  getSessionEventsMock.mockResolvedValue({
    status: "available",
    events: [
      {
        id: "evt_live_001",
        timestamp: "2026-05-06T09:14:00+05:30",
        app: "VS Code",
        windowTitle: "workaudit-ai - App.tsx",
        source: "active_window",
        type: "active_window_changed",
      },
      {
        id: "evt_file_001",
        timestamp: "2026-05-06T09:15:00+05:30",
        app: "File change",
        windowTitle: "modified C:/repo/src/app.py",
        source: "file_watcher",
        type: "file_changed",
      },
      {
        id: "evt_terminal_001",
        timestamp: "2026-05-06T09:16:00+05:30",
        app: "Terminal command",
        windowTitle: "powershell exit 1: pnpm test",
        source: "terminal_command_detector",
        type: "terminal_command",
      },
    ],
  });

  render(<App />);

  const timeline = await screen.findByRole("region", { name: "Raw timeline" });
  fireEvent.click(screen.getByRole("button", { name: "Terminal" }));

  const items = within(timeline).getAllByRole("listitem");
  expect(items).toHaveLength(1);
  expect(items[0].textContent).toContain("Terminal command");
  expect(within(timeline).queryByText("VS Code")).not.toBeInTheDocument();
  expect(within(timeline).queryByText("File change")).not.toBeInTheDocument();
});

test("shows empty raw timeline state when live sidecar has no events", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  getSessionEventsMock.mockResolvedValue({ status: "available", events: [] });

  render(<App />);

  const timeline = await screen.findByRole("region", { name: "Raw timeline" });

  expect(within(timeline).getByText("No raw events for this filter.")).toBeInTheDocument();
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

const sessionListResult: SessionListResult = {
  status: "available",
  message: "Sessions loaded.",
  sessions: [
    {
      id: "sess_browser_001",
      startedAt: "2026-05-06T09:14:00+05:30",
      endedAt: "2026-05-06T09:15:00+05:30",
      status: "stopped",
      title: "Test session",
      storagePath: null,
      privacyMode: "standard",
      eventCount: 2,
      screenshotCount: 1,
    },
    {
      id: "sess_browser_002",
      startedAt: "2026-05-05T10:00:00+05:30",
      endedAt: null,
      status: "interrupted",
      title: null,
      storagePath: null,
      privacyMode: "standard",
      eventCount: 0,
      screenshotCount: 0,
    },
  ],
};

const sessionDeletion: SessionDeletionResult = {
  status: "available",
  message: "Session deleted.",
  deletedSessionRows: 1,
  deletedScreenshotFiles: 1,
  missingScreenshotFiles: 0,
  deletedScreenshotRows: 1,
  removedArtifactRoot: true,
};

test("session browser panel shows unavailable state when sidecar is missing", async () => {
  getSidecarHealthMock.mockResolvedValue(missingSidecar);

  render(<App />);

  const panel = await screen.findByRole("region", { name: "Session browser" });

  expect(within(panel).getByRole("button", { name: "Refresh sessions" })).toBeInTheDocument();
  expect(within(panel).getByText("Session list bridge is unavailable.")).toBeInTheDocument();
});

test("session browser loads session list from sidecar and shows session details", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  getSessionsMock.mockResolvedValue(sessionListResult);

  render(<App />);

  const panel = await screen.findByRole("region", { name: "Session browser" });

  expect(await within(panel).findByText("sess_browser_001")).toBeInTheDocument();
  expect(within(panel).getByText("Test session")).toBeInTheDocument();
  expect(within(panel).getByText("2 events")).toBeInTheDocument();
  expect(within(panel).getByText("1 screenshot")).toBeInTheDocument();
  expect(within(panel).getByText("sess_browser_002")).toBeInTheDocument();
});

test("session browser deletes a selected session through the bridge", async () => {
  getSidecarHealthMock.mockResolvedValue(healthySidecar);
  getSessionsMock.mockResolvedValue(sessionListResult);
  deleteSessionMock.mockResolvedValue(sessionDeletion);

  render(<App />);

  const panel = await screen.findByRole("region", { name: "Session browser" });
  expect(await within(panel).findByText("sess_browser_001")).toBeInTheDocument();

  fireEvent.click(within(panel).getByRole("button", { name: "Delete session sess_browser_001" }));

  expect(deleteSessionMock).toHaveBeenCalledWith("sess_browser_001");
  expect(await within(panel).findByText("Session deleted.")).toBeInTheDocument();
  expect(within(panel).getByText("1 session row deleted")).toBeInTheDocument();
});
