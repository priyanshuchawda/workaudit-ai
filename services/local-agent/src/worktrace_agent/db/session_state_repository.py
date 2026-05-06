import sqlite3

from worktrace_agent.domain.session_state import (
    SessionRecord,
    SessionStatus,
    SessionTransitionError,
    build_recording_session,
    transition_session,
)

ACTIVE_STATUSES = {SessionStatus.RECORDING, SessionStatus.PAUSED}


def start_session(
    connection: sqlite3.Connection,
    *,
    session_id: str,
    started_at: str,
    title: str | None = None,
    storage_path: str | None = None,
    privacy_mode: str = "standard",
) -> SessionRecord:
    new_session = build_recording_session(
        session_id=session_id,
        started_at=started_at,
        title=title,
        storage_path=storage_path,
        privacy_mode=privacy_mode,
    )
    with connection:
        existing = _load_session(connection, session_id)
        if existing is not None:
            if existing.status in ACTIVE_STATUSES:
                return existing
            raise SessionTransitionError(f"Cannot start session from {existing.status.value}")

        connection.execute(
            """
            INSERT INTO sessions (
              id,
              started_at,
              ended_at,
              status,
              title,
              storage_path,
              privacy_mode,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (
                new_session.id,
                new_session.started_at,
                new_session.ended_at,
                new_session.status.value,
                new_session.title,
                new_session.storage_path,
                new_session.privacy_mode,
            ),
        )
    return new_session


def pause_session(
    connection: sqlite3.Connection,
    *,
    session_id: str,
    occurred_at: str,
) -> SessionRecord:
    session = _require_session(connection, session_id)
    if session.status is SessionStatus.PAUSED:
        return session
    if session.status is not SessionStatus.RECORDING:
        raise SessionTransitionError(f"Cannot pause session from {session.status.value}")

    paused = transition_session(session, status=SessionStatus.PAUSED, occurred_at=None)
    _persist_status(connection, paused)
    return paused


def stop_session(
    connection: sqlite3.Connection,
    *,
    session_id: str,
    occurred_at: str,
) -> SessionRecord:
    session = _require_session(connection, session_id)
    if session.status is SessionStatus.STOPPED:
        return session
    if session.status not in ACTIVE_STATUSES:
        raise SessionTransitionError(f"Cannot stop session from {session.status.value}")

    stopped = transition_session(session, status=SessionStatus.STOPPED, occurred_at=occurred_at)
    _persist_status(connection, stopped)
    return stopped


def interrupt_session(
    connection: sqlite3.Connection,
    *,
    session_id: str,
    occurred_at: str,
) -> SessionRecord:
    session = _require_session(connection, session_id)
    if session.status is SessionStatus.INTERRUPTED:
        return session
    if session.status not in ACTIVE_STATUSES:
        raise SessionTransitionError(f"Cannot interrupt session from {session.status.value}")

    interrupted = transition_session(
        session,
        status=SessionStatus.INTERRUPTED,
        occurred_at=occurred_at,
    )
    _persist_status(connection, interrupted)
    return interrupted


def _persist_status(connection: sqlite3.Connection, session: SessionRecord) -> None:
    with connection:
        connection.execute(
            """
            UPDATE sessions
            SET status = ?,
                ended_at = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (session.status.value, session.ended_at, session.id),
        )


def _require_session(connection: sqlite3.Connection, session_id: str) -> SessionRecord:
    session = _load_session(connection, session_id)
    if session is None:
        raise SessionTransitionError(f"Unknown session: {session_id}")
    return session


def _load_session(connection: sqlite3.Connection, session_id: str) -> SessionRecord | None:
    row = connection.execute(
        """
        SELECT id, started_at, ended_at, status, title, storage_path, privacy_mode
        FROM sessions
        WHERE id = ?
        """,
        (session_id,),
    ).fetchone()
    if row is None:
        return None

    return SessionRecord(
        id=str(row["id"]),
        started_at=str(row["started_at"]),
        ended_at=str(row["ended_at"]) if row["ended_at"] is not None else None,
        status=SessionStatus(str(row["status"])),
        title=str(row["title"]) if row["title"] is not None else None,
        storage_path=str(row["storage_path"]) if row["storage_path"] is not None else None,
        privacy_mode=str(row["privacy_mode"]),
    )
