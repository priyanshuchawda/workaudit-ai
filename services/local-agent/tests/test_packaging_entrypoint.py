from __future__ import annotations

from pathlib import Path

import pytest

from worktrace_agent.api.app import default_artifact_root, default_db_path


def test_python_module_entrypoint_imports_cleanly() -> None:
    import worktrace_agent.__main__ as entrypoint

    assert callable(entrypoint.main)


def test_sidecar_entrypoint_uses_local_host_and_configured_port(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import worktrace_agent.__main__ as entrypoint

    monkeypatch.setenv("WORKTRACE_SIDECAR_HOST", "127.0.0.1")
    monkeypatch.setenv("WORKTRACE_SIDECAR_PORT", "4567")

    config = entrypoint.read_sidecar_server_config()

    assert config.host == "127.0.0.1"
    assert config.port == 4567


def test_sidecar_entrypoint_rejects_non_local_host(monkeypatch: pytest.MonkeyPatch) -> None:
    import worktrace_agent.__main__ as entrypoint

    monkeypatch.setenv("WORKTRACE_SIDECAR_HOST", "0.0.0.0")
    monkeypatch.setenv("WORKTRACE_SIDECAR_PORT", "4567")

    with pytest.raises(SystemExit, match="WORKTRACE_SIDECAR_HOST must be 127.0.0.1"):
        entrypoint.read_sidecar_server_config()


def test_default_db_path_respects_configured_env(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    configured = tmp_path / "db" / "worktrace.sqlite"
    monkeypatch.setenv("WORKTRACE_DB_PATH", str(configured))

    assert default_db_path() == configured


def test_default_artifact_root_is_local_and_deterministic(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("WORKTRACE_DB_PATH", str(tmp_path / "db" / "worktrace.sqlite"))

    assert default_artifact_root("sess_packaged_001") == (
        tmp_path / "sessions" / "sess_packaged_001"
    )
