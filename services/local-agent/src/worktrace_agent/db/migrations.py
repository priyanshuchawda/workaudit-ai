import re
import sqlite3
from pathlib import Path

MIGRATION_NAME_PATTERN = re.compile(r"^\d{3}_[a-z0-9_]+\.sql$")
DEFAULT_MIGRATIONS_DIR = Path(__file__).with_name("migrations")


def get_applied_migrations(connection: sqlite3.Connection) -> list[str]:
    _ensure_migration_table(connection)
    rows = connection.execute(
        "SELECT filename FROM schema_migrations ORDER BY filename ASC"
    ).fetchall()
    return [str(row["filename"]) for row in rows]


def get_latest_schema_version(migrations_dir: Path | None = None) -> str:
    migration_files = _migration_files(migrations_dir or DEFAULT_MIGRATIONS_DIR)
    if not migration_files:
        return "none"
    return migration_files[-1].name


def apply_migrations(
    connection: sqlite3.Connection,
    migrations_dir: Path | None = None,
) -> list[str]:
    _ensure_migration_table(connection)

    applied = set(get_applied_migrations(connection))
    applied_now: list[str] = []

    for migration_file in _migration_files(migrations_dir or DEFAULT_MIGRATIONS_DIR):
        if migration_file.name in applied:
            continue

        sql = migration_file.read_text(encoding="utf-8")
        safe_filename = migration_file.name.replace("'", "''")
        try:
            connection.executescript(
                f"""
                BEGIN;
                {sql}
                INSERT INTO schema_migrations (filename) VALUES ('{safe_filename}');
                COMMIT;
                """
            )
        except sqlite3.Error:
            connection.rollback()
            raise
        applied_now.append(migration_file.name)

    return applied_now


def _migration_files(migrations_dir: Path) -> list[Path]:
    files = sorted(Path(migrations_dir).glob("*.sql"), key=lambda path: path.name)
    for migration_file in files:
        if not MIGRATION_NAME_PATTERN.match(migration_file.name):
            raise ValueError(f"Invalid migration filename: {migration_file.name}")
    return files


def _ensure_migration_table(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
          filename TEXT PRIMARY KEY,
          applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    connection.commit()
