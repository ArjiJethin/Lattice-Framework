from __future__ import annotations

import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from tests.conftest import wait_for_job


def database_path(settings) -> Path:
    path = settings.database_url.split("sqlite:///", 1)[1]
    return Path(path)


def test_inference_runs_and_does_not_persist_prompt_or_output(
    client: TestClient, make_configuration
):
    configuration = make_configuration()
    secret_prompt = "SECRET-PROMPT-4f8a2c1d"
    response = client.post(
        "/api/v1/inference",
        json={
            "configuration_id": configuration["id"],
            "prompt": secret_prompt,
            "generation_parameters": {"max_tokens": 6},
        },
    )
    assert response.status_code == 202
    accepted = response.json()
    assert accepted["output_retention_policy"] == "none"
    assert accepted["test_only"] is True
    job = wait_for_job(client, accepted["job_id"])
    assert job["status"] == "completed"
    execution = client.get(f"/api/v1/inference/{accepted['execution_id']}").json()
    assert execution["status"] == "completed"
    assert execution["prompt_retained"] is False
    assert execution["retained_output"] is None
    assert execution["latency_ms"] is not None
    assert execution["hardware_snapshot"]
    assert execution["configuration_snapshot"]
    assert execution["output_tokens"] == 6
    assert execution["metrics_json"]["ttft_ms"]["status"] == "measured"

    settings = client.app.state.container.settings
    connection = sqlite3.connect(database_path(settings))
    try:
        tables = [
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        ]
        for table in tables:
            if table.startswith("sqlite_"):
                continue
            rows = connection.execute(f'SELECT * FROM "{table}"').fetchall()
            assert secret_prompt not in str(rows), f"prompt leaked into {table}"
    finally:
        connection.close()


def test_output_retention_requires_server_permission(client: TestClient, make_configuration):
    configuration = make_configuration()
    response = client.post(
        "/api/v1/inference",
        json={
            "configuration_id": configuration["id"],
            "prompt": "hello",
            "retain_output": True,
        },
    )
    assert response.status_code == 422
    assert "retention" in response.json()["error"]["message"]


def test_inference_requires_exactly_one_target(client: TestClient, make_configuration):
    configuration = make_configuration()
    neither = client.post("/api/v1/inference", json={"prompt": "hello"})
    assert neither.status_code == 422
    both = client.post(
        "/api/v1/inference",
        json={
            "prompt": "hello",
            "configuration_id": configuration["id"],
            "decision_id": "some-decision",
        },
    )
    assert both.status_code == 422


def test_inference_unknown_resources(client: TestClient):
    missing_config = client.post(
        "/api/v1/inference", json={"prompt": "hello", "configuration_id": "nope"}
    )
    assert missing_config.status_code == 404
    missing_decision = client.post(
        "/api/v1/inference", json={"prompt": "hello", "decision_id": "nope"}
    )
    assert missing_decision.status_code == 404


def test_inference_list_and_get(client: TestClient, make_configuration):
    configuration = make_configuration()
    first = client.post(
        "/api/v1/inference",
        json={"prompt": "one", "configuration_id": configuration["id"]},
    ).json()
    wait_for_job(client, first["job_id"])
    listed = client.get("/api/v1/inference", params={"configuration_id": configuration["id"]})
    assert listed.status_code == 200
    body = listed.json()
    assert body["total"] >= 1
    assert any(item["id"] == first["execution_id"] for item in body["items"])
    assert client.get("/api/v1/inference/unknown").status_code == 404
