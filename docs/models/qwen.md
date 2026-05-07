# Qwen Model Notes

Qwen-style local instruct, embedding, or vision models are candidates for report, retrieval, and selected-frame analysis.

Current status:

- Embedding manifest/runtime target: `Qwen/Qwen3-Embedding-0.6B`.
- Not installed by WorkTrace by default.
- Not downloaded automatically by WorkTrace.
- Not loaded during recording.
- Candidate for a user-managed localhost report runtime alternative after adapter-level tests.
- Continuous VLM remains forbidden.
- Qwen text or vision context limits do not change WorkTrace's first report-runtime policy: capped evidence selection, no full long-context default, and no continuous vision.

Current embedding adapter notes:

- Localhost-only `/embed` adapter with fakeable JSON transport.
- Redacted input payloads only.
- Embeddings are retrieval helpers only; no claim generation without evidence IDs.
- Real local runtime smoke, benchmarked vector index persistence, and model-server setup are deferred.

Future Qwen runtime work must be selected-frame/manual only for vision and evidence-cited for text report behavior.
