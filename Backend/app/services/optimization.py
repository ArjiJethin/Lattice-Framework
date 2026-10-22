"""Optimization service: evidence resolution, decision persistence and execution."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.benchmarking.protocol import PROTOCOL_VERSION
from app.core.enums import (
    DecisionStatus,
    InferenceValidationStatus,
    JobStatus,
    JobType,
    MetricStatus,
)
from app.core.errors import (
    ConflictError,
    DecisionNotExecutableError,
    NotFoundError,
    ValidationFailure,
)
from app.core.idempotency import idempotency_lock, is_job_idempotency_conflict
from app.core.logging import get_logger
from app.core.settings import Settings
from app.core.time import new_id
from app.db.models import DecisionCandidate, Job, OptimizationDecision
from app.db.session import session_scope
from app.jobs.manager import JobManager
from app.optimization.baseline import METRIC_DIRECTIONS, BaselineOptimizer
from app.optimization.contracts import (
    CandidateEvidence,
    Constraint,
    EvidencePolicy,
    MetricEvidence,
    OptimizationObjective,
    OptimizationRequest,
    OptimizationResult,
)
from app.repositories import benchmarks as benchmark_repo
from app.repositories import configurations as configuration_repo
from app.repositories import decisions as decision_repo
from app.repositories import inference as inference_repo
from app.repositories import jobs as job_repo
from app.schemas.benchmark import BenchmarkCreate
from app.schemas.inference import InferenceCreate
from app.schemas.optimization import (
    ConstraintResult,
    ConstraintSpec,
    DecisionExecuteResponse,
    DecisionExecutionOutcome,
    DecisionRead,
    OutcomeMetricComparison,
)
from app.services.benchmarks import BenchmarkService
from app.services.configurations import ConfigurationService
from app.services.jobs import create_job, safe_failure, transition
from app.services.snapshots import build_workload_snapshot
from app.services.workloads import WorkloadService

logger = get_logger(__name__)

DEFAULT_BENCHMARK_EVALUATOR_NOTE = (
    "Fresh benchmarking uses the configured default protocol and is not a research-grade "
    "adaptive optimizer step."
)


@dataclass
class DecisionCreation:
    decision: DecisionRead
    http_status: int
    job_id: str | None
    duplicate: bool = False


class OptimizationService:
    def __init__(
        self,
        session: Session,
        *,
        settings: Settings,
        runtime_registry: Any,
        hardware_service: Any,
        quality_registry: Any,
        job_manager: JobManager,
        runtime_locks: Any,
        session_factory: sessionmaker[Session],
        optimizer: BaselineOptimizer | None = None,
    ) -> None:
        self.session = session
        self.settings = settings
        self.runtime_registry = runtime_registry
        self.hardware_service = hardware_service
        self.quality_registry = quality_registry
        self.job_manager = job_manager
        self.runtime_locks = runtime_locks
        self.session_factory = session_factory
        self.optimizer = optimizer or BaselineOptimizer()

    # ------------------------------------------------------------------
    # Decisions
    # ------------------------------------------------------------------
    def create(self, payload: Any, request_id: str | None = None) -> DecisionCreation:
        # Serialise replay-check + persist for this idempotency key only.
        with idempotency_lock(JobType.OPTIMIZATION.value, request_id):
            return self._create_locked(payload, request_id=request_id)

    def _create_locked(self, payload: Any, request_id: str | None = None) -> DecisionCreation:
        replay = self._replay(request_id, payload)
        if replay is not None:
            return replay
        workload = WorkloadService(self.session, self.settings).get(payload.workload_id)
        configuration_service = ConfigurationService(
            self.session, self.settings, runtime_registry=self.runtime_registry
        )
        configurations = []
        for configuration_id in payload.candidate_configuration_ids:
            configuration = configuration_service.get(configuration_id)
            if not configuration.enabled:
                raise ValidationFailure(
                    "candidate configuration is disabled",
                    details={
                        "field": "candidate_configuration_ids",
                        "configuration_id": configuration_id,
                    },
                )
            configurations.append(configuration)
        workload_snapshot = build_workload_snapshot(workload)
        candidates = self._collect_evidence(
            configurations=[item.id for item in configurations],
            workload_snapshot=workload_snapshot,
            policy=payload.evidence_policy,
        )

        if payload.allow_fresh_benchmarking and any(
            candidate.run_id is None for candidate in candidates
        ):
            # Validate the runtime up-front so a hopeless request fails fast.
            for configuration in configurations:
                try:
                    self.runtime_registry.resolve(configuration.runtime_adapter)
                except Exception as exc:
                    raise ValidationFailure(
                        (
                            "fresh benchmarking was requested but no runtime is "
                            "available for a candidate"
                        ),
                        details={
                            "configuration_id": configuration.id,
                            "reason": getattr(exc, "message", str(exc)),
                        },
                    ) from exc
            self.job_manager.reserve()
            try:
                job = create_job(
                    self.session,
                    job_type=JobType.OPTIMIZATION.value,
                    resource_type="optimization_decision",
                    resource_id="pending",
                    request_id=request_id,
                )
                decision = self._new_decision(
                    payload=payload,
                    workload_id=workload.id,
                    workload_snapshot=workload_snapshot,
                    status=DecisionStatus.PENDING_EVIDENCE.value,
                    job_id=job.id,
                )
                decision_repo.create(self.session, decision)
                job.resource_id = decision.id
                self.session.commit()
            except IntegrityError as exc:
                self.session.rollback()
                self.job_manager.release()
                if not request_id or not is_job_idempotency_conflict(exc):
                    raise
                replay = self._replay(request_id, payload)
                if replay is None:
                    raise
                return replay
            except Exception:
                self.session.rollback()
                self.job_manager.release()
                raise
            try:
                self.job_manager.submit(job.id, JobType.OPTIMIZATION.value, decision.id)
            except Exception as exc:
                self.job_manager.release()
                with session_scope(self.session_factory) as cleanup:
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
            return DecisionCreation(
                decision=self.get_decision(decision.id),
                http_status=202,
                job_id=job.id,
            )

        result = self._run_optimizer(
            payload=payload,
            workload_snapshot=workload_snapshot,
            candidates=candidates,
        )
        decision = self._new_decision(
            payload=payload,
            workload_id=workload.id,
            workload_snapshot=workload_snapshot,
            status=result.status,
            job_id=None,
        )
        self._apply_result(decision, result)
        decision_repo.create(self.session, decision)
        self._persist_candidates(self.session, decision, result)
        self.session.commit()
        return DecisionCreation(
            decision=self.get_decision(decision.id), http_status=201, job_id=None
        )

    def _replay(self, request_id: str | None, payload: Any) -> DecisionCreation | None:
        """Return the decision already recorded for a repeated ``X-Request-ID``.

        Only job-backed (``allow_fresh_benchmarking``) decisions can be replayed,
        because only those persist an idempotency key on a job row.  Synchronous
        decisions are pure evaluations of existing evidence and are therefore
        cheap to recompute, but replaying one would silently hide a changed
        payload, so a repeated key that targets a different workload or
        candidate set is rejected.
        """
        if not request_id:
            return None
        job = job_repo.find_by_request(
            self.session, job_type=JobType.OPTIMIZATION.value, request_id=request_id
        )
        if job is None:
            return None
        decision = (
            decision_repo.get(self.session, job.resource_id)
            if job.resource_id and job.resource_id != "pending"
            else None
        )
        if decision is None:
            raise ConflictError(
                "this request id is already recorded for an optimization job without a decision",
                details={"request_id": request_id, "job_id": job.id},
            )
        if decision.workload_id != payload.workload_id or list(
            decision.candidate_configuration_ids
        ) != list(payload.candidate_configuration_ids):
            raise ConflictError(
                "this request id was already used for a different optimization request",
                details={
                    "request_id": request_id,
                    "existing_decision_id": decision.id,
                    "existing_workload_id": decision.workload_id,
                },
            )
        return DecisionCreation(
            decision=self.get_decision(decision.id),
            http_status=200,
            job_id=job.id,
            duplicate=True,
        )

    def get_decision(self, decision_id: str) -> DecisionRead:
        decision = decision_repo.get(self.session, decision_id)
        if decision is None:
            raise NotFoundError(f"optimization decision '{decision_id}' was not found")
        return DecisionRead.model_validate(decision)

    def get_model(self, decision_id: str) -> OptimizationDecision:
        decision = decision_repo.get(self.session, decision_id)
        if decision is None:
            raise NotFoundError(f"optimization decision '{decision_id}' was not found")
        return decision

    def list(
        self, *, limit: int, offset: int, workload_id: str | None, status: str | None
    ) -> tuple[list[DecisionRead], int]:
        items, total = decision_repo.list_decisions(
            self.session,
            limit=limit,
            offset=offset,
            workload_id=workload_id,
            status=status,
        )
        return [DecisionRead.model_validate(item) for item in items], total

    def execute(
        self, decision_id: str, payload: Any, request_id: str | None = None
    ) -> DecisionExecuteResponse:
        # ``request_id`` is forwarded so a retried execution with the same key
        # returns the original inference instead of launching a second one.
        decision = self.get_model(decision_id)
        if (
            decision.status != DecisionStatus.SELECTED.value
            or not decision.selected_configuration_id
        ):
            raise DecisionNotExecutableError(
                "only a decision with a selected feasible configuration can be executed",
                details={
                    "decision_status": decision.status,
                    "selected_configuration_id": decision.selected_configuration_id,
                },
            )
        from app.services.inference import InferenceService

        inference_service = InferenceService(
            self.session,
            settings=self.settings,
            runtime_registry=self.runtime_registry,
            hardware_service=self.hardware_service,
            job_manager=self.job_manager,
            runtime_locks=self.runtime_locks,
            session_factory=self.session_factory,
        )
        accepted = inference_service.create(
            InferenceCreate(
                configuration_id=decision.selected_configuration_id,
                prompt=payload.prompt,
                system_prompt=payload.system_prompt,
                generation_parameters=payload.generation_parameters,
                timeout_seconds=payload.timeout_seconds,
                retain_output=payload.retain_output,
            ),
            request_id=request_id,
            decision_id=decision.id,
        )
        decision.execution_job_id = accepted.job_id
        self.session.commit()
        return DecisionExecuteResponse(
            decision_id=decision.id,
            job_id=accepted.job_id,
            inference_execution_id=accepted.execution_id,
            status=accepted.status,
            configuration_id=decision.selected_configuration_id,
            duplicate=accepted.duplicate,
            message=(
                "Duplicate execution replayed: this X-Request-ID already launched an inference "
                "execution for this decision"
                if accepted.duplicate
                else "Inference execution queued for the selected configuration"
            ),
        )

    # ------------------------------------------------------------------
    # Execution outcome (derived from persisted rows, never from memory)
    # ------------------------------------------------------------------
    def execution_outcome(self, decision_id: str) -> DecisionExecutionOutcome:
        decision = self.get_model(decision_id)
        executions = inference_repo.for_decision(self.session, decision.id)
        execution = executions[0] if executions else None
        job = None
        if decision.execution_job_id:
            job = self.session.get(Job, decision.execution_job_id)
        if job is None and execution is not None:
            job = self.session.get(Job, execution.job_id)

        notes: list[str] = []
        selected = decision.selected_configuration_id
        candidate = next(
            (
                item
                for item in decision.candidates or []
                if selected is not None and item.configuration_id == selected
            ),
            None,
        )
        baseline_run_id = (
            candidate.evidence_run_ids[0]
            if candidate is not None and candidate.evidence_run_ids
            else None
        )
        baseline_summaries = (
            {
                summary.metric_name: summary
                for summary in benchmark_repo.get_metric_summaries(self.session, baseline_run_id)
            }
            if baseline_run_id
            else {}
        )
        actual_metrics: dict[str, Any] = dict(execution.metrics_json or {}) if execution else {}
        metrics = self._compare_metrics(
            baseline_summaries=baseline_summaries,
            actual_metrics=actual_metrics,
            baseline_run_id=baseline_run_id,
        )
        actual_available = any(item.actual_value is not None for item in metrics)
        baseline_available = any(item.baseline_value is not None for item in metrics)

        if execution is None and job is None:
            verdict = "not_executed"
        elif execution is not None and execution.status in {
            JobStatus.QUEUED.value,
            JobStatus.RUNNING.value,
        }:
            verdict = "pending"
        elif (
            execution is None
            and job is not None
            and job.status
            in {
                JobStatus.QUEUED.value,
                JobStatus.RUNNING.value,
            }
        ):
            verdict = "pending"
        else:
            effective_status = execution.status if execution is not None else job.status
            if effective_status in {
                JobStatus.CANCELLED.value,
                JobStatus.INTERRUPTED.value,
            }:
                verdict = effective_status
            elif effective_status == JobStatus.FAILED.value:
                verdict = "failed"
            elif execution is None:
                # The job finished but its execution row is gone (manual database
                # surgery or a restored dump).  Claiming success or failure would
                # both be guesses, so report the gap explicitly.
                verdict = "execution_missing"
            elif execution.validation_status == InferenceValidationStatus.PASSED.value:
                verdict = "constraints_met"
            elif execution.validation_status == InferenceValidationStatus.FAILED.value:
                verdict = "constraints_violated"
            else:
                verdict = "completed_unverified"

        executed = decision.execution_job_id is not None or bool(executions)
        constraints_satisfied: bool | None
        if execution is None or execution.validation_status is None:
            constraints_satisfied = None
        elif execution.validation_status == InferenceValidationStatus.PASSED.value:
            constraints_satisfied = True
        elif execution.validation_status == InferenceValidationStatus.FAILED.value:
            constraints_satisfied = False
        else:
            constraints_satisfied = None

        if execution is not None and execution.test_only:
            notes.append(
                "Execution used the test-only fake runtime; these numbers are not real model "
                "performance."
            )
        if not (decision.constraint_specification or {}).get("constraints"):
            notes.append(
                "The decision declared no hard constraints, so constraint validation is not "
                "applicable to this execution."
            )
        if not baseline_available:
            notes.append(
                "No benchmark evidence run with usable metrics is linked to the selected "
                "candidate, so no baseline comparison is available."
            )
        if execution is not None and not actual_available:
            notes.append("The execution did not record any measured metric for this decision.")
        if job is not None and job.error_code:
            notes.append(f"Job terminated with error code '{job.error_code}'.")
        if execution is not None and execution.error_code:
            notes.append(f"Execution terminated with error code '{execution.error_code}'.")
        if (
            execution is None
            and job is not None
            and job.status
            not in {
                JobStatus.QUEUED.value,
                JobStatus.RUNNING.value,
            }
        ):
            notes.append(
                "The decision references a terminal job whose inference execution row no longer "
                "exists; its result cannot be verified."
            )
        if len(executions) > 1:
            notes.append(
                f"This decision has {len(executions)} inference executions; the outcome view "
                "reports the most recent one."
            )

        return DecisionExecutionOutcome(
            decision_id=decision.id,
            decision_status=decision.status,
            selected_configuration_id=selected,
            verdict=verdict,
            executed=executed,
            execution_count=len(executions),
            execution_job_id=decision.execution_job_id,
            job_status=job.status if job is not None else None,
            job_error_code=job.error_code if job is not None else None,
            job_error_message=job.error_message if job is not None else None,
            inference_execution_id=execution.id if execution is not None else None,
            execution_status=execution.status if execution is not None else None,
            execution_error_code=execution.error_code if execution is not None else None,
            execution_error_message=execution.error_message if execution is not None else None,
            test_only=execution.test_only if execution is not None else None,
            validation_status=execution.validation_status if execution is not None else None,
            constraints_satisfied=constraints_satisfied,
            constraint_results=[
                ConstraintResult(**item) for item in (execution.constraint_results or [])
            ]
            if execution is not None
            else [],
            baseline_run_id=baseline_run_id,
            baseline_available=baseline_available,
            actual_metrics_available=actual_available,
            started_at=execution.started_at if execution is not None else None,
            finished_at=execution.finished_at if execution is not None else None,
            duration_ms=execution.duration_ms if execution is not None else None,
            metrics=metrics,
            notes=notes,
        )

    @staticmethod
    def _compare_metrics(
        *,
        baseline_summaries: dict[str, Any],
        actual_metrics: dict[str, Any],
        baseline_run_id: str | None,
    ) -> list[OutcomeMetricComparison]:
        """Pair post-execution metrics with the benchmark evidence that justified them."""
        numeric = {
            MetricStatus.MEASURED.value,
            MetricStatus.DERIVED.value,
            MetricStatus.ESTIMATED.value,
        }
        comparisons: list[OutcomeMetricComparison] = []
        for name in sorted(set(baseline_summaries) | set(actual_metrics)):
            if name not in METRIC_DIRECTIONS:
                continue
            summary = baseline_summaries.get(name)
            raw = actual_metrics.get(name)
            envelope = raw if isinstance(raw, dict) else None
            baseline_value = (
                float(summary.mean)
                if summary is not None and summary.mean is not None and summary.status in numeric
                else None
            )
            actual_value = (
                float(envelope["value"])
                if envelope is not None
                and envelope.get("value") is not None
                and envelope.get("status") in numeric
                else None
            )
            delta = (
                round(actual_value - baseline_value, 6)
                if actual_value is not None and baseline_value is not None
                else None
            )
            direction = METRIC_DIRECTIONS[name]
            comparisons.append(
                OutcomeMetricComparison(
                    metric=name,
                    unit=(envelope or {}).get("unit") or (summary.unit if summary else None),
                    direction=direction,
                    baseline_value=baseline_value,
                    baseline_status=summary.status if summary is not None else None,
                    baseline_run_id=baseline_run_id,
                    actual_value=actual_value,
                    actual_status=(envelope or {}).get("status"),
                    absolute_delta=delta,
                    relative_delta_pct=(
                        round(delta / baseline_value * 100.0, 4)
                        if delta is not None and baseline_value not in (None, 0)
                        else None
                    ),
                    improved=(
                        None
                        if delta is None
                        else (delta < 0 if direction == "minimize" else delta > 0)
                    ),
                    reason=((envelope or {}).get("reason") if actual_value is None else None)
                    or (summary.reason if baseline_value is None and summary is not None else None),
                )
            )
        return comparisons

    # ------------------------------------------------------------------
    # Fresh-benchmark worker
    # ------------------------------------------------------------------
    def run_decision_job(self, decision_id: str) -> None:
        """Worker entry point.

        A failed optimization job must never leave its decision stranded in
        ``pending_evidence``: the failure is persisted on the decision and then
        re-raised so the job manager records the job as failed too.
        """
        try:
            self._run_decision_job(decision_id)
        except Exception as exc:
            code, message = safe_failure(exc)
            logger.exception("optimization decision %s failed (%s)", decision_id, code)
            self._fail_decision(decision_id, code, message)
            raise

    def _fail_decision(self, decision_id: str, code: str, message: str) -> None:
        try:
            with session_scope(self.session_factory) as session:
                decision = decision_repo.get(session, decision_id)
                if decision is None:
                    return
                if decision.status != DecisionStatus.PENDING_EVIDENCE.value:
                    return
                decision.status = DecisionStatus.FAILED.value
                decision.no_selection_reason = f"optimization job failed ({code}): {message[:400]}"
                decision.explanation = decision.no_selection_reason
        except Exception:  # pragma: no cover - last resort
            logger.exception("failed to persist failure for decision %s", decision_id)

    def _run_decision_job(self, decision_id: str) -> None:
        with session_scope(self.session_factory) as session:
            decision = decision_repo.get(session, decision_id)
            if decision is None:
                return
            if decision.status != DecisionStatus.PENDING_EVIDENCE.value:
                return
            job = session.get(Job, decision.job_id) if decision.job_id else None
            if job is not None and job.status == JobStatus.CANCELLED.value:
                return
            workload = WorkloadService(session, self.settings).get(decision.workload_id)
            workload_snapshot = build_workload_snapshot(workload)
            candidate_ids = list(decision.candidate_configuration_ids)
            configurations = [
                configuration_repo.get(session, candidate_id) for candidate_id in candidate_ids
            ]
            existing = [
                candidate
                for candidate in self._collect_evidence(
                    configurations=candidate_ids,
                    workload_snapshot=workload_snapshot,
                    policy=self._policy_from_decision(decision),
                    session=session,
                )
                if candidate.run_id is not None
            ]
            missing = [
                configuration
                for configuration in configurations
                if configuration is not None
                and configuration.id not in {candidate.configuration_id for candidate in existing}
            ]

        # Benchmarks run inline inside this optimization job to avoid nested
        # job-manager scheduling deadlocks.  Each gets its own persisted job row.
        for configuration in missing:
            try:
                with session_scope(self.session_factory) as session:
                    service = BenchmarkService(
                        session,
                        settings=self.settings,
                        runtime_registry=self.runtime_registry,
                        hardware_service=self.hardware_service,
                        quality_registry=self.quality_registry,
                        job_manager=self.job_manager,
                        runtime_locks=self.runtime_locks,
                        session_factory=self.session_factory,
                    )
                    _job_id, run_id, _test_only, _duplicate = service.provision(
                        BenchmarkCreate(
                            configuration_id=configuration.id,
                            workload_id=decision.workload_id,
                            quality_evaluator=workload.quality_evaluator,
                        ),
                        request_id=None,
                        schedule=False,
                    )
                service.execute(run_id)
            except Exception as exc:
                code, message = safe_failure(exc)
                logger.warning(
                    "fresh benchmark for configuration %s failed: %s (%s)",
                    configuration.id,
                    message,
                    code,
                )

        with session_scope(self.session_factory) as session:
            decision = decision_repo.get(session, decision_id)
            if decision is None:
                return
            if decision.status != DecisionStatus.PENDING_EVIDENCE.value:
                return
            workload = WorkloadService(session, self.settings).get(decision.workload_id)
            workload_snapshot = build_workload_snapshot(workload)
            policy = self._policy_from_decision(decision)
            candidates = self._collect_evidence(
                configurations=list(decision.candidate_configuration_ids),
                workload_snapshot=workload_snapshot,
                policy=policy,
                session=session,
            )
            payload = self._payload_from_decision(decision)
            result = self._run_optimizer(
                payload=payload,
                workload_snapshot=workload_snapshot,
                candidates=candidates,
            )
            decision.status = result.status
            self._apply_result(decision, result)
            self._persist_candidates(session, decision, result)
            session.flush()

    # ------------------------------------------------------------------
    # Evidence
    # ------------------------------------------------------------------
    def _collect_evidence(
        self,
        *,
        configurations: list[str],
        workload_snapshot: dict[str, Any],
        policy: Any,
        session: Session | None = None,
    ) -> list[CandidateEvidence]:
        session = session or self.session
        results: list[CandidateEvidence] = []
        hardware_classes: dict[str, str] = {}
        for configuration_id in configurations:
            configuration = configuration_repo.get(session, configuration_id)
            if configuration is None:
                results.append(
                    CandidateEvidence(
                        configuration_id=configuration_id,
                        incompatible_reason="configuration no longer exists",
                    )
                )
                continue
            runs = benchmark_repo.finished_runs_for_configuration(
                session,
                configuration_id,
                workload_id=workload_snapshot["workload_id"],
                statuses=list(policy.allowed_run_statuses),
                limit=25,
            )
            chosen: CandidateEvidence | None = None
            rejection_reason: str | None = None
            for run in runs:
                if run.test_only and not policy.allow_test_only_evidence:
                    rejection_reason = (
                        "only test-only (fake runtime) evidence exists; it is excluded from "
                        "optimization by the evidence policy"
                    )
                    continue
                if run.protocol_version != PROTOCOL_VERSION:
                    rejection_reason = (
                        f"benchmark protocol '{run.protocol_version}' is incompatible with "
                        f"'{PROTOCOL_VERSION}'"
                    )
                    continue
                if policy.require_current_workload_snapshot:
                    run_hash = (run.workload_snapshot or {}).get("content_hash")
                    if run_hash != workload_snapshot["content_hash"]:
                        rejection_reason = (
                            "benchmark evidence was collected for a different workload snapshot"
                        )
                        continue
                metrics = {
                    summary.metric_name: MetricEvidence(
                        metric_name=summary.metric_name,
                        value=summary.mean,
                        unit=summary.unit,
                        status=summary.status,
                        sample_count=summary.sample_count,
                        method=summary.method,
                        reason=summary.reason,
                    )
                    for summary in benchmark_repo.get_metric_summaries(session, run.id)
                }
                hardware_class = self._hardware_class(run.hardware_snapshot or {})
                hardware_classes.setdefault(configuration_id, hardware_class)
                chosen = CandidateEvidence(
                    configuration_id=configuration_id,
                    run_id=run.id,
                    run_status=run.status,
                    finished_at=run.finished_at or run.created_at,
                    workload_snapshot_hash=(run.workload_snapshot or {}).get("content_hash"),
                    protocol_version=run.protocol_version,
                    model_identity=run.model_identity or {},
                    runtime=run.runtime_metadata or {},
                    hardware_class=hardware_class,
                    successful_repetitions=run.completed_repetitions,
                    metrics=metrics,
                    test_only=run.test_only,
                    warnings=(
                        [
                            {
                                "code": "test_only_evidence",
                                "severity": "warning",
                                "message": (
                                    "evidence comes from the test-only fake runtime and must not "
                                    "be reported as real model performance"
                                ),
                            }
                        ]
                        if run.test_only
                        else []
                    ),
                )
                break
            if chosen is None:
                chosen = CandidateEvidence(
                    configuration_id=configuration_id,
                    incompatible_reason=rejection_reason or "no compatible benchmark evidence",
                )
            results.append(chosen)

        # Evidence collected on a different machine than the one running this
        # decision is still usable, but its absolute numbers are not portable and
        # the caller must be told.  Comparing against the *current* hardware class
        # also covers the case where every candidate was measured elsewhere (which
        # an inter-candidate comparison alone would miss).
        current_class = self._current_hardware_class()
        if current_class:
            for candidate in results:
                collected_class = hardware_classes.get(candidate.configuration_id)
                if collected_class and collected_class != current_class:
                    candidate.warnings.append(
                        {
                            "code": "evidence_hardware_mismatch",
                            "severity": "warning",
                            "message": (
                                "candidate evidence was collected on a different hardware "
                                "class than the machine running this decision; absolute values "
                                "are not portable"
                            ),
                        }
                    )

        # Hardware differences are exposed as warnings, never silently ignored.
        if len(set(hardware_classes.values())) > 1:
            for candidate in results:
                if candidate.configuration_id in hardware_classes:
                    candidate.warnings.append(
                        {
                            "code": "hardware_difference",
                            "severity": "warning",
                            "message": (
                                "candidate evidence was collected on a different hardware class "
                                "than another candidate"
                            ),
                        }
                    )
        return results

    def _run_optimizer(
        self,
        *,
        payload: Any,
        workload_snapshot: dict[str, Any],
        candidates: list[CandidateEvidence],
    ) -> OptimizationResult:
        constraints = [
            Constraint(
                metric=item.metric,
                operator=item.operator.value,
                value=float(item.value),
                unit=item.unit,
            )
            for item in payload.constraints
        ]
        evidence_policy = EvidencePolicy(
            max_age_hours=payload.evidence_policy.max_age_hours,
            min_successful_repetitions=payload.evidence_policy.min_successful_repetitions,
            require_current_workload_snapshot=payload.evidence_policy.require_current_workload_snapshot,
            allow_estimated_metrics=payload.evidence_policy.allow_estimated_metrics,
            allow_test_only_evidence=payload.evidence_policy.allow_test_only_evidence,
            allowed_run_statuses=tuple(payload.evidence_policy.allowed_run_statuses),
        )
        request = OptimizationRequest(
            workload_id=payload.workload_id,
            workload_snapshot_hash=workload_snapshot["content_hash"],
            candidates=candidates,
            constraints=constraints,
            objective=OptimizationObjective(
                name=payload.objective.value, weights=dict(payload.weights)
            ),
            evidence_policy=evidence_policy,
            switching_overhead_ms=payload.switching_overhead_ms,
        )
        return self.optimizer.optimize(request)

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------
    def _new_decision(
        self,
        *,
        payload: Any,
        workload_id: str,
        workload_snapshot: dict[str, Any],
        status: str,
        job_id: str | None,
    ) -> OptimizationDecision:
        return OptimizationDecision(
            id=new_id(),
            job_id=job_id,
            workload_id=workload_id,
            workload_snapshot=workload_snapshot,
            constraint_specification={
                "constraints": [
                    {
                        "metric": item.metric,
                        "operator": item.operator.value,
                        "value": item.value,
                        "unit": item.unit,
                    }
                    for item in payload.constraints
                ]
            },
            objective=payload.objective.value,
            weights=dict(payload.weights),
            evidence_policy=payload.evidence_policy.model_dump(),
            candidate_configuration_ids=list(payload.candidate_configuration_ids),
            feasible_configuration_ids=[],
            evidence_run_ids=[],
            selected_configuration_id=None,
            status=status,
            algorithm=self.optimizer.name,
            algorithm_version=self.optimizer.version,
            switching_overhead_considered=payload.switching_overhead_ms is not None,
        )

    def _apply_result(self, decision: OptimizationDecision, result: OptimizationResult) -> None:
        decision.status = result.status
        decision.feasible_configuration_ids = result.feasible_configuration_ids
        decision.evidence_run_ids = result.evidence_run_ids
        decision.selected_configuration_id = result.selected_configuration_id
        decision.no_selection_reason = result.no_selection_reason
        decision.explanation = result.explanation
        decision.algorithm = result.algorithm
        decision.algorithm_version = result.algorithm_version
        decision.duration_ms = result.duration_ms

    def _persist_candidates(
        self,
        session: Session,
        decision: OptimizationDecision,
        result: OptimizationResult,
    ) -> None:
        candidates = [
            DecisionCandidate(
                id=new_id(),
                decision_id=decision.id,
                configuration_id=item.configuration_id,
                feasibility=item.feasibility,
                rejection_reasons=item.rejection_reasons,
                constraint_results=[entry.to_dict() for entry in item.constraint_results],
                objective_values=item.objective_values,
                score_components=item.score_components,
                score=item.score,
                rank=item.rank,
                evidence_run_ids=item.evidence_run_ids,
                warnings=item.warnings,
            )
            for item in result.candidates
        ]
        decision_repo.replace_candidates(session, decision.id, candidates)

    # ------------------------------------------------------------------
    def _current_hardware_class(self) -> str | None:
        try:
            snapshot = self.hardware_service.snapshot()
        except Exception:  # pragma: no cover - telemetry is optional
            logger.warning("hardware snapshot unavailable for evidence comparison")
            return None
        if not snapshot:
            return None
        return self._hardware_class(snapshot)

    @staticmethod
    def _hardware_class(snapshot: dict[str, Any]) -> str:
        cpu = (snapshot.get("cpu") or {}).get("model") or {}
        gpu_devices = (snapshot.get("gpu") or {}).get("devices") or []
        gpu = gpu_devices[0].get("model", {}).get("value") if gpu_devices else None
        os_name = (snapshot.get("system") or {}).get("os", {}).get("value")
        return f"{os_name}|{cpu.get('value')}|{gpu}".lower()

    def _policy_from_decision(self, decision: OptimizationDecision) -> EvidencePolicy:
        raw = decision.evidence_policy or {}
        return EvidencePolicy(
            max_age_hours=float(raw.get("max_age_hours", self.settings.evidence_max_age_hours)),
            min_successful_repetitions=int(
                raw.get(
                    "min_successful_repetitions", self.settings.evidence_min_successful_repetitions
                )
            ),
            require_current_workload_snapshot=bool(
                raw.get("require_current_workload_snapshot", True)
            ),
            allow_estimated_metrics=bool(
                raw.get(
                    "allow_estimated_metrics", self.settings.allow_estimated_metrics_in_decisions
                )
            ),
            allow_test_only_evidence=bool(
                raw.get(
                    "allow_test_only_evidence",
                    self.settings.allow_test_only_optimization_evidence,
                )
            ),
            allowed_run_statuses=tuple(raw.get("allowed_run_statuses", ["completed", "partial"])),
        )

    def _payload_from_decision(self, decision: OptimizationDecision) -> Any:
        from app.schemas.optimization import EvidencePolicy as SchemaPolicy
        from app.schemas.optimization import OptimizationCreate

        constraints_raw = (decision.constraint_specification or {}).get("constraints", [])
        policy = self._policy_from_decision(decision)
        return OptimizationCreate(
            workload_id=decision.workload_id,
            candidate_configuration_ids=list(decision.candidate_configuration_ids),
            constraints=[ConstraintSpec(**item) for item in constraints_raw],
            objective=decision.objective,  # type: ignore[arg-type]
            weights=dict(decision.weights or {}),
            evidence_policy=SchemaPolicy(
                max_age_hours=policy.max_age_hours,
                min_successful_repetitions=policy.min_successful_repetitions,
                require_current_workload_snapshot=policy.require_current_workload_snapshot,
                allow_estimated_metrics=policy.allow_estimated_metrics,
                allow_test_only_evidence=policy.allow_test_only_evidence,
                allowed_run_statuses=list(policy.allowed_run_statuses),
            ),
            allow_fresh_benchmarking=False,
        )


__all__ = ["DecisionCreation", "OptimizationService"]
