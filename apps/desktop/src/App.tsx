import "./App.css";

const statusPanels = [
  {
    title: "Recorder",
    state: "Not connected",
    tone: "border-amber-300 bg-amber-50 text-amber-950",
    details: "Desktop capture is intentionally not implemented in this shell.",
  },
  {
    title: "Local agent",
    state: "Foundation only",
    tone: "border-sky-300 bg-sky-50 text-sky-950",
    details: "Python 3.13 storage tests exist; no sidecar process is started yet.",
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

function App() {
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
