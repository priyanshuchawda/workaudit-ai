# Local Model Runtime Policy

Local model runtimes are optional workers, not dependencies for the recorder.

Rules:

- Normal recording must not load OCR, LLM, embedding, audio, or VLM models.
- Heavy runtimes must be lazy and explicit.
- Runtime availability checks should avoid importing heavy modules where practical.
- Runtime errors must be categorized safely and redacted before reaching the UI or logs.
- Cancellation and timeout behavior must be added before long-running inference becomes user-facing.
- AI report generation must run only after stop or manual request.

For #81, model cache metadata and disk-space checks are in scope. LLM, embedding, audio, OCR package, and VLM runtime execution remains out of scope.
