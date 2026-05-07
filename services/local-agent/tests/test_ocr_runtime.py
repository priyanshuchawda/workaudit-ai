from __future__ import annotations

import sys

from worktrace_agent.capture.ocr_runtime import (
    OcrRuntimeConfig,
    OcrRuntimeStatus,
    check_ocr_runtime_availability,
)

HEAVY_OCR_MODULES = (
    "paddle",
    "paddleocr",
    "cv2",
    "onnxruntime",
)


def test_disabled_ocr_runtime_is_safe_and_not_runnable() -> None:
    availability = check_ocr_runtime_availability(
        OcrRuntimeConfig(enabled=False, provider="paddleocr")
    )

    assert availability.status is OcrRuntimeStatus.DISABLED
    assert availability.can_run is False
    assert availability.provider == "paddleocr"
    assert availability.user_message == "OCR runtime is disabled. Recording continues without OCR."


def test_missing_ocr_runtime_returns_unavailable_without_importing_package() -> None:
    for module_name in HEAVY_OCR_MODULES:
        sys.modules.pop(module_name, None)

    availability = check_ocr_runtime_availability(
        OcrRuntimeConfig(
            enabled=True,
            provider="paddleocr",
            module_name="worktrace_missing_ocr_runtime",
        )
    )

    assert availability.status is OcrRuntimeStatus.UNAVAILABLE
    assert availability.can_run is False
    assert "not installed" in availability.user_message
    assert not any(module_name in sys.modules for module_name in HEAVY_OCR_MODULES)


def test_available_ocr_runtime_is_ready_without_importing_heavy_module() -> None:
    for module_name in HEAVY_OCR_MODULES:
        sys.modules.pop(module_name, None)

    availability = check_ocr_runtime_availability(
        OcrRuntimeConfig(enabled=True, provider="fake-ocr", module_name="json")
    )

    assert availability.status is OcrRuntimeStatus.READY
    assert availability.can_run is True
    assert availability.provider == "fake-ocr"
    assert not any(module_name in sys.modules for module_name in HEAVY_OCR_MODULES)
