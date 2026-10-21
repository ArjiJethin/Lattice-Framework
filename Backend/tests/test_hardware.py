from __future__ import annotations

from pathlib import Path

import pytest

from app.core.enums import AvailabilityStatus
from app.core.settings import Settings
from app.hardware import collectors
from app.hardware.collectors import GPUCollector
from app.hardware.preflight import run_preflight
from app.hardware.service import HardwareService
from app.hardware.telemetry import ResourceMonitor
from app.hardware.types import available, not_installed, unavailable


@pytest.fixture
def settings(tmp_path: Path, model_root: Path) -> Settings:
    return Settings(
        database_url=f"sqlite:///{(tmp_path / 'hw.db').as_posix()}",
        model_roots=[model_root],
        runtime_allow_fake=False,
        gpu_telemetry_enabled=False,
        log_level="WARNING",
    )


def test_snapshot_works_without_gpu_and_never_fabricates_zero(settings):
    service = HardwareService(settings)
    snapshot = service.snapshot()
    assert snapshot["schema_version"]
    assert snapshot["collected_at"]
    assert snapshot["gpu"]["devices"] == []
    count = snapshot["gpu"]["device_count"]
    assert count["status"] in {"not_applicable", "not_installed", "not_detected"}
    assert count["value"] is None
    assert snapshot["memory"]["process_rss_mb"]["value"] is not None
    assert snapshot["memory"]["process_rss_mb"]["status"] == "available"
    assert snapshot["gpu"]["limitations"]


def test_gpu_collector_reports_permission_denied(settings, monkeypatch):
    monkeypatch.setattr(
        collectors,
        "_gpu_readings_from_nvml",
        lambda: (
            [],
            unavailable(
                AvailabilityStatus.PERMISSION_DENIED, "NVML permission denied", method="pynvml"
            ),
        ),
    )
    monkeypatch.setattr(
        collectors,
        "_gpu_readings_from_smi",
        lambda _timeout: (
            [],
            unavailable(AvailabilityStatus.NOT_DETECTED, "nvidia-smi missing", method="nvidia-smi"),
        ),
    )
    service = HardwareService(settings.with_overrides(gpu_telemetry_enabled=True))
    snapshot = service.snapshot()
    assert snapshot["gpu"]["device_count"]["status"] == "permission_denied"
    assert snapshot["gpu"]["device_count"]["value"] is None


def test_gpu_collector_missing_dependency(monkeypatch, settings):
    collector = GPUCollector(enabled=True)
    monkeypatch.setattr(
        collectors,
        "_gpu_readings_from_nvml",
        lambda: ([], not_installed("pynvml not installed", method="pynvml")),
    )
    monkeypatch.setattr(
        collectors,
        "_gpu_readings_from_smi",
        lambda _timeout: (
            [],
            unavailable(AvailabilityStatus.NOT_DETECTED, "nvidia-smi missing", method="nvidia-smi"),
        ),
    )
    devices, count, _limitations = collector.collect()
    assert devices == []
    assert count.status in {AvailabilityStatus.NOT_INSTALLED, AvailabilityStatus.NOT_DETECTED}
    assert count.value is None


def test_failing_collector_does_not_break_snapshot(settings):
    service = HardwareService(settings)
    service._cpu.collect = lambda: (_ for _ in ()).throw(RuntimeError("boom"))
    snapshot = service.snapshot()
    cpu_report = next(item for item in snapshot["collectors"] if item["name"] == "cpu")
    assert cpu_report["status"] == "collection_error"
    assert "RuntimeError" in cpu_report["reason"]
    # The snapshot is still produced with the remaining data.
    assert snapshot["system"]["os"]["value"]


def test_partial_collector_data_leaves_missing_values_null(settings):
    service = HardwareService(settings)
    service._memory.collect = lambda: {
        "total_mb": available(1024.0, unit="MB", method="test"),
        "available_mb": unavailable(AvailabilityStatus.PERMISSION_DENIED, "denied", method="test"),
    }
    snapshot = service.snapshot()
    assert snapshot["memory"]["total_mb"]["value"] == 1024.0
    assert snapshot["memory"]["available_mb"]["value"] is None
    assert snapshot["memory"]["available_mb"]["status"] == "permission_denied"


def test_preflight_marks_estimate_as_estimated_and_advisory(settings, model_root):
    model = model_root / "tiny.gguf"
    result = run_preflight(
        settings=settings,
        configuration={
            "model_format": "gguf",
            "quantization": "q4_k_m",
            "context_length": 2048,
            "gpu_layers": 0,
        },
        model_path=model,
        runtime_capabilities={
            "adapter_id": "fake",
            "available": True,
            "supported_formats": ["gguf"],
            "supported_quantizations": None,
            "max_context_length": None,
            "supports_gpu_offload": False,
        },
        hardware_snapshot={"memory": {}, "gpu": {"devices": []}},
    )
    assert result["advisory_only"] is True
    assert result["estimate"]["status"] == "estimated"
    assert result["estimate"]["estimated_required_mb"] > 0
    assert result["estimate"]["available_ram_mb"] is None
    assert result["estimate"]["assumptions"]


def test_preflight_rejects_missing_model(settings, tmp_path):
    missing = tmp_path / "missing.gguf"
    result = run_preflight(
        settings=settings,
        configuration={"model_format": "gguf", "context_length": 2048, "gpu_layers": 0},
        model_path=missing,
        runtime_capabilities={"adapter_id": "fake", "available": True},
        hardware_snapshot={},
    )
    assert result["status"] == "infeasible"
    assert any(
        check["name"] == "model_file_exists" and check["status"] == "fail"
        for check in result["checks"]
    )


def test_preflight_warns_when_gpu_requested_but_absent(settings, model_root):
    result = run_preflight(
        settings=settings,
        configuration={"model_format": "gguf", "context_length": 512, "gpu_layers": 20},
        model_path=model_root / "tiny.gguf",
        runtime_capabilities={
            "adapter_id": "fake",
            "available": True,
            "supports_gpu_offload": True,
            "supported_formats": ["gguf"],
        },
        hardware_snapshot={"gpu": {"devices": []}},
    )
    assert any("GPU offload was requested" in warning for warning in result["warnings"])
    assert any(
        check["name"] == "requested_gpu_offload_available" and check["status"] == "warning"
        for check in result["checks"]
    )


def test_resource_monitor_records_peaks_and_statuses():
    monitor = ResourceMonitor(20)
    monitor.start()
    monitor.stop()
    result = monitor.stop()
    assert result.sample_count >= 0
    if result.peaks.get("peak_process_rss_mb") is not None:
        assert result.peaks["peak_process_rss_mb"] > 0
    assert result.statuses.get("peak_gpu_device_memory_used_mb") in {
        "not_applicable",
        "not_detected",
        "not_installed",
        "unavailable",
    }
