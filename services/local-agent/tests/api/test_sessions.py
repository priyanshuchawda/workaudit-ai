from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from worktrace_agent.api.app import create_app
from worktrace_agent.capture.active_window import ActiveWindowSnapshot
from worktrace_agent.capture.screenshot_capture import ScreenshotProvider
from worktrace_agent.capture.screenshot_sampler import ScreenshotFrame


class StaticActiveWindowProvider:
    def get_active_window(self) -> ActiveWindowSnapshot:
        return ActiveWindowSnapshot(
            app="VS Code",
            window_title="workaudit-ai - App.tsx",
            process_name="Code.exe",
            timestamp="2026-05-06T09:14:01+05:30",
            confidence=0.98,
        )


class StaticScreenshotProvider(ScreenshotProvider):
    def capture_frame(self, *, session_id: str, timestamp: str) -> ScreenshotFrame:
        return ScreenshotFrame(
            session_id=session_id,
            timestamp=timestamp,
            width=8,
            height=8,
            rgb_bytes=bytes([80, 80, 80]) * 8 * 8,
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


def test_start_stop_list_and_delete_session_screenshots(tmp_path: Path) -> None:
    client = TestClient(
        create_app(
            db_path=tmp_path / "worktrace.sqlite",
            active_window_provider=StaticActiveWindowProvider(),
            screenshot_provider=StaticScreenshotProvider(),
            recorder_poll_interval_seconds=0.01,
            screenshot_interval_seconds=0.01,
        )
    )

    client.post(
        "/sessions/start",
        json={
            "session_id": "sess_api_screenshot_001",
            "started_at": "2026-05-06T09:14:00+05:30",
        },
    )
    client.post(
        "/sessions/sess_api_screenshot_001/stop",
        json={"stopped_at": "2026-05-06T09:15:00+05:30"},
    )
    screenshots_response = client.get("/sessions/sess_api_screenshot_001/screenshots")

    assert screenshots_response.status_code == 200
    screenshots = screenshots_response.json()["screenshots"]
    assert len(screenshots) == 1
    assert screenshots[0]["session_id"] == "sess_api_screenshot_001"
    assert screenshots[0]["source_event_id"] is not None
    assert screenshots[0]["stored_width"] == 8
    assert (tmp_path / "sessions" / "sess_api_screenshot_001" / "screenshots").exists()

    delete_response = client.delete("/sessions/sess_api_screenshot_001/screenshots")

    assert delete_response.status_code == 200
    assert delete_response.json()["deleted_rows"] == 1
    assert client.get("/sessions/sess_api_screenshot_001/screenshots").json()["screenshots"] == []


def test_latest_session_events_returns_most_recent_session_events(tmp_path: Path) -> None:
    client = TestClient(
        create_app(
            db_path=tmp_path / "worktrace.sqlite",
            active_window_provider=StaticActiveWindowProvider(),
            recorder_poll_interval_seconds=0.01,
        )
    )

    client.post(
        "/sessions/start",
        json={
            "session_id": "sess_api_001",
            "started_at": "2026-05-06T09:14:00+05:30",
        },
    )
    client.post(
        "/sessions/sess_api_001/stop",
        json={"stopped_at": "2026-05-06T09:15:00+05:30"},
    )

    response = client.get("/sessions/latest/events")

    assert response.status_code == 200
    events = response.json()["events"]
    assert len(events) == 1
    assert events[0]["session_id"] == "sess_api_001"
    assert events[0]["metadata"]["app"] == "VS Code"


def test_stop_unknown_session_returns_safe_error(tmp_path: Path) -> None:
    client = TestClient(create_app(db_path=tmp_path / "worktrace.sqlite"))

    response = client.post(
        "/sessions/sess_missing/stop",
        json={"stopped_at": "2026-05-06T09:15:00+05:30"},
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Unknown session: sess_missing"}
