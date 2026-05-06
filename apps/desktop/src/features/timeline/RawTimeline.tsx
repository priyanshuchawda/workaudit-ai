import type { RawTimelineEvent } from "./raw-timeline-simulation";

type RawTimelineProps = {
  events: RawTimelineEvent[];
};

export function RawTimeline({ events }: RawTimelineProps) {
  const orderedEvents = [...events].sort((first, second) =>
    first.timestamp.localeCompare(second.timestamp),
  );

  return (
    <section
      aria-label="Raw timeline simulation"
      className="rounded-md border border-zinc-300 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-2 border-b border-zinc-200 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Simulation preview
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">Raw timeline</h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-zinc-700">
          Deterministic active-window events for the 10-minute fake recording test. Live OS capture
          is not wired yet.
        </p>
      </div>

      <ol className="mt-4 divide-y divide-zinc-200">
        {orderedEvents.map((event) => (
          <li className="grid gap-3 py-4 md:grid-cols-[5rem_14rem_1fr]" key={event.id}>
            <time className="text-sm font-semibold text-zinc-700" dateTime={event.timestamp}>
              {formatTimelineTime(event.timestamp)}
            </time>
            <div>
              <p className="font-semibold text-zinc-950">{event.app}</p>
              <p className="text-xs uppercase tracking-wide text-zinc-500">{event.source}</p>
            </div>
            <p className="text-sm leading-6 text-zinc-800">{event.windowTitle}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function formatTimelineTime(timestamp: string): string {
  return timestamp.slice(11, 16);
}
