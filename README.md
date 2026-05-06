# WorkTrace AI

WorkTrace builds an evidence-backed timeline from local desktop events and generates summaries only from cited session evidence.

## Current Status

Planning + Phase 0 foundation. Not production-ready yet.

This repository currently contains planning documents, the initial project structure, shared contracts, the first SQLite migration foundation, fake-session storage/export proof, a status-only desktop shell, minimal FastAPI health app, and typed sidecar health commands. It does not yet include live capture workers, end-to-end recording, AI report generation, OCR, audio transcription, embeddings, or local model integrations.

MVP 0 now includes shared contract schemas for events, sessions, reports, evidence IDs, privacy levels, confidence, and model run metadata.

MVP 0 now also includes a Python 3.13 SQLite migration foundation with WAL mode for local persistence.

MVP 0 now includes a fake-session validation, SQLite round-trip, and redacted raw JSON export proof.

MVP 1A now includes an initial Tauri v2 React desktop shell with status-only Home panels.

MVP 1A now includes a minimal Python 3.13 FastAPI app foundation with a tested `/health` endpoint for sidecar status.

MVP 1A now includes typed desktop sidecar health commands and UI states for loading, missing, and unhealthy sidecar conditions.

MVP 1B now includes a persisted Python session state machine for recording, paused, stopped, and interrupted statuses. This does not start capture workers yet.

MVP 1B now includes deterministic fake active-window raw events, SQLite raw-event read/write helpers, and a raw timeline UI preview. This is not live OS capture yet.

MVP 1C now includes a Python screenshot sampler policy with duplicate skipping, 5-second interval defaults, 1280px width metadata, hourly storage caps, and SQLite screenshot metadata. This is not live OS screenshot capture yet.

MVP 1C now includes Python normalization helpers for file operation events and redacted terminal command events stored as raw events. This is not a live file watcher or terminal hook yet.

MVP 1D now includes foundational privacy policy decisions, prompt/export/log redaction helpers, and screenshot deletion that removes SQLite references and files under a session artifact root. This is not a complete privacy system yet.

MVP 1D now includes crash recovery helpers that mark active sessions as interrupted, keep partial raw events readable, and show an initial interrupted-session banner preview. This is not live crash monitoring yet.

MVP 1D now includes local rotating log and redacted debug bundle foundations for safe diagnostics. This does not add cloud telemetry.

MVP 1E now includes a deterministic Python timeline chunker that turns raw events into activity blocks, evidence-backed chunks, and basic repeated-command findings without an LLM.

MVP 1E now includes deterministic Markdown export with evidence references plus the existing redacted raw JSON export path.

## What It Is

WorkTrace AI is planned as a local-first Windows desktop activity recorder and timeline engine. The product direction is to capture local session evidence, build a deterministic timeline, and then use AI only where it can cite the session evidence it used.

## What It Is Not

- Not a chatbot
- Not a cloud surveillance tool
- Not a keylogger
- Not production-ready yet
- Not training or fine-tuning an LLM in the MVP

## Core Principles

- Local-first by default
- No cloud upload by default
- No keylogging
- Deterministic timeline first, LLM second
- Every AI finding must cite evidence IDs
- Privacy and deletion controls before advanced AI

## Planned Stack

- Tauri v2
- React + TypeScript + Tailwind
- Rust Tauri commands
- Python 3.13 FastAPI sidecar
- SQLite WAL
- Pytest, Vitest, Playwright, Rust tests
- Local pretrained models later, not training in MVP

## MVP Scope

The first realistic MVP is planned to include:

- start/pause/stop session
- active window tracking
- screenshot sampling with duplicate skipping
- file events
- safe terminal command detection
- SQLite storage
- raw timeline
- rule-based chunks
- privacy controls
- Markdown export
- local AI report after session stop/manual request

## Deferred

These are intentionally deferred until the recorder, privacy layer, and deterministic timeline are reliable:

- continuous OCR
- audio narration
- embeddings
- vision model
- workflow debugger
- installer/signing
- cloud sync
- remote AI
- fine-tuning

## Local Runtime

- Python 3.13 is the target local-agent runtime.
- Use `uv run --python 3.13 ...` until `services/local-agent/pyproject.toml` pins runtime.

## Development Rules

Contributors and AI coding agents must read these before making changes:

- `plan.md`
- `docs/coding.md`
- `docs/tauri_rust_rules.md`
- `docs/react_typescript.md`
- `docs/python_LLM.md`

Do not add Tauri, React, Rust, Python, FastAPI, SQLite, capture, OCR, model, or AI runtime code unless the relevant issue explicitly asks for it.

## Roadmap

- MVP 0: Foundation
- MVP 1A: Shell and Sidecar
- MVP 1B: Sessions and Raw Timeline
- MVP 1C: Capture Expansion
- MVP 1D: Privacy, Recovery, Observability
- MVP 1E: Deterministic Timeline and Export
- MVP 1F: Local LLM Report

See `plan.md` and `docs/github-roadmap.md` for the detailed milestone breakdown.
