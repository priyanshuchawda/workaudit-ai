import sqlite3
from dataclasses import dataclass
from pathlib import Path

from worktrace_agent.capture.screenshot_sampler import ScreenshotArtifact


@dataclass(frozen=True)
class ScreenshotDeletionResult:
    deleted_files: int
    missing_files: int
    deleted_rows: int


def save_screenshot(connection: sqlite3.Connection, screenshot: ScreenshotArtifact) -> None:
    with connection:
        connection.execute(
            """
            INSERT INTO screenshots (
              id,
              session_id,
              source_event_id,
              timestamp,
              width,
              height,
              stored_width,
              stored_height,
              byte_size,
              content_hash,
              visual_hash,
              storage_path
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                screenshot.id,
                screenshot.session_id,
                screenshot.source_event_id,
                screenshot.timestamp,
                screenshot.width,
                screenshot.height,
                screenshot.stored_width,
                screenshot.stored_height,
                screenshot.byte_size,
                screenshot.content_hash,
                screenshot.visual_hash,
                screenshot.storage_path,
            ),
        )


def list_screenshots(connection: sqlite3.Connection, session_id: str) -> list[ScreenshotArtifact]:
    rows = connection.execute(
        """
        SELECT
          id,
          session_id,
          source_event_id,
          timestamp,
          width,
          height,
          stored_width,
          stored_height,
          byte_size,
          content_hash,
          visual_hash,
          storage_path
        FROM screenshots
        WHERE session_id = ?
        ORDER BY timestamp ASC, id ASC
        """,
        (session_id,),
    ).fetchall()

    return [_screenshot_from_row(row) for row in rows]


def delete_screenshots_for_session(
    connection: sqlite3.Connection,
    *,
    session_id: str,
    artifact_root: Path,
) -> ScreenshotDeletionResult:
    screenshots = list_screenshots(connection, session_id)
    resolved_root = artifact_root.resolve()
    targets = [
        _resolve_artifact_path(resolved_root=resolved_root, storage_path=screenshot.storage_path)
        for screenshot in screenshots
    ]

    deleted_files = 0
    missing_files = 0
    for target in targets:
        if not target.exists():
            missing_files += 1
            continue
        if not target.is_file():
            raise ValueError("screenshot artifact path is not a file")
        target.unlink()
        deleted_files += 1

    with connection:
        cursor = connection.execute("DELETE FROM screenshots WHERE session_id = ?", (session_id,))

    return ScreenshotDeletionResult(
        deleted_files=deleted_files,
        missing_files=missing_files,
        deleted_rows=cursor.rowcount,
    )


def _screenshot_from_row(row: sqlite3.Row) -> ScreenshotArtifact:
    return ScreenshotArtifact(
        id=str(row["id"]),
        session_id=str(row["session_id"]),
        source_event_id=str(row["source_event_id"]) if row["source_event_id"] is not None else None,
        timestamp=str(row["timestamp"]),
        width=int(row["width"]),
        height=int(row["height"]),
        stored_width=int(row["stored_width"]),
        stored_height=int(row["stored_height"]),
        byte_size=int(row["byte_size"]),
        content_hash=str(row["content_hash"]),
        visual_hash=str(row["visual_hash"]),
        storage_path=str(row["storage_path"]),
    )


def _resolve_artifact_path(*, resolved_root: Path, storage_path: str) -> Path:
    target = (resolved_root / storage_path).resolve()
    try:
        target.relative_to(resolved_root)
    except ValueError as error:
        raise ValueError("screenshot artifact path is outside artifact root") from error
    return target
