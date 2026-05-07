# Local Model Runtime Policy

Local model runtimes are optional workers, not dependencies for the recorder.

Rules:

- Normal recording must not load OCR, LLM, embedding, audio, or VLM models.
- Heavy runtimes must be lazy and explicit.
- Runtime availability checks should avoid importing heavy modules where practical.
- Runtime errors must be categorized safely and redacted before reaching the UI or logs.
- Cancellation and timeout behavior must be added before long-running inference becomes user-facing.
- AI report generation must run only after stop or manual request.

For #83, a localhost-only report runtime adapter may call a user-managed local model service through an injectable transport. WorkTrace still does not bundle, download, start, or manage model files or model servers in this issue.

For #85, the desktop local AI report panel is wired through React, Tauri, and FastAPI boundary commands for status, generate, and cancel. The default service remains unavailable without a configured local runtime. The UI must not show full prompts and must not fake success.

For #87, the default report model config is Gemma 4 E2B-it Q4. WorkTrace maps it to `gemma4:e2b` for Ollama-style localhost runtimes and records `google/gemma-4-E2B-it` as the Hugging Face source ID. This is manifest/config metadata only: no model is downloaded, loaded, started, or smoke-tested by WorkTrace.

For #89, WorkTrace can manually install a user-supplied local model file into the cache after disk-space, size, and checksum checks, and can uninstall the exact cached file. This does not perform network downloads, start model servers, import heavy runtime packages, or load models during recording.

For #91, WorkTrace adds a localhost-only Qwen3 embedding runtime adapter for retrieval/grouping helpers. The adapter redacts text before transport, validates response dimensions, and can be fully tested with fake transport. It still does not run during recording, does not auto-download models, and does not allow embeddings to bypass evidence-ID claim discipline.

For #93, WorkTrace adds an optional real PaddleOCR adapter path behind selective-worker guardrails. Runtime binding is lazy, unavailable runtimes degrade safely, and per-session OCR jobs are capped so OCR cannot become continuous capture.

#83 runtime budgets:

- default mode context budget: 8192 tokens
- deep mode context budget limit: 16384 tokens
- default max output tokens: 512
- default temperature: 0.2
- prompts over the configured character cap fail safely before any transport call

The Gemma/Qwen docs mention larger context windows, but WorkTrace must not use full long-context windows by default on the target 16 GB Windows laptop.
