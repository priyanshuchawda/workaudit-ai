# Eval Results

See `../plan.md` and `evals.md` for the evaluation strategy.

## Reproduce

```powershell
cd services/local-agent
uv run --python 3.13 python scripts/evaluate_model.py
```

## Current aggregate

The current deterministic golden-session runner uses 20 compact local sessions.
The aggregate result from the latest local run is:

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

## Interpretation

- `timeline_accuracy`, blocker precision, and blocker recall currently measure deterministic rules on compact local fixtures.
- `hallucinated_event_count = 0` means generated workflow evidence IDs are known event IDs in the fixture.
- `privacy_leak_count = 0` means the eval output did not include the known privacy test corpus.
- Latency, RAM, and storage values are deterministic estimates for regression tracking.
- These numbers are not real Windows profiling and do not prove live recorder performance.
