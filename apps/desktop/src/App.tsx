import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { RecoveryBanner } from "./features/recovery/RecoveryBanner";
import { recoverySimulationSessions } from "./features/recovery/recovery-simulation";
import { RawTimeline } from "./features/timeline/RawTimeline";
import {
  rawTimelineSimulationEvents,
  type RawTimelineEvent,
} from "./features/timeline/raw-timeline-simulation";
import {
  deleteSession,
  deleteSessionScreenshots,
  exportSessionMarkdown,
  exportSessionRawJson,
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
  type RecorderControlResult,
  type RecorderSession,
  type ScreenshotDeletionResult,
  type SessionDeletionResult,
  type SessionExportPreview,
  type SessionExportResult,
  type SessionEventsResult,
  type SessionFolderResult,
  type SessionScreenshot,
  type SessionScreenshotsResult,
  type SessionSummary,
  type SidecarHealth,
} from "./lib/tauri-client";

const statusPanels = [
  {
    title: "Privacy",
    state: "Local-first",
    tone: "border-emerald-300 bg-emerald-50 text-emerald-950",
    details: "No cloud upload, keylogging, terminal spying, browser history, or file contents.",
  },
  {
    title: "Evidence",
    state: "Contracts ready",
    tone: "border-zinc-300 bg-zinc-50 text-zinc-950",
    details: "Shared schemas and fake-session export proof are available for later UI work.",
  },
];

const initialSidecarHealth: SidecarHealth = {
  status: "loading",
  appVersion: null,
  schemaVersion: null,
  message: "Checking local agent sidecar status.",
};

const initialSessionEvents: SessionEventsResult = {
  status: "unavailable",
  events: [],
};

const initialRecorderMessage = "Ready to start a local sidecar-backed recording session.";

type RecorderUiStatus =
  | "idle"
  | "loading"
  | "unavailable"
  | RecorderSession["status"];

type EventFilter = "all" | RawTimelineEvent["source"];

type ExportReviewState =
  | { status: "idle" | "loading" | "unavailable"; message: string; export: null }
  | { status: "success"; message: string; export: SessionExportPreview };

type FolderReviewState =
  | { status: "idle" | "loading" | "unavailable"; message: string; path: null }
  | { status: "success"; message: string; path: string };

type ScreenshotReviewState =
  | { status: "idle" | "loading" | "unavailable"; message: string; screenshots: [] }
  | { status: "success"; message: string; screenshots: SessionScreenshot[] };

type ScreenshotDeletionState =
  | { status: "idle" | "loading" | "unavailable"; message: string; result: null }
  | { status: "success"; message: string; result: ScreenshotDeletionResult };

type SessionBrowserState =
  | { status: "idle" | "loading" | "unavailable"; message: string; sessions: [] }
  | { status: "success"; message: string; sessions: SessionSummary[] };

type SessionDeletionState =
  | { status: "idle" | "loading" | "unavailable"; message: string; result: null }
  | { status: "success"; message: string; result: SessionDeletionResult };

const eventFilters: { label: string; value: EventFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active windows", value: "active_window" },
  { label: "Files", value: "file_watcher" },
  { label: "Terminal", value: "terminal_command_detector" },
];

const sidecarLabels: Record<SidecarHealth["status"], string> = {
  loading: "Checking sidecar",
  healthy: "Sidecar healthy",
  unhealthy: "Sidecar unhealthy",
  missing: "Missing sidecar",
};

const sidecarTone: Record<SidecarHealth["status"], string> = {
  loading: "border-sky-300 bg-sky-50 text-sky-950",
  healthy: "border-emerald-300 bg-emerald-50 text-emerald-950",
  unhealthy: "border-rose-300 bg-rose-50 text-rose-950",
  missing: "border-amber-300 bg-amber-50 text-amber-950",
};

const initialExportReviewState: ExportReviewState = {
  status: "idle",
  message: "No export preview available yet.",
  export: null,
};

const initialFolderReviewState: FolderReviewState = {
  status: "idle",
  message: "Session folder lookup has not run yet.",
  path: null,
};

const initialScreenshotReviewState: ScreenshotReviewState = {
  status: "idle",
  message: "Connect to a live sidecar session before reviewing screenshots.",
  screenshots: [],
};

const initialScreenshotDeletionState: ScreenshotDeletionState = {
  status: "idle",
  message: "No screenshot deletion has run yet.",
  result: null,
};

const initialSessionBrowserState: SessionBrowserState = {
  status: "unavailable",
  message: "Session list bridge is unavailable.",
  sessions: [],
};

const initialSessionDeletionState: SessionDeletionState = {
  status: "idle",
  message: "No session deletion has run yet.",
  result: null,
};

function App() {
  const [sidecarHealth, setSidecarHealth] = useState<SidecarHealth>(initialSidecarHealth);
  const [sessionEvents, setSessionEvents] = useState<SessionEventsResult>(initialSessionEvents);
  const [recorderSession, setRecorderSession] = useState<RecorderSession | null>(null);
  const [recorderStatus, setRecorderStatus] = useState<RecorderUiStatus>("idle");
  const [recorderMessage, setRecorderMessage] = useState(initialRecorderMessage);
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [exportReview, setExportReview] =
    useState<ExportReviewState>(initialExportReviewState);
  const [folderReview, setFolderReview] =
    useState<FolderReviewState>(initialFolderReviewState);
  const [screenshotReview, setScreenshotReview] =
    useState<ScreenshotReviewState>(initialScreenshotReviewState);
  const [screenshotDeletion, setScreenshotDeletion] =
    useState<ScreenshotDeletionState>(initialScreenshotDeletionState);
  const [selectedScreenshotId, setSelectedScreenshotId] = useState<string | null>(null);
  const [sessionBrowser, setSessionBrowser] =
    useState<SessionBrowserState>(initialSessionBrowserState);
  const [sessionDeletion, setSessionDeletion] =
    useState<SessionDeletionState>(initialSessionDeletionState);
  const sourceEvents: RawTimelineEvent[] =
    sessionEvents.status === "available" ? sessionEvents.events : rawTimelineSimulationEvents;
  const timelineEvents =
    eventFilter === "all"
      ? sourceEvents
      : sourceEvents.filter((event) => event.source === eventFilter);
  const sessionEventCount = sourceEvents.length;
  const sourceStatusLabel =
    sessionEvents.status === "available" ? "Latest sidecar session" : "Fixture preview session";
  const reviewSessionId =
    recorderSession?.id ?? (sessionEvents.status === "available" ? "latest" : null);

  const refreshSidecarHealth = useCallback(async () => {
    setSidecarHealth(initialSidecarHealth);
    setSidecarHealth(await getSidecarHealth());
  }, []);

  const handleStartSidecar = async () => {
    setSidecarHealth({
      ...initialSidecarHealth,
      message: "Starting local agent sidecar.",
    });
    setSidecarHealth(await startSidecar());
  };

  const handleStopSidecar = async () => {
    setSidecarHealth({
      ...initialSidecarHealth,
      message: "Stopping local agent sidecar.",
    });
    setSidecarHealth(await stopSidecar());
  };

  const applyRecorderResult = async (result: RecorderControlResult) => {
    setRecorderMessage(result.message);
    if (result.status === "unavailable") {
      setRecorderStatus("unavailable");
      return;
    }

    setRecorderSession(result.session);
    setRecorderStatus(result.session.status);
    setSessionEvents(await getSessionEvents(result.session.id));
  };

  const handleStartRecording = async () => {
    setRecorderStatus("loading");
    setRecorderMessage("Starting recording session.");
    await applyRecorderResult(
      await startRecordingSession({
        sessionId: createSessionId(),
        startedAt: nowWithOffset(),
        title: "Desktop recording",
        privacyMode: "standard",
      }),
    );
  };

  const handlePauseRecording = async () => {
    if (!recorderSession) {
      return;
    }
    setRecorderStatus("loading");
    setRecorderMessage("Pausing recording session.");
    await applyRecorderResult(
      await pauseRecordingSession({
        sessionId: recorderSession.id,
        pausedAt: nowWithOffset(),
      }),
    );
  };

  const handleResumeRecording = async () => {
    if (!recorderSession) {
      return;
    }
    setRecorderStatus("loading");
    setRecorderMessage("Resuming recording session.");
    await applyRecorderResult(
      await resumeRecordingSession({
        sessionId: recorderSession.id,
        resumedAt: nowWithOffset(),
      }),
    );
  };

  const handleStopRecording = async () => {
    if (!recorderSession) {
      return;
    }
    setRecorderStatus("loading");
    setRecorderMessage("Stopping recording session.");
    await applyRecorderResult(
      await stopRecordingSession({
        sessionId: recorderSession.id,
        stoppedAt: nowWithOffset(),
      }),
    );
  };

  const applyExportResult = (result: SessionExportResult) => {
    if (result.status === "unavailable") {
      setExportReview({
        status: "unavailable",
        message: result.message,
        export: null,
      });
      return;
    }

    setExportReview({
      status: "success",
      message: result.message,
      export: result.export,
    });
  };

  const applyFolderResult = (result: SessionFolderResult) => {
    if (result.status === "unavailable") {
      setFolderReview({
        status: "unavailable",
        message: result.message,
        path: null,
      });
      return;
    }

    setFolderReview({
      status: "success",
      message: result.message,
      path: result.path,
    });
  };

  const handleExportMarkdown = async () => {
    if (!reviewSessionId) {
      return;
    }
    setExportReview({
      status: "loading",
      message: "Generating Markdown export preview.",
      export: null,
    });
    applyExportResult(await exportSessionMarkdown(reviewSessionId));
  };

  const handleExportRawJson = async () => {
    if (!reviewSessionId) {
      return;
    }
    setExportReview({
      status: "loading",
      message: "Generating raw JSON export preview.",
      export: null,
    });
    applyExportResult(await exportSessionRawJson(reviewSessionId));
  };

  const handleOpenSessionFolder = async () => {
    if (!reviewSessionId) {
      return;
    }
    setFolderReview({
      status: "loading",
      message: "Checking session folder availability.",
      path: null,
    });
    applyFolderResult(await getSessionFolder(reviewSessionId));
  };

  const applyScreenshotResult = (result: SessionScreenshotsResult) => {
    if (result.status === "unavailable") {
      setScreenshotReview({
        status: "unavailable",
        message: result.message,
        screenshots: [],
      });
      setSelectedScreenshotId(null);
      return;
    }

    setScreenshotReview({
      status: "success",
      message: result.message,
      screenshots: result.screenshots,
    });
    setSelectedScreenshotId(result.screenshots[0]?.id ?? null);
  };

  const handleDeleteScreenshots = async () => {
    if (!reviewSessionId) {
      return;
    }
    setScreenshotDeletion({
      status: "loading",
      message: "Deleting screenshot artifacts.",
      result: null,
    });
    const result = await deleteSessionScreenshots(reviewSessionId);
    if (result.status === "unavailable") {
      setScreenshotDeletion({
        status: "unavailable",
        message: result.message,
        result: null,
      });
      return;
    }
    setScreenshotDeletion({
      status: "success",
      message: result.message,
      result,
    });
    setScreenshotReview({
      status: "success",
      message: "Screenshot metadata loaded.",
      screenshots: [],
    });
    setSelectedScreenshotId(null);
  };

  const handleRefreshSessions = useCallback(async () => {
    setSessionBrowser({
      status: "loading",
      message: "Loading session list.",
      sessions: [],
    });
    const result = await getSessions();
    if (result.status === "unavailable") {
      setSessionBrowser({
        status: "unavailable",
        message: result.message,
        sessions: [],
      });
      return;
    }
    setSessionBrowser({
      status: "success",
      message: result.message,
      sessions: result.sessions,
    });
  }, []);

  const handleDeleteSession = async (sessionId: string) => {
    setSessionDeletion({
      status: "loading",
      message: "Deleting session.",
      result: null,
    });
    const result = await deleteSession(sessionId);
    if (result.status === "unavailable") {
      setSessionDeletion({
        status: "unavailable",
        message: result.message,
        result: null,
      });
      return;
    }
    setSessionDeletion({
      status: "success",
      message: result.message,
      result,
    });
    // Refresh the session list after deletion
    void handleRefreshSessions();
  };

  useEffect(() => {
    let isMounted = true;

    void Promise.all([getSidecarHealth(), getSessionEvents(), getSessions()]).then(
      ([health, events, sessions]) => {
        if (isMounted) {
          setSidecarHealth(health);
          setSessionEvents(events);
          if (sessions.status === "unavailable") {
            setSessionBrowser({
              status: "unavailable",
              message: sessions.message,
              sessions: [],
            });
          } else {
            setSessionBrowser({
              status: "success",
              message: sessions.message,
              sessions: sessions.sessions,
            });
          }
        }
      },
    );

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    void Promise.resolve().then(async () => {
      if (!isMounted) {
        return;
      }

      if (!reviewSessionId) {
        setScreenshotReview(initialScreenshotReviewState);
        setScreenshotDeletion(initialScreenshotDeletionState);
        setSelectedScreenshotId(null);
        return;
      }

      setScreenshotReview({
        status: "loading",
        message: "Loading screenshot metadata.",
        screenshots: [],
      });
      setScreenshotDeletion(initialScreenshotDeletionState);
      const result = await getSessionScreenshots(reviewSessionId);
      if (isMounted) {
        applyScreenshotResult(result);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [reviewSessionId]);

  return (
    <main className="min-h-screen bg-stone-100 text-zinc-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-4 border-b border-zinc-300 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Local-first desktop shell
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-normal text-zinc-950">
              WorkTrace AI
            </h1>
          </div>
          <div className="rounded-md border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-700">
            Phase: recorder control flow
          </div>
        </header>

        <section
          aria-label="Desktop shell status"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <article
            className={`min-h-44 rounded-md border p-5 shadow-sm ${sidecarTone[sidecarHealth.status]}`}
          >
            <div className="flex h-full flex-col justify-between gap-5">
              <div>
                <h2 className="text-lg font-semibold tracking-normal">Local agent</h2>
                <p className="mt-3 text-2xl font-semibold tracking-normal">
                  {sidecarLabels[sidecarHealth.status]}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-sm leading-6">{sidecarHealth.message}</p>
                {sidecarHealth.appVersion && sidecarHealth.schemaVersion ? (
                  <p className="text-xs font-medium">
                    App {sidecarHealth.appVersion} / schema {sidecarHealth.schemaVersion}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-md border border-current px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={sidecarHealth.status === "loading"}
                    onClick={refreshSidecarHealth}
                    type="button"
                  >
                    Check
                  </button>
                  <button
                    className="rounded-md border border-current px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={sidecarHealth.status === "loading"}
                    onClick={handleStartSidecar}
                    type="button"
                  >
                    Start
                  </button>
                  <button
                    className="rounded-md border border-current px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={sidecarHealth.status === "loading"}
                    onClick={handleStopSidecar}
                    type="button"
                  >
                    Stop
                  </button>
                </div>
              </div>
            </div>
          </article>
          <RecorderControlPanel
            eventCount={sessionEvents.status === "available" ? sessionEvents.events.length : 0}
            message={recorderMessage}
            onPause={handlePauseRecording}
            onResume={handleResumeRecording}
            onStart={handleStartRecording}
            onStop={handleStopRecording}
            session={recorderSession}
            status={recorderStatus}
          />
          {statusPanels.map((panel) => (
            <article
              className={`min-h-44 rounded-md border p-5 shadow-sm ${panel.tone}`}
              key={panel.title}
            >
              <div className="flex h-full flex-col justify-between gap-6">
                <div>
                  <h2 className="text-lg font-semibold tracking-normal">{panel.title}</h2>
                  <p className="mt-3 text-2xl font-semibold tracking-normal">{panel.state}</p>
                </div>
                <p className="text-sm leading-6">{panel.details}</p>
              </div>
            </article>
          ))}
        </section>

        <RecoveryBanner sessions={recoverySimulationSessions} />

        <SessionBrowserPanel
          deletionState={sessionDeletion}
          onDelete={handleDeleteSession}
          onRefresh={handleRefreshSessions}
          state={sessionBrowser}
        />

        <section
          aria-label="Sessions"
          className="rounded-md border border-zinc-300 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Sessions
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                {sourceStatusLabel}
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-zinc-700">
              {sessionEvents.status === "available"
                ? "Loaded from the configured local sidecar event bridge."
                : "The sidecar session list is unavailable, so the dashboard is showing the deterministic preview session."}
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Metric label="Raw events" value={sessionEventCount.toString()} />
            <Metric label="Connection" value={sessionEvents.status} />
            <Metric label="Selected filter" value={filterLabel(eventFilter)} />
          </div>
        </section>

        <section
          aria-label="Session detail"
          className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]"
        >
          <div className="space-y-4">
            <div className="rounded-md border border-zinc-300 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                    Filters
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-normal">Raw event stream</h2>
                </div>
                <div className="flex flex-wrap gap-2" aria-label="Event filters">
                  {eventFilters.map((filter) => (
                    <button
                      className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
                        eventFilter === filter.value
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-300 bg-white text-zinc-800"
                      }`}
                      key={filter.value}
                      onClick={() => setEventFilter(filter.value)}
                      type="button"
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <RawTimeline events={timelineEvents} sourceStatus={sessionEvents.status} />
          </div>

          <aside className="space-y-4">
            <ScreenshotEvidencePanel
              canReview={Boolean(reviewSessionId)}
              deletionState={screenshotDeletion}
              onDelete={handleDeleteScreenshots}
              onSelect={setSelectedScreenshotId}
              selectedScreenshotId={selectedScreenshotId}
              state={screenshotReview}
            />

            <ExportReviewPanel
              canReview={Boolean(reviewSessionId)}
              exportState={exportReview}
              folderState={folderReview}
              onExportMarkdown={handleExportMarkdown}
              onExportRawJson={handleExportRawJson}
              onOpenSessionFolder={handleOpenSessionFolder}
            />

            <section
              aria-label="Privacy status"
              className="rounded-md border border-emerald-300 bg-emerald-50 p-5 text-emerald-950 shadow-sm"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Privacy
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-normal">Privacy status</h2>
              <p className="mt-3 text-sm leading-6">
                Local-only review. Terminal ingestion is explicit, file events are metadata-only,
                and blocked/private capture controls remain sidecar-owned.
              </p>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}

function RecorderControlPanel({
  eventCount,
  message,
  onPause,
  onResume,
  onStart,
  onStop,
  session,
  status,
}: {
  eventCount: number;
  message: string;
  onPause: () => void;
  onResume: () => void;
  onStart: () => void;
  onStop: () => void;
  session: RecorderSession | null;
  status: RecorderUiStatus;
}) {
  const isBusy = status === "loading";
  const canPause = session?.status === "recording" && !isBusy;
  const canResume = session?.status === "paused" && !isBusy;
  const canStop =
    (session?.status === "recording" || session?.status === "paused") && !isBusy;

  return (
    <article
      aria-label="Recorder controls"
      className={`min-h-44 rounded-md border p-5 shadow-sm ${recorderTone(status)}`}
    >
      <div className="flex h-full flex-col justify-between gap-5">
        <div>
          <h2 className="text-lg font-semibold tracking-normal">Recorder</h2>
          <p className="mt-3 text-2xl font-semibold tracking-normal">
            {recorderLabel(status)}
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-sm leading-6">{message}</p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Metric label="Events" value={eventCount.toString()} />
            <Metric label="Privacy" value={session?.privacyMode ?? "standard"} />
            <Metric label="Session" value={session?.id ?? "none"} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md border border-current px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isBusy || session?.status === "recording" || session?.status === "paused"}
              onClick={onStart}
              type="button"
            >
              Start recording
            </button>
            <button
              className="rounded-md border border-current px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canPause}
              onClick={onPause}
              type="button"
            >
              Pause recording
            </button>
            <button
              className="rounded-md border border-current px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canResume}
              onClick={onResume}
              type="button"
            >
              Resume recording
            </button>
            <button
              className="rounded-md border border-current px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canStop}
              onClick={onStop}
              type="button"
            >
              Stop recording
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ScreenshotEvidencePanel({
  canReview,
  deletionState,
  onDelete,
  onSelect,
  selectedScreenshotId,
  state,
}: {
  canReview: boolean;
  deletionState: ScreenshotDeletionState;
  onDelete: () => void;
  onSelect: (screenshotId: string) => void;
  selectedScreenshotId: string | null;
  state: ScreenshotReviewState;
}) {
  const selectedScreenshot =
    state.status === "success"
      ? state.screenshots.find((screenshot) => screenshot.id === selectedScreenshotId) ??
        state.screenshots[0] ??
        null
      : null;
  const isScreenshotLoading = state.status === "loading";
  const hasScreenshots = state.status === "success" && state.screenshots.length > 0;
  const deleteDisabled =
    !canReview ||
    isScreenshotLoading ||
    !hasScreenshots ||
    deletionState.status === "loading";

  return (
    <section
      aria-label="Screenshot evidence"
      className="rounded-md border border-zinc-300 bg-white p-5 shadow-sm"
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
        Screenshots
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-normal">Screenshot evidence</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-700">{state.message}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-700">
        No OCR or image text extraction has run.
      </p>

      <button
        className="mt-4 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-500 disabled:opacity-70"
        disabled={deleteDisabled}
        onClick={onDelete}
        type="button"
      >
        Delete screenshots
      </button>

      {deletionState.status !== "idle" ? (
        <div
          aria-live="polite"
          className={`mt-3 rounded-md border p-3 text-sm ${
            deletionState.status === "unavailable"
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-zinc-200 bg-zinc-50 text-zinc-800"
          }`}
        >
          <p className="font-semibold text-zinc-950">{deletionState.message}</p>
          {deletionState.result ? (
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
              <Metric
                label="Rows"
                value={`${deletionState.result.deletedRows} row deleted`}
              />
              <Metric
                label="Files"
                value={`${deletionState.result.deletedFiles} file deleted`}
              />
              <Metric
                label="Missing"
                value={`${deletionState.result.missingFiles} missing`}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {state.status === "loading" ? (
          <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            Loading screenshot metadata.
          </p>
        ) : null}
        {state.status === "success" && state.screenshots.length === 0 ? (
          <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            No screenshot metadata for this session.
          </p>
        ) : null}
        {hasScreenshots ? (
          <ul className="space-y-2">
            {state.screenshots.map((screenshot) => (
              <li key={screenshot.id}>
                <button
                  className={`w-full rounded-md border p-3 text-left text-sm ${
                    selectedScreenshot?.id === screenshot.id
                      ? "border-zinc-950 bg-zinc-50"
                      : "border-zinc-200 bg-white"
                  }`}
                  onClick={() => onSelect(screenshot.id)}
                  type="button"
                >
                  <span className="block font-semibold text-zinc-950">{screenshot.id}</span>
                  <span className="mt-1 block text-xs text-zinc-600">
                    {screenshot.sourceEventId ?? "No source event"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {selectedScreenshot ? (
        <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800">
          <h3 className="font-semibold tracking-normal text-zinc-950">Preview metadata</h3>
          <dl className="mt-3 space-y-2">
            <MetadataRow label="Evidence ID" value={selectedScreenshot.id} />
            <MetadataRow
              label="Source event"
              value={selectedScreenshot.sourceEventId ?? "none"}
            />
            <MetadataRow
              label="Original"
              value={`${selectedScreenshot.width} x ${selectedScreenshot.height} original`}
            />
            <MetadataRow
              label="Stored"
              value={`${selectedScreenshot.storedWidth} x ${selectedScreenshot.storedHeight} stored`}
            />
            <MetadataRow label="Bytes" value={selectedScreenshot.byteSize.toString()} />
            <MetadataRow label="Path" value={selectedScreenshot.storagePath} />
            <MetadataRow label="Content hash" value={selectedScreenshot.contentHash} />
            <MetadataRow label="Visual hash" value={selectedScreenshot.visualHash} />
          </dl>
        </div>
      ) : null}
    </section>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="break-all text-sm text-zinc-800">{value}</dd>
    </div>
  );
}

function ExportReviewPanel({
  canReview,
  exportState,
  folderState,
  onExportMarkdown,
  onExportRawJson,
  onOpenSessionFolder,
}: {
  canReview: boolean;
  exportState: ExportReviewState;
  folderState: FolderReviewState;
  onExportMarkdown: () => void;
  onExportRawJson: () => void;
  onOpenSessionFolder: () => void;
}) {
  const isExportBusy = exportState.status === "loading";
  const isFolderBusy = folderState.status === "loading";
  const controlsDisabled = !canReview || isExportBusy;
  const folderDisabled = !canReview || isFolderBusy;

  return (
    <section
      aria-label="Export and report review"
      className="rounded-md border border-zinc-300 bg-white p-5 shadow-sm"
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Export</p>
      <h2 className="mt-2 text-xl font-semibold tracking-normal">Export and report review</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-500 disabled:opacity-70"
          disabled={controlsDisabled}
          onClick={onExportMarkdown}
          type="button"
        >
          Export Markdown
        </button>
        <button
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-500 disabled:opacity-70"
          disabled={controlsDisabled}
          onClick={onExportRawJson}
          type="button"
        >
          Export raw JSON
        </button>
        <button
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-500 disabled:opacity-70"
          disabled={folderDisabled}
          onClick={onOpenSessionFolder}
          type="button"
        >
          Open session folder
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-700">
        {canReview
          ? "Exports are deterministic local files generated from the configured sidecar session."
          : "Connect to a live sidecar session before exporting from the desktop."}
      </p>
      <div
        aria-live="polite"
        className={`mt-4 rounded-md border p-3 text-sm ${
          exportState.status === "unavailable"
            ? "border-amber-300 bg-amber-50 text-amber-950"
            : "border-zinc-200 bg-zinc-50 text-zinc-800"
        }`}
      >
        <p className="font-semibold text-zinc-950">{exportState.message}</p>
        {exportState.export ? (
          <div className="mt-3 space-y-3">
            <p className="break-all text-xs uppercase tracking-wide text-zinc-500">
              {exportState.export.path}
            </p>
            {exportState.export.evidenceIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {exportState.export.evidenceIds.map((evidenceId) => (
                  <span
                    className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-700"
                    key={evidenceId}
                  >
                    {evidenceId}
                  </span>
                ))}
              </div>
            ) : null}
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-zinc-200 bg-white p-3 text-xs leading-5 text-zinc-800">
              {exportState.export.preview}
            </pre>
          </div>
        ) : (
          <p className="mt-2 text-zinc-700">No export preview available yet.</p>
        )}
      </div>
      <div
        aria-live="polite"
        className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800"
      >
        <p className="font-semibold text-zinc-950">{folderState.message}</p>
        {folderState.path ? <p className="mt-2 break-all text-zinc-700">{folderState.path}</p> : null}
      </div>
      <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        <h3 className="font-semibold tracking-normal">AI report unavailable</h3>
        <p className="mt-2 leading-6">
          Real local LLM report generation is not wired into the desktop yet. Use deterministic
          Markdown or raw JSON export for review.
        </p>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-normal text-zinc-950">{value}</p>
    </div>
  );
}

function recorderLabel(status: RecorderUiStatus): string {
  const labels: Record<RecorderUiStatus, string> = {
    idle: "Recorder idle",
    loading: "Working",
    unavailable: "Recorder unavailable",
    recording: "Recording",
    paused: "Paused",
    stopped: "Stopped",
    interrupted: "Interrupted",
  };
  return labels[status];
}

function recorderTone(status: RecorderUiStatus): string {
  if (status === "recording") {
    return "border-emerald-300 bg-emerald-50 text-emerald-950";
  }
  if (status === "paused" || status === "idle" || status === "loading") {
    return "border-amber-300 bg-amber-50 text-amber-950";
  }
  if (status === "unavailable" || status === "interrupted") {
    return "border-rose-300 bg-rose-50 text-rose-950";
  }
  return "border-zinc-300 bg-zinc-50 text-zinc-950";
}

function createSessionId(): string {
  const randomId = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `sess_desktop_${randomId.replace(/-/g, "_")}`;
}

function nowWithOffset(): string {
  return new Date().toISOString().replace("Z", "+00:00");
}

function filterLabel(filter: EventFilter): string {
  return eventFilters.find((entry) => entry.value === filter)?.label ?? "All";
}

function SessionBrowserPanel({
  deletionState,
  onDelete,
  onRefresh,
  state,
}: {
  deletionState: SessionDeletionState;
  onDelete: (sessionId: string) => void;
  onRefresh: () => void;
  state: SessionBrowserState;
}) {
  return (
    <section
      aria-label="Session browser"
      className="rounded-md border border-zinc-300 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Session browser
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">Past sessions</h2>
        </div>
        <button
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={state.status === "loading"}
          onClick={onRefresh}
          type="button"
        >
          Refresh sessions
        </button>
      </div>

      <p className="mt-3 text-sm leading-6 text-zinc-700">{state.message}</p>

      {state.status === "loading" ? (
        <p className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
          Loading session list.
        </p>
      ) : null}

      {state.status === "success" && state.sessions.length === 0 ? (
        <p className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
          No sessions found.
        </p>
      ) : null}

      {state.status === "success" && state.sessions.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {state.sessions.map((session) => (
            <li
              className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 sm:flex-row sm:items-center sm:justify-between"
              key={session.id}
            >
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-zinc-950">{session.id}</p>
                {session.title ? (
                  <p className="text-sm text-zinc-700">{session.title}</p>
                ) : null}
                <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span>{session.status}</span>
                  <span>{session.eventCount} events</span>
                  <span>{session.screenshotCount} screenshot{session.screenshotCount !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <button
                aria-label={`Delete session ${session.id}`}
                className="shrink-0 rounded-md border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deletionState.status === "loading"}
                onClick={() => onDelete(session.id)}
                type="button"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {deletionState.status !== "idle" ? (
        <div
          aria-live="polite"
          className={`mt-3 rounded-md border p-3 text-sm ${
            deletionState.status === "unavailable"
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-zinc-200 bg-zinc-50 text-zinc-800"
          }`}
        >
          <p className="font-semibold text-zinc-950">{deletionState.message}</p>
          {deletionState.result ? (
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
              <Metric
                label="Session rows"
                value={`${deletionState.result.deletedSessionRows} session row deleted`}
              />
              <Metric
                label="Screenshot files"
                value={`${deletionState.result.deletedScreenshotFiles} screenshot file deleted`}
              />
              <Metric
                label="Artifact root"
                value={deletionState.result.removedArtifactRoot ? "Removed" : "Kept"}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default App;
