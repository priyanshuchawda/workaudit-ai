# Embedding Model Notes

Embedding models support retrieval, command similarity, workflow grouping, and session search.

Current status:

- Default embedding model manifest: `Qwen/Qwen3-Embedding-0.6B`.
- Runtime adapter is localhost-only and fakeable; no heavy embedding imports are required for availability checks.
- Embedding runtime is not loaded during recording.
- Automatic model downloads are disabled.
- Manual cache spec exists for `model.safetensors` only (metadata + checksum policy).

Embeddings are not a source of truth. Any final claim must still cite raw event, screenshot, OCR, or timeline evidence IDs.

## Vector storage decision

- First implementation: keep embedding vectors in SQLite tables for small/local indexes.
- Future scale path: add a local file index only if measured index growth or query latency requires it.
- Cloud vector DB is out of scope.
