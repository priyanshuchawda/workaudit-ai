from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from worktrace_agent.api.app import create_app
from worktrace_agent.capture.active_window import ActiveWindowSnapshot


class StaticActiveWindowProvider:
    def get_active_window(self) -> ActiveWindowSnapshot:
        return ActiveWindowSnapshot(
            app="VS Code",
            window_title="workaudit-ai - App.tsx",
            process_name="Code.exe",
            timestamp="2026-05-06T09:14:01+05:30",
            confidence=0.98,
        )


def test_start_stop_and_list_session_events(tmp_path: Path) -> None:
    client = TestClient(
        create_app(
            db_path=tmp_path / "worktrace.sqlite",
            active_window_provider=StaticActiveWindowProvider(),
            recorder_poll_interval_seconds=0.01,
        )
    )

    start_response = client.post(
        "/sessions/start",
        json={
            "session_id": "sess_api_001",
            "started_at": "2026-05-06T09:14:00+05:30",
            "title": "API live recorder",
        },
    )
    stop_response = client.post(
        "/sessions/sess_api_001/stop",
        json={"stopped_at": "2026-05-06T09:15:00+05:30"},
    )
    events_response = client.get("/sessions/sess_api_001/events")

    assert start_response.status_code == 200
    assert start_response.json()["status"] == "recording"
    assert stop_response.status_code == 200
    assert stop_response.json()["status"] == "stopped"
    assert events_response.status_code == 200
    events = events_response.json()["events"]
    assert len(events) == 1
    assert events[0]["source"] == "active_window"
    assert events[0]["type"] == "active_window_changed"
    assert events[0]["metadata"]["app"] == "VS Code"


def test_stop_unknown_session_returns_safe_error(tmp_path: Path) -> None:
    client = TestClient(create_app(db_path=tmp_path / "worktrace.sqlite"))

    response = client.post(
        "/sessions/sess_missing/stop",
        json={"stopped_at": "2026-05-06T09:15:00+05:30"},
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Unknown session: sess_missing"}
