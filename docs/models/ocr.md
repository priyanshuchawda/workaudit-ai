# OCR Runtime Policy

Selective OCR is allowed only after capture, privacy, export, session deletion, sidecar packaging, and storage cleanup are stable.

Current #79 policy:

- OCR may run only on changed, high-value screenshots.
- High-value examples: terminal errors, test failure screens, browser warnings, dialogs, popups, and traceback windows.
- OCR must not run for private-mode sessions or blocked apps.
- OCR must refuse likely secret-risk screens before detailed extraction.
- Stored OCR snippets must be redacted and linked to screenshot evidence IDs.
- OCR output is evidence, not an autonomous claim. Reports must still cite source events/screenshots.
- Continuous OCR of every screenshot is forbidden.
- No OCR model files are committed to git.
- Real PaddleOCR integration is optional and must degrade to unavailable if the runtime is absent.
- Real PaddleOCR binding must be lazy and local-only, with no heavy imports in non-OCR recording paths.
- Selective OCR must cap jobs per session to avoid continuous OCR behavior.
- Runtime failures must fail safely and skip the candidate.

The default runtime state should be disabled/unavailable unless explicitly configured.
