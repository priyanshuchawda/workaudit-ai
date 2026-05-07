from __future__ import annotations

import importlib.util
from dataclasses import dataclass
from enum import StrEnum

from worktrace_agent.privacy.redaction import redact_text


class OcrRuntimeStatus(StrEnum):
    DISABLED = "disabled"
    READY = "ready"
    UNAVAILABLE = "unavailable"


@dataclass(frozen=True)
class OcrRuntimeConfig:
    enabled: bool = False
    provider: str = "paddleocr"
    module_name: str = "paddleocr"


@dataclass(frozen=True)
class OcrRuntimeAvailability:
    provider: str
    status: OcrRuntimeStatus
    can_run: bool
    user_message: str


def check_ocr_runtime_availability(config: OcrRuntimeConfig) -> OcrRuntimeAvailability:
    _validate_config(config)
    provider = redact_text(config.provider.strip())
    if not config.enabled:
        return OcrRuntimeAvailability(
            provider=provider,
            status=OcrRuntimeStatus.DISABLED,
            can_run=False,
            user_message="OCR runtime is disabled. Recording continues without OCR.",
        )

    if importlib.util.find_spec(config.module_name) is None:
        return OcrRuntimeAvailability(
            provider=provider,
            status=OcrRuntimeStatus.UNAVAILABLE,
            can_run=False,
            user_message=(
                f"OCR runtime provider {provider} is not installed. "
                "Recording continues without OCR."
            ),
        )

    return OcrRuntimeAvailability(
        provider=provider,
        status=OcrRuntimeStatus.READY,
        can_run=True,
        user_message=f"OCR runtime provider {provider} is available for selective OCR.",
    )


def _validate_config(config: OcrRuntimeConfig) -> None:
    if not config.provider.strip():
        raise ValueError("provider must be a non-empty string")
    if not config.module_name.strip():
        raise ValueError("module_name must be a non-empty string")
