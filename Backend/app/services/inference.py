"""Inference execution service."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session, sessionmaker

from app.benchmarking.metrics import MeasurementDraft, measure_repetition
from app.core.enums import (
    ConstraintOutcome,
    InferenceValidationStatus,
    JobStatus,
    JobType,
    MetricStatus,
    RunStatus,
)
from app.core.errors import (
    ConflictError,
    NotFoundError,
    ValidationFailure,
)
from app.core.logging import get_logger
from app.core.settings import Settings
from app.core.time import monotonic, new_id, utcnow
from app.core.validation import validate_generation_parameters
from app.db.models import InferenceExecution
from app.db.session import session_scope
from app.jobs.manager import JobManager
from app.repositories import decisions as decision_repo
from app.repositories import inference as repo
from app.runtime.base import GenerationRequest
from app.runtime.locks import RuntimeLockManager
from app.runtime.registry import RuntimeRegistry
from app.schemas.inference import InferenceAccepted, InferenceCreate, InferenceRead
from app.services.configurations import ConfigurationService
from app.services.jobs import create_job, safe_failure, transition
from app.services.snapshots import build_configuration_snapshot

logger = get_logger(__name__)


class InferenceService:
    def __init__(
        self,
        session: Session,
        *,
        settings: Settings,
        runtime_registry: RuntimeRegistry,
        hardware_service: Any,
        job_manager: JobManager,
        runtime_locks: RuntimeLockManager,
        session_factory: sessionmaker[Session],
    ) -> None:
        self.session = session
        self.settings = settings
        self.runtime_registry = runtime_registry
        self.hardware_service = hardware_service
        self.job_manager = job_manager
        self.runtime_locks = runtime_locks
        self.session_factory = session_factory

    # ------------------------------------------------------------------
    def create(
        self,
        payload: InferenceCreate,
        request_id: str | None = None,
        *,
        decision_id: str | None = None,
    ) -> InferenceAccepted:
        configuration_service = ConfigurationService(
            self.session, self.settings, runtime_registry=self.runtime_registry
        )
        configuration = None
        linked_decision_id = decision_id or payload.decision_id
        if payload.configuration_id:
            configuration = configuration_service.get(payload.configuration_id)
        elif linked_decision_id:
            decision = decision_repo.get(self.session, linked_decision_id)
            if decision is None:
                raise NotFoundError(f"optimization decision '{linked_decision_id}' was not found")
            if decision.status != "selected" or not decision.selected_configuration_id:
                raise ConflictError(
                    "optimization decision has no selected feasible configuration",
                    details={"decision_status": decision.status},
                )
            configuration = configuration_service.get(decision.selected_configuration_id)
        if configuration is None:
            raise ValidationFailure("a configuration or decision reference is required")
        if not configuration.enabled:
            raise ValidationFailure("configuration is disabled")
        if len(payload.prompt) > self.settings.max_prompt_chars:
            limit = self.settings.max_prompt_chars
            raise ValidationFailure(
                f"prompt exceeds the configured maximum of {limit} characters",
                details={"field": "prompt"},
            )
        if payload.retain_output and not self.settings.allow_output_retention:
            raise ValidationFailure(
                "output retention is disabled by server policy (LATTICE_ALLOW_OUTPUT_RETENTION)",
                details={"field": "retain_output"},
            )
        merged = {
            **(configuration.generation_defaults or {}),
            **payload.generation_parameters,
        }
        merged.setdefault("max_tokens", min(256, self.settings.max_output_tokens))
        merged = validate_generation_parameters(
            merged, max_output_tokens=self.settings.max_output_tokens
        )
        timeout = payload.timeout_seconds or self.settings.runtime_default_timeout_seconds
        if timeout > self.settings.benchmark_max_timeout_seconds:
            raise ValidationFailure(
                "timeout_seconds exceeds the configured maximum",
                details={"field": "timeout_seconds"},
            )
        _, capabilities = self.runtime_registry.resolve(configuration.runtime_adapter)
        snapshot = build_configuration_snapshot(configuration)

        self.job_manager.reserve()
        try:
            job = create_job(
                self.session,
                job_type=JobType.INFERENCE.value,
                resource_type="inference_execution",
                resource_id="pending",
                request_id=request_id,
            )
            policy = (
                "retained_by_request"
                if payload.retain_output and self.settings.allow_output_retention
                else "none"
            )
            execution = InferenceExecution(
                id=new_id(),
                job_id=job.id,
                configuration_id=configuration.id,
                decision_id=linked_decision_id,
                status=RunStatus.QUEUED.value,
                configuration_snapshot=snapshot,
                generation_parameters={**merged, "timeout_seconds": timeout},
                runtime_metadata={
                    "adapter_id": capabilities.adapter_id,
                    "is_test_runtime": capabilities.is_test_runtime,
                },
                hardware_snapshot={},
                metrics_json={},
                constraint_results=[],
                output_retention_policy=policy,
                prompt_retained=False,
                test_only=capabilities.is_test_runtime,
            )
            repo.create(self.session, execution)
            job.resource_id = execution.id
            self.register_prompt(execution.id, payload.prompt, payload.system_prompt)
            self.session.commit()
        except Exception:
            self.session.rollback()
            self.job_manager.release()
            raise
        try:
            self.job_manager.submit(job.id, JobType.INFERENCE.value, execution.id)
        except Exception as exc:
            self.job_manager.release()
            _PROMPTS.pop(execution.id, None)
            _SYSTEM_PROMPTS.pop(execution.id, None)
            with session_scope(self.session_factory) as cleanup:
                from app.db.models import Job

                db_job = cleanup.get(Job, job.id)
                if db_job is not None and db_job.status == JobStatus.QUEUED.value:
                    transition(
                        cleanup,
                        db_job,
                        JobStatus.FAILED.value,
                        error_code="scheduling_failed",
                        error_message=safe_failure(exc)[1],
                    )
            raise
        return InferenceAccepted(
            execution_id=execution.id,
            job_id=job.id,
            status=execution.status,
            output_retention_policy=policy,
            test_only=capabilities.is_test_runtime,
            message=(
                "Inference queued. Prompts and outputs are not persisted by default."
                + (" TEST-ONLY fake runtime." if capabilities.is_test_runtime else "")
            ),
        )

    # ------------------------------------------------------------------
    def execute(self, execution_id: str) -> None:
        adapter = None
        lock_context = None
        try:
            with session_scope(self.session_factory) as session:
                execution = repo.get(session, execution_id)
                if execution is None:
                    return
                if execution.status in {
                    RunStatus.COMPLETED.value,
                    RunStatus.PARTIAL.value,
                    RunStatus.FAILED.value,
                    RunStatus.CANCELLED.value,
                    RunStatus.INTERRUPTED.value,
                }:
                    return
                from app.db.models import Job

                job = session.get(Job, execution.job_id)
                if job is not None and job.status == JobStatus.CANCELLED.value:
                    return
                adapter, capabilities = self.runtime_registry.resolve(
                    (execution.configuration_snapshot or {}).get("runtime_adapter", "auto")
                )
                if job is not None and job.status == JobStatus.QUEUED.value:
                    transition(session, job, JobStatus.RUNNING.value)
                execution.status = RunStatus.RUNNING.value
                execution.started_at = utcnow()
                hardware = self.hardware_service.snapshot(runtime_metadata=capabilities.to_dict())
                execution.hardware_snapshot = hardware
                execution.configuration_snapshot = {
                    **(execution.configuration_snapshot or {}),
                }
                runtime_metadata = dict(execution.runtime_metadata or {})
                runtime_metadata["capabilities"] = capabilities.to_dict()
                execution.runtime_metadata = runtime_metadata

                # Load from the current configuration row (path is never in the snapshot).
                from app.db.models import Configuration

                configuration = session.get(Configuration, execution.configuration_id)
                if configuration is None:
                    raise ConflictError("configuration for this execution no longer exists")
                runtime_configuration = ConfigurationService(
                    session, self.settings, runtime_registry=self.runtime_registry
                ).runtime_configuration_for(configuration)
                generation = dict(execution.generation_parameters or {})
                timeout = float(
                    generation.pop("timeout_seconds", self.settings.runtime_default_timeout_seconds)
                )
                prompt = None  # prompts are intentionally not persisted
                execution.runtime_metadata = runtime_metadata
                session.flush()

            # The prompt is supplied to the worker through the execution request
            # payload only when created; since it is not persisted, the API worker
            # receives it via job-scoped transient storage.
            prompt = _PROMPTS.pop(execution_id, None)
            if prompt is None:
                raise ValidationFailure(
                    "prompt is no longer available for this execution; prompts are not "
                    "persisted by default, so submissions must be executed in the same process"
                )
            system_prompt = _SYSTEM_PROMPTS.pop(execution_id, None)

            lock_context = self.runtime_locks.acquire(
                f"runtime:{adapter.adapter_id}", timeout_seconds=60
            )
            lock_context.__enter__()
            load_start = monotonic()
            load_result = adapter.load(runtime_configuration)
            load_ms = max(0.001, (monotonic() - load_start) * 1000.0)
            request = GenerationRequest.from_parameters(
                prompt,
                generation,
                system_prompt=system_prompt,
                timeout_seconds=timeout,
                stream=True,
            )
            draft = measure_repetition(
                adapter,
                request,
                sequence=1,
                repetition_index=1,
                kind="measured",
                collect_memory=True,
                sampling_interval_ms=self.settings.memory_sampling_interval_ms,
                gpu_collector=None,
            )
            constraints = self._decision_constraints(execution.decision_id)
            constraint_results, validation_status = self._validate_constraints(constraints, draft)
            with session_scope(self.session_factory) as session:
                execution = repo.get(session, execution_id)
                if execution is None:
                    return
                runtime_metadata = dict(execution.runtime_metadata or {})
                runtime_metadata.update(load_result.runtime_metadata)
                runtime_metadata["model_load_ms"] = round(load_ms, 6)
                runtime_metadata["effective_execution_mode"] = load_result.effective_execution_mode
                execution.runtime_metadata = runtime_metadata
                execution.status = (
                    RunStatus.COMPLETED.value
                    if draft.status == "completed"
                    else RunStatus.FAILED.value
                )
                execution.finished_at = utcnow()
                execution.duration_ms = (
                    max(
                        0.0, (execution.finished_at - execution.started_at).total_seconds() * 1000.0
                    )
                    if execution.started_at
                    else None
                )
                execution.input_tokens = draft.input_tokens
                execution.output_tokens = draft.output_tokens
                execution.token_count_source = draft.token_count_source
                execution.latency_ms = draft.latency_ms
                execution.ttft_ms = draft.ttft_ms
                execution.output_throughput_tps = draft.output_throughput_tps
                execution.peak_process_rss_mb = draft.peak_process_rss_mb
                execution.metrics_json = {
                    **draft.metrics,
                    "model_load_ms": {
                        "name": "model_load_ms",
                        "value": round(load_ms, 6),
                        "unit": "ms",
                        "status": MetricStatus.MEASURED.value,
                        "method": "perf_counter adapter.load()",
                        "reason": None,
                        "sample_count": 1,
                    },
                }
                execution.validation_status = validation_status
                execution.constraint_results = constraint_results
                if draft.status != "completed":
                    execution.error_code = draft.error_code or "inference_failed"
                    execution.error_message = draft.error_message
                if (
                    execution.output_retention_policy == "retained_by_request"
                    and draft.output_text is not None
                ):
                    execution.retained_output = draft.output_text[
                        : self.settings.max_retained_output_chars
                    ]
                from app.db.models import Job

                job = session.get(Job, execution.job_id)
                if job is not None and job.status == JobStatus.RUNNING.value:
                    transition(
                        session,
                        job,
                        (
                            JobStatus.COMPLETED.value
                            if execution.status == RunStatus.COMPLETED.value
                            else JobStatus.FAILED.value
                        ),
                        result_summary={
                            "inference_execution_id": execution.id,
                            "status": execution.status,
                            "test_only": execution.test_only,
                        },
                        error_code=execution.error_code,
                        error_message=execution.error_message,
                    )
        except Exception as exc:
            code, message = safe_failure(exc)
            logger.exception("inference execution %s failed (%s)", execution_id, code)
            self._fail_execution(execution_id, code, message)
        finally:
            _PROMPTS.pop(execution_id, None)
            _SYSTEM_PROMPTS.pop(execution_id, None)
            if lock_context is not None:
                try:
                    lock_context.__exit__(None, None, None)
                except Exception:  # pragma: no cover
                    pass
            if adapter is not None:
                try:
                    adapter.unload()
                except Exception:
                    logger.warning("runtime unload raised for adapter %s", adapter.adapter_id)

    # ------------------------------------------------------------------
    def get(self, execution_id: str) -> InferenceRead:
        execution = repo.get(self.session, execution_id)
        if execution is None:
            raise NotFoundError(f"inference execution '{execution_id}' was not found")
        return InferenceRead.model_validate(execution)

    def list(
        self,
        *,
        limit: int,
        offset: int,
        configuration_id: str | None = None,
        status: str | None = None,
    ) -> tuple[list[InferenceRead], int]:
        items, total = repo.list_executions(
            self.session,
            limit=limit,
            offset=offset,
            configuration_id=configuration_id,
            status=status,
        )
        return [InferenceRead.model_validate(item) for item in items], total

    # ------------------------------------------------------------------
    def register_prompt(self, execution_id: str, prompt: str, system_prompt: str | None) -> None:
        """Keep the prompt in process memory only (never the database)."""
        _PROMPTS[execution_id] = prompt
        if system_prompt:
            _SYSTEM_PROMPTS[execution_id] = system_prompt

    def _decision_constraints(self, decision_id: str | None) -> list[dict[str, Any]]:
        if not decision_id:
            return []
        decision = decision_repo.get(self.session, decision_id)
        if decision is None:
            return []
        return list((decision.constraint_specification or {}).get("constraints", []))

    @staticmethod
    def _validate_constraints(
        constraints: list[dict[str, Any]], draft: MeasurementDraft
    ) -> tuple[list[dict[str, Any]], str]:
        if not constraints:
            return [], InferenceValidationStatus.NOT_EVALUATED.value
        results: list[dict[str, Any]] = []
        any_failed = False
        any_unknown = False
        for constraint in constraints:
            metric_name = constraint.get("metric")
            operator = constraint.get("operator")
            threshold = float(constraint.get("value", 0.0))
            metric = draft.metrics.get(metric_name) if metric_name else None
            actual = metric.get("value") if metric else None
            status = metric.get("status") if metric else None
            outcome = ConstraintOutcome.UNKNOWN.value
            reason = None
            if metric is None:
                reason = f"metric '{metric_name}' is not available for inference"
            elif status not in ("measured", "derived", "estimated") or actual is None:
                reason = metric.get("reason") or "metric is unavailable"
            else:
                value = float(actual)
                if operator == "<=":
                    outcome = (
                        ConstraintOutcome.PASS.value
                        if value <= threshold
                        else ConstraintOutcome.FAIL.value
                    )
                elif operator == ">=":
                    outcome = (
                        ConstraintOutcome.PASS.value
                        if value >= threshold
                        else ConstraintOutcome.FAIL.value
                    )
                elif operator == "==":
                    outcome = (
                        ConstraintOutcome.PASS.value
                        if value == threshold
                        else ConstraintOutcome.FAIL.value
                    )
                else:
                    reason = f"unsupported operator '{operator}'"
            if outcome == ConstraintOutcome.FAIL.value:
                any_failed = True
            elif outcome == ConstraintOutcome.UNKNOWN.value:
                any_unknown = True
            results.append(
                {
                    "metric": metric_name,
                    "operator": operator,
                    "threshold": threshold,
                    "unit": constraint.get("unit"),
                    "actual_value": actual,
                    "actual_unit": metric.get("unit") if metric else None,
                    "metric_status": status,
                    "outcome": outcome,
                    "reason": reason,
                }
            )
        if any_failed:
            status_value = InferenceValidationStatus.FAILED.value
        elif any_unknown:
            status_value = InferenceValidationStatus.NOT_EVALUATED.value
        else:
            status_value = InferenceValidationStatus.PASSED.value
        return results, status_value

    def _fail_execution(self, execution_id: str, code: str, message: str) -> None:
        try:
            with session_scope(self.session_factory) as session:
                execution = repo.get(session, execution_id)
                if execution is None:
                    return
                if execution.status in {"completed", "failed", "cancelled", "interrupted"}:
                    return
                execution.status = RunStatus.FAILED.value
                execution.error_code = code
                execution.error_message = message[:500]
                execution.finished_at = utcnow()
                if execution.started_at is not None:
                    execution.duration_ms = max(
                        0.0, (execution.finished_at - execution.started_at).total_seconds() * 1000.0
                    )
                from app.db.models import Job

                job = session.get(Job, execution.job_id)
                if job is not None and job.status == JobStatus.RUNNING.value:
                    transition(
                        session,
                        job,
                        JobStatus.FAILED.value,
                        error_code=code,
                        error_message=message[:500],
                    )
        except Exception:  # pragma: no cover
            logger.exception("failed to persist failure for inference %s", execution_id)


# Process-local prompt hand-off: prompts are never written to the database but
# the worker thread needs them.  Entries are removed when the job finishes.
_PROMPTS: dict[str, str] = {}
_SYSTEM_PROMPTS: dict[str, str] = {}


__all__ = ["InferenceService"]
