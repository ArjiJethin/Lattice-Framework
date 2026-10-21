"""Typed, environment-backed application settings.

One entry point only: business logic must not call ``os.getenv``.  Environment
variables are read with the ``LATTICE_`` prefix; the legacy un-prefixed
``HOST``/``PORT``/``DEBUG``/``ENVIRONMENT``/``CORS_ORIGINS`` variables from the
original scaffold remain supported for backward compatibility.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPOSITORY_ROOT = BACKEND_DIR.parent
DEFAULT_DB_PATH = BACKEND_DIR / "data" / "lattice.db"
DEFAULT_MODEL_ROOT = REPOSITORY_ROOT / "models"


def _split_list(raw: str | list[str] | tuple[str, ...] | None) -> list[str]:
    """Split comma/path-separator separated env values, tolerating JSON lists."""
    if raw is None:
        return []
    if isinstance(raw, (list, tuple)):
        return [str(item).strip() for item in raw if str(item).strip()]
    text = raw.strip()
    if not text:
        return []
    if text.startswith("[") and text.endswith("]"):
        text = text[1:-1]
    separators = {",", os.pathsep}
    parts: list[str] = []
    token = ""
    for char in text:
        if char in separators:
            parts.append(token)
            token = ""
        else:
            token += char
    parts.append(token)
    cleaned: list[str] = []
    for part in parts:
        item = part.strip().strip("'\"")
        if item:
            cleaned.append(item)
    return cleaned


class Settings(BaseSettings):
    """Single source of truth for runtime configuration."""

    model_config = SettingsConfigDict(
        env_prefix="LATTICE_",
        env_file=(str(BACKEND_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        populate_by_name=True,
    )

    # --- Service identity / transport -------------------------------------
    app_name: str = "Lattice Backend"
    version: str = "0.2.0"
    api_prefix: str = "/api/v1"
    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("LATTICE_ENVIRONMENT", "ENVIRONMENT"),
    )
    debug: bool = Field(
        default=False,
        validation_alias=AliasChoices("LATTICE_DEBUG", "DEBUG"),
    )
    log_level: str = "INFO"
    host: str = Field(
        default="127.0.0.1",
        validation_alias=AliasChoices("LATTICE_HOST", "HOST"),
    )
    port: int = Field(
        default=8000,
        validation_alias=AliasChoices("LATTICE_PORT", "PORT"),
    )
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "tauri://localhost",
            "http://tauri.localhost",
        ],
        validation_alias=AliasChoices("LATTICE_CORS_ORIGINS", "CORS_ORIGINS"),
    )
    cors_allow_credentials: bool = False

    # --- Persistence ------------------------------------------------------
    database_url: str = f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"
    sqlite_busy_timeout_ms: int = 5000
    auto_create_schema: bool = True

    # --- Model path policy ------------------------------------------------
    model_roots: Annotated[list[Path], NoDecode] = Field(
        default_factory=lambda: [DEFAULT_MODEL_ROOT]
    )
    allow_unrooted_model_paths: bool = False

    # --- Runtime ----------------------------------------------------------
    runtime_adapter: str = "auto"
    runtime_allow_fake: bool = False
    runtime_model_cache_size: int = 1
    runtime_default_timeout_seconds: float = 120.0

    # --- Job manager ------------------------------------------------------
    job_max_workers: int = 1
    job_max_pending: int = 16
    job_shutdown_grace_seconds: float = 10.0
    job_recover_interrupted_on_startup: bool = True

    # --- Benchmark bounds -------------------------------------------------
    benchmark_default_repetitions: int = 3
    benchmark_recommended_repetitions: int = 5
    benchmark_max_repetitions: int = 20
    benchmark_default_warmups: int = 1
    benchmark_max_warmups: int = 5
    benchmark_default_timeout_seconds: float = 120.0
    benchmark_max_timeout_seconds: float = 900.0
    benchmark_continue_on_repetition_error: bool = True

    # --- Generation / request bounds -------------------------------------
    max_prompt_chars: int = 16000
    max_output_tokens: int = 2048
    max_context_length: int = 131072
    max_threads: int = 256
    max_batch_size: int = 8192
    max_gpu_layers: int = 999

    # --- Telemetry --------------------------------------------------------
    memory_sampling_interval_ms: int = 50
    gpu_telemetry_enabled: bool = True
    gpu_collector_timeout_seconds: float = 2.0
    memory_safety_margin_ratio: float = 0.15
    preflight_policy: Literal["advisory", "strict"] = "advisory"

    # --- Optimization evidence policy ------------------------------------
    evidence_max_age_hours: float = 168.0
    evidence_min_successful_repetitions: int = 1
    allow_estimated_metrics_in_decisions: bool = False
    # Test-only escape hatch. When false (default) fake-runtime evidence can
    # never influence an optimization decision or research summary.
    allow_test_only_optimization_evidence: bool = False

    # --- Privacy ----------------------------------------------------------
    allow_output_retention: bool = False
    max_retained_output_chars: int = 8000

    # --- History / import-export -----------------------------------------
    pagination_default_limit: int = 50
    pagination_max_limit: int = 200
    max_import_records: int = 500
    history_export_max_runs: int = 1000

    @field_validator("cors_origins", "model_roots", mode="before")
    @classmethod
    def _parse_list(cls, value: object) -> list[str]:
        if isinstance(value, Path):
            return [str(value)]
        return _split_list(value)  # type: ignore[arg-type]

    @field_validator("model_roots", mode="after")
    @classmethod
    def _expand_roots(cls, value: list[Path]) -> list[Path]:
        roots: list[Path] = []
        for root in value:
            try:
                roots.append(Path(root).expanduser().resolve())
            except OSError:  # pragma: no cover - pathological paths only
                continue
        return roots

    @field_validator("log_level")
    @classmethod
    def _normalise_log_level(cls, value: str) -> str:
        level = value.upper()
        if level not in {"CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"}:
            raise ValueError("log_level must be one of CRITICAL/ERROR/WARNING/INFO/DEBUG")
        return level

    @field_validator("database_url")
    @classmethod
    def _validate_database_url(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("database_url must not be empty")
        return value.strip()

    @field_validator(
        "job_max_workers",
        "job_max_pending",
        "benchmark_default_repetitions",
        "benchmark_max_repetitions",
        "benchmark_default_warmups",
        "benchmark_max_warmups",
        "max_output_tokens",
        "max_context_length",
        "memory_sampling_interval_ms",
    )
    @classmethod
    def _positive_int(cls, value: int) -> int:
        if value < 1:
            raise ValueError("must be >= 1")
        return value

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    def ensure_data_dir(self) -> None:
        """Create the parent directory for file-backed SQLite databases."""
        if not self.is_sqlite:
            return
        url = self.database_url
        if ":memory:" in url or "mode=memory" in url:
            return
        raw_path = url.split("sqlite:///", 1)[-1]
        db_path = Path(raw_path)
        if not db_path.is_absolute():
            db_path = (BACKEND_DIR / db_path).resolve()
        db_path.parent.mkdir(parents=True, exist_ok=True)

    def with_overrides(self, **overrides: object) -> Settings:
        """Return a copy with overrides - used by tests and factories."""
        return self.model_copy(update=overrides)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
