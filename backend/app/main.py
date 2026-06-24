from contextlib import asynccontextmanager
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlmodel import Session, select

from .database import get_session, init_db
from .models import Client, Project, Task, TimeEntry, utc_now


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Time Tracker API",
    version="0.1.0",
    description="Local API for tracking time across clients, projects, and tasks.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WorkPrompt(BaseModel):
    client_name: str = Field(min_length=1, max_length=120)
    project_name: str = Field(min_length=1, max_length=120)
    task_name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)


class EntryUpdate(BaseModel):
    description: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = Field(default=None, max_length=1000)
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    seconds_adjustment: Optional[int] = None


def clean_name(value: str) -> str:
    cleaned = " ".join(value.strip().split())
    if not cleaned:
        raise HTTPException(status_code=422, detail="Name fields cannot be blank.")
    return cleaned


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def get_or_create_client(session: Session, name: str) -> Client:
    cleaned = clean_name(name)
    statement = select(Client).where(func.lower(Client.name) == cleaned.lower())
    existing = session.exec(statement).first()
    if existing:
        return existing

    client = Client(name=cleaned)
    session.add(client)
    session.commit()
    session.refresh(client)
    return client


def get_or_create_project(session: Session, client_id: int, name: str) -> Project:
    cleaned = clean_name(name)
    statement = select(Project).where(
        Project.client_id == client_id,
        func.lower(Project.name) == cleaned.lower(),
    )
    existing = session.exec(statement).first()
    if existing:
        return existing

    project = Project(client_id=client_id, name=cleaned)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def get_or_create_task(session: Session, project_id: int, name: str) -> Task:
    cleaned = clean_name(name)
    statement = select(Task).where(
        Task.project_id == project_id,
        func.lower(Task.name) == cleaned.lower(),
    )
    existing = session.exec(statement).first()
    if existing:
        return existing

    task = Task(project_id=project_id, name=cleaned)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


def active_entry(session: Session) -> Optional[TimeEntry]:
    statement = (
        select(TimeEntry)
        .where(TimeEntry.ended_at.is_(None))
        .order_by(TimeEntry.started_at.desc())
    )
    return session.exec(statement).first()


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


def range_bounds_for_day(day: date) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time.min, tzinfo=timezone.utc)
    return start, start + timedelta(days=1)


def range_bounds_for_week(start_day: date) -> tuple[datetime, datetime]:
    start = datetime.combine(start_day, time.min, tzinfo=timezone.utc)
    return start, start + timedelta(days=7)


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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/clients")
def list_clients(session: Session = Depends(get_session)) -> list[Client]:
    return list(session.exec(select(Client).order_by(Client.name)).all())


@app.get("/projects")
def list_projects(
    client_id: Optional[int] = None,
    session: Session = Depends(get_session),
) -> list[Project]:
    statement = select(Project).order_by(Project.name)
    if client_id is not None:
        statement = statement.where(Project.client_id == client_id)
    return list(session.exec(statement).all())


@app.get("/tasks")
def list_tasks(
    project_id: Optional[int] = None,
    session: Session = Depends(get_session),
) -> list[Task]:
    statement = select(Task).order_by(Task.name)
    if project_id is not None:
        statement = statement.where(Task.project_id == project_id)
    return list(session.exec(statement).all())


@app.get("/timer/active")
def get_active_timer(session: Session = Depends(get_session)) -> Optional[dict[str, Any]]:
    entry = active_entry(session)
    return entry_payload(session, entry) if entry else None


@app.post("/timer/start")
def start_timer(
    prompt: WorkPrompt,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
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


@app.post("/timer/stop")
def stop_timer(session: Session = Depends(get_session)) -> Optional[dict[str, Any]]:
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


@app.get("/time-entries")
def list_time_entries(
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    session: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    statement = select(TimeEntry).order_by(TimeEntry.started_at.desc())
    if start is not None:
        statement = statement.where(TimeEntry.started_at >= start)
    if end is not None:
        statement = statement.where(TimeEntry.started_at < end)
    entries = session.exec(statement).all()
    now = utc_now()
    return [entry_payload(session, entry, now) for entry in entries]


@app.patch("/time-entries/{entry_id}")
def update_time_entry(
    entry_id: int,
    update: EntryUpdate,
    session: Session = Depends(get_session),
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


@app.get("/summaries/day")
def day_summary(
    day: date = Query(default_factory=lambda: utc_now().date()),
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    start, end = range_bounds_for_day(day)
    return summary_payload(session, start, end)


@app.get("/summaries/week")
def week_summary(
    start_day: date = Query(default_factory=lambda: (utc_now().date() - timedelta(days=utc_now().weekday()))),
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    start, end = range_bounds_for_week(start_day)
    return summary_payload(session, start, end)
