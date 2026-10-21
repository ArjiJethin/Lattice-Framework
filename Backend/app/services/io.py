"""Configuration import/export.

Imports validate every record first, apply all valid records in a single
transaction, and never overwrite history.  Exports omit absolute model paths by
default because they are machine-specific and may be sensitive.
"""

from __future__ import annotations

from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.benchmarking.protocol import CONFIGURATION_EXPORT_SCHEMA_VERSION
from app.core.errors import ValidationFailure
from app.core.paths import PathPolicy
from app.core.settings import Settings
from app.core.time import new_id, utcnow
from app.db.models import Configuration, ConfigurationRevision
from app.repositories import configurations as repo
from app.schemas.history import (
    ConfigurationExportEnvelope,
    ConfigurationExportRecord,
    ImportIssue,
    ImportRequest,
    ImportResponse,
)
from app.schemas.resources import ConfigurationCreate
from app.services.snapshots import build_configuration_snapshot


class ImportExportService:
    def __init__(self, session: Session, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.path_policy = PathPolicy(settings.model_roots, settings.allow_unrooted_model_paths)

    # ------------------------------------------------------------------
    def export(self, *, include_model_paths: bool = False) -> ConfigurationExportEnvelope:
        items, _total = repo.list_configurations(
            self.session, limit=self.settings.pagination_max_limit, offset=0
        )
        records = []
        for configuration in items:
            records.append(
                ConfigurationExportRecord(
                    name=configuration.name,
                    description=configuration.description,
                    model_id=configuration.model_id,
                    model_version=configuration.model_version,
                    model_format=configuration.model_format,
                    quantization=configuration.quantization,
                    model_path=configuration.model_path if include_model_paths else None,
                    context_length=configuration.context_length,
                    runtime_adapter=configuration.runtime_adapter,
                    runtime_parameters=configuration.runtime_parameters,
                    generation_defaults=configuration.generation_defaults,
                    thread_count=configuration.thread_count,
                    batch_size=configuration.batch_size,
                    gpu_layers=configuration.gpu_layers,
                    enabled=configuration.enabled,
                    metadata_json=configuration.metadata_json,
                )
            )
        return ConfigurationExportEnvelope(
            schema_version=CONFIGURATION_EXPORT_SCHEMA_VERSION,
            exported_at=utcnow(),
            count=len(records),
            includes_model_paths=include_model_paths,
            configurations=records,
        )

    # ------------------------------------------------------------------
    def import_configurations(self, payload: ImportRequest) -> ImportResponse:
        if payload.schema_version != CONFIGURATION_EXPORT_SCHEMA_VERSION:
            raise ValidationFailure(
                f"unsupported import schema_version '{payload.schema_version}'",
                details={"supported": CONFIGURATION_EXPORT_SCHEMA_VERSION},
            )
        if len(payload.configurations) > self.settings.max_import_records:
            raise ValidationFailure(
                f"at most {self.settings.max_import_records} configurations may be imported at once"
            )
        errors: list[ImportIssue] = []
        warnings: list[ImportIssue] = []
        prepared: list[tuple[ConfigurationCreate, str]] = []
        skipped = 0

        for index, raw in enumerate(payload.configurations):
            try:
                record = ConfigurationCreate(**raw)
            except ValidationError as exc:
                for detail in exc.errors()[:5]:
                    field = ".".join(str(part) for part in detail.get("loc", ()))
                    errors.append(
                        ImportIssue(
                            index=index,
                            code="invalid_record",
                            message=str(detail.get("msg", "invalid value")),
                            field=field or None,
                        )
                    )
                continue
            try:
                resolved = self.path_policy.resolve_model_path(record.model_path)
                self.path_policy.validate_extension(resolved, record.model_format)
            except ValidationFailure as exc:
                errors.append(
                    ImportIssue(
                        index=index,
                        code=exc.code,
                        message=exc.message,
                        field="model_path",
                    )
                )
                continue
            if record.context_length > self.settings.max_context_length:
                errors.append(
                    ImportIssue(
                        index=index,
                        code="invalid_record",
                        message="context_length exceeds the configured maximum",
                        field="context_length",
                    )
                )
                continue
            existing = repo.get_by_name(self.session, record.name)
            if existing is not None:
                if payload.conflict_policy == "error":
                    errors.append(
                        ImportIssue(
                            index=index,
                            code="duplicate_name",
                            message=f"configuration '{record.name}' already exists",
                            field="name",
                        )
                    )
                    continue
                if payload.conflict_policy == "skip":
                    skipped += 1
                    warnings.append(
                        ImportIssue(
                            index=index,
                            code="skipped_duplicate",
                            message=f"configuration '{record.name}' already exists; skipped",
                            field="name",
                        )
                    )
                    continue
                base = record.name
                suffix = 1
                candidate = f"{base}-imported"
                while repo.get_by_name(self.session, candidate) is not None:
                    suffix += 1
                    candidate = f"{base}-imported-{suffix}"
                record = record.model_copy(update={"name": candidate})
                warnings.append(
                    ImportIssue(
                        index=index,
                        code="renamed_duplicate",
                        message=f"configuration renamed to '{candidate}' to avoid a conflict",
                        field="name",
                    )
                )
            prepared.append((record, str(resolved)))

        if errors:
            # Never partially apply an import that contains malformed records.
            if not payload.dry_run:
                self.session.rollback()
            return ImportResponse(
                dry_run=payload.dry_run,
                total=len(payload.configurations),
                imported=0,
                skipped=skipped,
                failed=len({issue.index for issue in errors if issue.index is not None}),
                errors=errors,
                warnings=warnings,
                records=[record for record, _ in prepared] if payload.dry_run else [],
            )

        if payload.dry_run:
            return ImportResponse(
                dry_run=True,
                total=len(payload.configurations),
                imported=len(prepared),
                skipped=skipped,
                failed=0,
                errors=[],
                warnings=warnings,
                records=[record for record, _ in prepared],
            )

        try:
            for record, resolved in prepared:
                configuration = Configuration(
                    id=new_id(),
                    name=record.name,
                    description=record.description,
                    model_id=record.model_id,
                    model_version=record.model_version,
                    model_format=record.model_format,
                    quantization=record.quantization,
                    model_path=resolved,
                    context_length=record.context_length,
                    runtime_adapter=record.runtime_adapter,
                    runtime_parameters=record.runtime_parameters,
                    generation_defaults=record.generation_defaults,
                    thread_count=record.thread_count,
                    batch_size=record.batch_size,
                    gpu_layers=record.gpu_layers,
                    enabled=record.enabled,
                    validation_state="unvalidated",
                    validation_summary={},
                    metadata_json=record.metadata_json,
                    revision=1,
                )
                repo.create(self.session, configuration)
                snapshot = build_configuration_snapshot(configuration)
                repo.add_revision(
                    self.session,
                    ConfigurationRevision(
                        id=new_id(),
                        configuration_id=configuration.id,
                        revision=1,
                        snapshot=snapshot,
                        content_hash=snapshot["content_hash"],
                    ),
                )
            self.session.commit()
        except IntegrityError:
            self.session.rollback()
            return ImportResponse(
                dry_run=False,
                total=len(payload.configurations),
                imported=0,
                skipped=skipped,
                failed=len(prepared),
                errors=[
                    ImportIssue(
                        index=None,
                        code="transaction_failed",
                        message="import transaction failed and was rolled back; no records written",
                    )
                ],
                warnings=warnings,
                records=[],
            )
        return ImportResponse(
            dry_run=False,
            total=len(payload.configurations),
            imported=len(prepared),
            skipped=skipped,
            failed=0,
            errors=[],
            warnings=warnings,
            records=[],
        )


__all__ = ["ImportExportService"]
