from datetime import datetime
from typing import Any

from sqlalchemy import or_
from sqlmodel import Session, select

from ..models import Client, Project, Task, TimeEntry, utc_now
from ..utils.datetime import as_utc
from .time_entries import entry_payload


def entries_for_range(session: Session, start: datetime, end: datetime) -> list[TimeEntry]:
    statement = (
        select(TimeEntry)
        .where(
            TimeEntry.started_at < end,
            or_(TimeEntry.ended_at.is_(None), TimeEntry.ended_at > start),
        )
        .order_by(TimeEntry.started_at)
    )
    return list(session.exec(statement).all())


def clipped_duration_seconds(
    entry: TimeEntry,
    range_start: datetime,
    range_end: datetime,
    now: datetime,
) -> int:
    started_at = max(as_utc(entry.started_at), range_start)
    ended_at = min(as_utc(entry.ended_at) if entry.ended_at else now, range_end)
    duration = max(0, int((ended_at - started_at).total_seconds()))
    return max(0, duration + entry.seconds_adjustment)


def summary_payload(
    session: Session,
    start: datetime,
    end: datetime,
) -> dict[str, Any]:
    now = utc_now()
    entries = entries_for_range(session, start, end)
    buckets: dict[tuple[int, int, int], dict[str, Any]] = {}

    for entry in entries:
        client = session.get(Client, entry.client_id)
        project = session.get(Project, entry.project_id)
        task = session.get(Task, entry.task_id)
        key = (entry.client_id, entry.project_id, entry.task_id)
        if key not in buckets:
            buckets[key] = {
                "client_id": entry.client_id,
                "client_name": client.name if client else "Unknown client",
                "project_id": entry.project_id,
                "project_name": project.name if project else "Unknown project",
                "task_id": entry.task_id,
                "task_name": task.name if task else "Unknown task",
                "duration_seconds": 0,
                "entry_ids": [],
            }

        buckets[key]["duration_seconds"] += clipped_duration_seconds(entry, start, end, now)
        buckets[key]["entry_ids"].append(entry.id)

    return {
        "start": start,
        "end": end,
        "total_seconds": sum(bucket["duration_seconds"] for bucket in buckets.values()),
        "buckets": sorted(
            buckets.values(),
            key=lambda bucket: bucket["duration_seconds"],
            reverse=True,
        ),
        "entries": [entry_payload(session, entry, now) for entry in entries],
    }
