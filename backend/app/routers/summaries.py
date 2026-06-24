from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from ..database import get_session
from ..models import utc_now
from ..services.summaries import summary_payload
from ..utils.datetime import current_week_start, range_bounds_for_day, range_bounds_for_week

router = APIRouter()


@router.get("/summaries/day")
def day_summary(
    day: date = Query(default_factory=lambda: utc_now().date()),
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    start, end = range_bounds_for_day(day)
    return summary_payload(session, start, end)


@router.get("/summaries/week")
def week_summary(
    start_day: date = Query(default_factory=current_week_start),
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    start, end = range_bounds_for_week(start_day)
    return summary_payload(session, start, end)
