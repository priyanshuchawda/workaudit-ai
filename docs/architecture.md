# Architecture

Initial Phase 0 placeholder. See `../plan.md` for the authoritative roadmap and constraints.

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

Phase 0 does not implement this runtime yet. This file records the intended boundaries so future implementation issues do not mix UI, native commands, sidecar work, storage, and AI behavior in one change.
