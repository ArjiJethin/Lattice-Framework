"""Workload profile service."""

from __future__ import annotations

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError, ValidationFailure
from app.core.settings import Settings
from app.core.time import new_id, utcnow
from app.db.models import Workload, WorkloadRevision
from app.repositories import workloads as repo
from app.schemas.common import DeleteResponse
from app.schemas.resources import WorkloadCreate, WorkloadRead, WorkloadUpdate
from app.services.snapshots import build_workload_snapshot


class WorkloadService:
    def __init__(self, session: Session, settings: Settings) -> None:
        self.session = session
        self.settings = settings

    def get(self, workload_id: str) -> Workload:
        workload = repo.get(self.session, workload_id)
        if workload is None:
            raise NotFoundError(f"workload '{workload_id}' was not found")
        return workload

    def list(
        self,
        *,
        limit: int,
        offset: int,
        workload_type: str | None = None,
        enabled: bool | None = None,
        search: str | None = None,
    ) -> tuple[list[WorkloadRead], int]:
        items, total = repo.list_workloads(
            self.session,
            limit=limit,
            offset=offset,
            workload_type=workload_type,
            enabled=enabled,
            search=search,
        )
        return [self.to_read(item) for item in items], total

    def create(self, payload: WorkloadCreate) -> WorkloadRead:
        if repo.get_by_name(self.session, payload.name) is not None:
            raise ConflictError(
                "a workload with this name already exists", details={"field": "name"}
            )
        input_spec = payload.input_spec.model_dump(exclude_none=True)
        self._validate(payload.workload_type, input_spec, payload)
        quality_evaluator = payload.quality_evaluator
        if quality_evaluator is None and payload.workload_type == "exact_match":
            quality_evaluator = "exact_match"
        workload = Workload(
            id=new_id(),
            name=payload.name,
            description=payload.description,
            workload_type=payload.workload_type,
            input_spec=input_spec,
            output_tokens_target=payload.output_tokens_target,
            output_tokens_min=payload.output_tokens_min,
            output_tokens_max=payload.output_tokens_max,
            context_requirement=payload.context_requirement,
            dataset_reference=payload.dataset_reference,
            protocol_reference=payload.protocol_reference,
            quality_evaluator=quality_evaluator,
            version=payload.version,
            metadata_json=payload.metadata_json,
            enabled=payload.enabled,
        )
        try:
            repo.create(self.session, workload)
            self._add_revision(workload)
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ConflictError("a workload with this name already exists") from exc
        return self.to_read(workload)

    def update(self, workload_id: str, payload: WorkloadUpdate) -> WorkloadRead:
        workload = self.get(workload_id)
        fields = payload.model_dump(exclude_unset=True)
        if "name" in fields and fields["name"] != workload.name:
            existing = repo.get_by_name(self.session, fields["name"])
            if existing is not None and existing.id != workload.id:
                raise ConflictError("a workload with this name already exists")
        if "input_spec" in fields and fields["input_spec"] is not None:
            fields["input_spec"] = payload.input_spec.model_dump(exclude_none=True)  # type: ignore[union-attr]
        merged_type = fields.get("workload_type", workload.workload_type)
        merged_spec = fields.get("input_spec", workload.input_spec)
        merged_output = fields.get("output_tokens_target", workload.output_tokens_target)
        merged_min = fields.get("output_tokens_min", workload.output_tokens_min)
        merged_max = fields.get("output_tokens_max", workload.output_tokens_max)
        merged_context = fields.get("context_requirement", workload.context_requirement)
        self._validate_values(
            workload_type=merged_type,
            input_spec=merged_spec,
            output_tokens_target=merged_output,
            output_tokens_min=merged_min,
            output_tokens_max=merged_max,
            context_requirement=merged_context,
        )
        content_keys = {
            "workload_type",
            "input_spec",
            "output_tokens_target",
            "output_tokens_min",
            "output_tokens_max",
            "context_requirement",
            "dataset_reference",
            "quality_evaluator",
        }
        content_changed = any(key in fields for key in content_keys)
        for key, value in fields.items():
            setattr(workload, key, value)
        if content_changed and "version" not in fields:
            workload.version += 1
        workload.updated_at = utcnow()
        self._add_revision(workload)
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ConflictError("a workload with this name already exists") from exc
        return self.to_read(workload)

    def delete(self, workload_id: str) -> DeleteResponse:
        workload = self.get(workload_id)
        references = repo.count_history_references(self.session, workload.id)
        if references:
            workload.deleted_at = utcnow()
            workload.enabled = False
            self.session.commit()
            return DeleteResponse(
                id=workload.id,
                deleted="soft",
                message=(
                    "Workload is referenced by benchmark or optimization history, so it was "
                    "disabled and soft-deleted; historical snapshots remain interpretable."
                ),
            )
        repo.delete(self.session, workload)
        self.session.commit()
        return DeleteResponse(id=workload_id, deleted="hard", message="Workload deleted")

    # -- validation --------------------------------------------------------
    def _validate(self, workload_type: str, input_spec: dict, payload: WorkloadCreate) -> None:
        self._validate_values(
            workload_type=workload_type,
            input_spec=input_spec,
            output_tokens_target=payload.output_tokens_target,
            output_tokens_min=payload.output_tokens_min,
            output_tokens_max=payload.output_tokens_max,
            context_requirement=payload.context_requirement,
        )

    def _validate_values(
        self,
        *,
        workload_type: str,
        input_spec: dict,
        output_tokens_target: int,
        output_tokens_min: int | None,
        output_tokens_max: int | None,
        context_requirement: int,
    ) -> None:
        prompts: list[str] = []
        if input_spec.get("prompt"):
            prompts.append(str(input_spec["prompt"]))
        for sample in input_spec.get("samples") or []:
            if sample.get("prompt"):
                prompts.append(str(sample["prompt"]))
        if not prompts and workload_type in ("generation", "completion", "exact_match"):
            raise ValidationFailure(
                "input_spec.prompt or at least one input_spec.samples[].prompt is required",
                details={"field": "input_spec.prompt"},
            )
        for prompt in prompts:
            if len(prompt) > self.settings.max_prompt_chars:
                limit = self.settings.max_prompt_chars
                raise ValidationFailure(
                    f"prompt exceeds the configured maximum of {limit} characters",
                    details={"field": "input_spec.prompt"},
                )
        if output_tokens_target > self.settings.max_output_tokens:
            limit = self.settings.max_output_tokens
            raise ValidationFailure(
                f"output_tokens_target exceeds the configured maximum ({limit})",
                details={"field": "output_tokens_target"},
            )
        if output_tokens_min is not None and output_tokens_max is not None:
            if output_tokens_min > output_tokens_max:
                raise ValidationFailure("output_tokens_min must be <= output_tokens_max")
        if output_tokens_min is not None and output_tokens_target < output_tokens_min:
            raise ValidationFailure("output_tokens_target must be >= output_tokens_min")
        if output_tokens_max is not None and output_tokens_target > output_tokens_max:
            raise ValidationFailure("output_tokens_target must be <= output_tokens_max")
        if context_requirement > self.settings.max_context_length:
            limit = self.settings.max_context_length
            raise ValidationFailure(
                f"context_requirement exceeds the configured maximum ({limit})",
                details={"field": "context_requirement"},
            )
        if workload_type == "exact_match":
            references = input_spec.get("expected_output") or any(
                sample.get("expected_output") for sample in input_spec.get("samples") or []
            )
            if not references:
                raise ValidationFailure(
                    "exact_match workloads require input_spec.expected_output or sample references",
                    details={"field": "input_spec.expected_output"},
                )

    # -- helpers -----------------------------------------------------------
    def _add_revision(self, workload: Workload) -> None:
        snapshot = build_workload_snapshot(workload)
        repo.add_revision(
            self.session,
            WorkloadRevision(
                id=new_id(),
                workload_id=workload.id,
                revision=workload.version,
                snapshot=snapshot,
                content_hash=snapshot["content_hash"],
            ),
        )

    def to_read(self, workload: Workload) -> WorkloadRead:
        snapshot = build_workload_snapshot(workload)
        return WorkloadRead(
            id=workload.id,
            name=workload.name,
            description=workload.description,
            workload_type=workload.workload_type,
            input_spec=workload.input_spec,
            output_tokens_target=workload.output_tokens_target,
            output_tokens_min=workload.output_tokens_min,
            output_tokens_max=workload.output_tokens_max,
            context_requirement=workload.context_requirement,
            dataset_reference=workload.dataset_reference,
            protocol_reference=workload.protocol_reference,
            quality_evaluator=workload.quality_evaluator,
            version=workload.version,
            metadata_json=workload.metadata_json,
            enabled=workload.enabled,
            deleted_at=workload.deleted_at,
            created_at=workload.created_at,
            updated_at=workload.updated_at,
            snapshot_hash=snapshot["content_hash"],
        )


__all__ = ["WorkloadService"]
