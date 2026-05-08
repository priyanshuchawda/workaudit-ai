# Eval Results

See `../plan.md` and `evals.md` for the evaluation strategy.

## Reproduce

```powershell
cd services/local-agent
uv run --python 3.13 python scripts/evaluate_model.py
```

## Current aggregate

The current deterministic golden-session runner uses 20 compact local sessions.
The deterministic aggregate result from the latest local run is:

```txt
| aggregate | 1.00 | 1.00 | 1.00 | 0 | 0 | 104.00 | 0.017 | 18555 | yes |
```

Columns:

```txt
session_id
timeline_accuracy
blocker_precision
blocker_recall
hallucinated_event_count
privacy_leak_count
estimated_latency_ms
estimated_ram_mb
storage_bytes
passed
```

## AI report eval aggregate

The same command also prints deterministic AI report eval rows. The latest local run produced:

```txt
| mode | sessions | hallucinated_evidence_count | evidence_citation_valid | privacy_leak_count | generated_report_evidence_id_coverage | model_unavailable_fallback | summary_usefulness_proxy | blocker_precision_proxy | blocker_recall_proxy | estimated_latency_ms | estimated_memory_mb | model_call_count | model_called_during_recording | passed |
| deterministic_report | 20 | 0 | yes | 0 | 1.000 | no | 1.000 | 1.000 | 1.000 | 104.000 | 0.001 | 0 | no | yes |
| fake_gemma_e2b | 20 | 0 | yes | 0 | 1.000 | no | 1.000 | 1.000 | 1.000 | 364.000 | 3276.800 | 20 | no | yes |
| fake_gemma_e4b_deep | 20 | 0 | yes | 0 | 1.000 | no | 1.000 | 1.000 | 1.000 | 572.000 | 5120.000 | 20 | no | yes |
| model_unavailable | 20 | 0 | yes | 0 | 0.000 | yes | 0.500 | 1.000 | 1.000 | 20.000 | 0.000 | 0 | no | yes |
```

AI report eval columns:

```txt
mode
sessions
hallucinated_evidence_count
evidence_citation_valid
privacy_leak_count
generated_report_evidence_id_coverage
model_unavailable_fallback
summary_usefulness_proxy
blocker_precision_proxy
blocker_recall_proxy
estimated_latency_ms
estimated_memory_mb
model_call_count
model_called_during_recording
passed
```

## Interpretation

- `timeline_accuracy`, blocker precision, and blocker recall currently measure deterministic rules on compact local fixtures.
- `hallucinated_event_count = 0` means generated workflow evidence IDs are known event IDs in the fixture.
- `privacy_leak_count = 0` means the eval output did not include the known privacy test corpus.
- Latency, RAM, and storage values are deterministic estimates for regression tracking.
- AI report rows use deterministic and fake-runtime proxy outputs only; `fake_gemma_e2b` and `fake_gemma_e4b_deep` do not represent real Gemma runtime quality or speed.
- `model_called_during_recording = no` means the eval path did not mark any report model as called during a recording session.
- `model_unavailable` proves the unavailable fallback row is represented without calling a model.
- These numbers are not real Windows profiling and do not prove live recorder performance.

## Real Gemma E2B smoke

On 2026-05-08, a tiny local smoke passed against user-installed Ollama and the
configured default Gemma E2B tag:

```txt
command: cd services/local-agent; uv run --python 3.13 python scripts/smoke_gemma_e2b_report.py
status: passed
ollama_version: ollama version is 0.23.1
model_name: gemma4:e2b
evidence_ids: evt_gemma_e2b_smoke_terminal
privacy_leak_count: 0
```

The smoke result is recorded in
`docs/evidence/gemma-e2b-smoke-2026-05-08.json`.

Interpretation:

- This proves the existing localhost Ollama report adapter can produce a
  Pydantic-validated, evidence-cited report from the installed `gemma4:e2b`
  model on this Windows machine.
- This is not a quality benchmark, memory benchmark, latency benchmark, or CI
  requirement.
- Models are still not loaded during recording, and normal tests still use fake
  runtimes or skip-safe smoke behavior.

## PaddleOCR sample smoke

On 2026-05-08, the optional PaddleOCR sample smoke command was run on this
Windows machine:

```txt
command: cd services/local-agent; uv run --python 3.13 python scripts/smoke_paddleocr_sample.py
status: skipped
provider: paddleocr
reason: OCR runtime provider paddleocr is not installed. Recording continues without OCR.
privacy_leak_count: 0
```

The smoke result is recorded in
`docs/evidence/paddleocr-smoke-2026-05-08.json`.

Interpretation:

- This proves the PaddleOCR smoke path is callable, local-sample based, and
  skip-safe when the optional runtime is absent.
- This is not a PaddleOCR recognition, latency, memory, or installer proof.
- Normal recording and tests remain independent of PaddleOCR, and no model files
  are bundled or downloaded.
