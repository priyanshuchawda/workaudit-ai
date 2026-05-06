from __future__ import annotations

import hashlib
from collections.abc import Iterable, Mapping, Sequence
from typing import Protocol

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from worktrace_agent.privacy.redaction import redact_text
from worktrace_agent.timeline.deterministic import DeterministicTimeline

PROMPT_VERSION = "evidence-report-v1"
MAX_REPORT_ATTEMPTS = 2


class ReportGenerationError(RuntimeError):
    """Safe user-readable report generation failure."""


class HallucinationGuardError(ReportGenerationError):
    """Raised when generated output cites evidence that is not in the session."""


class LocalReportModel(Protocol):
    def generate(self, prompt: str) -> str:
        """Generate report JSON from a redacted evidence prompt."""
        ...


class ModelRunMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    model_name: str = Field(min_length=1)
    model_version: str | None = Field(default=None, min_length=1)
    prompt_version: str = Field(min_length=1)
    input_hash: str = Field(min_length=1)
    generated_at: str = Field(min_length=1)


class EvidenceClaim(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    title: str | None = Field(default=None, min_length=1)
    text: str | None = Field(default=None, min_length=1)
    path: str | None = Field(default=None, min_length=1)
    command: str | None = Field(default=None, min_length=1)
    evidence_event_ids: tuple[str, ...] = Field(min_length=1)

    @model_validator(mode="after")
    def require_claim_text(self) -> EvidenceClaim:
        if not any((self.title, self.text, self.path, self.command)):
            raise ValueError("claim must include title, text, path, or command")
        return self


class LlmReportPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    session_title: str = Field(min_length=1)
    summary: EvidenceClaim
    timeline: tuple[EvidenceClaim, ...]
    blockers: tuple[EvidenceClaim, ...]
    repeated_actions: tuple[EvidenceClaim, ...]
    important_files: tuple[EvidenceClaim, ...]
    commands: tuple[EvidenceClaim, ...]
    workflow_steps: tuple[EvidenceClaim, ...]
    confidence: float = Field(ge=0, le=1)


class EvidenceCitedReport(LlmReportPayload):
    session_id: str = Field(min_length=1)
    known_evidence_event_ids: tuple[str, ...] = Field(min_length=1)
    model_metadata: ModelRunMetadata

    def all_claims(self) -> tuple[EvidenceClaim, ...]:
        return (
            self.summary,
            *self.timeline,
            *self.blockers,
            *self.repeated_actions,
            *self.important_files,
            *self.commands,
            *self.workflow_steps,
        )


def generate_evidence_cited_report(
    *,
    session: Mapping[str, object],
    timeline: DeterministicTimeline,
    model: LocalReportModel,
    model_name: str,
    generated_at: str,
    model_version: str | None = None,
) -> EvidenceCitedReport:
    known_evidence_event_ids = _known_evidence_event_ids(timeline)
    if not known_evidence_event_ids:
        raise ReportGenerationError("Report generation requires session evidence.")

    prompt = build_report_prompt(session=session, timeline=timeline)
    payload = _generate_valid_payload(model=model, prompt=prompt)
    _guard_report_evidence(payload, known_evidence_event_ids)

    return EvidenceCitedReport(
        **payload.model_dump(),
        session_id=_required_string(session.get("id"), "session.id"),
        known_evidence_event_ids=known_evidence_event_ids,
        model_metadata=ModelRunMetadata(
            model_name=redact_text(model_name),
            model_version=redact_text(model_version) if model_version is not None else None,
            prompt_version=PROMPT_VERSION,
            input_hash=_hash_prompt(prompt),
            generated_at=redact_text(generated_at),
        ),
    )


def parse_report_json(raw_json: str) -> LlmReportPayload:
    return LlmReportPayload.model_validate_json(raw_json)


def build_report_prompt(*, session: Mapping[str, object], timeline: DeterministicTimeline) -> str:
    evidence_lines = "\n".join(_evidence_lines(timeline))
    if not evidence_lines:
        evidence_lines = "- No evidence available."

    prompt = f"""
You are generating a WorkTrace AI session report from local session evidence.

Rules:
- Return only valid JSON.
- Do not invent events, files, commands, blockers, or workflow steps.
- Every claim must include evidence_event_ids from the known evidence list.
- If there is no evidence for a claim, omit that claim.
- Do not include raw secrets.

Output JSON shape:
{{
  "session_title": "string",
  "summary": {{"text": "string", "evidence_event_ids": ["evt_id"]}},
  "timeline": [{{"title": "string", "text": "string", "evidence_event_ids": ["evt_id"]}}],
  "blockers": [{{"title": "string", "text": "string", "evidence_event_ids": ["evt_id"]}}],
  "repeated_actions": [{{"title": "string", "text": "string", "evidence_event_ids": ["evt_id"]}}],
  "important_files": [{{"path": "string", "evidence_event_ids": ["evt_id"]}}],
  "commands": [{{"command": "string", "evidence_event_ids": ["evt_id"]}}],
  "workflow_steps": [{{"title": "string", "text": "string", "evidence_event_ids": ["evt_id"]}}],
  "confidence": 0.0
}}

Session:
- id: {_required_string(session.get("id"), "session.id")}
- title: {_optional_string(session.get("title"), "Untitled session")}
- status: {_optional_string(session.get("status"), "unknown")}

Known evidence:
{evidence_lines}
"""
    return redact_text(prompt.strip())


def _generate_valid_payload(*, model: LocalReportModel, prompt: str) -> LlmReportPayload:
    last_error: ValidationError | None = None
    for attempt in range(MAX_REPORT_ATTEMPTS):
        raw_output = _safe_generate(model, _prompt_for_attempt(prompt, attempt))
        try:
            return parse_report_json(raw_output)
        except ValidationError as error:
            last_error = error

    raise ReportGenerationError(
        "Local report output could not be validated after one retry."
    ) from last_error


def _safe_generate(model: LocalReportModel, prompt: str) -> str:
    try:
        return model.generate(prompt)
    except Exception as error:
        raise ReportGenerationError("Local report generation failed safely.") from error


def _prompt_for_attempt(prompt: str, attempt: int) -> str:
    if attempt == 0:
        return prompt
    return (
        f"{prompt}\n\nPrevious output was invalid. Return valid JSON matching the schema exactly."
    )


def _guard_report_evidence(
    payload: LlmReportPayload,
    known_evidence_event_ids: Sequence[str],
) -> None:
    known_ids = set(known_evidence_event_ids)
    for claim in _claims_from_payload(payload):
        unknown_ids = [
            event_id for event_id in claim.evidence_event_ids if event_id not in known_ids
        ]
        if unknown_ids:
            raise HallucinationGuardError(
                f"Report claim cited unknown evidence IDs: {', '.join(unknown_ids)}"
            )


def _claims_from_payload(payload: LlmReportPayload) -> tuple[EvidenceClaim, ...]:
    return (
        payload.summary,
        *payload.timeline,
        *payload.blockers,
        *payload.repeated_actions,
        *payload.important_files,
        *payload.commands,
        *payload.workflow_steps,
    )


def _known_evidence_event_ids(timeline: DeterministicTimeline) -> tuple[str, ...]:
    return tuple(event.evidence_event_id for event in timeline.normalized_events)


def _evidence_lines(timeline: DeterministicTimeline) -> Iterable[str]:
    for event in timeline.normalized_events:
        yield redact_text(
            "- "
            f"{event.evidence_event_id}: "
            f"{event.timestamp} "
            f"{event.source}/{event.type} "
            f"{event.label} "
            f"{event.summary}"
        )


def _hash_prompt(prompt: str) -> str:
    return f"sha256:{hashlib.sha256(prompt.encode('utf-8')).hexdigest()}"


def _required_string(value: object, field_name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ReportGenerationError(f"{field_name} must be a non-empty string")
    return redact_text(value.strip())


def _optional_string(value: object, default: str) -> str:
    if value is None:
        return default
    return redact_text(str(value))
