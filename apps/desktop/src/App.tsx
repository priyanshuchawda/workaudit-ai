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
  getSessionEvents,
  getSidecarHealth,
  startSidecar,
  stopSidecar,
  type SessionEventsResult,
  type SidecarHealth,
} from "./lib/tauri-client";

const statusPanels = [
  {
    title: "Recorder",
    state: "Control flow pending",
    tone: "border-amber-300 bg-amber-50 text-amber-950",
    details: "Start, pause, resume, and stop controls are not fully wired in this dashboard yet.",
  },
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

type EventFilter = "all" | RawTimelineEvent["source"];

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

function App() {
  const [sidecarHealth, setSidecarHealth] = useState<SidecarHealth>(initialSidecarHealth);
  const [sessionEvents, setSessionEvents] = useState<SessionEventsResult>(initialSessionEvents);
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const sourceEvents: RawTimelineEvent[] =
    sessionEvents.status === "available" ? sessionEvents.events : rawTimelineSimulationEvents;
  const timelineEvents =
    eventFilter === "all"
      ? sourceEvents
      : sourceEvents.filter((event) => event.source === eventFilter);
  const sessionEventCount = sourceEvents.length;
  const sourceStatusLabel =
    sessionEvents.status === "available" ? "Latest sidecar session" : "Fixture preview session";

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

  useEffect(() => {
    let isMounted = true;

    void Promise.all([getSidecarHealth(), getSessionEvents()]).then(([health, events]) => {
      if (isMounted) {
        setSidecarHealth(health);
        setSessionEvents(events);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
            Phase: dashboard foundation
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
            <section
              aria-label="Screenshot evidence"
              className="rounded-md border border-zinc-300 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Screenshots
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-normal">Screenshot evidence</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-700">
                Screenshot metadata bridge unavailable
              </p>
              <button
                className="mt-4 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-500 disabled:cursor-not-allowed disabled:opacity-70"
                disabled
                type="button"
              >
                Delete screenshots
              </button>
            </section>

            <section
              aria-label="Export and retention"
              className="rounded-md border border-zinc-300 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Export
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-normal">Export and retention</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <UnavailableButton label="Export Markdown" />
                <UnavailableButton label="Export raw JSON" />
                <UnavailableButton label="Delete session" />
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-700">
                Desktop export and session deletion commands are not wired yet.
              </p>
            </section>

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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-normal text-zinc-950">{value}</p>
    </div>
  );
}

function UnavailableButton({ label }: { label: string }) {
  return (
    <button
      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-500 disabled:cursor-not-allowed disabled:opacity-70"
      disabled
      type="button"
    >
      {label}
    </button>
  );
}

function filterLabel(filter: EventFilter): string {
  return eventFilters.find((entry) => entry.value === filter)?.label ?? "All";
}

export default App;
