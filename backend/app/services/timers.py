from typing import Any, Optional

from sqlmodel import Session, select

from ..models import TimeEntry, utc_now
from ..schemas import WorkPrompt
from .catalog import get_or_create_client, get_or_create_project, get_or_create_task
from .time_entries import entry_payload


def active_entry(session: Session) -> Optional[TimeEntry]:
    statement = (
        select(TimeEntry)
        .where(TimeEntry.ended_at.is_(None))
        .order_by(TimeEntry.started_at.desc())
    )
    return session.exec(statement).first()


def get_active_timer(session: Session) -> Optional[dict[str, Any]]:
    entry = active_entry(session)
    return entry_payload(session, entry) if entry else None


def start_timer(session: Session, prompt: WorkPrompt) -> dict[str, Any]:
    now = utc_now()
    current = active_entry(session)
    if current:
        current.ended_at = now
        current.updated_at = now
        session.add(current)

    client = get_or_create_client(session, prompt.client_name)
    project = get_or_create_project(session, client.id, prompt.project_name)
    task = get_or_create_task(session, project.id, prompt.task_name)

    entry = TimeEntry(
        client_id=client.id,
        project_id=project.id,
        task_id=task.id,
        description=prompt.description.strip(),
        started_at=now,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry_payload(session, entry, now)


def stop_timer(session: Session) -> Optional[dict[str, Any]]:
    current = active_entry(session)
    if not current:
        return None

    now = utc_now()
    current.ended_at = now
    current.updated_at = now
    session.add(current)
    session.commit()
    session.refresh(current)
    return entry_payload(session, current, now)
