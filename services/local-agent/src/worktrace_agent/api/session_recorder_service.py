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
from worktrace_agent.capture.file_watcher import (
    FileSnapshotProvider,
    FileWatcherWorker,
)
from worktrace_agent.capture.screenshot_capture import (
    ScreenshotCaptureWorker,
    ScreenshotProvider,
    WindowsScreenshotProvider,
)
from worktrace_agent.capture.screenshot_sampler import ScreenshotArtifact
from worktrace_agent.db.connection import initialize_database
from worktrace_agent.db.raw_events_repository import list_raw_events
from worktrace_agent.db.screenshots_repository import (
    ScreenshotDeletionResult,
    delete_screenshots_for_session,
    list_screenshots,
)
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
        screenshot_provider: ScreenshotProvider | None = None,
        file_snapshot_provider: FileSnapshotProvider | None = None,
        recorder_poll_interval_seconds: float = 1,
        screenshot_interval_seconds: float = 5,
        file_watch_interval_seconds: float = 1,
    ) -> None:
        self._db_path = Path(db_path)
        self._connection = initialize_database(db_path)
        self._active_window_provider = active_window_provider or WindowsActiveWindowProvider()
        self._screenshot_provider = screenshot_provider or WindowsScreenshotProvider()
        self._file_snapshot_provider = file_snapshot_provider
        self._recorder_poll_interval_seconds = recorder_poll_interval_seconds
        self._screenshot_interval_seconds = screenshot_interval_seconds
        self._file_watch_interval_seconds = file_watch_interval_seconds
        self._running_recorders: dict[str, RunningRecorder] = {}
        self._running_screenshot_workers: dict[str, RunningScreenshotWorker] = {}
        self._running_file_watchers: dict[str, RunningFileWatcher] = {}
        self._lock = asyncio.Lock()

    async def start_recording_session(
        self,
        *,
        session_id: str,
        started_at: str,
        title: str | None,
        storage_path: str | None,
        privacy_mode: str,
        file_watch_roots: list[str] | None = None,
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
            if session_id not in self._running_screenshot_workers:
                screenshot_worker = ScreenshotCaptureWorker(
                    connection=self._connection,
                    session_id=session_id,
                    artifact_root=self._artifact_root_for_session(session),
                    provider=self._screenshot_provider,
                    interval_seconds=self._screenshot_interval_seconds,
                )
                active_process_name = self._active_process_name()
                screenshot_worker.poll_once(active_process_name=active_process_name)
                self._running_screenshot_workers[session_id] = RunningScreenshotWorker(
                    worker=screenshot_worker,
                    task=asyncio.create_task(
                        screenshot_worker.run(
                            active_process_name_provider=self._active_process_name,
                        )
                    ),
                )
            roots = [Path(root) for root in file_watch_roots or [] if root.strip()]
            if roots and session_id not in self._running_file_watchers:
                file_watcher = FileWatcherWorker(
                    connection=self._connection,
                    session_id=session_id,
                    roots=roots,
                    provider=self._file_snapshot_provider,
                    interval_seconds=self._file_watch_interval_seconds,
                )
                file_watcher.poll_once()
                self._running_file_watchers[session_id] = RunningFileWatcher(
                    worker=file_watcher,
                    task=asyncio.create_task(file_watcher.run()),
                )
            return session

    async def stop_recording_session(self, *, session_id: str, stopped_at: str) -> SessionRecord:
        async with self._lock:
            running_file_watcher = self._running_file_watchers.pop(session_id, None)
            if running_file_watcher is not None:
                await running_file_watcher.worker.stop()
                with contextlib.suppress(asyncio.CancelledError):
                    await running_file_watcher.task

            running_screenshots = self._running_screenshot_workers.pop(session_id, None)
            if running_screenshots is not None:
                await running_screenshots.worker.stop()
                with contextlib.suppress(asyncio.CancelledError):
                    await running_screenshots.task

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
        resolved_session_id = self._resolve_session_id(session_id)
        if resolved_session_id is None:
            return []
        return list_raw_events(self._connection, resolved_session_id)

    def list_session_screenshots(self, *, session_id: str) -> list[ScreenshotArtifact]:
        resolved_session_id = self._resolve_session_id(session_id)
        if resolved_session_id is None:
            return []
        return list_screenshots(self._connection, resolved_session_id)

    def delete_session_screenshots(self, *, session_id: str) -> ScreenshotDeletionResult:
        return delete_screenshots_for_session(
            self._connection,
            session_id=session_id,
            artifact_root=self._artifact_root_for_session_id(session_id),
        )

    def close(self) -> None:
        self._connection.close()

    def _resolve_session_id(self, session_id: str) -> str | None:
        if session_id != "latest":
            return session_id

        row = self._connection.execute(
            """
            SELECT id
            FROM sessions
            ORDER BY started_at DESC, created_at DESC
            LIMIT 1
            """
        ).fetchone()
        if row is None:
            return None
        return str(row["id"])

    def _active_process_name(self) -> str | None:
        try:
            snapshot = self._active_window_provider.get_active_window()
        except Exception:
            return None
        if snapshot is None:
            return None
        return snapshot.process_name

    def _artifact_root_for_session(self, session: SessionRecord) -> Path:
        if session.storage_path:
            return Path(session.storage_path)
        return self._artifact_root_for_session_id(session.id)

    def _artifact_root_for_session_id(self, session_id: str) -> Path:
        base = self._db_path.parent
        if base.name == "db":
            base = base.parent
        return base / "sessions" / session_id


@dataclass
class RunningScreenshotWorker:
    worker: ScreenshotCaptureWorker
    task: asyncio.Task[None]


@dataclass
class RunningFileWatcher:
    worker: FileWatcherWorker
    task: asyncio.Task[None]


def map_session_error(error: SessionTransitionError) -> tuple[int, str]:
    return 409, str(error)


def is_sqlite_missing_session_error(error: sqlite3.Error) -> bool:
    return "FOREIGN KEY constraint failed" in str(error)
