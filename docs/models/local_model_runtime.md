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

#83 runtime budgets:

- default mode context budget: 8192 tokens
- deep mode context budget limit: 16384 tokens
- default max output tokens: 512
- default temperature: 0.2
- prompts over the configured character cap fail safely before any transport call

The Gemma/Qwen docs mention larger context windows, but WorkTrace must not use full long-context windows by default on the target 16 GB Windows laptop.
