"""Tests verifying 100% compliance with docs/api-contract.md."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def test_contract_system_status(client: TestClient) -> None:
    res = client.get("/api/v1/system/status")
    assert res.status_code == 200
    data = res.json()
    assert data["connected"] is True
    assert "activeModel" in data
    assert "name" in data["activeModel"]
    assert "quantization" in data["activeModel"]
    assert "runtime" in data["activeModel"]
    assert "status" in data["activeModel"]
    assert "hardware" in data
    assert "device" in data["hardware"]
    assert "vramTotalGb" in data["hardware"]
    assert "vramUsedGb" in data["hardware"]
    assert "cudaAvailable" in data["hardware"]


def test_contract_profiles(client: TestClient) -> None:
    res = client.get("/api/v1/profiles")
    assert res.status_code == 200
    data = res.json()
    assert "stats" in data
    assert data["stats"]["total"] >= 1
    assert "selectedCandidateId" in data
    assert "candidates" in data
    assert len(data["candidates"]) >= 1

    cand = data["candidates"][0]
    assert "id" in cand
    assert "name" in cand
    assert "modelName" in cand
    assert "quantization" in cand
    assert "status" in cand
    assert "nodeRole" in cand
    assert "constraints" in cand
    assert "position3D" in cand
    assert len(cand["position3D"]) == 3


def test_contract_overview_metrics(client: TestClient) -> None:
    res = client.get("/api/v1/metrics/overview")
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    m = data["metrics"]
    assert "inferenceLatencyMs" in m
    assert "generationSpeedToks" in m
    assert "gpuMemoryUsedGb" in m
    assert "gpuMemoryTotalGb" in m


def test_contract_experiments(client: TestClient) -> None:
    res = client.get("/api/v1/experiments?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "experiments" in data
    assert isinstance(data["experiments"], list)
    if data["experiments"]:
        exp = data["experiments"][0]
        assert "id" in exp
        assert "model" in exp
        assert "configuration" in exp
        assert "result" in exp


def test_contract_trends(client: TestClient) -> None:
    res = client.get("/api/v1/trends?range=30")
    assert res.status_code == 200
    data = res.json()
    assert "data" in data
    trend_data = data["data"]
    assert "timeRange" in trend_data
    assert "points" in trend_data
    assert isinstance(trend_data["points"], list)
    # Trends contain measured benchmark runs only; no fixture points are fabricated.
    for pt in trend_data["points"]:
        assert "run" in pt
        assert "latencyMs" in pt
        assert "throughputToks" in pt
        assert "gpuMemoryGb" in pt


def test_contract_optimization_plan(client: TestClient) -> None:
    payload = {
        "modelName": "Qwen2.5-0.5B",
        "targetHardware": "CUDA",
        "memoryBudgetGb": 4.0,
        "maxLatencyMs": 250,
        "minQualityScore": 80.0,
        "objective": "balanced",
    }
    res = client.post("/api/v1/optimization/plan", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "decisionId" in data
    assert data["status"] in ("optimal", "feasible", "infeasible")
    assert "selectedCandidateId" in data
    assert "rationale" in data
    assert "timestamp" in data
