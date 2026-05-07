# Architecture

See `../plan.md` for the authoritative roadmap and constraints.

The planned architecture is:

```txt
React UI
  -> typed Tauri client
  -> Rust Tauri backend
  -> Python FastAPI sidecar
  -> SQLite WAL + local artifacts
  -> timeline engine
  -> reports/exports
```

The repo now implements the first real recorder signals, but the architecture is
still local-first and evidence-first: native desktop commands talk only to a
localhost sidecar, the sidecar persists raw evidence into SQLite, and AI/runtime
features remain separate from capture workers.

## Current implementation map

```mermaid
flowchart LR
  A["React dashboard and recorder controls"] --> B["Typed Tauri client"]
  B --> C["Rust sidecar health, event, recorder, and launch commands"]
  C --> D["Python 3.13 FastAPI local agent"]
  D --> E["Active-window, screenshot, file, and explicit terminal workers"]
  E --> F["SQLite WAL and local artifacts"]
  F --> G["Deterministic timeline and exports"]
  G --> H["Golden evals and sample reports"]
```

Implemented today:

- desktop shell and preview UI
- typed sidecar health, event, recorder-control, and configured launch/stop checks
- Python FastAPI health and session-control foundation
- SQLite WAL migrations and repositories
- fake session validation and export
- real Windows active-window polling
- real Windows screenshot capture and artifact metadata
- metadata-only configured-folder file watching
- explicit safe terminal command ingestion
- privacy redaction and private-mode suppression across implemented capture workers
- deterministic timeline, Markdown export, and report foundations
- local model availability fallback states
- selective OCR/audio/embedding/vision contracts without real model loading
- workflow debugger rules, golden evals, and resource budget checks

Not implemented yet:

- bundled Python sidecar installer artifact
- desktop export/screenshot-management commands
- desktop privacy center and configurable blocklist UI
- production signing or updater
- real model runtime downloads
- live OCR/model runtime integrations
- real Windows performance benchmark
