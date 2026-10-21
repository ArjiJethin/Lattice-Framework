from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError

from app.core.enums import JobStatus
from app.core.errors import ConflictError
from app.core.settings import Settings
from app.core.time import utcnow
from app.db.models import (
    BenchmarkRun,
    Configuration,
    InferenceExecution,
    Job,
    OptimizationDecision,
    Workload,
)
from app.db.session import (
    create_engine_from_settings,
    create_session_factory,
    init_database,
    verify_database,
)
from app.repositories import jobs as job_repo
from app.schemas.resources import ConfigurationCreate, ConfigurationUpdate
from app.services.configurations import ConfigurationService
from app.services.jobs import (
    assert_transition,
    recover_interrupted_work,
    transition,
)


@pytest.fixture
def db(tmp_path: Path, model_root: Path):
    settings = Settings(
        database_url=f"sqlite:///{(tmp_path / 'db-test.db').as_posix()}",
        model_roots=[model_root],
        runtime_allow_fake=False,
        gpu_telemetry_enabled=False,
        log_level="WARNING",
    )
    engine = create_engine_from_settings(settings)
    init_database(engine)
    factory = create_session_factory(engine)
    yield settings, engine, factory
    engine.dispose()


def test_sqlite_foreign_keys_enabled_on_every_connection(db):
    _settings, engine, _factory = db
    ok, reason = verify_database(engine)
    assert ok, reason
    with engine.connect() as connection:
        assert connection.execute(text("PRAGMA foreign_keys")).scalar_one() == 1


def test_foreign_key_violation_is_rejected(db):
    _settings, _engine, factory = db
    with factory() as session:
        session.add(
            Workload(
                id="wl-1",
                name="wl",
                workload_type="generation",
                input_spec={"prompt": "x"},
                output_tokens_target=4,
                context_requirement=8,
            )
        )
        session.commit()
        session.add(
            BenchmarkRun(
                id="run-1",
                job_id="missing-job",
                configuration_id="missing-config",
                workload_id="wl-1",
                protocol_version="v",
                configuration_snapshot={},
                workload_snapshot={},
                protocol_snapshot={},
                snapshot_hash="hash",
                requested_warmups=0,
                requested_repetitions=1,
            )
        )
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()


def test_failed_transaction_rolls_back_partial_writes(db):
    _settings, _engine, factory = db
    with factory() as session:
        session.add(
            Workload(
                id="wl-1",
                name="wl",
                workload_type="generation",
                input_spec={"prompt": "x"},
                output_tokens_target=4,
                context_requirement=8,
            )
        )
        session.flush()
        session.rollback()
    with factory() as session:
        assert session.scalar(select(func.count()).select_from(Workload)) == 0


def test_data_persists_across_engine_restart(db):
    settings, engine, factory = db
    with factory() as session:
        session.add(
            Workload(
                id="wl-1",
                name="persisted",
                workload_type="generation",
                input_spec={"prompt": "x"},
                output_tokens_target=4,
                context_requirement=8,
            )
        )
        session.commit()
    engine.dispose()
    engine2 = create_engine_from_settings(settings)
    init_database(engine2)
    with create_session_factory(engine2)() as session:
        assert session.get(Workload, "wl-1") is not None
    engine2.dispose()


def test_configuration_revisions_are_immutable_snapshots(db, model_root: Path):
    settings, _engine, factory = db
    model = model_root / "tiny.gguf"
    service_settings = settings.with_overrides(model_roots=[model_root])
    with factory() as session:
        service = ConfigurationService(session, service_settings)
        created = service.create(
            ConfigurationCreate(
                name="cfg",
                model_id="tiny",
                model_format="gguf",
                model_path=str(model),
                context_length=1024,
            )
        )
        service.update(created.id, ConfigurationUpdate(name="cfg-renamed"))
        configuration = service.get(created.id)
        assert configuration.revision == 2
        assert len(configuration.revisions) == 2
        first = configuration.revisions[0].snapshot
        second = configuration.revisions[1].snapshot
        assert first["name"] == "cfg"
        assert second["name"] == "cfg-renamed"
        assert first["content_hash"] != second["content_hash"]


def test_job_state_machine_rejects_illegal_and_terminal_transitions(db):
    _settings, _engine, factory = db
    assert_transition("queued", "running")
    assert_transition("running", "completed")
    with pytest.raises(ConflictError):
        assert_transition("completed", "running")
    with pytest.raises(ConflictError):
        assert_transition("failed", "completed")
    with pytest.raises(ConflictError):
        assert_transition("queued", "completed")
    with factory() as session:
        job = job_repo.create(
            session,
            Job(id="job-1", job_type="benchmark", status=JobStatus.QUEUED.value),
        )
        transition(session, job, JobStatus.RUNNING.value)
        transition(session, job, JobStatus.COMPLETED.value)
        session.commit()
        with pytest.raises(ConflictError):
            transition(session, job, JobStatus.RUNNING.value)
        session.rollback()


def test_restart_recovery_marks_interrupted_work(db):
    _settings, _engine, factory = db
    now = utcnow()
    with factory() as session:
        session.add_all(
            [
                Job(id="job-q", job_type="benchmark", status="queued"),
                Job(id="job-r", job_type="benchmark", status="running", started_at=now),
                Workload(
                    id="wl-1",
                    name="wl",
                    workload_type="generation",
                    input_spec={"prompt": "x"},
                    output_tokens_target=4,
                    context_requirement=8,
                ),
                Configuration(
                    id="cfg-1",
                    name="cfg",
                    model_id="tiny",
                    model_format="gguf",
                    model_path="model.gguf",
                    context_length=1024,
                ),
            ]
        )
        session.commit()
    with factory() as session:
        session.add_all(
            [
                BenchmarkRun(
                    id="run-1",
                    job_id="job-r",
                    configuration_id="cfg-1",
                    workload_id="wl-1",
                    status="running",
                    protocol_version="v",
                    configuration_snapshot={},
                    workload_snapshot={},
                    protocol_snapshot={},
                    snapshot_hash="hash",
                    requested_warmups=0,
                    requested_repetitions=1,
                ),
                OptimizationDecision(
                    id="dec-1",
                    job_id="job-r",
                    workload_id="wl-1",
                    workload_snapshot={},
                    status="pending_evidence",
                    algorithm="baseline",
                    algorithm_version="1",
                ),
            ]
        )
        session.commit()
    counts = recover_interrupted_work(factory)
    assert counts["jobs"] >= 2
    with factory() as session:
        assert session.get(Job, "job-q").status == "interrupted"
        assert session.get(Job, "job-r").status == "interrupted"
        assert session.get(BenchmarkRun, "run-1").status == "interrupted"
        assert session.get(OptimizationDecision, "dec-1").status == "failed"
        assert session.get(Job, "job-r").error_code == "interrupted_by_restart"


def test_inference_execution_persists_without_prompt(db):
    _settings, _engine, factory = db
    with factory() as session:
        session.add_all(
            [
                Job(id="job-i", job_type="inference", status="queued"),
                Configuration(
                    id="cfg-1",
                    name="cfg",
                    model_id="tiny",
                    model_format="gguf",
                    model_path="model.gguf",
                    context_length=1024,
                ),
            ]
        )
        session.commit()
    with factory() as session:
        session.add(
            InferenceExecution(
                id="exec-1",
                job_id="job-i",
                configuration_id="cfg-1",
                configuration_snapshot={},
                output_retention_policy="none",
            )
        )
        session.commit()
        execution = session.get(InferenceExecution, "exec-1")
        assert execution.prompt_retained is False
        assert execution.retained_output is None
