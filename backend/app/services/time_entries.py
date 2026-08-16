from datetime import datetime
from typing import Any, Optional

from fastapi import HTTPException
from sqlmodel import Session, select

from ..models import Client, Project, Task, TimeEntry, utc_now
from ..schemas import EntryUpdate, ManualTimeEntryCreate
from ..utils.datetime import as_utc
from .catalog import get_or_create_client, get_or_create_project, get_or_create_task


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
    client_name = data.pop("client_name", None)
    project_name = data.pop("project_name", None)
    task_name = data.pop("task_name", None)
    for field, value in data.items():
        setattr(entry, field, value if not isinstance(value, str) else value.strip())

    if client_name is not None or project_name is not None or task_name is not None:
        current_client = session.get(Client, entry.client_id)
        current_project = session.get(Project, entry.project_id)
        current_task = session.get(Task, entry.task_id)
        next_client_name = client_name if client_name is not None else current_client.name if current_client else ""
        next_project_name = (
            project_name if project_name is not None else current_project.name if current_project else "General"
        )
        next_task_name = task_name if task_name is not None else current_task.name if current_task else ""

        if not next_client_name.strip():
            raise HTTPException(status_code=422, detail="Client name cannot be blank.")
        if not next_project_name.strip():
            raise HTTPException(status_code=422, detail="Project name cannot be blank.")
        if not next_task_name.strip():
            raise HTTPException(status_code=422, detail="Task name cannot be blank.")

        client = get_or_create_client(session, next_client_name)
        project = get_or_create_project(session, client.id, next_project_name)
        task = get_or_create_task(session, project.id, next_task_name)
        entry.client_id = client.id
        entry.project_id = project.id
        entry.task_id = task.id

    if entry.ended_at and as_utc(entry.ended_at) < as_utc(entry.started_at):
        raise HTTPException(status_code=422, detail="Entry end time cannot be before start time.")

    entry.updated_at = utc_now()
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry_payload(session, entry)


def create_manual_time_entry(
    session: Session,
    manual_entry: ManualTimeEntryCreate,
) -> dict[str, Any]:
    if as_utc(manual_entry.ended_at) < as_utc(manual_entry.started_at):
        raise HTTPException(status_code=422, detail="Entry end time cannot be before start time.")

    now = utc_now()
    client = get_or_create_client(session, manual_entry.client_name)
    project = get_or_create_project(session, client.id, manual_entry.project_name)
    task = get_or_create_task(session, project.id, manual_entry.task_name)

    entry = TimeEntry(
        client_id=client.id,
        project_id=project.id,
        task_id=task.id,
        description=manual_entry.description.strip(),
        notes=manual_entry.notes.strip(),
        started_at=manual_entry.started_at,
        ended_at=manual_entry.ended_at,
        created_at=now,
        updated_at=now,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry_payload(session, entry)


def delete_time_entry(session: Session, entry_id: int) -> None:
    entry = session.get(TimeEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found.")

    session.delete(entry)
    session.commit()
