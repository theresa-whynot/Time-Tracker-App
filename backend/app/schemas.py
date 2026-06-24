from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


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
