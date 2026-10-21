"""Configuration profile service."""

from __future__ import annotations

from pathlib import Path

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.enums import ValidationState
from app.core.errors import ConflictError, NotFoundError, ValidationFailure
from app.core.logging import get_logger
from app.core.paths import PathPolicy
from app.core.settings import Settings
from app.core.time import new_id, utc_iso, utcnow
from app.core.validation import validate_generation_parameters
from app.db.models import Configuration, ConfigurationRevision
from app.hardware.preflight import run_preflight
from app.hardware.service import HardwareService
from app.repositories import configurations as repo
from app.runtime.base import RuntimeConfiguration
from app.runtime.registry import RuntimeRegistry
from app.schemas.common import DeleteResponse
from app.schemas.resources import (
    ConfigurationCreate,
    ConfigurationRead,
    ConfigurationUpdate,
    ConfigurationValidationResponse,
    ValidationCheck,
)
from app.services.snapshots import build_configuration_snapshot

logger = get_logger(__name__)


class ConfigurationService:
    def __init__(
        self,
        session: Session,
        settings: Settings,
        *,
        runtime_registry: RuntimeRegistry | None = None,
        hardware_service: HardwareService | None = None,
    ) -> None:
        self.session = session
        self.settings = settings
        self.runtime_registry = runtime_registry
        self.hardware_service = hardware_service
        self.path_policy = PathPolicy(settings.model_roots, settings.allow_unrooted_model_paths)

    # -- read --------------------------------------------------------------
    def get(self, configuration_id: str, *, include_deleted: bool = False) -> Configuration:
        configuration = repo.get(self.session, configuration_id, include_deleted=include_deleted)
        if configuration is None:
            raise NotFoundError(f"configuration '{configuration_id}' was not found")
        return configuration

    def list(
        self,
        *,
        limit: int,
        offset: int,
        enabled: bool | None = None,
        model_id: str | None = None,
        search: str | None = None,
    ) -> tuple[list[ConfigurationRead], int]:
        items, total = repo.list_configurations(
            self.session,
            limit=limit,
            offset=offset,
            enabled=enabled,
            model_id=model_id,
            search=search,
        )
        return [self.to_read(item) for item in items], total

    # -- write -------------------------------------------------------------
    def create(self, payload: ConfigurationCreate) -> ConfigurationRead:
        if repo.get_by_name(self.session, payload.name) is not None:
            raise ConflictError(
                "a configuration with this name already exists",
                details={"field": "name"},
            )
        self._validate_bounds(
            context_length=payload.context_length,
            thread_count=payload.thread_count,
            batch_size=payload.batch_size,
            gpu_layers=payload.gpu_layers,
        )
        resolved = self._resolve_path(payload.model_path, payload.model_format)
        generation_defaults = validate_generation_parameters(
            payload.generation_defaults, max_output_tokens=self.settings.max_output_tokens
        )
        configuration = Configuration(
            id=new_id(),
            name=payload.name,
            description=payload.description,
            model_id=payload.model_id,
            model_version=payload.model_version,
            model_format=payload.model_format,
            quantization=payload.quantization,
            model_path=str(resolved),
            context_length=payload.context_length,
            runtime_adapter=payload.runtime_adapter,
            runtime_parameters=payload.runtime_parameters,
            generation_defaults=generation_defaults,
            thread_count=payload.thread_count,
            batch_size=payload.batch_size,
            gpu_layers=payload.gpu_layers,
            enabled=payload.enabled,
            validation_state=ValidationState.UNVALIDATED.value,
            validation_summary={},
            metadata_json=payload.metadata_json,
            revision=1,
        )
        try:
            repo.create(self.session, configuration)
            repo.add_revision(
                self.session,
                ConfigurationRevision(
                    id=new_id(),
                    configuration_id=configuration.id,
                    revision=1,
                    snapshot=build_configuration_snapshot(configuration),
                    content_hash=build_configuration_snapshot(configuration)["content_hash"],
                ),
            )
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ConflictError(
                "a configuration with this name already exists",
                details={"field": "name"},
            ) from exc
        return self.to_read(configuration)

    def update(self, configuration_id: str, payload: ConfigurationUpdate) -> ConfigurationRead:
        configuration = self.get(configuration_id)
        fields = payload.model_dump(exclude_unset=True)
        if "name" in fields and fields["name"] != configuration.name:
            existing = repo.get_by_name(self.session, fields["name"])
            if existing is not None and existing.id != configuration.id:
                raise ConflictError("a configuration with this name already exists")
        if "model_path" in fields:
            resolved = self._resolve_path(
                fields["model_path"], fields.get("model_format", configuration.model_format)
            )
            configuration.model_path = str(resolved)
            fields.pop("model_path")
        if "generation_defaults" in fields:
            fields["generation_defaults"] = validate_generation_parameters(
                fields["generation_defaults"], max_output_tokens=self.settings.max_output_tokens
            )
        self._validate_bounds(
            context_length=fields.get("context_length", configuration.context_length),
            thread_count=fields.get("thread_count", configuration.thread_count),
            batch_size=fields.get("batch_size", configuration.batch_size),
            gpu_layers=fields.get("gpu_layers", configuration.gpu_layers),
        )
        for key, value in fields.items():
            setattr(configuration, key, value)
        configuration.revision += 1
        configuration.updated_at = utcnow()
        # Editing a profile invalidates its previous validation summary.
        configuration.validation_state = ValidationState.UNVALIDATED.value
        configuration.validation_summary = {}
        snapshot = build_configuration_snapshot(configuration)
        repo.add_revision(
            self.session,
            ConfigurationRevision(
                id=new_id(),
                configuration_id=configuration.id,
                revision=configuration.revision,
                snapshot=snapshot,
                content_hash=snapshot["content_hash"],
            ),
        )
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ConflictError("a configuration with this name already exists") from exc
        return self.to_read(configuration)

    def delete(self, configuration_id: str) -> DeleteResponse:
        configuration = self.get(configuration_id)
        references = repo.count_history_references(self.session, configuration.id)
        if references or repo.has_running_jobs(self.session, configuration.id):
            configuration.deleted_at = utcnow()
            configuration.enabled = False
            self.session.commit()
            return DeleteResponse(
                id=configuration.id,
                deleted="soft",
                message=(
                    "Configuration is referenced by history or running work, so it was "
                    "disabled and soft-deleted; historical snapshots remain interpretable."
                ),
            )
        repo.delete(self.session, configuration)
        self.session.commit()
        return DeleteResponse(id=configuration_id, deleted="hard", message="Configuration deleted")

    # -- validation --------------------------------------------------------
    def validate(self, configuration_id: str) -> ConfigurationValidationResponse:
        configuration = self.get(configuration_id)
        checks: list[ValidationCheck] = []
        warnings: list[str] = []
        model_path = Path(configuration.model_path)
        checks.append(
            ValidationCheck(
                name="model_path_policy",
                status="pass",
                detail="model path is inside an approved model root",
                method="path_policy",
            )
        )
        try:
            self.path_policy.validate_extension(model_path, configuration.model_format)
            checks.append(
                ValidationCheck(
                    name="model_extension",
                    status="pass",
                    detail=f"extension matches model_format '{configuration.model_format}'",
                    method="path_policy",
                )
            )
        except ValidationFailure as exc:
            checks.append(
                ValidationCheck(
                    name="model_extension", status="fail", detail=exc.message, method="path_policy"
                )
            )
        if model_path.is_file():
            checks.append(
                ValidationCheck(
                    name="model_file",
                    status="pass",
                    detail="model file exists",
                    method="pathlib.stat",
                    value=model_path.stat().st_size,
                )
            )
        else:
            checks.append(
                ValidationCheck(
                    name="model_file",
                    status="fail",
                    detail="model file is not present; benchmarks and inference cannot run",
                    method="pathlib.stat",
                )
            )

        capabilities = None
        adapter = None
        runtime_reason: str | None = None
        adapter_id = configuration.runtime_adapter
        if self.runtime_registry is not None:
            try:
                adapter, capabilities = self.runtime_registry.resolve(adapter_id)
            except Exception as exc:
                runtime_reason = getattr(exc, "message", str(exc))
                capabilities = self.runtime_registry.get_capabilities(adapter_id)
        runtime_available = bool(capabilities and capabilities.available)
        checks.append(
            ValidationCheck(
                name="runtime_available",
                status="pass" if runtime_available else "warning",
                detail=(
                    f"runtime adapter '{capabilities.adapter_id if capabilities else adapter_id}' "
                    "is available"
                    if runtime_available
                    else (runtime_reason or "runtime adapter is not available")
                ),
                method="runtime_capabilities",
            )
        )
        runtime_config = self._runtime_configuration(configuration)
        if adapter is not None:
            runtime_validation = adapter.validate(runtime_config)
            for issue in runtime_validation.issues:
                checks.append(
                    ValidationCheck(
                        name=f"runtime:{issue.code}",
                        status="fail" if issue.severity == "error" else "warning",
                        detail=issue.message,
                        method=f"runtime:{adapter.adapter_id}",
                    )
                )
        preflight_dict: dict | None = None
        if self.hardware_service is not None and capabilities is not None:
            snapshot = self.hardware_service.snapshot(runtime_metadata=capabilities.to_dict())
            preflight = run_preflight(
                settings=self.settings,
                configuration={
                    "model_format": configuration.model_format,
                    "quantization": configuration.quantization,
                    "context_length": configuration.context_length,
                    "gpu_layers": configuration.gpu_layers,
                },
                model_path=model_path,
                runtime_capabilities=capabilities.to_dict(),
                hardware_snapshot=snapshot,
            )
            preflight_dict = preflight
            for check in preflight["checks"]:
                if check["status"] in ("fail", "unknown", "warning"):
                    checks.append(
                        ValidationCheck(
                            name=f"preflight:{check['name']}",
                            status=check["status"],
                            detail=check["detail"],
                            method=check.get("method"),
                        )
                    )
            warnings.extend(preflight.get("warnings", []))

        failed = any(check.status == "fail" for check in checks)
        state = ValidationState.INVALID.value if failed else ValidationState.VALID.value
        summary = {
            "state": state,
            "checked_at": utc_iso(utcnow()),
            "runtime_adapter": adapter_id,
            "runtime_available": runtime_available,
            "checks": [check.model_dump() for check in checks],
            "warnings": warnings,
            "preflight": preflight_dict,
        }
        configuration.validation_state = state
        configuration.validation_summary = summary
        configuration.updated_at = utcnow()
        self.session.commit()
        return ConfigurationValidationResponse(
            configuration_id=configuration.id,
            validation_state=state,
            checks=checks,
            runtime_adapter=adapter_id,
            runtime_available=runtime_available,
            runtime_reason=runtime_reason,
            preflight=preflight_dict,
            warnings=warnings,
        )

    # -- helpers -----------------------------------------------------------
    def to_read(self, configuration: Configuration) -> ConfigurationRead:
        path = Path(configuration.model_path)
        present: bool | None
        try:
            present = path.is_file()
        except OSError:  # pragma: no cover - defensive
            present = None
        return ConfigurationRead(
            id=configuration.id,
            name=configuration.name,
            description=configuration.description,
            model_id=configuration.model_id,
            model_version=configuration.model_version,
            model_format=configuration.model_format,
            quantization=configuration.quantization,
            context_length=configuration.context_length,
            runtime_adapter=configuration.runtime_adapter,
            runtime_parameters=configuration.runtime_parameters,
            generation_defaults=configuration.generation_defaults,
            thread_count=configuration.thread_count,
            batch_size=configuration.batch_size,
            gpu_layers=configuration.gpu_layers,
            enabled=configuration.enabled,
            validation_state=configuration.validation_state,
            validation_summary=configuration.validation_summary,
            metadata_json=configuration.metadata_json,
            revision=configuration.revision,
            model_path_configured=bool(configuration.model_path),
            model_file_name=path.name,
            model_file_present=present,
            deleted_at=configuration.deleted_at,
            created_at=configuration.created_at,
            updated_at=configuration.updated_at,
        )

    def _resolve_path(self, raw_path: str, model_format: str) -> Path:
        resolved = self.path_policy.resolve_model_path(raw_path)
        self.path_policy.validate_extension(resolved, model_format)
        return resolved

    def _validate_bounds(
        self,
        *,
        context_length: int,
        thread_count: int | None,
        batch_size: int | None,
        gpu_layers: int | None,
    ) -> None:
        if context_length > self.settings.max_context_length:
            limit = self.settings.max_context_length
            raise ValidationFailure(
                f"context_length exceeds the configured maximum ({limit})",
                details={"field": "context_length"},
            )
        if thread_count is not None and thread_count > self.settings.max_threads:
            raise ValidationFailure(
                f"thread_count exceeds the configured maximum ({self.settings.max_threads})",
                details={"field": "thread_count"},
            )
        if batch_size is not None and batch_size > self.settings.max_batch_size:
            raise ValidationFailure(
                f"batch_size exceeds the configured maximum ({self.settings.max_batch_size})",
                details={"field": "batch_size"},
            )
        if gpu_layers is not None and gpu_layers > self.settings.max_gpu_layers:
            raise ValidationFailure(
                f"gpu_layers exceeds the configured maximum ({self.settings.max_gpu_layers})",
                details={"field": "gpu_layers"},
            )

    def _runtime_configuration(self, configuration: Configuration) -> RuntimeConfiguration:
        return RuntimeConfiguration(
            configuration_id=configuration.id,
            model_id=configuration.model_id,
            model_path=Path(configuration.model_path),
            model_format=configuration.model_format,
            quantization=configuration.quantization,
            context_length=configuration.context_length,
            runtime_parameters=configuration.runtime_parameters,
            thread_count=configuration.thread_count,
            batch_size=configuration.batch_size,
            gpu_layers=configuration.gpu_layers,
            generation_defaults=configuration.generation_defaults,
            revision=configuration.revision,
        )

    def runtime_configuration_for(self, configuration: Configuration) -> RuntimeConfiguration:
        return self._runtime_configuration(configuration)


__all__ = ["ConfigurationService"]
