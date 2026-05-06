import sqlite3

from worktrace_agent.capture.screenshot_sampler import ScreenshotArtifact


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
