# WorkTrace AI

WorkTrace builds an evidence-backed timeline from local desktop events and generates summaries only from cited session evidence.

## Current Status

Planning + Phase 0 foundation. Not production-ready yet.

This repository currently contains planning documents, the initial project structure, shared contracts, the first SQLite migration foundation, fake-session storage/export proof, a desktop session dashboard foundation, minimal FastAPI app, typed sidecar health commands, a Tauri session-event bridge for configured local sidecar events, desktop recorder lifecycle controls for a configured local sidecar, a configured localhost sidecar launch/stop abstraction, a first real Windows active-window polling loop, real Windows screenshot capture with compressed PNG artifact storage and retention cleanup, desktop screenshot metadata review/delete controls through the configured sidecar, metadata-only file watcher capture for configured folders, explicit safe terminal command ingestion in the Python sidecar, hardened privacy redaction/private-mode suppression for implemented capture workers, selective OCR runtime guardrails with optional runtime availability checks, a desktop local AI report panel wired through typed sidecar endpoints, and a metadata-only Gemma 4 E2B default report model manifest. It does not yet include terminal spying/global shell capture, continuous OCR, bundled PaddleOCR, audio transcription, embeddings, model downloads, or a smoke-tested real local model runtime.

MVP 0 now includes shared contract schemas for events, sessions, reports, evidence IDs, privacy levels, confidence, and model run metadata.

MVP 0 now also includes a Python 3.13 SQLite migration foundation with WAL mode for local persistence.

MVP 0 now includes a fake-session validation, SQLite round-trip, and redacted raw JSON export proof.

MVP 1A now includes an initial Tauri v2 React desktop shell with status-only Home panels.

MVP 1A now includes a minimal Python 3.13 FastAPI app foundation with a tested `/health` endpoint for sidecar status.

MVP 1A now includes typed desktop sidecar health commands and UI states for loading, missing, and unhealthy sidecar conditions.

MVP 1A now includes a desktop session dashboard foundation with a sessions panel, session detail surface, source-filtered raw timeline, recorder start/pause/resume/stop controls for a configured local sidecar, screenshot evidence unavailable state, disabled export/retention actions for commands that are not wired yet, and a privacy status panel.

MVP 1B now includes a persisted Python session state machine for recording, paused, stopped, and interrupted statuses. This does not start capture workers yet.

MVP 1B now includes deterministic fake active-window raw events, SQLite raw-event read/write helpers, and a raw timeline UI preview. This is not live OS capture yet.

MVP 1B now includes real Windows active-window polling in the Python sidecar, with a provider abstraction, change-only raw-event persistence, session start/stop API wiring, and safe provider failure handling. This records app/process/window-title changes only; screenshots, file watcher, terminal capture, OCR, and model runtimes are handled by later guarded layers.

MVP 1B now includes Tauri commands that can start, pause, resume, stop, and load events from a configured localhost Python sidecar bridge and otherwise return safe unavailable states so the desktop can fall back to fixture preview data.

MVP 1B now includes a Tauri sidecar launch abstraction for a configured local sidecar binary and localhost port. It starts the process with local-only sidecar host/port environment, suppresses sidecar stdio, stops the managed process safely, and still returns safe missing/unhealthy states when no configured binary is available. Packaging-ready sidecar binary lookup exists, Tauri is configured for a `worktrace-local-agent` external binary, and the Python sidecar has a local-only executable entrypoint. A local Windows package smoke has produced a PyInstaller sidecar artifact and NSIS installer with the sidecar artifact present. Python sidecar packaging is not bundled into the installer unless the target-triple sidecar artifact is produced before the Windows package build.

MVP 1C now includes real Windows screenshot capture with 5-second interval defaults, 1280px max-width compressed PNG artifact storage, duplicate skipping, SQLite screenshot metadata, nearby active-window evidence linking, bounded retention cleanup, and safe screenshot deletion under the session artifact root. JPEG/WebP screenshot encoding is not implemented yet.

MVP 1C now includes a metadata-only file watcher worker for configured folders. It polls filesystem snapshots, emits created/modified/deleted/renamed raw events, ignores noisy build/dependency folders, marks sensitive file paths, and does not store file contents.

MVP 1C now includes explicit safe terminal command ingestion through the local API. It accepts command, shell, exit code, timestamp, and session ID from a manual/logger path, redacts secrets before persistence, stores a redacted command hash, and exposes terminal events in the raw timeline stream. This is not terminal spying, keylogging, or global shell capture.

MVP 1D now includes foundational privacy policy decisions, prompt/export/log redaction helpers, stronger JWT/GitHub/Google/AWS/private-key/password-style redaction, optional generic email/phone redaction controls, private-mode suppression for active-window/screenshot/file-watcher workers, and screenshot deletion that removes SQLite references and files under a session artifact root. This is not a complete privacy center or desktop blocklist configuration UI yet.

MVP 1D now includes crash recovery helpers that mark active sessions as interrupted, keep partial raw events readable, and show an initial interrupted-session banner preview. This is not live crash monitoring yet.

MVP 1D now includes local rotating log and redacted debug bundle foundations for safe diagnostics. This does not add cloud telemetry.

MVP 1E now includes a deterministic Python timeline chunker that turns raw events into activity blocks, evidence-backed chunks, and basic repeated-command findings without an LLM.

MVP 1E now includes deterministic Markdown export with evidence references plus the existing redacted raw JSON export path.

MVP 1F now includes typed local model availability, fallback states, and a metadata-only model cache manager with deterministic local cache paths, disk-space checks, and checksum validation. Deterministic recording, timeline, and export paths can run without an AI model installed. This does not implement model downloads, local model loading, or LLM report generation yet.

MVP 1F now includes an evidence-cited local LLM report generation foundation with prompt construction, Pydantic output validation, invalid JSON retry, hallucination guards, and a localhost-only Ollama-style report runtime adapter with fakeable transport tests. The adapter sends conservative generation options by default, caps prompts before transport, and does not use full long-context model windows by default. No model is bundled or downloaded, and no real local runtime smoke has been run yet.

MVP 1F now includes a default report-model manifest for Gemma 4 E2B-it Q4. The manifest maps user-managed Ollama-style runtimes to `gemma4:e2b`, records the Hugging Face model ID `google/gemma-4-E2B-it`, keeps the default context budget at 8192 tokens, records 16384 tokens as the first maximum tested budget target, and disables automatic downloads. It is configuration metadata only, not a bundled model.

MVP 2A now includes a selective OCR worker/runtime foundation that processes changed high-value screenshot candidates, skips private or blocked apps, refuses likely secret-risk screens, redacts OCR text, stores OCR results with screenshot evidence links, and reports optional OCR runtime availability without importing heavy OCR packages. This uses a fakeable OCR engine contract; PaddleOCR is not bundled, downloaded, or required.

MVP 2A now includes optional audio transcription and command embedding foundations with fakeable engine/model contracts. Audio transcription is disabled by default, command clusters keep evidence event IDs, and no real audio capture, model download, or embedding runtime is implemented yet.

MVP 2B now includes a selected-frame vision analysis foundation with secret-risk refusal, cancellation, and fakeable VLM analyzer contracts. This does not implement continuous vision, real VLM integration, model downloads, or UI deep analysis yet.

MVP 3 now includes a deterministic workflow debugger foundation that derives evidence-cited recipe steps and workflow findings from local timeline events. This does not implement autonomous replay, command execution, UI recipe review, or the formal golden eval runner yet.

MVP 4 now includes 20 compact golden sessions and a deterministic eval runner that prints a reproducible benchmark table for timeline accuracy, blocker metrics, hallucinated evidence, privacy leaks, and estimated resource columns. This is not real Windows resource profiling yet.

MVP 4 now includes deterministic recording resource budget checks, screenshot retention cleanup tests, and a fake 30-minute recording budget simulation for CPU, RAM, DB growth, screenshot storage, and model-loaded policy. This is not yet real Windows capture profiling.

MVP dashboard work now includes desktop-accessible deterministic Markdown and raw JSON export review through the configured local sidecar bridge. The desktop shows preview text, export paths, evidence IDs, safe unavailable/error states, session-folder lookup status, and a local AI report panel with generate/regenerate/cancel controls wired through the typed sidecar boundary. Without a configured local runtime, the panel reports a safe unavailable state and does not fake success.

MVP dashboard work now includes desktop session browser, session deletion, and folder-open integration through the configured local sidecar bridge. The desktop lists all past sessions with event and screenshot counts, allows deleting any session (removing rows and artifact files), and shows honest deletion result counts. Session folder-open remains a display-only path lookup; no shell launch is wired yet.

## Two-Minute Review

WorkTrace AI is a local-first desktop recorder and evidence timeline project. The implemented repo currently proves the foundations: typed contracts, SQLite WAL migrations, fake session storage/export, a Tauri shell, sidecar health, deterministic timeline/export/report foundations, model fallback states, selective AI-worker contracts, workflow debugging rules, golden evals, and deterministic resource budget checks.

The project is still a foundation/demo repo. It now has real Windows active-window polling, compressed PNG screenshot capture with bounded cleanup, metadata-only file watcher capture, explicit safe terminal command ingestion, desktop recorder controls through a configured local sidecar bridge, desktop export review/screenshot metadata/delete UI, and a session browser with session deletion through the sidecar bridge. It is not a live Windows recording benchmark and is not signed or production-distributed yet.

## Evidence and Verification

- Shared schema tests validate event, session, timeline, finding, report, privacy, confidence, evidence ID, and model metadata contracts.
- Python tests validate storage, migrations, fake sessions, session state, privacy redaction, exports, timeline chunks, report guards, optional AI-worker contracts, workflow debugger rules, golden evals, and resource budgets.
- Desktop tests validate the status shell, sidecar health states, recovery banner preview, raw timeline preview, safe/live session-event bridge states, export review controls, local AI report UI states with a fake bridge response, screenshot metadata/delete states, and session browser list/delete behavior.
- `docs/eval-results.md` records the reproducible golden-session eval command and current aggregate result.
- `docs/sample-report.md` shows a deterministic evidence-cited sample report from local fixture-style data.

## Current Limitations

- Active-window, screenshot, configured-folder file watcher, explicit terminal command ingestion, selective OCR guardrails, and desktop start/pause/resume/stop controls are wired through the Python sidecar. The Tauri recorder and event bridge still require a configured localhost sidecar URL or configured local sidecar binary/port; PaddleOCR and model runtimes are not bundled or downloaded.
- Screenshot artifacts are currently stored as compressed PNG files with conservative retention cleanup. JPEG/WebP encoding decisions are documented as deferred until a dedicated image-encoding/runtime issue.
- Terminal command ingestion is manual/API-based only. It does not spy on terminals, keylog, or capture commands unless an explicit logger/hook posts them.
- Privacy hardening covers implemented redaction and private-mode worker suppression paths, but the desktop privacy center, configurable blocklist UI, and complete cross-worker privacy management are still incomplete.
- The desktop app now has a session dashboard foundation, sidecar-backed recorder controls, configured sidecar launch/stop handling, deterministic Markdown/raw JSON export review, local AI report controls, screenshot metadata/delete UI, and a session browser with session deletion. Session folder-open shows the local path only; no shell open is wired yet.
- The desktop AI report UI is wired through React, Tauri, and FastAPI boundary commands, but the default runtime state is unavailable until a local runtime is explicitly configured. It shows model metadata, run time, input hash, and evidence IDs only when the sidecar returns a validated report result.
- A localhost-only local report runtime adapter exists for evidence-cited report generation tests, and Gemma 4 E2B-it Q4 is now the default report-model config (`gemma4:e2b` / `google/gemma-4-E2B-it`). This only talks to a user-managed local model service, refuses oversized prompts, and no real local LLM runtime has been smoke-tested. The desktop report panel does not download models or start a model server.
- A metadata-only model cache manager exists for local paths, disk checks, and checksum validation. It does not perform network downloads or load models.
- Selective OCR remains backend/runtime-contract work. The desktop screenshot panel does not yet show stored OCR snippets, and no real OCR smoke has been run in this PR.
- Python sidecar packaging is not bundled into the installer unless `pnpm --dir apps/desktop package:sidecar` first produces the expected target-triple sidecar executable for Tauri. The Windows installer build smoke has passed locally with that artifact present, but installer install/run QA has not been performed.
- Local model runtimes and automatic model downloads are not integrated.
- Installer output is not code-signed and not production-distributed yet.
- Resource budget checks use deterministic fake samples plus storage cleanup tests, not a live Windows recording benchmark.

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
- screenshot sampling with duplicate skipping and compressed PNG artifact storage
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
