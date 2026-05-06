import { render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import App from "./App";
import {
  getSidecarHealth,
  startSidecar,
  stopSidecar,
  type SidecarHealth,
} from "./lib/tauri-client";

vi.mock("./lib/tauri-client", () => ({
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
const startSidecarMock = vi.mocked(startSidecar);
const stopSidecarMock = vi.mocked(stopSidecar);

beforeEach(() => {
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

  const timeline = screen.getByRole("region", { name: "Raw timeline simulation" });
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
