import { z } from "zod";

const NonEmptyStringSchema = z.string().trim().min(1);
const IsoDateTimeSchema = z.iso.datetime({ offset: true });
const ConfidenceSchema = z.number().min(0).max(1);
const EvidenceEventIdsSchema = z.array(NonEmptyStringSchema).min(1);

export const PrivacyLevelSchema = z.enum(["safe", "sensitive", "secret", "redacted", "unknown"]);

export const SessionStatusSchema = z.enum(["recording", "paused", "stopped", "interrupted"]);

export const FindingSeveritySchema = z.enum(["low", "medium", "high"]);

export const ModelRunMetadataSchema = z.object({
  model_name: NonEmptyStringSchema,
  model_version: NonEmptyStringSchema.optional(),
  prompt_version: NonEmptyStringSchema.optional(),
  input_hash: NonEmptyStringSchema.optional(),
  generated_at: IsoDateTimeSchema
});

export const EventSchema = z.object({
  id: NonEmptyStringSchema,
  session_id: NonEmptyStringSchema,
  timestamp: IsoDateTimeSchema,
  source: NonEmptyStringSchema,
  type: NonEmptyStringSchema,
  privacy_level: PrivacyLevelSchema,
  confidence: ConfidenceSchema,
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const SessionSchema = z.object({
  id: NonEmptyStringSchema,
  started_at: IsoDateTimeSchema,
  ended_at: IsoDateTimeSchema.nullish(),
  status: SessionStatusSchema,
  title: NonEmptyStringSchema.optional(),
  storage_path: NonEmptyStringSchema.optional(),
  privacy_mode: NonEmptyStringSchema
});

export const TimelineChunkSchema = z.object({
  id: NonEmptyStringSchema,
  session_id: NonEmptyStringSchema,
  start: IsoDateTimeSchema,
  end: IsoDateTimeSchema,
  label: NonEmptyStringSchema,
  summary: NonEmptyStringSchema,
  evidence_event_ids: EvidenceEventIdsSchema,
  confidence: ConfidenceSchema
});

export const FindingSchema = z.object({
  id: NonEmptyStringSchema,
  session_id: NonEmptyStringSchema,
  type: NonEmptyStringSchema,
  title: NonEmptyStringSchema,
  description: NonEmptyStringSchema,
  evidence_event_ids: EvidenceEventIdsSchema,
  severity: FindingSeveritySchema,
  confidence: ConfidenceSchema
});

const EvidenceBackedTextSchema = z.object({
  title: NonEmptyStringSchema.optional(),
  text: NonEmptyStringSchema.optional(),
  path: NonEmptyStringSchema.optional(),
  command: NonEmptyStringSchema.optional(),
  evidence_event_ids: EvidenceEventIdsSchema
});

export const ReportSchema = z.object({
  session_id: NonEmptyStringSchema,
  session_title: NonEmptyStringSchema,
  summary: NonEmptyStringSchema,
  timeline: z.array(TimelineChunkSchema),
  blockers: z.array(FindingSchema),
  repeated_actions: z.array(FindingSchema),
  important_files: z.array(EvidenceBackedTextSchema),
  commands: z.array(EvidenceBackedTextSchema),
  workflow_steps: z.array(EvidenceBackedTextSchema),
  confidence: ConfidenceSchema,
  model_metadata: ModelRunMetadataSchema.optional()
});
