from pathlib import Path

from worktrace_agent.capture.ocr_worker import (
    OcrCandidate,
    OcrEngineResult,
    OcrSkipReason,
    SelectiveOcrWorker,
)
from worktrace_agent.capture.screenshot_sampler import ScreenshotArtifact
from worktrace_agent.db.connection import initialize_database
from worktrace_agent.db.ocr_repository import list_ocr_results, save_ocr_result
from worktrace_agent.db.screenshots_repository import save_screenshot
from worktrace_agent.db.session_state_repository import start_session
from worktrace_agent.privacy.redaction import (
    PRIVACY_TEST_CORPUS,
    REDACTION_TOKEN,
    count_privacy_leaks,
)

SESSION_ID = "sess_ocr_001"
TIMESTAMP = "2026-05-06T09:30:00+05:30"


def test_terminal_error_screenshot_runs_ocr_and_stores_redacted_evidence(
    tmp_path: Path,
) -> None:
    connection = initialize_database(tmp_path / "worktrace.sqlite")
    engine = FakeOcrEngine(
        OcrEngineResult(
            text=f"Traceback: pytest failed with {PRIVACY_TEST_CORPUS[0]}",
            confidence=0.91,
            metadata={"line_count": 1},
        )
    )
    try:
        start_session(connection, session_id=SESSION_ID, started_at=TIMESTAMP)
        screenshot = build_screenshot("shot_terminal_error", visual_hash="abc123")
        save_screenshot(connection, screenshot)

        decision = SelectiveOcrWorker().process_candidate(
            OcrCandidate(
                screenshot=screenshot,
                image_bytes=b"fake-terminal-image",
                app_name="Windows Terminal",
                window_title="pytest failure - traceback",
            ),
            engine=engine,
        )

        assert decision.result is not None
        assert decision.skipped is None
        assert engine.call_count == 1
        assert decision.result.screenshot_id == screenshot.id
        assert REDACTION_TOKEN in decision.result.text
        assert count_privacy_leaks(decision.result.text) == 0

        save_ocr_result(connection, decision.result)
        stored = list_ocr_results(connection, SESSION_ID)

        assert stored == [decision.result]
        assert stored[0].session_id == SESSION_ID
        assert stored[0].screenshot_id == screenshot.id
    finally:
        connection.close()


def test_unchanged_high_value_screenshot_is_skipped_without_engine_call() -> None:
    worker = SelectiveOcrWorker()
    engine = FakeOcrEngine(OcrEngineResult(text="Error: failed test", confidence=0.9))
    first = build_screenshot("shot_terminal_error_001", visual_hash="samehash")
    duplicate = build_screenshot("shot_terminal_error_002", visual_hash="samehash")

    first_decision = worker.process_candidate(
        OcrCandidate(
            screenshot=first,
            image_bytes=b"first",
            app_name="Windows Terminal",
            window_title="pytest traceback",
        ),
        engine=engine,
    )
    duplicate_decision = worker.process_candidate(
        OcrCandidate(
            screenshot=duplicate,
            image_bytes=b"duplicate",
            app_name="Windows Terminal",
            window_title="pytest traceback",
        ),
        engine=engine,
    )

    assert first_decision.result is not None
    assert duplicate_decision.result is None
    assert duplicate_decision.skipped is OcrSkipReason.UNCHANGED
    assert engine.call_count == 1


def test_non_high_value_screenshot_is_skipped_without_engine_call() -> None:
    engine = FakeOcrEngine(OcrEngineResult(text="not used", confidence=0.9))

    decision = SelectiveOcrWorker().process_candidate(
        OcrCandidate(
            screenshot=build_screenshot("shot_plain_browser", visual_hash="plainhash"),
            image_bytes=b"plain",
            app_name="Chrome",
            window_title="Documentation page",
        ),
        engine=engine,
    )

    assert decision.result is None
    assert decision.skipped is OcrSkipReason.NOT_HIGH_VALUE
    assert engine.call_count == 0


def test_ocr_results_table_exists_after_migrations(tmp_path: Path) -> None:
    connection = initialize_database(tmp_path / "worktrace.sqlite")
    try:
        row = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ocr_results'"
        ).fetchone()

        assert row is not None
    finally:
        connection.close()


class FakeOcrEngine:
    engine_name = "fake-ocr"

    def __init__(self, result: OcrEngineResult) -> None:
        self.result = result
        self.call_count = 0

    def recognize(self, candidate: OcrCandidate) -> OcrEngineResult:
        self.call_count += 1
        return self.result


def build_screenshot(screenshot_id: str, *, visual_hash: str) -> ScreenshotArtifact:
    return ScreenshotArtifact(
        id=screenshot_id,
        session_id=SESSION_ID,
        source_event_id=None,
        timestamp=TIMESTAMP,
        width=1280,
        height=720,
        stored_width=1280,
        stored_height=720,
        byte_size=1024,
        content_hash=f"content-{screenshot_id}",
        visual_hash=visual_hash,
        storage_path=f"screenshots/{screenshot_id}.rgb",
    )
