"""Model path approval and input safety helpers.

Clients never get to point the backend at an arbitrary file.  Paths are
resolved and must live inside one of the configured model roots unless
``allow_unrooted_model_paths`` is explicitly enabled.
"""

from __future__ import annotations

import os
import re
from collections.abc import Iterable
from pathlib import Path

from app.core.errors import UnsafePathError, ValidationFailure

_ALLOWED_SCHEMES = {"", "file"}
_UNSAFE_CHARS = re.compile(r"[\x00-\x1f]")
_SUPPORTED_FORMATS: dict[str, tuple[str, ...]] = {
    "gguf": (".gguf",),
    "ggml": (".ggml", ".bin"),
    "safetensors": (".safetensors",),
    "onnx": (".onnx",),
}


class PathPolicy:
    """Resolve and validate client-supplied model paths."""

    def __init__(self, roots: Iterable[Path], allow_unrooted: bool = False) -> None:
        self.roots = [Path(root).expanduser().resolve() for root in roots]
        self.allow_unrooted = allow_unrooted

    def resolve_model_path(self, raw_path: str) -> Path:
        if not raw_path or not raw_path.strip():
            raise ValidationFailure("model_path must not be empty")
        if _UNSAFE_CHARS.search(raw_path):
            raise UnsafePathError("model_path contains control characters")
        if "://" in raw_path:
            scheme = raw_path.split("://", 1)[0].lower()
            if scheme not in _ALLOWED_SCHEMES:
                raise UnsafePathError(
                    "model_path must be a local filesystem path; URLs are not accepted"
                )
            raw_path = raw_path.split("://", 1)[1]
        candidate = Path(os.path.expandvars(os.path.expanduser(raw_path)))
        try:
            resolved = candidate.resolve(strict=False)
        except OSError as exc:  # pragma: no cover - platform specific
            raise ValidationFailure("model_path could not be resolved") from exc
        if self.allow_unrooted:
            return resolved
        if not self.roots:
            raise UnsafePathError(
                "No model roots are configured; set LATTICE_MODEL_ROOTS or enable "
                "LATTICE_ALLOW_UNROOTED_MODEL_PATHS explicitly"
            )
        for root in self.roots:
            try:
                resolved.relative_to(root)
                return resolved
            except ValueError:
                continue
        raise UnsafePathError(
            "model_path is outside the approved model roots",
            details={"approved_root_count": len(self.roots)},
        )

    @staticmethod
    def validate_extension(path: Path, model_format: str) -> None:
        suffixes = _SUPPORTED_FORMATS.get(model_format.lower())
        if suffixes is None:
            return
        if path.suffix.lower() not in suffixes:
            raise ValidationFailure(
                f"model_path extension does not match model_format '{model_format}'",
                details={"allowed_suffixes": list(suffixes)},
            )

    @staticmethod
    def safe_name(path: Path) -> str:
        """Only the basename is ever safe to log/return."""
        return path.name
