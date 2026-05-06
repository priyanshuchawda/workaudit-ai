# WorkTrace AI

WorkTrace builds an evidence-backed timeline from local desktop events and generates summaries only from cited session evidence.

## Current Status

Planning + Phase 0 foundation. Not production-ready yet.

This repository currently contains planning documents, the initial project structure, shared contracts, the first SQLite migration foundation, fake-session storage/export proof, a status-oriented desktop shell, minimal FastAPI app, typed sidecar health commands, a Tauri session-event bridge for configured local sidecar events, a first real Windows active-window polling loop, real Windows screenshot capture with artifact storage, metadata-only file watcher capture for configured folders, and explicit safe terminal command ingestion in the Python sidecar. It does not yet include terminal spying/global shell capture, OCR, audio transcription, embeddings, or local model integrations.

MVP 0 now includes shared contract schemas for events, sessions, reports, evidence IDs, privacy levels, confidence, and model run metadata.

MVP 0 now also includes a Python 3.13 SQLite migration foundation with WAL mode for local persistence.

MVP 0 now includes a fake-session validation, SQLite round-trip, and redacted raw JSON export proof.

MVP 1A now includes an initial Tauri v2 React desktop shell with status-only Home panels.

MVP 1A now includes a minimal Python 3.13 FastAPI app foundation with a tested `/health` endpoint for sidecar status.

MVP 1A now includes typed desktop sidecar health commands and UI states for loading, missing, and unhealthy sidecar conditions.

MVP 1B now includes a persisted Python session state machine for recording, paused, stopped, and interrupted statuses. This does not start capture workers yet.

MVP 1B now includes deterministic fake active-window raw events, SQLite raw-event read/write helpers, and a raw timeline UI preview. This is not live OS capture yet.

MVP 1B now includes real Windows active-window polling in the Python sidecar, with a provider abstraction, change-only raw-event persistence, session start/stop API wiring, and safe provider failure handling. This records app/process/window-title changes only; screenshots, file watcher, terminal capture, OCR, and model runtimes are still not live.

MVP 1B now includes a Tauri `get_session_events` command that can load active-window events from a configured localhost Python sidecar URL and otherwise returns a safe unavailable state so the desktop can fall back to fixture preview data.

MVP 1C now includes real Windows screenshot capture with 5-second interval defaults, 1280px max-width artifact storage, duplicate skipping, SQLite screenshot metadata, nearby active-window evidence linking, and safe screenshot deletion under the session artifact root. OCR is not implemented yet.

MVP 1C now includes a metadata-only file watcher worker for configured folders. It polls filesystem snapshots, emits created/modified/deleted/renamed raw events, ignores noisy build/dependency folders, marks sensitive file paths, and does not store file contents.

MVP 1C now includes explicit safe terminal command ingestion through the local API. It accepts command, shell, exit code, timestamp, and session ID from a manual/logger path, redacts secrets before persistence, stores a redacted command hash, and exposes terminal events in the raw timeline stream. This is not terminal spying, keylogging, or global shell capture.

MVP 1D now includes foundational privacy policy decisions, prompt/export/log redaction helpers, and screenshot deletion that removes SQLite references and files under a session artifact root. This is not a complete privacy system yet.

MVP 1D now includes crash recovery helpers that mark active sessions as interrupted, keep partial raw events readable, and show an initial interrupted-session banner preview. This is not live crash monitoring yet.

MVP 1D now includes local rotating log and redacted debug bundle foundations for safe diagnostics. This does not add cloud telemetry.

MVP 1E now includes a deterministic Python timeline chunker that turns raw events into activity blocks, evidence-backed chunks, and basic repeated-command findings without an LLM.

MVP 1E now includes deterministic Markdown export with evidence references plus the existing redacted raw JSON export path.

MVP 1F now includes typed local model availability and fallback states so deterministic recording, timeline, and export paths can run without an AI model installed. This does not implement local model loading or LLM report generation yet.

MVP 1F now includes an evidence-cited local LLM report generation foundation with prompt construction, Pydantic output validation, invalid JSON retry, and hallucination guards. This uses a local model client contract only; no real model runtime, model download, or report UI is implemented yet.

MVP 2A now includes a selective OCR worker foundation that processes changed high-value screenshot candidates, redacts OCR text, and stores OCR results with screenshot evidence links. This uses a fakeable OCR engine contract only; live PaddleOCR integration is not implemented yet.

MVP 2A now includes optional audio transcription and command embedding foundations with fakeable engine/model contracts. Audio transcription is disabled by default, command clusters keep evidence event IDs, and no real audio capture, model download, or embedding runtime is implemented yet.

MVP 2B now includes a selected-frame vision analysis foundation with secret-risk refusal, cancellation, and fakeable VLM analyzer contracts. This does not implement continuous vision, real VLM integration, model downloads, or UI deep analysis yet.

MVP 3 now includes a deterministic workflow debugger foundation that derives evidence-cited recipe steps and workflow findings from local timeline events. This does not implement autonomous replay, command execution, UI recipe review, or the formal golden eval runner yet.

MVP 4 now includes 20 compact golden sessions and a deterministic eval runner that prints a reproducible benchmark table for timeline accuracy, blocker metrics, hallucinated evidence, privacy leaks, and estimated resource columns. This is not real Windows resource profiling yet.

MVP 4 now includes deterministic recording resource budget checks and a fake 30-minute recording budget simulation for CPU, RAM, DB growth, screenshot storage, and model-loaded policy. This is not yet real Windows capture profiling.

## Two-Minute Review

WorkTrace AI is a local-first desktop recorder and evidence timeline project. The implemented repo currently proves the foundations: typed contracts, SQLite WAL migrations, fake session storage/export, a Tauri shell, sidecar health, deterministic timeline/export/report foundations, model fallback states, selective AI-worker contracts, workflow debugging rules, golden evals, and deterministic resource budget checks.

The project is still a foundation/demo repo. It now has real Windows active-window polling, screenshot capture, metadata-only file watcher capture, and explicit safe terminal command ingestion, but it is not a full live Windows recorder yet, not a live Windows recording benchmark, and not signed or production-distributed yet.

## Evidence and Verification

- Shared schema tests validate event, session, timeline, finding, report, privacy, confidence, evidence ID, and model metadata contracts.
- Python tests validate storage, migrations, fake sessions, session state, privacy redaction, exports, timeline chunks, report guards, optional AI-worker contracts, workflow debugger rules, golden evals, and resource budgets.
- Desktop tests validate the status shell, sidecar health states, recovery banner preview, raw timeline preview, and safe/live session-event bridge states.
- `docs/eval-results.md` records the reproducible golden-session eval command and current aggregate result.
- `docs/sample-report.md` shows a deterministic evidence-cited sample report from local fixture-style data.

## Current Limitations

- Active-window, screenshot, configured-folder file watcher, and explicit terminal command ingestion paths are wired into the Python sidecar. The Tauri event bridge requires a configured localhost sidecar URL; OCR and model runtimes are still not live.
- Terminal command ingestion is manual/API-based only. It does not spy on terminals, keylog, or capture commands unless an explicit logger/hook posts them.
- The desktop app is a shell and preview UI, not the finished recorder dashboard.
- Python sidecar packaging is not bundled into the installer yet.
- Local model runtimes and model downloads are not integrated.
- Installer output is not code-signed and not production-distributed yet.
- Resource budget checks use deterministic fake samples, not a live Windows recording benchmark.

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
