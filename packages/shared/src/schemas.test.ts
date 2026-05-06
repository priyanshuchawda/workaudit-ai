import { describe, expect, test } from "vitest";
import {
  EventSchema,
  FindingSchema,
  ReportSchema,
  SessionSchema,
  TimelineChunkSchema
} from "./schemas";

const modelMetadata = {
  model_name: "gemma-4-E2B-it",
  model_version: "q4",
  prompt_version: "report-v1",
  input_hash: "sha256:test",
  generated_at: "2026-05-06T09:45:00+05:30"
};

const validEvent = {
  id: "evt_001",
  session_id: "sess_001",
  timestamp: "2026-05-06T09:15:00+05:30",
  source: "window_tracker",
  type: "active_window_changed",
  privacy_level: "safe",
  confidence: 0.98,
  metadata: {
    app: "VS Code",
    window_title: "README.md - workaudit-ai"
  }
};

const validSession = {
  id: "sess_001",
  started_at: "2026-05-06T09:14:00+05:30",
  ended_at: null,
  status: "recording",
  title: "Portfolio SEO Fix",
  storage_path: "~/.worktrace/sessions/sess_001",
  privacy_mode: "standard"
};

const validTimelineChunk = {
  id: "chunk_001",
  session_id: "sess_001",
  start: "2026-05-06T09:14:00+05:30",
  end: "2026-05-06T09:31:00+05:30",
  label: "coding",
  summary: "Edited metadata and SEO files.",
  evidence_event_ids: ["evt_001"],
  confidence: 0.82
};

const validFinding = {
  id: "finding_001",
  session_id: "sess_001",
  type: "repeated_command",
  title: "Repeated SEO test loop",
  description: "The command pnpm test:seo ran repeatedly during debugging.",
  evidence_event_ids: ["evt_001"],
  severity: "medium",
  confidence: 0.9
};

const validReport = {
  session_id: "sess_001",
  session_title: "Portfolio SEO Fix",
  summary: "The session focused on a portfolio SEO fix.",
  timeline: [validTimelineChunk],
  blockers: [validFinding],
  repeated_actions: [validFinding],
  important_files: [
    {
      path: "app/page.tsx",
      evidence_event_ids: ["evt_001"]
    }
  ],
  commands: [
    {
      command: "pnpm test:seo",
      evidence_event_ids: ["evt_001"]
    }
  ],
  workflow_steps: [
    {
      title: "Run SEO test",
      evidence_event_ids: ["evt_001"]
    }
  ],
  confidence: 0.84,
  model_metadata: modelMetadata
};

describe("shared schema contracts", () => {
  test("parses a valid event", () => {
    expect(EventSchema.parse(validEvent)).toMatchObject(validEvent);
  });

  test("parses a valid session", () => {
    expect(SessionSchema.parse(validSession)).toMatchObject(validSession);
  });

  test("parses a valid timeline chunk", () => {
    expect(TimelineChunkSchema.parse(validTimelineChunk)).toMatchObject(validTimelineChunk);
  });

  test("parses a valid finding", () => {
    expect(FindingSchema.parse(validFinding)).toMatchObject(validFinding);
  });

  test("parses a valid report", () => {
    expect(ReportSchema.parse(validReport)).toMatchObject(validReport);
  });

  test("rejects an event missing id", () => {
    const { id: _id, ...eventWithoutId } = validEvent;

    expect(() => EventSchema.parse(eventWithoutId)).toThrow();
  });

  test("rejects an event with an empty id", () => {
    expect(() => EventSchema.parse({ ...validEvent, id: "" })).toThrow();
  });

  test("rejects an event with a bad timestamp", () => {
    expect(() => EventSchema.parse({ ...validEvent, timestamp: "not-a-date" })).toThrow();
  });

  test("rejects an event missing source", () => {
    const { source: _source, ...eventWithoutSource } = validEvent;

    expect(() => EventSchema.parse(eventWithoutSource)).toThrow();
  });

  test("rejects an event with an empty source", () => {
    expect(() => EventSchema.parse({ ...validEvent, source: "" })).toThrow();
  });

  test("rejects an event with confidence below 0", () => {
    expect(() => EventSchema.parse({ ...validEvent, confidence: -0.01 })).toThrow();
  });

  test("rejects an event with confidence above 1", () => {
    expect(() => EventSchema.parse({ ...validEvent, confidence: 1.01 })).toThrow();
  });

  test("rejects a timeline chunk without evidence event ids", () => {
    expect(() =>
      TimelineChunkSchema.parse({ ...validTimelineChunk, evidence_event_ids: [] })
    ).toThrow();
  });

  test("rejects a finding without evidence event ids", () => {
    expect(() => FindingSchema.parse({ ...validFinding, evidence_event_ids: [] })).toThrow();
  });
});
