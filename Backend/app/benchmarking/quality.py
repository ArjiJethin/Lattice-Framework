"""Quality evaluation interface.

Quality is never invented: without a declared evaluator and compatible
reference data the result is ``unavailable``.  Runs without quality evidence
must not satisfy a quality constraint in the optimizer.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from app.core.enums import QualityStatus
from app.core.time import utcnow


@dataclass
class QualityEvaluationInput:
    outputs: list[str | None]
    workload_snapshot: dict[str, Any]
    prompts: list[str | None] = field(default_factory=list)


@dataclass
class QualityResult:
    evaluator: str | None
    evaluator_version: str | None
    metric_name: str | None
    scale: str | None
    score: float | None
    status: str
    sample_count: int = 0
    failed_count: int = 0
    reason: str | None = None
    details: dict[str, Any] = field(default_factory=dict)
    protocol_version: str = "quality-evaluator/1"

    def to_dict(self) -> dict[str, Any]:
        return {
            "evaluator": self.evaluator,
            "evaluator_version": self.evaluator_version,
            "metric_name": self.metric_name,
            "scale": self.scale,
            "score": self.score,
            "status": self.status,
            "sample_count": self.sample_count,
            "failed_count": self.failed_count,
            "reason": self.reason,
            "details": self.details,
            "protocol_version": self.protocol_version,
            "evaluated_at": utcnow().isoformat(),
        }


class BaseQualityEvaluator(ABC):
    name: str = "base"
    version: str = "1.0.0"
    metric_name: str = "quality_score"
    scale: str = "unspecified"
    requires_references: bool = True

    @abstractmethod
    def evaluate(self, payload: QualityEvaluationInput) -> QualityResult:
        """Evaluate generated outputs.  Must never invent a score."""


class ExactMatchEvaluator(BaseQualityEvaluator):
    """Normalized exact-match accuracy against a workload reference output."""

    name = "exact_match"
    version = "1.0.0"
    metric_name = "exact_match_accuracy"
    scale = "ratio (0.0-1.0)"
    requires_references = True

    @staticmethod
    def _normalise(text: str) -> str:
        return " ".join(text.casefold().split())

    def evaluate(self, payload: QualityEvaluationInput) -> QualityResult:
        input_spec = payload.workload_snapshot.get("input_spec") or {}
        reference = input_spec.get("expected_output")
        if not reference:
            samples = input_spec.get("samples") or []
            if len(samples) == 1 and samples[0].get("expected_output"):
                reference = samples[0]["expected_output"]
        if not reference:
            return QualityResult(
                evaluator=self.name,
                evaluator_version=self.version,
                metric_name=self.metric_name,
                scale=self.scale,
                score=None,
                status=QualityStatus.UNAVAILABLE.value,
                reason="no reference outputs are configured for this workload",
            )
        total = 0
        failed = 0
        correct = 0
        for output in payload.outputs:
            if output is None:
                failed += 1
                continue
            total += 1
            if self._normalise(output) == self._normalise(str(reference)):
                correct += 1
        if total == 0:
            return QualityResult(
                evaluator=self.name,
                evaluator_version=self.version,
                metric_name=self.metric_name,
                scale=self.scale,
                score=None,
                status=QualityStatus.UNAVAILABLE.value,
                sample_count=0,
                failed_count=failed,
                reason="no successful generations were available to evaluate",
            )
        return QualityResult(
            evaluator=self.name,
            evaluator_version=self.version,
            metric_name=self.metric_name,
            scale=self.scale,
            score=correct / total,
            status=QualityStatus.AVAILABLE.value,
            sample_count=total,
            failed_count=failed,
            details={
                "correct": correct,
                "total": total,
                "normalisation": "casefold + whitespace collapse",
                "reference_source": "workload.input_spec.expected_output",
            },
        )


class QualityRegistry:
    def __init__(self) -> None:
        self._evaluators: dict[str, BaseQualityEvaluator] = {}
        self.register(ExactMatchEvaluator())

    def register(self, evaluator: BaseQualityEvaluator) -> None:
        self._evaluators[evaluator.name] = evaluator

    def get(self, name: str | None) -> BaseQualityEvaluator | None:
        if not name:
            return None
        return self._evaluators.get(name)

    def list(self) -> list[dict[str, Any]]:
        return [
            {
                "name": evaluator.name,
                "version": evaluator.version,
                "metric_name": evaluator.metric_name,
                "scale": evaluator.scale,
                "requires_references": evaluator.requires_references,
            }
            for evaluator in self._evaluators.values()
        ]

    def evaluate(self, name: str | None, payload: QualityEvaluationInput) -> QualityResult:
        evaluator = self.get(name)
        if evaluator is None:
            return QualityResult(
                evaluator=name,
                evaluator_version=None,
                metric_name=None,
                scale=None,
                score=None,
                status=QualityStatus.UNAVAILABLE.value,
                reason=(
                    "no quality evaluator is configured for this run"
                    if not name
                    else f"quality evaluator '{name}' is not registered"
                ),
            )
        try:
            result = evaluator.evaluate(payload)
        except Exception as exc:  # evaluator failures must be recorded safely
            return QualityResult(
                evaluator=evaluator.name,
                evaluator_version=evaluator.version,
                metric_name=evaluator.metric_name,
                scale=evaluator.scale,
                score=None,
                status=QualityStatus.FAILED.value,
                reason=f"quality evaluator raised {exc.__class__.__name__}",
            )
        return result


__all__ = [
    "BaseQualityEvaluator",
    "ExactMatchEvaluator",
    "QualityEvaluationInput",
    "QualityRegistry",
    "QualityResult",
]
