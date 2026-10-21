# Lattice Framework — Frontend/Backend API Contract Specification

This document defines the formal HTTP/JSON API contract between the Lattice frontend and the FastAPI backend (`backend/app`). Backend Developer 2 can implement these endpoints to achieve seamless full-stack integration.

---

## 1. Overview & Conventions

- **Default Base URL**: `http://127.0.0.1:8000`
- **API Prefix**: `/api/v1`
- **Content-Type**: `application/json`
- **Health Check**: Available at both `/health` and `/api/v1/health`
- **Nullability Convention**: In unmeasured or in-flight profiling states, performance metrics (`memoryUsageGb`, `inferenceLatencyMs`, `qualityScore`, `generationSpeedToks`) must be returned as explicit `null`, not fabricated default numbers (e.g. `0` or placeholder integers).

---

## 2. API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Service reachability and version check. |
| `GET` | `/api/v1/system/status` | Runtime readiness, active model, and hardware VRAM status. |
| `GET` | `/api/v1/profiles` | Candidate configuration profiles and space topology. |
| `GET` | `/api/v1/metrics/overview` | High-level summary metrics (Latency, Speed, GPU Memory). |
| `GET` | `/api/v1/experiments` | Log of recent optimization/benchmark experiments. |
| `GET` | `/api/v1/trends` | Historical performance run metrics for ECharts visualization. |
| `POST` | `/api/v1/optimization/plan` | Submit resource constraints and receive recommended candidate. |

---

## 3. Endpoint Specifications

### 3.1 Health Check
- **Route**: `GET /api/v1/health` (also aliased at `/health`)
- **Status Codes**: `200 OK`
- **Response**:
```json
{
  "status": "ok",
  "service": "lattice-backend",
  "version": "0.1.0",
  "uptimeSeconds": 1420
}
```

---

### 3.2 System Status
- **Route**: `GET /api/v1/system/status`
- **Status Codes**: `200 OK`
- **Response**:
```json
{
  "connected": true,
  "activeModel": {
    "name": "Qwen3-1.7B",
    "quantization": "Q4_K_M",
    "runtime": "llama.cpp",
    "status": "Loaded",
    "contextWindow": 4096,
    "architecture": "qwen2"
  },
  "hardware": {
    "device": "NVIDIA GeForce RTX 4060 Laptop GPU",
    "vramTotalGb": 4.0,
    "vramUsedGb": 2.7,
    "cudaAvailable": true,
    "computeCapability": "8.9"
  }
}
```

---

### 3.3 Configuration Profiles
- **Route**: `GET /api/v1/profiles`
- **Status Codes**: `200 OK`
- **Response**:
```json
{
  "stats": {
    "selected": 1,
    "feasible": 6,
    "evaluating": 3,
    "unprofiled": 8,
    "rejected": 2,
    "total": 20
  },
  "selectedCandidateId": "cand-optimizer",
  "candidates": [
    {
      "id": "cand-optimizer",
      "name": "Optimizer",
      "modelName": "Qwen3-1.7B",
      "quantization": "Q4_K_M",
      "description": "General purpose (balanced)",
      "subLabel": "Selecting best configuration",
      "status": "selected",
      "nodeRole": "optimizer",
      "memoryUsageGb": 2.7,
      "memoryBudgetGb": 4.0,
      "inferenceLatencyMs": 184,
      "latencyConstraintMs": 250,
      "qualityScore": 86.2,
      "qualityThreshold": 80.0,
      "generationSpeedToks": 42.0,
      "constraints": {
        "withinMemoryBudget": true,
        "meetsLatencyConstraint": true,
        "qualityThresholdSatisfied": true
      },
      "position3D": [0.0, 2.2, 0.0],
      "platformIndex": 0,
      "badgeText": "Selected"
    },
    {
      "id": "cand-rejected-1",
      "name": "Candidate X",
      "modelName": "Qwen3-1.7B",
      "quantization": "F16",
      "description": "Unquantized 16-bit float profile",
      "status": "rejected",
      "nodeRole": "candidate",
      "memoryUsageGb": 5.2,
      "memoryBudgetGb": 4.0,
      "inferenceLatencyMs": 410,
      "latencyConstraintMs": 250,
      "qualityScore": 99.1,
      "qualityThreshold": 80.0,
      "generationSpeedToks": 14.0,
      "rejectionReason": "Exceeds 4.0 GB memory budget constraint",
      "constraints": {
        "withinMemoryBudget": false,
        "meetsLatencyConstraint": false,
        "qualityThresholdSatisfied": true
      },
      "position3D": [4.0, 1.2, 3.2]
    }
  ]
}
```

---

### 3.4 Overview Metrics
- **Route**: `GET /api/v1/metrics/overview`
- **Status Codes**: `200 OK`
- **Response**:
```json
{
  "metrics": {
    "inferenceLatencyMs": 184,
    "inferenceLatencyChangePct": -12,
    "generationSpeedToks": 42,
    "generationSpeedChangePct": 8,
    "gpuMemoryUsedGb": 2.7,
    "gpuMemoryTotalGb": 4.0,
    "gpuMemoryUsagePct": 68,
    "lastMeasuredAt": "2026-10-21T14:00:00Z"
  }
}
```

---

### 3.5 Recent Experiments
- **Route**: `GET /api/v1/experiments`
- **Query Params**: `limit` (int, default 10)
- **Status Codes**: `200 OK`
- **Response**:
```json
{
  "total": 42,
  "experiments": [
    {
      "id": "EXP-0042",
      "model": "Qwen3-1.7B",
      "configuration": "Q4_K_M",
      "objective": "Constraint-based",
      "result": "Completed",
      "latencyMs": 184,
      "date": "Oct 17, 2026",
      "candidateId": "cand-optimizer"
    },
    {
      "id": "EXP-0041",
      "model": "Llama-3.1-8B",
      "configuration": "Q4_0",
      "objective": "Latency optimization",
      "result": "Completed",
      "latencyMs": 212,
      "date": "Oct 16, 2026",
      "candidateId": "cand-b"
    },
    {
      "id": "EXP-0040",
      "model": "Qwen3-1.7B",
      "configuration": "Q5_K_M",
      "objective": "Quality prioritization",
      "result": "Partial",
      "latencyMs": 240,
      "date": "Oct 16, 2026",
      "candidateId": "cand-c"
    }
  ]
}
```

---

### 3.6 Performance Trends
- **Route**: `GET /api/v1/trends`
- **Query Params**: `range` (string, optional: `"10"`, `"20"`, `"30"`, `"all"`)
- **Status Codes**: `200 OK`
- **Response**:
```json
{
  "data": {
    "timeRange": "Last 30 runs",
    "points": [
      { "run": 1, "latencyMs": 260, "throughputToks": 28, "gpuMemoryGb": 3.8 },
      { "run": 2, "latencyMs": 250, "throughputToks": 30, "gpuMemoryGb": 3.6 }
    ]
  }
}
```

---

### 3.7 Optimization Plan Submission
- **Route**: `POST /api/v1/optimization/plan`
- **Request Body**:
```json
{
  "modelName": "Qwen3-1.7B",
  "targetHardware": "CUDA",
  "memoryBudgetGb": 4.0,
  "maxLatencyMs": 250,
  "minQualityScore": 80.0,
  "objective": "balanced"
}
```
- **Status Codes**: `200 OK`
- **Response**:
```json
{
  "decisionId": "dec-90412",
  "status": "optimal",
  "selectedCandidateId": "cand-optimizer",
  "rationale": "Q4_K_M achieves 86.2 quality score within 2.7 GB VRAM, 184 ms inference latency.",
  "candidateProfiles": [],
  "timestamp": "2026-10-21T14:15:00Z"
}
```

---

## 4. Error Responses
All 4xx/5xx responses must conform to the FastAPI standard error format:
```json
{
  "detail": "Descriptive human-readable explanation of the validation or runtime failure"
}
```
