import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { getSidecarHealth, startSidecar, stopSidecar, type SidecarHealth } from "./lib/tauri-client";

const statusPanels = [
  {
    title: "Recorder",
    state: "Not connected",
    tone: "border-amber-300 bg-amber-50 text-amber-950",
    details: "Desktop capture is intentionally not implemented in this shell.",
  },
  {
    title: "Privacy",
    state: "Local-first",
    tone: "border-emerald-300 bg-emerald-50 text-emerald-950",
    details: "No cloud upload, keylogging, screenshots, or clipboard capture in this shell.",
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

    void getSidecarHealth().then((health) => {
      if (isMounted) {
        setSidecarHealth(health);
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
            Phase: MVP 1A shell
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
      </section>
    </main>
  );
}

export default App;
