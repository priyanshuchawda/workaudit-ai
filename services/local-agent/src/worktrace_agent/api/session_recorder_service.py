from __future__ import annotations

import asyncio
import contextlib
import sqlite3
from dataclasses import dataclass
from pathlib import Path

from worktrace_agent.capture.active_window import (
    ActiveWindowProvider,
    ActiveWindowRecorder,
    WindowsActiveWindowProvider,
)
from worktrace_agent.db.connection import initialize_database
from worktrace_agent.db.raw_events_repository import list_raw_events
from worktrace_agent.db.session_state_repository import (
    SessionTransitionError,
    start_session,
    stop_session,
)
from worktrace_agent.domain.raw_event import RawEvent
from worktrace_agent.domain.session_state import SessionRecord


@dataclass
class RunningRecorder:
    recorder: ActiveWindowRecorder
    task: asyncio.Task[None]


class SessionRecorderService:
    def __init__(
        self,
        *,
        db_path: Path,
        active_window_provider: ActiveWindowProvider | None = None,
        recorder_poll_interval_seconds: float = 1,
    ) -> None:
        self._connection = initialize_database(db_path)
        self._active_window_provider = active_window_provider or WindowsActiveWindowProvider()
        self._recorder_poll_interval_seconds = recorder_poll_interval_seconds
        self._running_recorders: dict[str, RunningRecorder] = {}
        self._lock = asyncio.Lock()

    async def start_recording_session(
        self,
        *,
        session_id: str,
        started_at: str,
        title: str | None,
        storage_path: str | None,
        privacy_mode: str,
    ) -> SessionRecord:
        async with self._lock:
            session = start_session(
                self._connection,
                session_id=session_id,
                started_at=started_at,
                title=title,
                storage_path=storage_path,
                privacy_mode=privacy_mode,
            )
            if session_id not in self._running_recorders:
                recorder = ActiveWindowRecorder(
                    connection=self._connection,
                    session_id=session_id,
                    provider=self._active_window_provider,
                    poll_interval_seconds=self._recorder_poll_interval_seconds,
                )
                recorder.poll_once()
                self._running_recorders[session_id] = RunningRecorder(
                    recorder=recorder,
                    task=asyncio.create_task(recorder.run()),
                )
            return session

    async def stop_recording_session(self, *, session_id: str, stopped_at: str) -> SessionRecord:
        async with self._lock:
            running = self._running_recorders.pop(session_id, None)
            if running is not None:
                await running.recorder.stop()
                with contextlib.suppress(asyncio.CancelledError):
                    await running.task
            return stop_session(
                self._connection,
                session_id=session_id,
                occurred_at=stopped_at,
            )

    def list_session_events(self, *, session_id: str) -> list[RawEvent]:
        return list_raw_events(self._connection, session_id)

    def close(self) -> None:
        self._connection.close()


def map_session_error(error: SessionTransitionError) -> tuple[int, str]:
    return 409, str(error)


def is_sqlite_missing_session_error(error: sqlite3.Error) -> bool:
    return "FOREIGN KEY constraint failed" in str(error)
