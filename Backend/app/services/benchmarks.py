"""Benchmark orchestration service.

The service owns the lifecycle but delegates measurement arithmetic to
``app.benchmarking.metrics``.  Long-running work never holds a database session:
each persistence step opens a short-lived session, commits, and closes.
"""

from __future__ import annotations

import platform
from datetime import datetime
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.benchmarking.metrics import (
    MeasurementDraft,
    aggregate_measurements,
    measure_repetition,
)
from app.benchmarking.protocol import (
    PROTOCOL_VERSION,
    SNAPSHOT_SCHEMA_VERSION,
    BenchmarkProtocol,
)
from app.benchmarking.quality import QualityEvaluationInput, QualityRegistry
from app.benchmarking.statistics import summarize_metric
from app.core.enums import (
    JobStatus,
    JobType,
    MetricStatus,
    RepetitionStatus,
    RunStatus,
)
from app.core.errors import (
    BenchmarkNotExecutableError,
    ConflictError,
    NotFoundError,
    ValidationFailure,
)
from app.core.idempotency import idempotency_lock, is_job_idempotency_conflict
from app.core.logging import get_logger
from app.core.settings import Settings
from app.core.time import content_hash, monotonic, new_id, utcnow
from app.core.validation import validate_generation_parameters
from app.db.models import (
    BenchmarkMeasurement,
    BenchmarkMetricSummary,
    BenchmarkRun,
    Configuration,
)
from app.db.session import session_scope
from app.hardware.service import HardwareService
from app.jobs.manager import JobManager
from app.repositories import benchmarks as repo
from app.repositories import jobs as job_repo
from app.runtime.base import (
    BaseRuntimeAdapter,
    GenerationRequest,
    RuntimeConfiguration,
)
from app.runtime.locks import RuntimeLockManager
from app.runtime.registry import RuntimeRegistry
from app.schemas.benchmark import (
    BenchmarkAccepted,
    BenchmarkCancelResponse,
    BenchmarkCreate,
    BenchmarkDetail,
    BenchmarkRunRead,
    MeasurementPage,
    MeasurementRead,
)
from app.services.configurations import ConfigurationService
from app.services.jobs import create_job, safe_failure, transition
from app.services.snapshots import build_configuration_snapshot, build_workload_snapshot
from app.services.workloads import WorkloadService

logger = get_logger(__name__)


def software_versions() -> dict[str, Any]:
    import importlib.metadata

    versions: dict[str, Any] = {
        "python": platform.python_version(),
        "platform": platform.platform(),
    }
    for package in ("fastapi", "sqlalchemy", "pydantic", "psutil"):
        try:
            versions[package] = importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            versions[package] = None
    return versions


class BenchmarkService:
    def __init__(
        self,
        session: Session,
        *,
        settings: Settings,
        runtime_registry: RuntimeRegistry,
        hardware_service: HardwareService,
        quality_registry: QualityRegistry,
        job_manager: JobManager,
        runtime_locks: RuntimeLockManager,
        session_factory: sessionmaker[Session],
    ) -> None:
        self.session = session
        self.settings = settings
        self.runtime_registry = runtime_registry
        self.hardware_service = hardware_service
        self.quality_registry = quality_registry
        self.job_manager = job_manager
        self.runtime_locks = runtime_locks
        self.session_factory = session_factory

    # ------------------------------------------------------------------
    # Submission
    # ------------------------------------------------------------------
    def submit(self, payload: BenchmarkCreate, request_id: str | None = None) -> BenchmarkAccepted:
        # Replay check and insert must be one critical section, otherwise two
        # concurrent requests with the same key both see "no run yet".
        with idempotency_lock(JobType.BENCHMARK.value, request_id):
            replay = self._replay(request_id, payload)
            if replay is not None:
                return replay
            job_id, run_id, test_only, duplicate = self.provision(
                payload, request_id=request_id, schedule=True
            )
        return BenchmarkAccepted(
            job_id=job_id,
            benchmark_run_id=run_id,
            status=RunStatus.QUEUED.value,
            message=(
                "Benchmark queued. Poll the job or run endpoint for status. "
                + (
                    "TEST-ONLY fake runtime: measurements are not real model performance."
                    if test_only
                    else "Real runtime adapter will execute the benchmark."
                )
            ),
            test_only=test_only,
            duplicate=duplicate,
        )

    def _replay(self, request_id: str | None, payload: BenchmarkCreate) -> BenchmarkAccepted | None:
        """Return an existing accepted submission for a repeated ``X-Request-ID``.

        A repeated key that targets a different configuration/workload is a
        client error, not a replay: silently returning another run's ids would
        make two different experiments look like one.
        """
        if not request_id:
            return None
        job = job_repo.find_by_request(
            self.session, job_type=JobType.BENCHMARK.value, request_id=request_id
        )
        if job is None:
            return None
        run = repo.get_run(self.session, job.resource_id) if job.resource_id else None
        if run is None:
            raise ConflictError(
                "this request id is already recorded for a benchmark job without a run",
                details={"request_id": request_id, "job_id": job.id},
            )
        if (
            run.configuration_id != payload.configuration_id
            or run.workload_id != payload.workload_id
        ):
            raise ConflictError(
                "this request id was already used for a different benchmark submission",
                details={
                    "request_id": request_id,
                    "existing_benchmark_run_id": run.id,
                    "existing_configuration_id": run.configuration_id,
                    "existing_workload_id": run.workload_id,
                },
            )
        return BenchmarkAccepted(
            job_id=job.id,
            benchmark_run_id=run.id,
            status=run.status,
            test_only=run.test_only,
            duplicate=True,
            message=(
                f"Duplicate submission replayed: benchmark run {run.id} already exists for "
                f"this X-Request-ID (status '{run.status}')."
            ),
        )

    def provision(
        self,
        payload: BenchmarkCreate,
        *,
        request_id: str | None = None,
        schedule: bool = True,
    ) -> tuple[str, str, bool, bool]:
        """Validate and persist a job+run.

        ``schedule=False`` is used by the optimization worker, which executes the
        run inline inside its own job to avoid nested job-manager deadlocks.
        """
        configuration_service = ConfigurationService(
            self.session,
            self.settings,
            runtime_registry=self.runtime_registry,
            hardware_service=self.hardware_service,
        )
        workload_service = WorkloadService(self.session, self.settings)
        configuration = configuration_service.get(payload.configuration_id)
        workload = workload_service.get(payload.workload_id)
        if not configuration.enabled:
            raise ValidationFailure(
                "configuration is disabled", details={"field": "configuration_id"}
            )
        if not workload.enabled:
            raise ValidationFailure("workload is disabled", details={"field": "workload_id"})

        adapter, capabilities = self.runtime_registry.resolve(configuration.runtime_adapter)

        protocol = self._build_protocol(payload, configuration, workload)
        config_snapshot = build_configuration_snapshot(configuration)
        workload_snapshot = build_workload_snapshot(workload)
        snapshot_hash = content_hash(
            {
                "configuration": config_snapshot["content_hash"],
                "workload": workload_snapshot["content_hash"],
                "protocol": protocol.to_dict(),
            }
        )
        if schedule:
            self.job_manager.reserve()
        try:
            job = create_job(
                self.session,
                job_type=JobType.BENCHMARK.value,
                resource_type="benchmark_run",
                resource_id="pending",
                request_id=request_id,
            )
            run = BenchmarkRun(
                id=new_id(),
                job_id=job.id,
                configuration_id=configuration.id,
                workload_id=workload.id,
                status=RunStatus.QUEUED.value,
                protocol_version=protocol.protocol_version,
                snapshot_schema_version=SNAPSHOT_SCHEMA_VERSION,
                configuration_snapshot=config_snapshot,
                workload_snapshot=workload_snapshot,
                protocol_snapshot=protocol.to_dict(),
                snapshot_hash=snapshot_hash,
                requested_warmups=protocol.warmups,
                requested_repetitions=protocol.repetitions,
                completed_repetitions=0,
                failed_repetitions=0,
                completed_warmups=0,
                runtime_metadata={"adapter_id": adapter.adapter_id},
                model_identity={},
                hardware_snapshot={},
                software_versions=software_versions(),
                aggregate_summary={},
                test_only=adapter.is_test_runtime,
            )
            repo.create_run(self.session, run)
            job.resource_id = run.id
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            if schedule:
                self.job_manager.release()
            if not request_id or not is_job_idempotency_conflict(exc):
                raise
            replay = self._replay(request_id, payload)
            if replay is None:
                raise
            return replay.job_id, replay.benchmark_run_id, replay.test_only, True
        except Exception:
            self.session.rollback()
            if schedule:
                self.job_manager.release()
            raise
        if not schedule:
            return job.id, run.id, adapter.is_test_runtime, False
        try:
            self.job_manager.submit(job.id, JobType.BENCHMARK.value, run.id)
        except Exception as exc:
            self.job_manager.release()
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
        return job.id, run.id, adapter.is_test_runtime, False

    def _build_protocol(
        self,
        payload: BenchmarkCreate,
        configuration: Any,
        workload: Any,
    ) -> BenchmarkProtocol:
        repetitions = (
            payload.repetitions
            if payload.repetitions is not None
            else self.settings.benchmark_default_repetitions
        )
        if repetitions > self.settings.benchmark_max_repetitions:
            raise ValidationFailure(
                f"repetitions must be <= {self.settings.benchmark_max_repetitions}",
                details={"field": "repetitions"},
            )
        warmups = (
            payload.warmup_iterations
            if payload.warmup_iterations is not None
            else self.settings.benchmark_default_warmups
        )
        if warmups > self.settings.benchmark_max_warmups:
            raise ValidationFailure(
                f"warmup_iterations must be <= {self.settings.benchmark_max_warmups}",
                details={"field": "warmup_iterations"},
            )
        timeout = (
            payload.timeout_seconds
            if payload.timeout_seconds is not None
            else self.settings.benchmark_default_timeout_seconds
        )
        if timeout > self.settings.benchmark_max_timeout_seconds:
            raise ValidationFailure(
                f"timeout_seconds must be <= {self.settings.benchmark_max_timeout_seconds}",
                details={"field": "timeout_seconds"},
            )
        if payload.protocol_version and payload.protocol_version != PROTOCOL_VERSION:
            raise ValidationFailure(
                f"unsupported protocol version '{payload.protocol_version}'",
                details={"field": "protocol_version", "supported": PROTOCOL_VERSION},
            )
        if workload.context_requirement > configuration.context_length:
            raise ValidationFailure(
                "workload context requirement exceeds the configuration context length",
                details={
                    "field": "workload_id",
                    "context_requirement": workload.context_requirement,
                    "context_length": configuration.context_length,
                },
            )
        if workload.output_tokens_target > self.settings.max_output_tokens:
            raise ValidationFailure(
                "workload output token target exceeds the configured generation limit",
                details={"field": "workload_id"},
            )
        merged_generation = {
            **(configuration.generation_defaults or {}),
            **payload.generation_parameters,
        }
        merged_generation.setdefault(
            "max_tokens",
            min(workload.output_tokens_target, self.settings.max_output_tokens),
        )
        merged_generation = validate_generation_parameters(
            merged_generation, max_output_tokens=self.settings.max_output_tokens
        )
        input_spec = workload.input_spec or {}
        if not input_spec.get("prompt") and not input_spec.get("samples"):
            raise ValidationFailure(
                "workload has no prompt or samples", details={"field": "workload_id"}
            )
        evaluator = payload.quality_evaluator or workload.quality_evaluator
        if evaluator is not None and self.quality_registry.get(evaluator) is None:
            raise ValidationFailure(
                f"quality evaluator '{evaluator}' is not registered",
                details={"field": "quality_evaluator"},
            )
        interval = (
            payload.memory_sampling_interval_ms
            if payload.memory_sampling_interval_ms is not None
            else self.settings.memory_sampling_interval_ms
        )
        if not 10 <= interval <= 5000:
            raise ValidationFailure(
                "memory_sampling_interval_ms must be between 10 and 5000",
                details={"field": "memory_sampling_interval_ms"},
            )
        return BenchmarkProtocol(
            repetitions=repetitions,
            warmups=warmups,
            timeout_seconds=timeout,
            generation_parameters=merged_generation,
            collect_memory=payload.collect_memory,
            memory_sampling_interval_ms=interval,
            quality_evaluator=evaluator,
            stream=True,
        )

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------
    def execute(self, run_id: str) -> None:
        """Worker entry point.  Must never leave a run permanently ``running``."""
        adapter: BaseRuntimeAdapter | None = None
        lock_context = None
        try:
            with session_scope(self.session_factory) as session:
                run = repo.get_run(session, run_id)
                if run is None:
                    logger.warning("benchmark run %s disappeared", run_id)
                    return
                job = run.job
                if run.status in {
                    RunStatus.COMPLETED.value,
                    RunStatus.PARTIAL.value,
                    RunStatus.FAILED.value,
                    RunStatus.CANCELLED.value,
                    RunStatus.INTERRUPTED.value,
                }:
                    return
                if job.status == JobStatus.CANCELLED.value:
                    return
                adapter, capabilities = self.runtime_registry.resolve(
                    run.configuration_snapshot.get("runtime_adapter", "auto")
                )
                if adapter.is_test_runtime != run.test_only:
                    run.test_only = adapter.is_test_runtime
                if job.status == JobStatus.QUEUED.value:
                    transition(session, job, JobStatus.RUNNING.value)
                run.status = RunStatus.RUNNING.value
                run.started_at = utcnow()
                hardware_snapshot = self.hardware_service.snapshot(
                    runtime_metadata=capabilities.to_dict()
                )
                run.hardware_snapshot = hardware_snapshot
                run.runtime_metadata = {
                    "adapter_id": adapter.adapter_id,
                    "capabilities": capabilities.to_dict(),
                    "requested_execution_mode": self._requested_mode(run),
                }
                run.model_identity = self._model_identity(run)
                configuration = session.get(Configuration, run.configuration_id)
                if configuration is None:
                    raise BenchmarkNotExecutableError("configuration for this run no longer exists")
                runtime_configuration = ConfigurationService(
                    session, self.settings, runtime_registry=self.runtime_registry
                ).runtime_configuration_for(configuration)
                workload_snapshot = run.workload_snapshot
                protocol = BenchmarkProtocol(
                    repetitions=run.requested_repetitions,
                    warmups=run.requested_warmups,
                    timeout_seconds=float(
                        run.protocol_snapshot.get(
                            "timeout_seconds",
                            self.settings.benchmark_default_timeout_seconds,
                        )
                    ),
                    generation_parameters=dict(
                        run.protocol_snapshot.get("generation_parameters", {})
                    ),
                    collect_memory=bool(run.protocol_snapshot.get("collect_memory", True)),
                    memory_sampling_interval_ms=int(
                        run.protocol_snapshot.get(
                            "memory_sampling_interval_ms",
                            self.settings.memory_sampling_interval_ms,
                        )
                    ),
                    quality_evaluator=run.protocol_snapshot.get("quality_evaluator"),
                    stream=bool(run.protocol_snapshot.get("stream", True)),
                )
                snapshot = hardware_snapshot
                preflight = self._preflight(runtime_configuration, capabilities.to_dict(), snapshot)
                run.feasibility_result = preflight
                session.flush()

            lock_context = self.runtime_locks.acquire(
                f"runtime:{adapter.adapter_id}", timeout_seconds=60
            )
            lock_context.__enter__()
            try:
                self._execute_locked(
                    run_id=run_id,
                    adapter=adapter,
                    capabilities=capabilities.to_dict(),
                    runtime_configuration=runtime_configuration,
                    workload_snapshot=workload_snapshot,
                    protocol=protocol,
                    preflight=preflight,
                )
            finally:
                lock_context.__exit__(None, None, None)
                lock_context = None
        except Exception as exc:
            code, message = safe_failure(exc)
            logger.exception("benchmark run %s failed (%s)", run_id, code)
            self._fail_run(run_id, code, message)
        finally:
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

    def _execute_locked(
        self,
        *,
        run_id: str,
        adapter: BaseRuntimeAdapter,
        capabilities: dict[str, Any],
        runtime_configuration: RuntimeConfiguration,
        workload_snapshot: dict[str, Any],
        protocol: BenchmarkProtocol,
        preflight: dict[str, Any],
    ) -> None:
        from app.hardware.collectors import GPUCollector

        if preflight.get("status") == "infeasible" or (
            preflight.get("status") == "unknown" and self.settings.preflight_policy == "strict"
        ):
            reasons = (
                "; ".join(
                    check["detail"]
                    for check in preflight.get("checks", [])
                    if check.get("status") == "fail"
                )
                or "preflight policy requires a known-feasible configuration"
            )
            self._fail_run(run_id, "preflight_rejected", reasons[:500])
            return

        load_start = monotonic()
        load_result = adapter.load(runtime_configuration)
        load_ms = max(0.001, (monotonic() - load_start) * 1000.0)
        with session_scope(self.session_factory) as session:
            run = repo.get_run(session, run_id)
            if run is None:
                return
            runtime_metadata = dict(run.runtime_metadata)
            runtime_metadata.update(load_result.runtime_metadata)
            runtime_metadata["model_load_ms"] = round(load_ms, 6)
            runtime_metadata["effective_execution_mode"] = load_result.effective_execution_mode
            runtime_metadata["requested_execution_mode"] = self._requested_mode(run)
            if load_result.warnings:
                runtime_metadata["warnings"] = load_result.warnings
            run.runtime_metadata = runtime_metadata
            session.flush()

        gpu_collector = (
            GPUCollector(
                enabled=self.settings.gpu_telemetry_enabled,
                timeout_seconds=self.settings.gpu_collector_timeout_seconds,
            )
            if protocol.collect_memory
            else None
        )
        input_spec = workload_snapshot.get("input_spec") or {}
        prompt = self._select_prompt(input_spec)
        system_prompt = input_spec.get("system_prompt")
        generation_defaults = dict(protocol.generation_parameters)
        sequence = 0
        outputs: list[str | None] = []
        successes = 0
        failures = 0
        completed_warmups = 0
        total_steps = protocol.warmups + protocol.repetitions

        for index in range(protocol.warmups):
            request = GenerationRequest.from_parameters(
                prompt,
                generation_defaults,
                system_prompt=system_prompt,
                timeout_seconds=protocol.timeout_seconds,
                stream=protocol.stream,
            )
            draft = measure_repetition(
                adapter,
                request,
                sequence=sequence,
                repetition_index=index + 1,
                kind="warmup",
                collect_memory=protocol.collect_memory,
                sampling_interval_ms=protocol.memory_sampling_interval_ms,
                gpu_collector=gpu_collector,
            )
            sequence += 1
            self._persist_measurement(run_id, draft)
            completed_warmups += 1
            self._update_progress(run_id, completed_warmups, 0, 0, step=sequence, total=total_steps)

        for index in range(protocol.repetitions):
            request = GenerationRequest.from_parameters(
                prompt,
                generation_defaults,
                system_prompt=system_prompt,
                timeout_seconds=protocol.timeout_seconds,
                stream=protocol.stream,
            )
            draft = measure_repetition(
                adapter,
                request,
                sequence=sequence,
                repetition_index=index + 1,
                kind="measured",
                collect_memory=protocol.collect_memory,
                sampling_interval_ms=protocol.memory_sampling_interval_ms,
                gpu_collector=gpu_collector,
            )
            sequence += 1
            if draft.status == RepetitionStatus.COMPLETED.value:
                successes += 1
                outputs.append(draft.output_text)
            else:
                failures += 1
                outputs.append(None)
            self._persist_measurement(run_id, draft)
            self._update_progress(
                run_id,
                completed_warmups,
                successes,
                failures,
                step=sequence,
                total=total_steps,
            )
            if failures and not self.settings.benchmark_continue_on_repetition_error:
                break

        self._finalize_run(
            run_id=run_id,
            protocol=protocol,
            workload_snapshot=workload_snapshot,
            outputs=outputs,
            successes=successes,
            failures=failures,
            completed_warmups=completed_warmups,
            load_ms=load_ms,
        )

    def _finalize_run(
        self,
        *,
        run_id: str,
        protocol: BenchmarkProtocol,
        workload_snapshot: dict[str, Any],
        outputs: list[str | None],
        successes: int,
        failures: int,
        completed_warmups: int,
        load_ms: float,
    ) -> None:
        with session_scope(self.session_factory) as session:
            run = repo.get_run(session, run_id)
            if run is None:
                return
            measurements = repo.all_measurements(session, run_id)
            summaries = aggregate_measurements(measurements, failed_count=failures)
            summaries.append(
                summarize_metric(
                    "model_load_ms",
                    [load_ms],
                    unit="ms",
                    status=MetricStatus.MEASURED,
                    method="perf_counter adapter.load() cold load (excluded from latency)",
                )
            )
            quality = self.quality_registry.evaluate(
                protocol.quality_evaluator,
                QualityEvaluationInput(
                    outputs=outputs,
                    workload_snapshot=workload_snapshot,
                ),
            )
            quality_dict = quality.to_dict()
            quality_metric_name = quality.metric_name or "quality_score"
            summaries.append(
                summarize_metric(
                    quality_metric_name,
                    [quality.score] if quality.score is not None else [],
                    unit="ratio" if quality.score is not None else None,
                    status=(
                        MetricStatus.MEASURED
                        if quality.score is not None
                        else MetricStatus.UNAVAILABLE
                    ),
                    method=(
                        f"evaluator:{quality.evaluator}@{quality.evaluator_version} "
                        f"scale:{quality.scale}"
                    ),
                    reason=quality.reason,
                    failed_count=quality.failed_count,
                )
            )

            if successes == 0:
                status = RunStatus.FAILED.value
                error_code = "all_repetitions_failed" if failures else "no_repetitions_executed"
                error_message = (
                    "no measured repetition completed successfully"
                    if failures
                    else "no measured repetitions were executed"
                )
            elif failures:
                status = RunStatus.PARTIAL.value
                error_code = "partial_repetitions_failed"
                error_message = f"{failures} measured repetition(s) failed"
            else:
                status = RunStatus.COMPLETED.value
                error_code = None
                error_message = None

            run.status = status
            run.completed_repetitions = successes
            run.failed_repetitions = failures
            run.completed_warmups = completed_warmups
            run.finished_at = utcnow()
            if run.started_at is not None:
                run.duration_ms = max(
                    0.0, (run.finished_at - run.started_at).total_seconds() * 1000.0
                )
            run.error_code = error_code
            run.error_message = error_message
            run.quality_result = quality_dict
            run.aggregate_summary = {
                "protocol_version": protocol.protocol_version,
                "counts": {
                    "requested_repetitions": protocol.repetitions,
                    "successful_repetitions": successes,
                    "failed_repetitions": failures,
                    "warmups_completed": completed_warmups,
                    "raw_measurement_rows": len(measurements),
                },
                "metrics": {summary["metric_name"]: summary for summary in summaries},
                "quality": quality_dict,
                "test_only": run.test_only,
                "warmups_excluded_from_aggregates": True,
            }
            repo.replace_metric_summaries(
                session,
                run_id,
                [
                    BenchmarkMetricSummary(id=new_id(), **{**summary, "run_id": run_id})
                    for summary in summaries
                ],
            )
            try:
                post_snapshot = self.hardware_service.snapshot()
                hardware = dict(run.hardware_snapshot or {})
                hardware["post_run"] = post_snapshot
                run.hardware_snapshot = hardware
            except Exception:  # pragma: no cover - telemetry is optional
                logger.warning("post-run hardware snapshot failed")
            job = run.job
            if job.status == JobStatus.RUNNING.value:
                transition(
                    session,
                    job,
                    (
                        JobStatus.COMPLETED.value
                        if status in (RunStatus.COMPLETED.value, RunStatus.PARTIAL.value)
                        else JobStatus.FAILED.value
                    ),
                    result_summary={
                        "benchmark_run_id": run_id,
                        "status": status,
                        "successful_repetitions": successes,
                        "failed_repetitions": failures,
                        "test_only": run.test_only,
                    },
                    error_code=error_code if status == RunStatus.FAILED.value else None,
                    error_message=error_message if status == RunStatus.FAILED.value else None,
                )
            session.flush()

    # ------------------------------------------------------------------
    # Persistence helpers (short sessions only)
    # ------------------------------------------------------------------
    def _persist_measurement(self, run_id: str, draft: MeasurementDraft) -> None:
        with session_scope(self.session_factory) as session:
            session.add(
                BenchmarkMeasurement(
                    id=new_id(),
                    run_id=run_id,
                    sequence=draft.sequence,
                    repetition_index=draft.repetition_index,
                    kind=draft.kind,
                    status=draft.status,
                    started_at=draft.started_at,
                    finished_at=draft.finished_at,
                    input_tokens=draft.input_tokens,
                    output_tokens=draft.output_tokens,
                    token_count_source=draft.token_count_source,
                    ttft_ms=draft.ttft_ms,
                    latency_ms=draft.latency_ms,
                    generation_duration_ms=draft.generation_duration_ms,
                    time_per_output_token_ms=draft.time_per_output_token_ms,
                    output_throughput_tps=draft.output_throughput_tps,
                    peak_process_rss_mb=draft.peak_process_rss_mb,
                    system_ram_used_mb=draft.system_ram_used_mb,
                    gpu_device_memory_used_mb=draft.gpu_device_memory_used_mb,
                    gpu_utilization_pct=draft.gpu_utilization_pct,
                    metrics_json=draft.metrics,
                    error_code=draft.error_code,
                    error_message=draft.error_message,
                    runtime_metadata=draft.runtime_metadata,
                )
            )

    def _update_progress(
        self,
        run_id: str,
        warmups: int,
        successes: int,
        failures: int,
        *,
        step: int,
        total: int,
    ) -> None:
        with session_scope(self.session_factory) as session:
            run = repo.get_run(session, run_id)
            if run is None:
                return
            run.completed_warmups = warmups
            run.completed_repetitions = successes
            run.failed_repetitions = failures
            job = run.job
            if job.status == JobStatus.RUNNING.value and total > 0:
                job.progress = max(0.0, min(1.0, step / total))

    def _fail_run(self, run_id: str, code: str, message: str) -> None:
        try:
            with session_scope(self.session_factory) as session:
                run = repo.get_run(session, run_id)
                if run is None:
                    return
                if run.status in {
                    RunStatus.COMPLETED.value,
                    RunStatus.PARTIAL.value,
                    RunStatus.FAILED.value,
                    RunStatus.CANCELLED.value,
                    RunStatus.INTERRUPTED.value,
                }:
                    return
                run.status = RunStatus.FAILED.value
                run.error_code = code
                run.error_message = message[:500]
                run.finished_at = utcnow()
                if run.started_at is not None:
                    run.duration_ms = max(
                        0.0, (run.finished_at - run.started_at).total_seconds() * 1000.0
                    )
                job = run.job
                if job.status == JobStatus.RUNNING.value:
                    transition(
                        session,
                        job,
                        JobStatus.FAILED.value,
                        error_code=code,
                        error_message=message[:500],
                    )
        except Exception:  # pragma: no cover - last resort
            logger.exception("failed to persist failure for benchmark run %s", run_id)

    # ------------------------------------------------------------------
    # Validation helpers
    # ------------------------------------------------------------------
    def _preflight(
        self,
        runtime_configuration: RuntimeConfiguration,
        capabilities: dict[str, Any],
        hardware_snapshot: dict[str, Any],
    ) -> dict[str, Any]:
        from app.hardware.preflight import run_preflight

        return run_preflight(
            settings=self.settings,
            configuration={
                "model_format": runtime_configuration.model_format,
                "quantization": runtime_configuration.quantization,
                "context_length": runtime_configuration.context_length,
                "gpu_layers": runtime_configuration.gpu_layers,
            },
            model_path=runtime_configuration.model_path,
            runtime_capabilities=capabilities,
            hardware_snapshot=hardware_snapshot,
        )

    @staticmethod
    def _select_prompt(input_spec: dict[str, Any]) -> str:
        if input_spec.get("prompt"):
            return str(input_spec["prompt"])
        samples = input_spec.get("samples") or []
        if samples:
            return str(samples[0].get("prompt", ""))
        return ""

    @staticmethod
    def _requested_mode(run: BenchmarkRun) -> str:
        gpu_layers = run.configuration_snapshot.get("gpu_layers")
        if gpu_layers is None:
            return "unknown"
        return "gpu_or_hybrid" if gpu_layers > 0 else "cpu"

    @staticmethod
    def _model_identity(run: BenchmarkRun) -> dict[str, Any]:
        snapshot = run.configuration_snapshot
        return {
            "model_id": snapshot.get("model_id"),
            "model_version": snapshot.get("model_version"),
            "model_format": snapshot.get("model_format"),
            "quantization": snapshot.get("quantization"),
            "model_file_name": (snapshot.get("model_file") or {}).get("name"),
            "model_file_size_bytes": (snapshot.get("model_file") or {}).get("size_bytes"),
            "configuration_revision": snapshot.get("revision"),
            "configuration_content_hash": snapshot.get("content_hash"),
        }

    # ------------------------------------------------------------------
    # Read APIs
    # ------------------------------------------------------------------
    def get_run(self, run_id: str) -> BenchmarkRun:
        run = repo.get_run(self.session, run_id, with_children=True)
        if run is None:
            raise NotFoundError(f"benchmark run '{run_id}' was not found")
        return run

    def run_read(self, run: BenchmarkRun) -> BenchmarkRunRead:
        return BenchmarkRunRead.model_validate(run)

    def detail(self, run_id: str) -> BenchmarkDetail:
        run = self.get_run(run_id)
        measurements = run.measurements or []
        base = BenchmarkRunRead.model_validate(run)
        return BenchmarkDetail(
            **base.model_dump(),
            measurements_count=len(measurements),
            warmup_count=sum(1 for item in measurements if item.kind == "warmup"),
            measured_count=sum(1 for item in measurements if item.kind == "measured"),
        )

    def list_runs(
        self,
        *,
        limit: int,
        offset: int,
        configuration_id: str | None = None,
        workload_id: str | None = None,
        status: str | None = None,
        created_after: datetime | None = None,
        created_before: datetime | None = None,
        include_test_only: bool = False,
    ) -> tuple[list[BenchmarkRunRead], int]:
        items, total = repo.list_runs(
            self.session,
            limit=limit,
            offset=offset,
            configuration_id=configuration_id,
            workload_id=workload_id,
            status=status,
            created_after=created_after,
            created_before=created_before,
            # Fake-runtime runs are excluded unless the caller opts in.
            test_only=True if include_test_only else False,
        )
        return [BenchmarkRunRead.model_validate(item) for item in items], total

    def measurements(
        self,
        run_id: str,
        *,
        limit: int,
        offset: int,
        kind: str | None = None,
    ) -> MeasurementPage:
        run = repo.get_run(self.session, run_id)
        if run is None:
            raise NotFoundError(f"benchmark run '{run_id}' was not found")
        items, total = repo.list_measurements(
            self.session, run_id, limit=limit, offset=offset, kind=kind
        )
        return MeasurementPage(
            items=[MeasurementRead.model_validate(item) for item in items],
            limit=limit,
            offset=offset,
            total=total,
        )

    def cancel(self, run_id: str) -> BenchmarkCancelResponse:
        run = repo.get_run(self.session, run_id)
        if run is None:
            raise NotFoundError(f"benchmark run '{run_id}' was not found")
        if run.status in {
            RunStatus.COMPLETED.value,
            RunStatus.PARTIAL.value,
            RunStatus.FAILED.value,
            RunStatus.CANCELLED.value,
            RunStatus.INTERRUPTED.value,
        }:
            raise ConflictError("benchmark run is already terminal", details={"status": run.status})
        if not self.job_manager.cancel(run.job_id):
            raise ConflictError(
                "cancellation is only supported for queued benchmark jobs; running native "
                "inference cannot be stopped reliably",
                details={"status": run.job.status},
            )
        run.status = RunStatus.CANCELLED.value
        run.finished_at = utcnow()
        run.error_code = "cancelled_before_start"
        run.error_message = "Benchmark cancelled before execution started"
        self.session.commit()
        return BenchmarkCancelResponse(
            benchmark_run_id=run_id,
            job_id=run.job_id,
            status=run.status,
            message="Benchmark cancelled before execution started",
        )


__all__ = ["BenchmarkService", "software_versions"]
