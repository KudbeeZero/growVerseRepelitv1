"""Lifecycle forecast: stage progress + ETAs to the next stage and harvest.

The forecast is a pure read over the same transition rule the engine uses in
`_step` (a stage takes ``base * (1 + (100 - health)/200)`` hours), so it must be
deterministic and consistent with how the plant actually advances.
"""

import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from growpodempire.enums import GrowthStage
from growpodempire.services.simulation_service import SimulationService
from growpodempire.simulation import engine
from growpodempire.simulation.clock import FrozenClock

from test_simulation import _plant, BASE, CFG


def test_seed_start_has_full_remaining_lifecycle(session):
    _, _, plant = _plant(session)
    plant.health = 100.0
    session.flush()
    f = engine.stage_forecast(plant, CFG, BASE)
    assert f["stage"] == GrowthStage.SEED.value
    assert f["stage_index"] == 0
    assert f["stage_count"] == 6
    assert f["next_stage"] == GrowthStage.GERMINATION.value
    assert f["stage_progress_pct"] == 0.0
    assert f["is_harvest_ready"] is False
    # seed_days (3) * 24h at full health.
    assert f["stage_base_hours"] == 72.0
    assert f["stage_total_hours"] == 72.0
    # Harvest is many days out and dated absolutely.
    assert f["hours_to_harvest"] > 1056  # 72+120+240+624 fixed stages, + flowering
    eta = datetime.fromisoformat(f["harvest_eta"])
    assert abs((eta - BASE).total_seconds() / 3600.0 - f["hours_to_harvest"]) < 0.1


def test_progress_advances_and_eta_shrinks_over_time(session):
    _, _, plant = _plant(session)
    plant.health = 100.0
    session.flush()
    early = engine.stage_forecast(plant, CFG, BASE + timedelta(hours=12))
    later = engine.stage_forecast(plant, CFG, BASE + timedelta(hours=48))
    assert 0 < early["stage_progress_pct"] < later["stage_progress_pct"]
    assert early["hours_to_harvest"] > later["hours_to_harvest"]
    # next-stage ETA is a fixed wall-clock moment, not a sliding window.
    assert early["next_stage_eta"] == later["next_stage_eta"]


def test_poor_health_stretches_durations(session):
    _, _, plant = _plant(session)
    plant.health = 100.0
    session.flush()
    healthy = engine.stage_forecast(plant, CFG, BASE)
    plant.health = 50.0
    session.flush()
    sick = engine.stage_forecast(plant, CFG, BASE)
    # health 50 -> multiplier 1.25 on every stage.
    assert sick["stage_total_hours"] == healthy["stage_total_hours"] * 1.25
    assert sick["hours_to_harvest"] > healthy["hours_to_harvest"]
    # base (ideal) duration is unaffected by health.
    assert sick["stage_base_hours"] == healthy["stage_base_hours"]


def test_harvest_stage_is_terminal(session):
    _, _, plant = _plant(session)
    plant.growth_stage = GrowthStage.HARVEST.value
    session.flush()
    f = engine.stage_forecast(plant, CFG, BASE)
    assert f["is_harvest_ready"] is True
    assert f["next_stage"] is None
    assert f["next_stage_eta"] is None
    assert f["harvest_eta"] is None
    assert f["stage_progress_pct"] == 100.0
    assert f["hours_to_harvest"] == 0.0


def test_service_forecast_uses_its_clock(session):
    _, _, plant = _plant(session)
    svc = SimulationService(session, config=CFG, clock=FrozenClock(BASE + timedelta(days=4)))
    svc.sync(plant)  # the /state route syncs before forecasting
    f = svc.forecast(plant)
    # 4 days in: past the 3-day seed stage, so it has advanced and reports an ETA.
    assert f["stage"] != GrowthStage.SEED.value
    assert f["harvest_eta"] is not None
    assert f["age_hours"] == 96.0
