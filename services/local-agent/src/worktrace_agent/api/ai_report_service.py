from __future__ import annotations

from typing import Protocol, cast

from worktrace_agent.domain.raw_event import RawEvent
from worktrace_agent.privacy.redaction import redact_json_value, redact_text

AI_REPORT_UNAVAILABLE_MESSAGE = (
    "Local AI report runtime is unavailable. Recording, timeline, and export continue."
)


class AiReportService(Protocol):
    def status(self, *, session_id: str) -> dict[str, object]:
        """Return safe local AI report availability for a session."""
        ...

    def generate(self, *, session_id: str, events: list[RawEvent]) -> dict[str, object]:
        """Generate a local AI report from redacted deterministic evidence."""
        ...

    def cancel(self, *, session_id: str) -> dict[str, object]:
        """Cancel a running local AI report if supported."""
        ...


class UnavailableAiReportService:
    def status(self, *, session_id: str) -> dict[str, object]:
        return unavailable_ai_report_result()

    def generate(self, *, session_id: str, events: list[RawEvent]) -> dict[str, object]:
        return unavailable_ai_report_result()

    def cancel(self, *, session_id: str) -> dict[str, object]:
        return {
            **_base_result(
                status="cancelled",
                message="Local AI report generation cancelled.",
                can_generate=True,
            ),
            "report": None,
        }


def unavailable_ai_report_result() -> dict[str, object]:
    return {
        **_base_result(
            status="runtime_unavailable",
            message=AI_REPORT_UNAVAILABLE_MESSAGE,
            can_generate=False,
        ),
        "report": None,
    }


def failed_ai_report_result() -> dict[str, object]:
    return {
        **_base_result(
            status="failed_safely",
            message="Local AI report generation failed safely.",
            can_generate=False,
        ),
        "report": None,
    }


def safe_ai_report_result(payload: dict[str, object]) -> dict[str, object]:
    return redact_json_value(
        {
            **_base_result(
                status=str(payload.get("status") or "failed_safely"),
                message=str(payload.get("message") or "Local AI report failed safely."),
                can_generate=bool(payload.get("can_generate", False)),
            ),
            "report": payload.get("report"),
            "evidence_ids": _string_list(payload.get("evidence_ids")),
            "model_name": _optional_string(payload.get("model_name")),
            "model_version": _optional_string(payload.get("model_version")),
            "runtime_ms": payload.get("runtime_ms"),
            "input_hash": _optional_string(payload.get("input_hash")),
            "generated_at": _optional_string(payload.get("generated_at")),
        }
    )


def _base_result(*, status: str, message: str, can_generate: bool) -> dict[str, object]:
    return {
        "status": redact_text(status),
        "message": redact_text(message),
        "can_generate": can_generate,
        "report": None,
        "evidence_ids": [],
        "model_name": None,
        "model_version": None,
        "runtime_ms": None,
        "input_hash": None,
        "generated_at": None,
    }


def _optional_string(value: object) -> str | None:
    if value is None:
        return None
    return redact_text(str(value))


def _string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    items = cast(list[object], value)
    return [redact_text(str(item)) for item in items if str(item).strip()]
