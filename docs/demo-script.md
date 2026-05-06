# Demo Script

See `../plan.md` for the full packaging and portfolio plan.

## Current implemented demo

This is not a live recording demo yet. It is a truthful repository demo for the
implemented foundations.

1. Open the repository README and show the exact claim: WorkTrace builds an evidence-backed timeline from local desktop events and generates summaries only from cited session evidence.
2. Run the Python quality gate from `services/local-agent`.
3. Run `uv run --python 3.13 python scripts/evaluate_model.py`.
4. Show the aggregate eval row and explain that latency, RAM, and storage are deterministic estimates.
5. Open `docs/sample-report.md` and point to the cited `evt_` evidence IDs.
6. Run `pnpm --dir apps/desktop build`.
7. Open the desktop README or app screenshots only as a shell/status preview.
8. Show `docs/privacy.md` and the README limitations before discussing future work.

## Commands

```powershell
cd services/local-agent
uv run --python 3.13 pytest
uv run --python 3.13 python scripts/evaluate_model.py

cd ../..
pnpm --dir apps/desktop build
```

## Future live demo

The planned live demo remains:

1. Start WorkTrace.
2. Record a real coding task.
3. Run a failing check.
4. Fix the issue.
5. Run the passing check.
6. Stop recording.
7. Review the evidence-backed timeline.
8. Export a Markdown report.
9. Show privacy controls and raw artifact deletion.

Do not record or publish the future live demo until the current limitation,
"live capture workers are not implemented yet," has been resolved.
