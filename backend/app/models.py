from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Client(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    created_at: datetime = Field(default_factory=utc_now)


class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    client_id: int = Field(foreign_key="client.id", index=True)
    name: str = Field(index=True)
    created_at: datetime = Field(default_factory=utc_now)


class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    name: str = Field(index=True)
    created_at: datetime = Field(default_factory=utc_now)


class TimeEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    client_id: int = Field(foreign_key="client.id", index=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    task_id: int = Field(foreign_key="task.id", index=True)
    description: str = ""
    started_at: datetime = Field(default_factory=utc_now, index=True)
    ended_at: Optional[datetime] = Field(default=None, index=True)
    seconds_adjustment: int = 0
    notes: str = ""
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
