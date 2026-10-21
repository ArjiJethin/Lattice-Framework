"""Capability discovery schemas."""

from __future__ import annotations

from typing import Any

from app.core.enums import AvailabilityStatus
from app.schemas.common import APIModel


class RuntimeCapabilityRead(APIModel):
    adapter_id: str
    status: AvailabilityStatus
    available: bool
    version: str | None = None
    backend: str | None = None
    reason: str | None = None
    supports_streaming: bool = False
    supports_token_counts: bool = False
    supports_cancellation: bool = False
    supports_gpu_offload: bool = False
    supported_formats: list[str] = []
    supported_quantizations: list[str] | None = None
    acceleration: list[str] = []
    is_test_runtime: bool = False
    limitations: list[str] = []


class CapabilityItem(APIModel):
    name: str
    status: str
    reason: str | None = None


class CapabilitiesResponse(APIModel):
    api_version: str
    environment: str
    runtime: dict[str, Any]
    hardware: dict[str, Any]
    telemetry: dict[str, Any]
    benchmark_metrics: list[dict[str, Any]]
    quality_evaluators: list[dict[str, Any]]
    protocol_versions: list[str]
    features: dict[str, Any]
    limitations: list[str]
