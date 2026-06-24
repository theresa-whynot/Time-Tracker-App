from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlmodel import Session, select

from ..models import Client, Project, Task


def clean_name(value: str) -> str:
    cleaned = " ".join(value.strip().split())
    if not cleaned:
        raise HTTPException(status_code=422, detail="Name fields cannot be blank.")
    return cleaned


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


def list_clients(session: Session) -> list[Client]:
    return list(session.exec(select(Client).order_by(Client.name)).all())


def list_projects(session: Session, client_id: Optional[int] = None) -> list[Project]:
    statement = select(Project).order_by(Project.name)
    if client_id is not None:
        statement = statement.where(Project.client_id == client_id)
    return list(session.exec(statement).all())


def list_tasks(session: Session, project_id: Optional[int] = None) -> list[Task]:
    statement = select(Task).order_by(Task.name)
    if project_id is not None:
        statement = statement.where(Task.project_id == project_id)
    return list(session.exec(statement).all())
