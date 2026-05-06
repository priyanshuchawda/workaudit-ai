from __future__ import annotations

import hashlib
from pathlib import PureWindowsPath
from typing import Final

from worktrace_agent.domain.raw_event import RawEvent, build_raw_event

FILE_OPERATIONS: Final = {"created", "modified", "deleted", "renamed"}
SENSITIVE_FILE_NAMES: Final = {".env", ".env.local", ".env.production", ".npmrc", ".pypirc"}
SENSITIVE_SUFFIXES: Final = {".key", ".pem", ".p12", ".pfx"}
SENSITIVE_NAME_PARTS: Final = ("secret", "password", "token", "credential")


def normalize_file_event(
    *,
    session_id: str,
    timestamp: str,
    path: str,
    operation: str,
) -> RawEvent:
    if operation not in FILE_OPERATIONS:
        raise ValueError(f"operation must be one of {sorted(FILE_OPERATIONS)}")

    normalized_path = normalize_path(path)
    file_name = PureWindowsPath(normalized_path).name
    extension = PureWindowsPath(normalized_path).suffix
    privacy_level = (
        "sensitive" if is_sensitive_path(file_name=file_name, extension=extension) else "safe"
    )

    return build_raw_event(
        event_id=build_file_event_id(
            session_id=session_id,
            timestamp=timestamp,
            normalized_path=normalized_path,
            operation=operation,
        ),
        session_id=session_id,
        timestamp=timestamp,
        source="file_watcher",
        event_type="file_changed",
        privacy_level=privacy_level,
        confidence=1,
        metadata={
            "path": normalized_path,
            "operation": operation,
            "file_name": file_name,
            "extension": extension,
        },
    )


def normalize_path(path: str) -> str:
    normalized = path.strip().replace("\\", "/")
    if not normalized:
        raise ValueError("path must be a non-empty string")
    return normalized


def is_sensitive_path(*, file_name: str, extension: str) -> bool:
    lower_file_name = file_name.lower()
    lower_extension = extension.lower()
    return (
        lower_file_name in SENSITIVE_FILE_NAMES
        or lower_extension in SENSITIVE_SUFFIXES
        or any(part in lower_file_name for part in SENSITIVE_NAME_PARTS)
    )


def build_file_event_id(
    *,
    session_id: str,
    timestamp: str,
    normalized_path: str,
    operation: str,
) -> str:
    digest = hashlib.sha256(
        f"{session_id}|{timestamp}|{normalized_path}|{operation}".encode()
    ).hexdigest()
    return f"{session_id}-file-{digest[:16]}"
