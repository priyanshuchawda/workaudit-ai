# Gemma Model Notes

Gemma-style local instruct models are candidates for future evidence-cited report generation.

Current status:

- Not installed by WorkTrace.
- Not downloaded by WorkTrace.
- Not loaded during recording.
- Not used for OCR.
- Default report model config for user-managed local runtimes: Gemma 4 E2B-it Q4.
- Ollama-style tag: `gemma4:e2b`.
- Hugging Face model ID: `google/gemma-4-E2B-it`.
- Quantization assumption for the default config: `Q4_0`.
- Default report context budget: 8192 tokens.
- First maximum tested budget target: 16384 tokens.
- Default output cap: 512 tokens.
- Default temperature: 0.2.
- Automatic downloads are disabled.
- Gemma 4 E2B/E4B may expose large context windows, but WorkTrace report runtime defaults stay capped at 8192 tokens and deep mode stays capped at 16384 tokens until local benchmarks prove more is safe.

Future report runtime work must document model size, quantization, disk path, checksum strategy where practical, latency, RAM use, and failure states before enabling any WorkTrace-managed download or inference path.
