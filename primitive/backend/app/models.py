from __future__ import annotations

import enum
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlmodel import SQLModel, Field, create_engine, Session, select

from .config import settings


def _db_path() -> Path:
    return settings.data_dir / "primitive.db"


def get_engine():
    engine = create_engine(f"sqlite:///{_db_path()}", echo=False)
    return engine


class JobStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"
    canceled = "canceled"


class Job(SQLModel, table=True):
    id: str = Field(primary_key=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    status: JobStatus = Field(default=JobStatus.pending, index=True)
    message: Optional[str] = None

    # paths
    input_path: str
    output_dir: str

    # primitive params as JSON (string)
    params_json: str

    # progress 0-100
    progress: int = 0

    def params(self) -> dict:
        try:
            return json.loads(self.params_json)
        except Exception:
            return {}


engine = get_engine()
SQLModel.metadata.create_all(engine)


def save_job(session: Session, job: Job) -> None:
    job.updated_at = datetime.utcnow()
    session.add(job)
    session.commit()
    session.refresh(job)


def get_job_by_id(job_id: str) -> Optional[Job]:
    with Session(engine) as session:
        stmt = select(Job).where(Job.id == job_id)
        res = session.exec(stmt).first()
        return res 