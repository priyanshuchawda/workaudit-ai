import os
from pathlib import Path

from fastapi import FastAPI

from worktrace_agent import __version__
from worktrace_agent.api.routes.health import router as health_router
from worktrace_agent.api.routes.sessions import router as sessions_router
from worktrace_agent.api.session_recorder_service import SessionRecorderService
from worktrace_agent.capture.active_window import ActiveWindowProvider


def _default_db_path() -> Path:
    configured_path = os.environ.get("WORKTRACE_DB_PATH")
    if configured_path:
        return Path(configured_path)
    return Path.home() / ".worktrace" / "db" / "worktrace.sqlite"


def create_app(
    *,
    db_path: Path | None = None,
    active_window_provider: ActiveWindowProvider | None = None,
    recorder_poll_interval_seconds: float = 1,
) -> FastAPI:
    app = FastAPI(
        title="WorkTrace Local Agent",
        version=__version__,
    )
    app.state.session_recorder_service = SessionRecorderService(
        db_path=db_path or _default_db_path(),
        active_window_provider=active_window_provider,
        recorder_poll_interval_seconds=recorder_poll_interval_seconds,
    )
    app.include_router(health_router)
    app.include_router(sessions_router)
    return app


app = create_app()
