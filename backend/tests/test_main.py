from fastapi.testclient import TestClient


def test_health_check(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "lattice-backend"
    assert response.headers["X-Request-ID"]


def test_ready_check(client: TestClient) -> None:
    response = client.get("/api/v1/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert "runtime" in body["checks"]


def test_openapi_documents_the_idempotent_and_outcome_contracts(client: TestClient) -> None:
    """The served schema must describe the routes the services actually implement."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    paths = schema["paths"]
    assert "/api/v1/optimization/decisions/{decision_id}/execution" in paths
    assert "get" in paths["/api/v1/optimization/decisions/{decision_id}/execution"]
    for path in ("/api/v1/benchmarks", "/api/v1/inference"):
        assert "post" in paths[path]
    # Replay is observable in the documented response models.
    assert "duplicate" in schema["components"]["schemas"]["BenchmarkAccepted"]["properties"]
    assert "duplicate" in schema["components"]["schemas"]["InferenceAccepted"]["properties"]
    assert "duplicate" in schema["components"]["schemas"]["DecisionCreationResponse"]["properties"]
    outcome = schema["components"]["schemas"]["DecisionExecutionOutcome"]["properties"]
    for field in ("verdict", "constraints_satisfied", "baseline_run_id", "metrics"):
        assert field in outcome
    assert schema["info"]["title"] == "Lattice Backend"
