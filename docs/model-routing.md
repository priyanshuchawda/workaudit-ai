# Model Routing

Initial Phase 0 placeholder. See `../plan.md` for the detailed AI and model-routing plan.

MVP model policy:

- no model training in the MVP
- pretrained local models only when AI features are added
- normal recording must work without models installed
- AI report generation runs after session stop or manual request
- selective OCR guardrails may run only on high-value screenshots when explicitly invoked
- PaddleOCR, vision, audio transcription, embeddings, and deep analysis are deferred as bundled runtimes

This project should never require a model for basic recording, raw timeline review, or local export.

Selective OCR policy:

- no continuous OCR
- no OCR model download in the current implementation
- no OCR package import during normal recording or availability checks
- private or blocked apps skip OCR
- likely secret-risk screens refuse OCR before extraction
- OCR snippets must be redacted and linked to screenshot evidence IDs

Local report runtime policy:

- report generation uses deterministic timeline evidence first and an LLM second
- localhost-only Ollama-style report runtime calls are adapter-level only
- desktop local AI report controls call only typed Tauri/FastAPI boundary commands
- the default UI/runtime state is unavailable until a local runtime is explicitly configured
- generated reports must show evidence IDs and model metadata without exposing the full prompt
- non-local model endpoints are rejected
- default report context budget is capped at 8192 tokens, with deep mode capped at 16384 tokens until benchmarks justify more
- prompts are capped before transport and oversized prompts fail safely
- model downloads, model server startup, embeddings, audio, and vision are out of scope for the first report runtime adapter
