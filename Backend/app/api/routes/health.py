"""Health, readiness and capability discovery."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.api.deps import get_container
from app.benchmarking.protocol import METRIC_CATALOGUE, PROTOCOL_VERSION
from app.core.container import Container
from app.core.time import utcnow
from app.db.session import verify_database
from app.hardware.service import HardwareService
from app.schemas.capabilities import CapabilitiesResponse

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Liveness probe")
def health(container: Container = Depends(get_container)) -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "lattice-backend",
        "version": container.settings.version,
        "api_version": "v1",
        "environment": container.settings.environment,
        "uptime_seconds": round((utcnow() - container.started_at).total_seconds(), 3),
        "note": "liveness only; no model files, GPU or runtime are required",
    }


@router.get("/ready", summary="Readiness probe")
def ready(container: Container = Depends(get_container)):
    database_ok, database_reason = verify_database(container.engine)
    runtime_adapters = [
        {
            "adapter_id": capability.adapter_id,
            "available": capability.available,
            "status": capability.status.value,
            "reason": capability.reason,
        }
        for capability in container.runtime_registry.list_capabilities()
    ]
    runtime_available = any(item["available"] for item in runtime_adapters)
    payload = {
        "status": "ready" if database_ok else "not_ready",
        "checks": {
            "database": {
                "status": "ready" if database_ok else "unavailable",
                "reason": database_reason,
            },
            "runtime": {
                "status": "available" if runtime_available else "unavailable",
                "reason": (
                    None
                    if runtime_available
                    else "no inference runtime is installed; non-runtime endpoints remain usable"
                ),
                "adapters": runtime_adapters,
            },
            "job_manager": {
                "status": "ready",
                "outstanding": container.job_manager.outstanding,
                "max_pending": container.job_manager.max_pending,
                "cancellation": "queued jobs only",
            },
            "optimizer": {"status": "ready", "algorithm": container.optimizer.name},
        },
        "optional_subsystems": {
            "runtime": "available" if runtime_available else "unavailable",
            "gpu_telemetry": "best_effort",
        },
    }
    status_code = 200 if database_ok else 503
    return JSONResponse(status_code=status_code, content=payload)


@router.get(
    "/capabilities",
    response_model=CapabilitiesResponse,
    summary="Runtime, hardware and research capability discovery",
)
def capabilities(container: Container = Depends(get_container)) -> CapabilitiesResponse:
    adapters = [
        capability.to_dict() for capability in container.runtime_registry.list_capabilities()
    ]
    default_capability: dict[str, Any] | None = None
    default_reason: str | None = None
    try:
        _, capability = container.runtime_registry.resolve(None)
        default_capability = capability.to_dict()
    except Exception as exc:
        default_reason = getattr(exc, "message", str(exc))
    snapshot = container.hardware_service.snapshot()
    limitations = [
        "Long-running work uses a bounded in-process worker pool; there is no distributed "
        "queue and queued work does not survive a restart.",
        "Benchmark timings on a shared desktop are not laboratory-grade; OS scheduling, "
        "thermal throttling and background load add noise.",
        "GPU memory/utilization telemetry is device-wide when available; per-process VRAM "
        "attribution may be unavailable.",
        "Preflight resource estimates are advisory; only an actual model load is authoritative.",
        "Synchronous native inference cannot be preemptively cancelled; only queued jobs can "
        "be cancelled reliably.",
    ]
    if container.settings.runtime_allow_fake:
        limitations.append(
            "The fake runtime adapter is enabled and is TEST-ONLY; its runs are tagged test_only "
            "and excluded from production/research summaries by default."
        )
    if container.settings.allow_output_retention:
        limitations.append(
            "Output retention is enabled by configuration; retained outputs are stored in the "
            "database only when explicitly requested per request."
        )
    return CapabilitiesResponse(
        api_version="v1",
        environment=container.settings.environment,
        runtime={
            "adapters": adapters,
            "default": default_capability,
            "default_unavailable_reason": default_reason,
            "auto_selection": "first installed, non-test adapter",
        },
        hardware=snapshot,
        telemetry=HardwareService.telemetry_support(snapshot),
        benchmark_metrics=[dict(metric) for metric in METRIC_CATALOGUE],
        quality_evaluators=container.quality_registry.list(),
        protocol_versions=[PROTOCOL_VERSION],
        features={
            "jobs": {
                "max_workers": container.settings.job_max_workers,
                "max_pending": container.settings.job_max_pending,
                "cancellation": "queued_only",
                "restart_recovery": "interrupted",
            },
            "benchmark": {
                "default_repetitions": container.settings.benchmark_default_repetitions,
                "max_repetitions": container.settings.benchmark_max_repetitions,
                "default_warmups": container.settings.benchmark_default_warmups,
                "max_warmups": container.settings.benchmark_max_warmups,
                "max_timeout_seconds": container.settings.benchmark_max_timeout_seconds,
            },
            "output_retention": {
                "available": container.settings.allow_output_retention,
                "default": False,
            },
            "import_export": {"configurations": True, "experiment_jsonl": True},
            "test_runtime_enabled": container.settings.runtime_allow_fake,
            "gpu_telemetry_enabled": container.settings.gpu_telemetry_enabled,
        },
        limitations=limitations,
    )
