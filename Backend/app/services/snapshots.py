"""Immutable snapshot builders.

Snapshots are versioned JSON documents.  They never embed absolute model paths
(only the file name and size) so persisted history is safe to expose and still
interpretable after the profile is edited or soft-deleted.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from app.core.time import content_hash, utc_iso
from app.db.models import Configuration, Workload

CONFIGURATION_SNAPSHOT_VERSION = "lattice.configuration-snapshot/1"
WORKLOAD_SNAPSHOT_VERSION = "lattice.workload-snapshot/1"


def _file_facts(model_path: str) -> dict[str, Any]:
    path = Path(model_path)
    facts: dict[str, Any] = {
        "name": path.name,
        "present": False,
        "size_bytes": None,
        "modified_at": None,
    }
    try:
        if path.is_file():
            stat = path.stat()
            facts.update(
                {
                    "present": True,
                    "size_bytes": stat.st_size,
                    "modified_at": utc_iso(datetime.fromtimestamp(stat.st_mtime).astimezone()),
                }
            )
    except OSError:
        pass
    return facts


def build_configuration_snapshot(
    configuration: Configuration, *, model_path: Path | None = None
) -> dict[str, Any]:
    snapshot: dict[str, Any] = {
        "schema_version": CONFIGURATION_SNAPSHOT_VERSION,
        "configuration_id": configuration.id,
        "name": configuration.name,
        "revision": configuration.revision,
        "model_id": configuration.model_id,
        "model_version": configuration.model_version,
        "model_format": configuration.model_format,
        "quantization": configuration.quantization,
        "model_file": _file_facts(str(model_path or configuration.model_path)),
        "context_length": configuration.context_length,
        "runtime_adapter": configuration.runtime_adapter,
        "runtime_parameters": configuration.runtime_parameters,
        "generation_defaults": configuration.generation_defaults,
        "thread_count": configuration.thread_count,
        "batch_size": configuration.batch_size,
        "gpu_layers": configuration.gpu_layers,
        "enabled": configuration.enabled,
        "metadata_json": configuration.metadata_json,
        "control_plane_metadata": {
            "validation_state": configuration.validation_state,
        },
    }
    snapshot["content_hash"] = content_hash(
        {key: value for key, value in snapshot.items() if key != "content_hash"}
    )
    return snapshot


def build_workload_snapshot(workload: Workload) -> dict[str, Any]:
    snapshot: dict[str, Any] = {
        "schema_version": WORKLOAD_SNAPSHOT_VERSION,
        "workload_id": workload.id,
        "name": workload.name,
        "workload_type": workload.workload_type,
        "input_spec": workload.input_spec,
        "output_tokens_target": workload.output_tokens_target,
        "output_tokens_min": workload.output_tokens_min,
        "output_tokens_max": workload.output_tokens_max,
        "context_requirement": workload.context_requirement,
        "dataset_reference": workload.dataset_reference,
        "protocol_reference": workload.protocol_reference,
        "quality_evaluator": workload.quality_evaluator,
        "version": workload.version,
        "metadata_json": workload.metadata_json,
        "enabled": workload.enabled,
    }
    snapshot["content_hash"] = content_hash(
        {key: value for key, value in snapshot.items() if key != "content_hash"}
    )
    return snapshot


def snapshot_content_hash(snapshot: dict[str, Any]) -> str:
    payload = {key: value for key, value in snapshot.items() if key != "content_hash"}
    return content_hash(payload)


__all__ = [
    "CONFIGURATION_SNAPSHOT_VERSION",
    "WORKLOAD_SNAPSHOT_VERSION",
    "build_configuration_snapshot",
    "build_workload_snapshot",
    "snapshot_content_hash",
]
