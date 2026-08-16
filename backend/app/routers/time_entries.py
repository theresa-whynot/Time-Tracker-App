from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, Response
from sqlmodel import Session

from ..database import get_session
from ..schemas import EntryUpdate, ManualTimeEntryCreate
from ..services import time_entries as time_entry_service

router = APIRouter()


@router.get("/time-entries")
def list_time_entries(
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    session: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    return time_entry_service.list_time_entries(session, start, end)


@router.patch("/time-entries/{entry_id}")
def update_time_entry(
    entry_id: int,
    update: EntryUpdate,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    return time_entry_service.update_time_entry(session, entry_id, update)


@router.post("/time-entries/manual")
def create_manual_time_entry(
    manual_entry: ManualTimeEntryCreate,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    return time_entry_service.create_manual_time_entry(session, manual_entry)


@router.delete("/time-entries/{entry_id}", status_code=204)
def delete_time_entry(
    entry_id: int,
    session: Session = Depends(get_session),
) -> Response:
    time_entry_service.delete_time_entry(session, entry_id)
    return Response(status_code=204)
