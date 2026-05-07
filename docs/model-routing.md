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
