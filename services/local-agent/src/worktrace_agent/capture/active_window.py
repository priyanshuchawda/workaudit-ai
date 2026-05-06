from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta

from worktrace_agent.db.raw_events_repository import append_raw_events
from worktrace_agent.domain.raw_event import RawEvent, build_raw_event


@dataclass(frozen=True)
class ActiveWindowFixture:
    offset_ratio: float
    app: str
    window_title: str
    process_name: str


ACTIVE_WINDOW_FIXTURE: tuple[ActiveWindowFixture, ...] = (
    ActiveWindowFixture(
        offset_ratio=0,
        app="VS Code",
        window_title="workaudit-ai - App.tsx",
        process_name="Code.exe",
    ),
    ActiveWindowFixture(
        offset_ratio=0.2,
        app="Chrome",
        window_title="Issue #9 - GitHub",
        process_name="chrome.exe",
    ),
    ActiveWindowFixture(
        offset_ratio=0.5,
        app="Windows Terminal",
        window_title="uv run --python 3.13 pytest",
        process_name="WindowsTerminal.exe",
    ),
    ActiveWindowFixture(
        offset_ratio=0.8,
        app="VS Code",
        window_title="raw_events_repository.py",
        process_name="Code.exe",
    ),
    ActiveWindowFixture(
        offset_ratio=1,
        app="File Explorer",
        window_title="worktrace session folder",
        process_name="explorer.exe",
    ),
)


def build_fake_active_window_events(
    *,
    session_id: str,
    started_at: str,
    duration_minutes: int,
) -> list[RawEvent]:
    start = _parse_offset_datetime(started_at)
    duration = timedelta(minutes=duration_minutes)

    return [
        build_raw_event(
            event_id=f"{session_id}-active-window-{index:03d}",
            session_id=session_id,
            timestamp=(start + (duration * fixture.offset_ratio)).isoformat(),
            source="active_window",
            event_type="active_window_changed",
            privacy_level="safe",
            confidence=1,
            metadata={
                "app": fixture.app,
                "window_title": fixture.window_title,
                "process_name": fixture.process_name,
            },
        )
        for index, fixture in enumerate(ACTIVE_WINDOW_FIXTURE)
    ]


def save_fake_active_window_recording(
    connection: sqlite3.Connection,
    *,
    session_id: str,
    started_at: str,
    duration_minutes: int,
) -> list[RawEvent]:
    events = build_fake_active_window_events(
        session_id=session_id,
        started_at=started_at,
        duration_minutes=duration_minutes,
    )
    append_raw_events(connection, events)
    return events


def _parse_offset_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("started_at must include a timezone offset")
    return parsed
