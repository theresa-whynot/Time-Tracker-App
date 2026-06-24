from typing import Optional

from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..database import get_session
from ..models import Client, Project, Task
from ..services import catalog as catalog_service

router = APIRouter()


@router.get("/clients")
def list_clients(session: Session = Depends(get_session)) -> list[Client]:
    return catalog_service.list_clients(session)


@router.get("/projects")
def list_projects(
    client_id: Optional[int] = None,
    session: Session = Depends(get_session),
) -> list[Project]:
    return catalog_service.list_projects(session, client_id)


@router.get("/tasks")
def list_tasks(
    project_id: Optional[int] = None,
    session: Session = Depends(get_session),
) -> list[Task]:
    return catalog_service.list_tasks(session, project_id)
