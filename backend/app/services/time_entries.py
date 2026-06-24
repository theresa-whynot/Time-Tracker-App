from datetime import datetime
from typing import Any, Optional

from fastapi import HTTPException
from sqlmodel import Session, select

from ..models import Client, Project, Task, TimeEntry, utc_now
from ..schemas import EntryUpdate
from ..utils.datetime import as_utc


def entry_duration_seconds(entry: TimeEntry, now: Optional[datetime] = None) -> int:
    current = now or utc_now()
    started_at = as_utc(entry.started_at)
    ended_at = as_utc(entry.ended_at) if entry.ended_at else current
    duration = max(0, int((ended_at - started_at).total_seconds()))
    return max(0, duration + entry.seconds_adjustment)


def entry_payload(session: Session, entry: TimeEntry, now: Optional[datetime] = None) -> dict[str, Any]:
    client = session.get(Client, entry.client_id)
    project = session.get(Project, entry.project_id)
    task = session.get(Task, entry.task_id)

    return {
        "id": entry.id,
        "client_id": entry.client_id,
        "client_name": client.name if client else "Unknown client",
        "project_id": entry.project_id,
        "project_name": project.name if project else "Unknown project",
        "task_id": entry.task_id,
        "task_name": task.name if task else "Unknown task",
        "description": entry.description,
        "notes": entry.notes,
        "started_at": entry.started_at,
        "ended_at": entry.ended_at,
        "seconds_adjustment": entry.seconds_adjustment,
        "duration_seconds": entry_duration_seconds(entry, now),
    }


def list_time_entries(
    session: Session,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
) -> list[dict[str, Any]]:
    statement = select(TimeEntry).order_by(TimeEntry.started_at.desc())
    if start is not None:
        statement = statement.where(TimeEntry.started_at >= start)
    if end is not None:
        statement = statement.where(TimeEntry.started_at < end)

    entries = session.exec(statement).all()
    now = utc_now()
    return [entry_payload(session, entry, now) for entry in entries]


def update_time_entry(
    session: Session,
    entry_id: int,
    update: EntryUpdate,
) -> dict[str, Any]:
    entry = session.get(TimeEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found.")

    data = update.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(entry, field, value if not isinstance(value, str) else value.strip())

    if entry.ended_at and as_utc(entry.ended_at) < as_utc(entry.started_at):
        raise HTTPException(status_code=422, detail="Entry end time cannot be before start time.")

    entry.updated_at = utc_now()
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry_payload(session, entry)
