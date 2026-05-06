import sqlite3
from pathlib import Path

import pytest

from worktrace_agent.db.connection import initialize_database, open_database
from worktrace_agent.db.migrations import apply_migrations, get_applied_migrations


def table_exists(connection: sqlite3.Connection, table_name: str) -> bool:
    row = connection.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table_name,),
    ).fetchone()
    return row is not None


def index_exists(connection: sqlite3.Connection, index_name: str) -> bool:
    row = connection.execute(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?",
        (index_name,),
    ).fetchone()
    return row is not None


def test_initialize_database_enables_wal_mode(tmp_path: Path) -> None:
    db_path = tmp_path / "nested" / "worktrace.sqlite"

    connection = initialize_database(db_path)
    try:
        journal_mode = connection.execute("PRAGMA journal_mode;").fetchone()[0]
        foreign_keys = connection.execute("PRAGMA foreign_keys;").fetchone()[0]
        busy_timeout = connection.execute("PRAGMA busy_timeout;").fetchone()[0]

        assert journal_mode == "wal"
        assert foreign_keys == 1
        assert busy_timeout > 0
        assert db_path.exists()
        assert connection.row_factory is sqlite3.Row
    finally:
        connection.close()


def test_fresh_database_applies_initial_migration(tmp_path: Path) -> None:
    connection = initialize_database(tmp_path / "worktrace.sqlite")
    try:
        assert get_applied_migrations(connection) == ["001_initial.sql"]
        assert table_exists(connection, "schema_migrations")
        assert table_exists(connection, "sessions")
        assert table_exists(connection, "raw_events")
        assert index_exists(connection, "idx_raw_events_session_timestamp")
        assert index_exists(connection, "idx_raw_events_type")
        assert index_exists(connection, "idx_raw_events_source")
    finally:
        connection.close()


def test_apply_migrations_is_idempotent(tmp_path: Path) -> None:
    connection = initialize_database(tmp_path / "worktrace.sqlite")
    try:
        assert apply_migrations(connection) == []
        assert get_applied_migrations(connection) == ["001_initial.sql"]

        migration_count = connection.execute("SELECT COUNT(*) FROM schema_migrations").fetchone()[0]
        assert migration_count == 1
    finally:
        connection.close()


def test_database_with_initial_migration_remains_readable_on_upgrade(tmp_path: Path) -> None:
    db_path = tmp_path / "worktrace.sqlite"
    connection = initialize_database(db_path)
    try:
        connection.execute(
            """
            INSERT INTO sessions (
              id,
              started_at,
              status,
              title,
              storage_path,
              privacy_mode
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                "sess_001",
                "2026-05-06T09:14:00+05:30",
                "stopped",
                "Schema smoke test",
                "~/.worktrace/sessions/sess_001",
                "standard",
            ),
        )
        connection.commit()
    finally:
        connection.close()

    reopened = open_database(db_path)
    try:
        assert apply_migrations(reopened) == []
        row = reopened.execute(
            "SELECT id, status FROM sessions WHERE id = ?", ("sess_001",)
        ).fetchone()

        assert row["id"] == "sess_001"
        assert row["status"] == "stopped"
    finally:
        reopened.close()


def test_failed_migration_is_not_recorded(tmp_path: Path) -> None:
    migrations_dir = tmp_path / "migrations"
    migrations_dir.mkdir()
    (migrations_dir / "001_bad.sql").write_text(
        "CREATE TABLE broken_table (id TEXT PRIMARY KEY,);",
        encoding="utf-8",
    )
    connection = open_database(tmp_path / "worktrace.sqlite")

    try:
        with pytest.raises(sqlite3.Error):
            apply_migrations(connection, migrations_dir=migrations_dir)

        assert get_applied_migrations(connection) == []
        assert not table_exists(connection, "broken_table")
    finally:
        connection.close()


def test_application_schema_is_defined_in_versioned_sql_migrations() -> None:
    migrations_dir = Path(__file__).parents[2] / "src" / "worktrace_agent" / "db" / "migrations"
    migration_files = sorted(migrations_dir.glob("*.sql"))

    assert [path.name for path in migration_files] == ["001_initial.sql"]

    migration_sql = migration_files[0].read_text(encoding="utf-8")
    assert "CREATE TABLE sessions" in migration_sql
    assert "CREATE TABLE raw_events" in migration_sql
