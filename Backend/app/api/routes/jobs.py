"""Job state endpoints."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import PageParams, get_db, pagination
from app.core.errors import NotFoundError
from app.repositories import jobs as job_repo
from app.schemas.jobs import JobPage, JobRead
from app.services.jobs import job_read

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("", response_model=JobPage)
def list_jobs(
    params: PageParams = Depends(pagination),
    job_status: str | None = Query(default=None, alias="status"),
    job_type: str | None = Query(default=None),
    created_after: datetime | None = Query(default=None),
    created_before: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
) -> JobPage:
    items, total = job_repo.list_jobs(
        db,
        limit=params.limit,
        offset=params.offset,
        status=job_status,
        job_type=job_type,
        created_after=created_after,
        created_before=created_before,
    )
    return JobPage(
        items=[job_read(db, item) for item in items],
        limit=params.limit,
        offset=params.offset,
        total=total,
    )


@router.get("/{job_id}", response_model=JobRead)
def get_job(job_id: str, db: Session = Depends(get_db)) -> JobRead:
    job = job_repo.get(db, job_id)
    if job is None:
        raise NotFoundError(f"job '{job_id}' was not found")
    return job_read(db, job)
