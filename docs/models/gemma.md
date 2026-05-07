# Gemma Model Notes

Gemma-style local instruct models are candidates for future evidence-cited report generation.

Current status:

- Not installed by WorkTrace.
- Not downloaded by WorkTrace.
- Not loaded during recording.
- Not used for OCR.
- Candidate for #83 localhost report-runtime adapter tests when a user-managed local model server is available.
- Gemma 4 E2B/E4B may expose large context windows, but WorkTrace report runtime defaults stay capped at 8192 tokens and deep mode stays capped at 16384 tokens until local benchmarks prove more is safe.

Future report runtime work must document model size, quantization, disk path, checksum strategy where practical, latency, RAM use, and failure states before enabling any WorkTrace-managed download or inference path.
