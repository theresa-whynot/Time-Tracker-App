from typing import Any, Optional

from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..database import get_session
from ..schemas import WorkPrompt
from ..services import timers as timer_service

router = APIRouter()


@router.get("/timer/active")
def get_active_timer(session: Session = Depends(get_session)) -> Optional[dict[str, Any]]:
    return timer_service.get_active_timer(session)


@router.post("/timer/start")
def start_timer(
    prompt: WorkPrompt,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    return timer_service.start_timer(session, prompt)


@router.post("/timer/stop")
def stop_timer(session: Session = Depends(get_session)) -> Optional[dict[str, Any]]:
    return timer_service.stop_timer(session)
