from __future__ import annotations

from typing import cast

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from worktrace_agent.api.session_recorder_service import (
    SessionRecorderService,
    map_session_error,
)
from worktrace_agent.db.session_state_repository import SessionTransitionError
from worktrace_agent.domain.raw_event import RawEvent
from worktrace_agent.domain.session_state import SessionRecord

router = APIRouter(prefix="/sessions", tags=["sessions"])


class StartSessionRequest(BaseModel):
    session_id: str = Field(min_length=1)
    started_at: str = Field(min_length=1)
    title: str | None = None
    storage_path: str | None = None
    privacy_mode: str = Field(default="standard", min_length=1)


class StopSessionRequest(BaseModel):
    stopped_at: str = Field(min_length=1)


class SessionResponse(BaseModel):
    id: str
    started_at: str
    ended_at: str | None
    status: str
    title: str | None
    storage_path: str | None
    privacy_mode: str


class RawEventResponse(BaseModel):
    id: str
    session_id: str
    timestamp: str
    source: str
    type: str
    privacy_level: str
    confidence: float
    metadata: dict[str, object]


class SessionEventsResponse(BaseModel):
    events: list[RawEventResponse]


@router.post("/start", response_model=SessionResponse)
async def start_recording_session(
    request_body: StartSessionRequest,
    request: Request,
) -> SessionResponse:
    service = _session_service(request)
    try:
        session = await service.start_recording_session(
            session_id=request_body.session_id,
            started_at=request_body.started_at,
            title=request_body.title,
            storage_path=request_body.storage_path,
            privacy_mode=request_body.privacy_mode,
        )
    except SessionTransitionError as error:
        status_code, detail = map_session_error(error)
        raise HTTPException(status_code=status_code, detail=detail) from error
    return _session_response(session)


@router.post("/{session_id}/stop", response_model=SessionResponse)
async def stop_recording_session(
    session_id: str,
    request_body: StopSessionRequest,
    request: Request,
) -> SessionResponse:
    service = _session_service(request)
    try:
        session = await service.stop_recording_session(
            session_id=session_id,
            stopped_at=request_body.stopped_at,
        )
    except SessionTransitionError as error:
        status_code, detail = map_session_error(error)
        raise HTTPException(status_code=status_code, detail=detail) from error
    return _session_response(session)


@router.get("/{session_id}/events", response_model=SessionEventsResponse)
async def list_recording_session_events(session_id: str, request: Request) -> SessionEventsResponse:
    service = _session_service(request)
    return SessionEventsResponse(
        events=[
            _raw_event_response(event)
            for event in service.list_session_events(session_id=session_id)
        ]
    )


def _session_service(request: Request) -> SessionRecorderService:
    return cast(SessionRecorderService, request.app.state.session_recorder_service)


def _session_response(session: SessionRecord) -> SessionResponse:
    return SessionResponse(
        id=session.id,
        started_at=session.started_at,
        ended_at=session.ended_at,
        status=session.status.value,
        title=session.title,
        storage_path=session.storage_path,
        privacy_mode=session.privacy_mode,
    )


def _raw_event_response(event: RawEvent) -> RawEventResponse:
    return RawEventResponse(
        id=event.id,
        session_id=event.session_id,
        timestamp=event.timestamp,
        source=event.source,
        type=event.type,
        privacy_level=event.privacy_level,
        confidence=event.confidence,
        metadata=event.metadata,
    )
