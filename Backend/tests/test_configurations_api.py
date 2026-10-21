from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient


def test_create_and_read_hides_absolute_model_path(client: TestClient, make_configuration):
    configuration = make_configuration()
    assert configuration["model_path_configured"] is True
    assert configuration["model_file_name"] == "tiny.gguf"
    assert configuration["model_file_present"] is True
    assert "model_path" not in configuration
    assert configuration["validation_state"] == "unvalidated"

    detail = client.get(f"/api/v1/configurations/{configuration['id']}")
    assert detail.status_code == 200
    assert detail.json()["id"] == configuration["id"]
    assert "model_path" not in detail.json()


def test_list_pagination_and_filters(client: TestClient, make_configuration):
    first = make_configuration(model_id="model-a")
    make_configuration(model_id="model-b")
    response = client.get("/api/v1/configurations", params={"limit": 1, "offset": 0})
    body = response.json()
    assert response.status_code == 200
    assert body["limit"] == 1
    assert body["offset"] == 0
    assert body["total"] >= 2
    assert len(body["items"]) == 1
    by_model = client.get("/api/v1/configurations", params={"model_id": "model-a"}).json()
    assert [item["id"] for item in by_model["items"]] == [first["id"]]
    empty = client.get("/api/v1/configurations", params={"search": "nothing-matches"}).json()
    assert empty["items"] == []
    assert empty["total"] == 0


def test_configuration_can_be_registered_before_model_exists(client: TestClient, model_root: Path):
    missing = model_root / "later.gguf"
    response = client.post(
        "/api/v1/configurations",
        json={
            "name": "future-model",
            "model_id": "tiny",
            "model_format": "gguf",
            "model_path": str(missing),
            "context_length": 512,
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["model_file_present"] is False
    assert body["model_file_name"] == "later.gguf"


def test_unknown_configuration_returns_sanitized_404(client: TestClient):
    response = client.get("/api/v1/configurations/does-not-exist")
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "not_found"
    assert body["request_id"]
    assert "traceback" not in response.text.lower()


def test_path_outside_model_root_is_rejected(client: TestClient, model_root: Path):
    outside = model_root.parent / "outside.gguf"
    outside.write_bytes(b"x")
    response = client.post(
        "/api/v1/configurations",
        json={
            "name": "unsafe",
            "model_id": "tiny",
            "model_format": "gguf",
            "model_path": str(outside),
            "context_length": 512,
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "unsafe_model_path"


def test_invalid_parameters_are_rejected_field_level(client: TestClient, model_path: Path):
    base = {
        "name": "invalid",
        "model_id": "tiny",
        "model_format": "gguf",
        "model_path": str(model_path),
        "context_length": 512,
    }
    negative_threads = client.post("/api/v1/configurations", json={**base, "thread_count": -4})
    assert negative_threads.status_code == 422
    assert negative_threads.json()["error"]["code"] == "validation_error"

    executable = client.post(
        "/api/v1/configurations",
        json={**base, "runtime_parameters": {"shell": "rm -rf /"}},
    )
    assert executable.status_code == 422

    unknown_generation = client.post(
        "/api/v1/configurations",
        json={**base, "generation_defaults": {"mystery": 1}},
    )
    assert unknown_generation.status_code == 422

    nan_parameter = client.post(
        "/api/v1/configurations",
        content=(
            '{"name":"nan","model_id":"tiny","model_format":"gguf",'
            f'"model_path":"{model_path.as_posix()}","context_length":512,'
            '"generation_defaults":{"temperature":NaN}}'
        ),
        headers={"Content-Type": "application/json"},
    )
    assert nan_parameter.status_code == 422


def test_duplicate_name_conflict(client: TestClient, make_configuration):
    configuration = make_configuration()
    response = client.post(
        "/api/v1/configurations",
        json={
            "name": configuration["name"],
            "model_id": "tiny",
            "model_format": "gguf",
            "model_path": configuration["model_file_name"],
            "context_length": 512,
        },
    )
    # The path is rejected first as unsafe; use the full approved path instead.
    assert response.status_code in (409, 422)
    duplicate = client.post(
        "/api/v1/configurations",
        json={
            "name": configuration["name"],
            "model_id": "tiny",
            "model_format": "gguf",
            "model_path": str(
                Path(client.app.state.container.settings.model_roots[0]) / "tiny.gguf"
            ),
            "context_length": 512,
        },
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "conflict"


def test_update_bumps_revision_and_preserves_history(client: TestClient, make_configuration):
    configuration = make_configuration()
    response = client.patch(
        f"/api/v1/configurations/{configuration['id']}",
        json={"description": "updated", "thread_count": 2},
    )
    assert response.status_code == 200
    assert response.json()["revision"] == 2
    assert response.json()["validation_state"] == "unvalidated"
    revisions = client.get(f"/api/v1/configurations/{configuration['id']}/revisions").json()
    assert revisions["total"] == 2
    assert revisions["items"][0]["snapshot"]["name"] == configuration["name"]
    assert "description" not in revisions["items"][0]["snapshot"] or (
        revisions["items"][0]["snapshot"].get("description") is None
    )
    assert revisions["items"][1]["snapshot"]["name"] == configuration["name"]
    assert revisions["items"][1]["content_hash"] != revisions["items"][0]["content_hash"]


def test_validate_endpoint_reports_checks(client: TestClient, make_configuration):
    configuration = make_configuration()
    response = client.post(f"/api/v1/configurations/{configuration['id']}/validate")
    assert response.status_code == 200
    body = response.json()
    assert body["validation_state"] in {"valid", "invalid"}
    names = {check["name"] for check in body["checks"]}
    assert "model_file" in names
    assert "runtime_available" in names
    assert body["preflight"]["advisory_only"] is True
    updated = client.get(f"/api/v1/configurations/{configuration['id']}").json()
    assert updated["validation_state"] == body["validation_state"]


def test_delete_without_history_is_hard(client: TestClient, make_configuration):
    configuration = make_configuration()
    response = client.delete(f"/api/v1/configurations/{configuration['id']}")
    assert response.status_code == 200
    assert response.json()["deleted"] == "hard"
    assert client.get(f"/api/v1/configurations/{configuration['id']}").status_code == 404


def test_delete_with_history_is_soft(client: TestClient, run_benchmark):
    configuration, _workload, _run, _job = run_benchmark()
    response = client.delete(f"/api/v1/configurations/{configuration['id']}")
    assert response.status_code == 200
    assert response.json()["deleted"] == "soft"
    # Soft-deleted resources disappear from the default list but history remains.
    listed = client.get("/api/v1/configurations").json()
    assert configuration["id"] not in [item["id"] for item in listed["items"]]


def test_export_and_import_round_trip(client: TestClient, make_configuration):
    configuration = make_configuration()
    export = client.get("/api/v1/configurations/export", params={"include_model_paths": True})
    assert export.status_code == 200
    envelope = export.json()
    assert envelope["schema_version"] == "lattice.configurations/1"
    assert envelope["includes_model_paths"] is True
    record = next(
        item for item in envelope["configurations"] if item["name"] == configuration["name"]
    )

    dry_run = client.post(
        "/api/v1/configurations/import",
        json={
            "configurations": [record],
            "dry_run": True,
            "conflict_policy": "rename",
        },
    )
    assert dry_run.status_code == 200
    assert dry_run.json()["imported"] == 1
    assert dry_run.json()["dry_run"] is True
    assert len(dry_run.json()["records"]) == 1

    conflict = client.post(
        "/api/v1/configurations/import",
        json={"configurations": [record], "conflict_policy": "error"},
    )
    assert conflict.status_code == 200
    body = conflict.json()
    assert body["imported"] == 0
    assert any(issue["code"] == "duplicate_name" for issue in body["errors"])

    renamed = client.post(
        "/api/v1/configurations/import",
        json={"configurations": [record], "conflict_policy": "rename"},
    )
    assert renamed.status_code == 200
    assert renamed.json()["imported"] == 1
    assert any(issue["code"] == "renamed_duplicate" for issue in renamed.json()["warnings"])


def test_malformed_import_writes_nothing(client: TestClient, make_configuration):
    before = client.get("/api/v1/configurations").json()["total"]
    response = client.post(
        "/api/v1/configurations/import",
        json={
            "configurations": [
                {
                    "name": "broken",
                    "model_id": "tiny",
                    "model_format": "gguf",
                    "model_path": "relative-not-approved.gguf",
                    "context_length": 512,
                }
            ]
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["imported"] == 0
    assert body["failed"] >= 1
    assert client.get("/api/v1/configurations").json()["total"] == before


def test_unsupported_import_schema_version_is_rejected(client: TestClient):
    response = client.post(
        "/api/v1/configurations/import",
        json={"schema_version": "unknown/9", "configurations": []},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
