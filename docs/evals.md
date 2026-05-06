# Evals

Initial Phase 0 placeholder. See `../plan.md` for the evaluation strategy.

Planned evaluation work:

- golden sessions
- `timeline_accuracy`
- `blocker_precision`
- `blocker_recall`
- `hallucinated_event_count`
- `privacy_leak_count`

MVP 4 now includes the first deterministic golden-session eval runner:

```powershell
cd services/local-agent
uv run --python 3.13 python scripts/evaluate_model.py
```

The current runner uses 20 compact local golden sessions and prints a reproducible Markdown benchmark table. Latency, RAM, and storage columns are deterministic estimates for regression tracking only; real Windows resource-budget enforcement is handled separately.

The first implementation work should create reliable event truth before AI evals. Later evals must verify that timelines, blockers, workflow steps, and reports are grounded in cited session evidence.
