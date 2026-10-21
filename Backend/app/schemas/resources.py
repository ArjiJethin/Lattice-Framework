"""Configuration and workload API schemas."""

from __future__ import annotations

import math
import re
from datetime import datetime
from typing import Any, Literal

from pydantic import Field, field_validator, model_validator

from app.core.validation import (
    validate_generation_parameters,
    validate_metadata,
    validate_runtime_parameters,
)
from app.schemas.common import APIModel, Page

ModelFormat = Literal["gguf", "ggml", "safetensors", "onnx", "unknown"]
_ADAPTER_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,59}$")
_QUANT_RE = re.compile(r"^[a-z0-9_.-]{0,60}$")


class ValidationCheck(APIModel):
    name: str
    status: str
    detail: str | None = None
    method: str | None = None
    value: float | int | str | bool | None = None


class ValidationSummary(APIModel):
    state: str = "unvalidated"
    checked_at: str | None = None
    runtime_adapter: str | None = None
    checks: list[ValidationCheck] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class ConfigurationCreate(APIModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    model_id: str = Field(min_length=1, max_length=200)
    model_version: str | None = Field(default=None, max_length=100)
    model_format: ModelFormat = "gguf"
    quantization: str | None = Field(default=None, max_length=60)
    model_path: str = Field(min_length=1, max_length=1024)
    context_length: int = Field(default=2048, ge=1, le=2_147_483_647)
    runtime_adapter: str = "auto"
    runtime_parameters: dict[str, Any] = Field(default_factory=dict)
    generation_defaults: dict[str, Any] = Field(default_factory=dict)
    thread_count: int | None = Field(default=None, ge=0, le=4096)
    batch_size: int | None = Field(default=None, ge=0, le=2_147_483_647)
    gpu_layers: int | None = Field(default=None, ge=0, le=100000)
    enabled: bool = True
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("runtime_adapter")
    @classmethod
    def _adapter(cls, value: str) -> str:
        if not _ADAPTER_RE.match(value):
            raise ValueError("runtime_adapter must match ^[a-z0-9][a-z0-9_-]{0,59}$")
        return value

    @field_validator("quantization")
    @classmethod
    def _quant(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if not _QUANT_RE.match(normalized):
            raise ValueError("quantization must match ^[a-z0-9_.-]{0,60}$")
        return normalized

    @field_validator("runtime_parameters")
    @classmethod
    def _runtime_params(cls, value: dict[str, Any]) -> dict[str, Any]:
        return validate_runtime_parameters(value)

    @field_validator("generation_defaults")
    @classmethod
    def _generation(cls, value: dict[str, Any]) -> dict[str, Any]:
        return validate_generation_parameters(value, max_output_tokens=2_147_483_647)

    @field_validator("metadata_json")
    @classmethod
    def _metadata(cls, value: dict[str, Any]) -> dict[str, Any]:
        return validate_metadata(value, field="metadata_json")

    @field_validator("name", "model_id")
    @classmethod
    def _strip_control(cls, value: str) -> str:
        if any(ord(char) < 32 for char in value):
            raise ValueError("value must not contain control characters")
        return value


class ConfigurationUpdate(APIModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    model_id: str | None = Field(default=None, min_length=1, max_length=200)
    model_version: str | None = Field(default=None, max_length=100)
    model_format: ModelFormat | None = None
    quantization: str | None = Field(default=None, max_length=60)
    model_path: str | None = Field(default=None, min_length=1, max_length=1024)
    context_length: int | None = Field(default=None, ge=1, le=2_147_483_647)
    runtime_adapter: str | None = None
    runtime_parameters: dict[str, Any] | None = None
    generation_defaults: dict[str, Any] | None = None
    thread_count: int | None = Field(default=None, ge=0, le=4096)
    batch_size: int | None = Field(default=None, ge=0, le=2_147_483_647)
    gpu_layers: int | None = Field(default=None, ge=0, le=100000)
    enabled: bool | None = None
    metadata_json: dict[str, Any] | None = None

    @field_validator("runtime_adapter")
    @classmethod
    def _adapter(cls, value: str | None) -> str | None:
        if value is not None and not _ADAPTER_RE.match(value):
            raise ValueError("runtime_adapter must match ^[a-z0-9][a-z0-9_-]{0,59}$")
        return value

    @field_validator("quantization")
    @classmethod
    def _quant(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if not _QUANT_RE.match(normalized):
            raise ValueError("quantization must match ^[a-z0-9_.-]{0,60}$")
        return normalized

    @field_validator("runtime_parameters")
    @classmethod
    def _runtime_params(cls, value: dict[str, Any] | None) -> dict[str, Any] | None:
        return None if value is None else validate_runtime_parameters(value)

    @field_validator("generation_defaults")
    @classmethod
    def _generation(cls, value: dict[str, Any] | None) -> dict[str, Any] | None:
        if value is None:
            return None
        return validate_generation_parameters(value, max_output_tokens=2_147_483_647)

    @field_validator("metadata_json")
    @classmethod
    def _metadata(cls, value: dict[str, Any] | None) -> dict[str, Any] | None:
        return None if value is None else validate_metadata(value, field="metadata_json")

    @model_validator(mode="after")
    def _not_empty(self) -> ConfigurationUpdate:
        if not self.model_fields_set:
            raise ValueError("at least one field must be provided")
        return self


class ConfigurationRead(APIModel):
    id: str
    name: str
    description: str | None
    model_id: str
    model_version: str | None
    model_format: str
    quantization: str | None
    context_length: int
    runtime_adapter: str
    runtime_parameters: dict[str, Any]
    generation_defaults: dict[str, Any]
    thread_count: int | None
    batch_size: int | None
    gpu_layers: int | None
    enabled: bool
    validation_state: str
    validation_summary: dict[str, Any]
    metadata_json: dict[str, Any]
    revision: int
    model_path_configured: bool = True
    model_file_name: str | None = None
    model_file_present: bool | None = None
    deleted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ConfigurationPage(Page[ConfigurationRead]):
    pass


class ConfigurationValidationResponse(APIModel):
    configuration_id: str
    validation_state: str
    checks: list[ValidationCheck]
    runtime_adapter: str
    runtime_available: bool
    runtime_reason: str | None = None
    preflight: dict[str, Any] | None = None
    warnings: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Workloads
# ---------------------------------------------------------------------------
WorkloadType = Literal["generation", "completion", "exact_match"]


class WorkloadSample(APIModel):
    prompt: str = Field(min_length=1, max_length=64_000)
    expected_output: str | None = Field(default=None, max_length=64_000)
    sample_id: str | None = Field(default=None, max_length=120)


class WorkloadInputSpec(APIModel):
    prompt: str | None = Field(default=None, max_length=64_000)
    system_prompt: str | None = Field(default=None, max_length=16_000)
    expected_output: str | None = Field(default=None, max_length=64_000)
    samples: list[WorkloadSample] = Field(default_factory=list, max_length=100)
    stop: list[str] = Field(default_factory=list, max_length=8)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("samples")
    @classmethod
    def _limit_samples(cls, value: list[WorkloadSample]) -> list[WorkloadSample]:
        if len(value) > 100:
            raise ValueError("at most 100 samples are supported")
        return value

    @field_validator("stop")
    @classmethod
    def _stop(cls, value: list[str]) -> list[str]:
        for item in value:
            if len(item) > 200 or "\x00" in item:
                raise ValueError("stop sequences must be <= 200 chars and contain no NUL")
        return value

    @field_validator("metadata")
    @classmethod
    def _metadata(cls, value: dict[str, Any]) -> dict[str, Any]:
        return validate_metadata(value, field="input_spec.metadata")


class WorkloadCreate(APIModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    workload_type: WorkloadType = "generation"
    input_spec: WorkloadInputSpec = Field(default_factory=WorkloadInputSpec)
    output_tokens_target: int = Field(default=128, ge=1, le=2_147_483_647)
    output_tokens_min: int | None = Field(default=None, ge=0, le=2_147_483_647)
    output_tokens_max: int | None = Field(default=None, ge=1, le=2_147_483_647)
    context_requirement: int = Field(default=1024, ge=1, le=2_147_483_647)
    dataset_reference: str | None = Field(default=None, max_length=300)
    protocol_reference: str | None = Field(default=None, max_length=120)
    quality_evaluator: str | None = Field(default=None, max_length=60)
    version: int = Field(default=1, ge=1)
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True

    @field_validator("metadata_json")
    @classmethod
    def _metadata(cls, value: dict[str, Any]) -> dict[str, Any]:
        return validate_metadata(value, field="metadata_json")

    @model_validator(mode="after")
    def _token_bounds(self) -> WorkloadCreate:
        if (
            self.output_tokens_min is not None
            and self.output_tokens_max is not None
            and self.output_tokens_min > self.output_tokens_max
        ):
            raise ValueError("output_tokens_min must be <= output_tokens_max")
        if self.output_tokens_target < (self.output_tokens_min or 0):
            raise ValueError("output_tokens_target must be >= output_tokens_min")
        if (
            self.output_tokens_max is not None
            and self.output_tokens_target > self.output_tokens_max
        ):
            raise ValueError("output_tokens_target must be <= output_tokens_max")
        return self


class WorkloadUpdate(APIModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    workload_type: WorkloadType | None = None
    input_spec: WorkloadInputSpec | None = None
    output_tokens_target: int | None = Field(default=None, ge=1, le=2_147_483_647)
    output_tokens_min: int | None = Field(default=None, ge=0, le=2_147_483_647)
    output_tokens_max: int | None = Field(default=None, ge=1, le=2_147_483_647)
    context_requirement: int | None = Field(default=None, ge=1, le=2_147_483_647)
    dataset_reference: str | None = Field(default=None, max_length=300)
    protocol_reference: str | None = Field(default=None, max_length=120)
    quality_evaluator: str | None = Field(default=None, max_length=60)
    version: int | None = Field(default=None, ge=1)
    metadata_json: dict[str, Any] | None = None
    enabled: bool | None = None

    @field_validator("metadata_json")
    @classmethod
    def _metadata(cls, value: dict[str, Any] | None) -> dict[str, Any] | None:
        return None if value is None else validate_metadata(value, field="metadata_json")

    @model_validator(mode="after")
    def _not_empty(self) -> WorkloadUpdate:
        if not self.model_fields_set:
            raise ValueError("at least one field must be provided")
        return self


class WorkloadRead(APIModel):
    id: str
    name: str
    description: str | None
    workload_type: str
    input_spec: dict[str, Any]
    output_tokens_target: int
    output_tokens_min: int | None
    output_tokens_max: int | None
    context_requirement: int
    dataset_reference: str | None
    protocol_reference: str | None
    quality_evaluator: str | None
    version: int
    metadata_json: dict[str, Any]
    enabled: bool
    deleted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    snapshot_hash: str | None = None


class WorkloadPage(Page[WorkloadRead]):
    pass


def finite_or_none(value: float | None) -> float | None:
    if value is None:
        return None
    return value if math.isfinite(value) else None
