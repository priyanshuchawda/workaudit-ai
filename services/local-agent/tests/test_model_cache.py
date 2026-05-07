from __future__ import annotations

import sys
from pathlib import Path

from pytest import MonkeyPatch

from worktrace_agent.ai.model_cache import (
    ModelCacheStatus,
    ModelDownloadSpec,
    check_model_cache,
    default_model_cache_root,
)

HEAVY_MODEL_MODULES = (
    "torch",
    "transformers",
    "llama_cpp",
    "ollama",
    "paddleocr",
    "faster_whisper",
)


def test_required_model_cache_states_are_explicit() -> None:
    assert {status.value for status in ModelCacheStatus} == {
        "not_installed",
        "downloading",
        "installed",
        "loading",
        "ready",
        "unavailable",
        "too_slow",
        "failed",
    }


def test_default_model_cache_root_prefers_explicit_env_then_local_app_data(
    tmp_path: Path,
) -> None:
    explicit = tmp_path / "explicit-model-cache"
    local_app_data = tmp_path / "LocalAppData"

    assert default_model_cache_root({"WORKTRACE_MODEL_CACHE": str(explicit)}) == explicit
    assert default_model_cache_root({"LOCALAPPDATA": str(local_app_data)}) == (
        local_app_data / "WorkTrace" / "models"
    )


def test_default_model_cache_root_falls_back_to_home(
    monkeypatch: MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(Path, "home", lambda: tmp_path)

    assert default_model_cache_root({}) == tmp_path / ".worktrace" / "models"


def test_missing_model_with_enough_disk_is_not_installed_and_download_allowed(
    tmp_path: Path,
) -> None:
    spec = model_spec(expected_bytes=100, sha256=None)

    state = check_model_cache(
        spec,
        cache_root=tmp_path,
        disk_space=FakeDiskSpace(free_bytes=1_000),
    )

    assert state.status is ModelCacheStatus.NOT_INSTALLED
    assert state.can_download is True
    assert state.path == tmp_path / "report" / "fake-report" / "fake-report.gguf"
    assert state.expected_bytes == 100
    assert state.actual_bytes is None
    assert state.user_message == "Model is not installed. Download can be offered explicitly."


def test_missing_model_with_insufficient_disk_fails_safely(tmp_path: Path) -> None:
    spec = model_spec(expected_bytes=1_000, sha256=None)

    state = check_model_cache(
        spec,
        cache_root=tmp_path,
        disk_space=FakeDiskSpace(free_bytes=500),
    )

    assert state.status is ModelCacheStatus.FAILED
    assert state.can_download is False
    assert "Not enough disk space" in state.user_message
    assert state.path.exists() is False


def test_installed_model_with_matching_hash_is_installed(tmp_path: Path) -> None:
    model_path = tmp_path / "report" / "fake-report" / "fake-report.gguf"
    model_path.parent.mkdir(parents=True)
    model_path.write_bytes(b"fake model")
    spec = model_spec(
        expected_bytes=model_path.stat().st_size,
        sha256="1eec943f3fbf69947176e7c711415ad88a08184169f72cd31dca0ab071e14939",
    )

    state = check_model_cache(
        spec,
        cache_root=tmp_path,
        disk_space=FakeDiskSpace(free_bytes=0),
    )

    assert state.status is ModelCacheStatus.INSTALLED
    assert state.can_download is False
    assert state.actual_bytes == len(b"fake model")
    assert state.user_message == "Model is installed in the local cache."


def test_installed_model_with_hash_mismatch_fails_without_deleting_file(tmp_path: Path) -> None:
    model_path = tmp_path / "report" / "fake-report" / "fake-report.gguf"
    model_path.parent.mkdir(parents=True)
    model_path.write_bytes(b"tampered")

    state = check_model_cache(
        model_spec(expected_bytes=8, sha256="0" * 64),
        cache_root=tmp_path,
        disk_space=FakeDiskSpace(free_bytes=0),
    )

    assert state.status is ModelCacheStatus.FAILED
    assert state.can_download is False
    assert "checksum" in state.user_message.lower()
    assert model_path.read_bytes() == b"tampered"


def test_model_cache_checks_do_not_import_heavy_model_modules(tmp_path: Path) -> None:
    for module_name in HEAVY_MODEL_MODULES:
        sys.modules.pop(module_name, None)

    check_model_cache(
        model_spec(expected_bytes=100, sha256=None),
        cache_root=tmp_path,
        disk_space=FakeDiskSpace(free_bytes=1_000),
    )

    assert not any(module_name in sys.modules for module_name in HEAVY_MODEL_MODULES)


def model_spec(*, expected_bytes: int, sha256: str | None) -> ModelDownloadSpec:
    return ModelDownloadSpec(
        model_id="report/fake-report",
        filename="fake-report.gguf",
        expected_bytes=expected_bytes,
        sha256=sha256,
    )


class FakeDiskSpace:
    def __init__(self, *, free_bytes: int) -> None:
        self.free_bytes = free_bytes

    def free_bytes_for(self, path: Path) -> int:
        return self.free_bytes
