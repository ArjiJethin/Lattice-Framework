"""enforce job idempotency keys

Revision ID: 9f1c2d7e4a6b
Revises: cab7b3235e59
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "9f1c2d7e4a6b"
down_revision: str | None = "cab7b3235e59"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    connection = op.get_bind()
    conflicts = connection.execute(
        sa.text(
            """
            SELECT job_type, request_id, COUNT(*) AS duplicate_count
            FROM jobs
            WHERE request_id IS NOT NULL
            GROUP BY job_type, request_id
            HAVING COUNT(*) > 1
            ORDER BY job_type, request_id
            """
        )
    ).fetchall()
    if conflicts:
        details = ", ".join(
            f"{job_type}/{request_id} ({count} rows)"
            for job_type, request_id, count in conflicts[:10]
        )
        suffix = " (showing first 10)" if len(conflicts) > 10 else ""
        raise RuntimeError(
            "Cannot add uq_jobs_job_type_request_id because duplicate non-null "
            f"job idempotency keys exist: {details}{suffix}. Resolve these records "
            "manually and rerun the migration; no rows were deleted or merged."
        )
    with op.batch_alter_table("jobs", schema=None) as batch_op:
        batch_op.create_unique_constraint(
            "uq_jobs_job_type_request_id", ["job_type", "request_id"]
        )


def downgrade() -> None:
    with op.batch_alter_table("jobs", schema=None) as batch_op:
        batch_op.drop_constraint("uq_jobs_job_type_request_id", type_="unique")
