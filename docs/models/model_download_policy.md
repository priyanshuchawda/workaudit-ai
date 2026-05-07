# Model Download Policy

WorkTrace must not download OCR, LLM, embedding, audio, or VLM model files automatically during normal recording or app startup.

Rules:

- Basic recording, timeline review, screenshot review, and export must work with no models installed.
- Large model downloads require an explicit issue scope and user-visible confirmation before implementation.
- Model artifacts must live outside git, under a local cache such as `%LOCALAPPDATA%/WorkTrace/models` or `~/.worktrace/models`.
- Model files, OCR caches, and generated runtime artifacts must be ignored by git.
- Before any large download, the app must check disk space and document expected size.
- Runtime states must include not installed, unavailable, too slow, failed safely, and ready.
- Failures must never corrupt session rows, raw events, screenshots, exports, or OCR results.

For #79, no model download is implemented. OCR runtime support must be optional and safe when OCR packages are absent.
