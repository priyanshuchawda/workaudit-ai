from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path

from fastapi.testclient import TestClient

from worktrace_agent.api.app import create_app
from worktrace_agent.capture.active_window import ActiveWindowSnapshot
from worktrace_agent.capture.file_watcher import FileSnapshot
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


class SequenceFileSnapshotProvider:
    def __init__(self, snapshots: list[list[FileSnapshot]]) -> None:
        self._snapshots = list(snapshots)

    def snapshot(self, roots: Sequence[Path]) -> list[FileSnapshot]:
        if not self._snapshots:
            return []
        return self._snapshots.pop(0)


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


def test_start_pause_resume_stop_session_control_flow(tmp_path: Path) -> None:
    client = TestClient(
        create_app(
            db_path=tmp_path / "worktrace.sqlite",
            active_window_provider=StaticActiveWindowProvider(),
            recorder_poll_interval_seconds=0.01,
            screenshot_interval_seconds=0.01,
        )
    )

    start_response = client.post(
        "/sessions/start",
        json={
            "session_id": "sess_api_control_001",
            "started_at": "2026-05-06T09:14:00+05:30",
            "title": "Desktop control flow",
            "privacy_mode": "standard",
        },
    )
    pause_response = client.post(
        "/sessions/sess_api_control_001/pause",
        json={"paused_at": "2026-05-06T09:15:00+05:30"},
    )
    resume_response = client.post(
        "/sessions/sess_api_control_001/resume",
        json={"resumed_at": "2026-05-06T09:16:00+05:30"},
    )
    stop_response = client.post(
        "/sessions/sess_api_control_001/stop",
        json={"stopped_at": "2026-05-06T09:17:00+05:30"},
    )

    assert start_response.status_code == 200
    assert start_response.json()["status"] == "recording"
    assert pause_response.status_code == 200
    assert pause_response.json()["status"] == "paused"
    assert resume_response.status_code == 200
    assert resume_response.json()["status"] == "recording"
    assert stop_response.status_code == 200
    assert stop_response.json()["status"] == "stopped"


def test_private_mode_session_suppresses_capture_workers(tmp_path: Path) -> None:
    client = TestClient(
        create_app(
            db_path=tmp_path / "worktrace.sqlite",
            active_window_provider=StaticActiveWindowProvider(),
            screenshot_provider=StaticScreenshotProvider(),
            recorder_poll_interval_seconds=0.01,
            screenshot_interval_seconds=0.01,
        )
    )

    start_response = client.post(
        "/sessions/start",
        json={
            "session_id": "sess_api_private_001",
            "started_at": "2026-05-06T09:14:00+05:30",
            "privacy_mode": "private",
        },
    )
    stop_response = client.post(
        "/sessions/sess_api_private_001/stop",
        json={"stopped_at": "2026-05-06T09:15:00+05:30"},
    )
    events_response = client.get("/sessions/sess_api_private_001/events")
    screenshots_response = client.get("/sessions/sess_api_private_001/screenshots")

    assert start_response.status_code == 200
    assert stop_response.status_code == 200
    assert events_response.json()["events"] == []
    assert screenshots_response.json()["screenshots"] == []


def test_session_start_stops_file_watcher_when_roots_are_configured(tmp_path: Path) -> None:
    project_root = tmp_path / "project"
    file_path = project_root / "src" / "app.py"
    client = TestClient(
        create_app(
            db_path=tmp_path / "worktrace.sqlite",
            active_window_provider=StaticActiveWindowProvider(),
            file_snapshot_provider=SequenceFileSnapshotProvider(
                [
                    [],
                    [FileSnapshot(path=file_path, size=20, modified_ns=20)],
                ]
            ),
            recorder_poll_interval_seconds=0.01,
            file_watch_interval_seconds=0.01,
        )
    )

    client.post(
        "/sessions/start",
        json={
            "session_id": "sess_api_files_001",
            "started_at": "2026-05-06T09:14:00+05:30",
            "file_watch_roots": [str(project_root)],
        },
    )
    client.post(
        "/sessions/sess_api_files_001/stop",
        json={"stopped_at": "2026-05-06T09:15:00+05:30"},
    )
    events_response = client.get("/sessions/sess_api_files_001/events")

    assert events_response.status_code == 200
    file_events = [
        event for event in events_response.json()["events"] if event["source"] == "file_watcher"
    ]
    assert len(file_events) == 1
    assert file_events[0]["type"] == "file_changed"
    assert file_events[0]["metadata"]["operation"] == "created"
    assert file_events[0]["metadata"]["path"].endswith("src/app.py")


def test_ingest_terminal_command_persists_redacted_event(tmp_path: Path) -> None:
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
            "session_id": "sess_api_terminal_001",
            "started_at": "2026-05-06T09:14:00+05:30",
        },
    )

    response = client.post(
        "/sessions/sess_api_terminal_001/terminal-events",
        json={
            "timestamp": "2026-05-06T09:14:30+05:30",
            "command": "pnpm test --token ghp_test",
            "shell": "powershell",
            "exit_code": 1,
        },
    )
    events_response = client.get("/sessions/sess_api_terminal_001/events")

    assert response.status_code == 200
    terminal_event = response.json()
    assert terminal_event["source"] == "terminal_command_detector"
    assert terminal_event["type"] == "terminal_command"
    assert terminal_event["privacy_level"] == "redacted"
    assert terminal_event["metadata"]["command"] == "pnpm test --token [REDACTED]"
    assert terminal_event["metadata"]["exit_code"] == 1
    assert terminal_event["metadata"]["shell"] == "powershell"
    assert "ghp_test" not in str(terminal_event)
    listed_events = events_response.json()["events"]
    assert any(event["id"] == terminal_event["id"] for event in listed_events)


def test_ingest_terminal_command_for_unknown_session_returns_safe_error(tmp_path: Path) -> None:
    client = TestClient(create_app(db_path=tmp_path / "worktrace.sqlite"))

    response = client.post(
        "/sessions/sess_missing/terminal-events",
        json={
            "timestamp": "2026-05-06T09:14:30+05:30",
            "command": "pnpm test",
            "shell": "powershell",
            "exit_code": 0,
        },
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Unknown session: sess_missing"}


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


def test_latest_session_screenshots_can_be_listed_and_deleted(tmp_path: Path) -> None:
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
            "session_id": "sess_api_screenshot_latest",
            "started_at": "2026-05-06T09:14:00+05:30",
        },
    )
    client.post(
        "/sessions/sess_api_screenshot_latest/stop",
        json={"stopped_at": "2026-05-06T09:15:00+05:30"},
    )

    screenshots_response = client.get("/sessions/latest/screenshots")

    assert screenshots_response.status_code == 200
    screenshots = screenshots_response.json()["screenshots"]
    assert len(screenshots) == 1
    assert screenshots[0]["session_id"] == "sess_api_screenshot_latest"

    delete_response = client.delete("/sessions/latest/screenshots")

    assert delete_response.status_code == 200
    assert delete_response.json()["deleted_rows"] == 1
    assert (
        client.get("/sessions/sess_api_screenshot_latest/screenshots").json()["screenshots"] == []
    )


def test_list_sessions_returns_newest_first_with_counts(tmp_path: Path) -> None:
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
            "session_id": "sess_api_list_old",
            "started_at": "2026-05-06T09:14:00+05:30",
            "title": "Older session",
        },
    )
    client.post(
        "/sessions/sess_api_list_old/terminal-events",
        json={
            "timestamp": "2026-05-06T09:14:30+05:30",
            "command": "pnpm test",
            "shell": "powershell",
            "exit_code": 0,
        },
    )
    client.post(
        "/sessions/sess_api_list_old/stop",
        json={"stopped_at": "2026-05-06T09:15:00+05:30"},
    )
    client.post(
        "/sessions/start",
        json={
            "session_id": "sess_api_list_new",
            "started_at": "2026-05-06T10:14:00+05:30",
            "title": "Newer session",
        },
    )
    client.post(
        "/sessions/sess_api_list_new/stop",
        json={"stopped_at": "2026-05-06T10:15:00+05:30"},
    )

    response = client.get("/sessions")

    assert response.status_code == 200
    sessions = response.json()["sessions"]
    assert [session["id"] for session in sessions] == [
        "sess_api_list_new",
        "sess_api_list_old",
    ]
    assert sessions[0]["title"] == "Newer session"
    assert sessions[0]["status"] == "stopped"
    assert sessions[0]["event_count"] == 1
    assert sessions[0]["screenshot_count"] == 1
    assert sessions[1]["event_count"] == 2
    assert sessions[1]["screenshot_count"] == 1


def test_delete_session_removes_rows_and_default_artifacts(tmp_path: Path) -> None:
    session_id = "sess_api_delete_001"
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
            "session_id": session_id,
            "started_at": "2026-05-06T09:14:00+05:30",
        },
    )
    client.post(
        f"/sessions/{session_id}/stop",
        json={"stopped_at": "2026-05-06T09:15:00+05:30"},
    )
    client.post(f"/sessions/{session_id}/exports/markdown")
    session_root = tmp_path / "sessions" / session_id

    assert session_root.exists()

    delete_response = client.delete(f"/sessions/{session_id}")

    assert delete_response.status_code == 200
    assert delete_response.json() == {
        "deleted_session_rows": 1,
        "deleted_screenshot_files": 1,
        "missing_screenshot_files": 0,
        "deleted_screenshot_rows": 1,
        "removed_artifact_root": True,
    }
    assert session_root.exists() is False
    assert all(
        session["id"] != session_id for session in client.get("/sessions").json()["sessions"]
    )
    assert client.get(f"/sessions/{session_id}/folder").status_code == 404


def test_delete_unknown_session_returns_safe_error(tmp_path: Path) -> None:
    client = TestClient(create_app(db_path=tmp_path / "worktrace.sqlite"))

    response = client.delete("/sessions/sess_missing")

    assert response.status_code == 404
    assert response.json() == {"detail": "Unknown session: sess_missing"}


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


def test_export_session_markdown_and_raw_json_from_api(tmp_path: Path) -> None:
    token = "ghp_" + "test"
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
            "session_id": "sess_api_export_001",
            "started_at": "2026-05-06T09:14:00+05:30",
            "title": "API export",
        },
    )
    client.post(
        "/sessions/sess_api_export_001/terminal-events",
        json={
            "timestamp": "2026-05-06T09:14:30+05:30",
            "command": f"pnpm test --token {token}",
            "shell": "powershell",
            "exit_code": 1,
        },
    )
    client.post(
        "/sessions/sess_api_export_001/stop",
        json={"stopped_at": "2026-05-06T09:15:00+05:30"},
    )

    markdown_response = client.post("/sessions/sess_api_export_001/exports/markdown")
    raw_json_response = client.post("/sessions/sess_api_export_001/exports/raw-json")
    folder_response = client.get("/sessions/sess_api_export_001/folder")

    assert markdown_response.status_code == 200
    markdown = markdown_response.json()
    assert markdown["format"] == "markdown"
    assert markdown["path"].endswith("sessions/sess_api_export_001/exports/session.md")
    assert (
        "Deterministic export generated from local session evidence. No LLM was used."
        in markdown["preview"]
    )
    assert markdown["evidence_ids"]
    assert any(evidence_id in markdown["preview"] for evidence_id in markdown["evidence_ids"])
    assert token not in markdown["preview"]

    assert raw_json_response.status_code == 200
    raw_json = raw_json_response.json()
    assert raw_json["format"] == "raw_json"
    assert raw_json["path"].endswith("sessions/sess_api_export_001/exports/session.raw.json")
    assert '"events"' in raw_json["preview"]
    assert token not in raw_json["preview"]

    assert folder_response.status_code == 200
    assert folder_response.json()["path"].endswith("sessions/sess_api_export_001")


def test_export_unknown_session_returns_safe_error(tmp_path: Path) -> None:
    client = TestClient(create_app(db_path=tmp_path / "worktrace.sqlite"))

    markdown_response = client.post("/sessions/sess_missing/exports/markdown")
    raw_json_response = client.post("/sessions/sess_missing/exports/raw-json")
    folder_response = client.get("/sessions/sess_missing/folder")

    assert markdown_response.status_code == 404
    assert markdown_response.json() == {"detail": "Unknown session: sess_missing"}
    assert raw_json_response.status_code == 404
    assert raw_json_response.json() == {"detail": "Unknown session: sess_missing"}
    assert folder_response.status_code == 404
    assert folder_response.json() == {"detail": "Unknown session: sess_missing"}


def test_stop_unknown_session_returns_safe_error(tmp_path: Path) -> None:
    client = TestClient(create_app(db_path=tmp_path / "worktrace.sqlite"))

    response = client.post(
        "/sessions/sess_missing/stop",
        json={"stopped_at": "2026-05-06T09:15:00+05:30"},
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Unknown session: sess_missing"}


def test_pause_and_resume_unknown_session_returns_safe_error(tmp_path: Path) -> None:
    client = TestClient(create_app(db_path=tmp_path / "worktrace.sqlite"))

    pause_response = client.post(
        "/sessions/sess_missing/pause",
        json={"paused_at": "2026-05-06T09:15:00+05:30"},
    )
    resume_response = client.post(
        "/sessions/sess_missing/resume",
        json={"resumed_at": "2026-05-06T09:16:00+05:30"},
    )

    assert pause_response.status_code == 409
    assert pause_response.json() == {"detail": "Unknown session: sess_missing"}
    assert resume_response.status_code == 409
    assert resume_response.json() == {"detail": "Unknown session: sess_missing"}
