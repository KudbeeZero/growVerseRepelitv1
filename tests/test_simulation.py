"""Real-time grow simulation: deterministic catch-up, reactions, care actions."""

import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from growpodempire.db.session import session_scope
from growpodempire.db.models import Strain
from growpodempire.economy.config import load_economy_config
from growpodempire.economy.ledger import balance
from growpodempire.services.game_service import GameService
from growpodempire.services.simulation_service import SimulationService
from growpodempire.simulation import engine
from growpodempire.simulation.clock import FrozenClock
from growpodempire.simulation.conditions import PlantCondition

CFG = load_economy_config()
BASE = datetime(2025, 1, 1, 0, 0, 0)


def _plant(session, slug="white-widow", humidity=50, temperature=24, ph=6.5):
    svc = GameService(session)
    p = svc.create_player("simfarmer")
    strain = session.query(Strain).filter(Strain.slug == slug).one()
    stack = svc.buy_seed(p.id, strain.id)
    pod = svc.create_pod(p.id, "Tent", capacity=4, charge=False)
    plant = svc.plant_seed(p.id, stack.id, pod.id)
    # Pin time + set a pod environment snapshot.
    for attr in ("last_tick_at", "stage_entered_at", "planted_at"):
        setattr(plant, attr, BASE)
    pod.temperature = temperature
    pod.humidity = humidity
    pod.co2_level = 1000
    pod.light_intensity = 500
    pod.ph_level = ph
    session.flush()
    return p.id, pod, plant


def _conditions(plant):
    return {f["condition"] for f in plant.condition_flags}


def test_catch_up_advances_growth_stage(session):
    _, _, plant = _plant(session)
    assert plant.growth_stage == "seed"
    engine.catch_up(session, plant, BASE + timedelta(days=5), CFG)
    assert plant.growth_stage != "seed"      # progressed out of seed stage
    assert plant.height > 0 or plant.growth_stage != "seed"


def test_overwatering_triggers_root_rot(session):
    _, _, plant = _plant(session)
    plant.water_level = 99.0
    engine.catch_up(session, plant, BASE + timedelta(hours=1), CFG)
    conds = _conditions(plant)
    assert PlantCondition.ROOT_ROT.value in conds or PlantCondition.OVERWATERED.value in conds


def test_neglect_reduces_health(session):
    _, _, plant = _plant(session)
    engine.catch_up(session, plant, BASE + timedelta(days=5), CFG)
    assert plant.health < 100.0


def test_high_humidity_breeds_pests(session):
    # Damp air -> infestation onset. Spawn is stochastic (seeded by the plant's
    # random id), so force a high spawn rate to keep the test deterministic.
    import copy
    from growpodempire.economy.config import EconomyConfig
    raw = copy.deepcopy(CFG.raw)
    raw["simulation"]["pests"]["base_spawn_chance_per_hour"] = 0.6
    hot = EconomyConfig(raw=raw)

    _, _, plant = _plant(session, slug="blue-dream", humidity=72)
    events = engine.catch_up(session, plant, BASE + timedelta(days=4), hot)
    onsets = [
        e for e in events
        if e.event_type == "condition_onset"
        and e.payload.get("condition") == PlantCondition.PEST_INFESTATION.value
    ]
    assert onsets, "expected a pest infestation to break out in high humidity"


def test_high_humidity_breeds_mildew(session):
    _, _, plant = _plant(session, slug="blue-dream", humidity=72)
    events = engine.catch_up(session, plant, BASE + timedelta(days=4), CFG)
    onsets = [
        e for e in events
        if e.event_type == "condition_onset"
        and e.payload.get("condition") == PlantCondition.MILDEW.value
    ]
    assert onsets or plant.disease_level > 0


def test_total_neglect_kills_the_plant(session):
    # Hot, damp, never watered/fed for a month -> the plant dies.
    _, _, plant = _plant(session, slug="blue-dream", humidity=75, temperature=33)
    events = engine.catch_up(session, plant, BASE + timedelta(days=30), CFG)
    assert plant.is_alive is False
    assert plant.health == 0.0
    assert PlantCondition.DEAD.value in _conditions(plant)
    assert any(e.event_type == "death" for e in events)


def test_simulation_is_deterministic(session):
    _, _, plant = _plant(session)
    initial = dict(
        water_level=plant.water_level,
        nutrient_level=plant.nutrient_level,
        pest_level=plant.pest_level,
        disease_level=plant.disease_level,
        health=plant.health,
        height=plant.height,
        growth_stage=plant.growth_stage,
    )

    def run_and_snap():
        engine.catch_up(session, plant, BASE + timedelta(hours=48), CFG)
        return (
            round(plant.height, 6),
            round(plant.health, 6),
            round(plant.water_level, 6),
            round(plant.pest_level, 6),
            plant.growth_stage,
        )

    first = run_and_snap()
    # Reset mutable state and replay.
    for k, v in initial.items():
        setattr(plant, k, v)
    plant.last_tick_at = BASE
    plant.stage_entered_at = BASE
    second = run_and_snap()
    assert first == second


def test_treat_pests_clears_and_charges(db):
    with session_scope() as s:
        _, _, plant = _plant(s)
        plant.pest_level = 50.0
        pid = plant.player_id
        before = balance(s, pid)
        sim = SimulationService(s, clock=FrozenClock(BASE))
        sim.treat_pests(pid, plant.id)
        assert plant.pest_level == 0.0
        assert balance(s, pid) == before - Decimal(str(CFG.pest_treatment_cost))


def test_feed_raises_nutrients_and_charges(db):
    with session_scope() as s:
        _, _, plant = _plant(s)
        plant.nutrient_level = 20.0
        pid = plant.player_id
        before = balance(s, pid)
        sim = SimulationService(s, clock=FrozenClock(BASE + timedelta(hours=1)))
        sim.feed(pid, plant.id)
        assert plant.nutrient_level > 20.0
        assert balance(s, pid) == before - Decimal(str(CFG.nutrients_cost))


def test_water_action_raises_water_level(db):
    with session_scope() as s:
        _, _, plant = _plant(s)
        plant.water_level = 30.0
        pid = plant.player_id
        sim = SimulationService(s, clock=FrozenClock(BASE + timedelta(hours=1)))
        sim.water(pid, plant.id, amount=40)
        assert plant.water_level > 30.0


# --- compute-on-read cost cap (dormancy) -------------------------------------

def _capped_cfg(hours):
    import copy
    from growpodempire.economy.config import EconomyConfig
    raw = copy.deepcopy(CFG.raw)
    raw["simulation"]["max_catchup_hours"] = hours
    return EconomyConfig(raw=raw)


def test_long_idle_read_is_bounded_and_converges(session, monkeypatch):
    # An automated pod keeps a plant alive indefinitely — the worst case for
    # compute-on-read. A 5-year absence must cost at most one cap window of
    # steps, land exactly at `now` (no time-debt carried to the next read),
    # and leave an auditable dormancy event for the skipped span.
    _, pod, plant = _plant(session)
    pod.auto_water = True
    pod.auto_feed = True

    cfg = _capped_cfg(240)  # small window keeps the test fast
    calls = {"n": 0}
    real_step = engine._step

    def counting_step(*args, **kwargs):
        calls["n"] += 1
        return real_step(*args, **kwargs)

    monkeypatch.setattr(engine, "_step", counting_step)

    now = BASE + timedelta(days=5 * 365)
    events = engine.catch_up(session, plant, now, cfg)

    assert calls["n"] <= 240                       # bounded work per read
    assert plant.last_tick_at == now               # converged in ONE read
    dormancy = [e for e in events if e.event_type == "dormancy"]
    assert len(dormancy) == 1
    assert dormancy[0].payload["skipped_hours"] == 5 * 365 * 24 - 240

    # A follow-up read pays nothing extra.
    calls["n"] = 0
    engine.catch_up(session, plant, now + timedelta(minutes=30), cfg)
    assert calls["n"] == 0

    # The stage clock paused with the plant: the dormant gap must not be
    # counted as time-in-stage, so the next hours don't cascade stage changes.
    events2 = engine.catch_up(session, plant, now + timedelta(hours=5), cfg)
    assert not any(e.event_type == "stage_change" for e in events2)


def test_cap_leaves_normal_reads_untouched(session):
    # Elapsed under the cap: the dormancy path must not fire at all — the
    # plant advances fully to `now` with no dormancy event (near-term parity).
    _, _, plant = _plant(session)
    now = BASE + timedelta(hours=48)
    events = engine.catch_up(session, plant, now, CFG)
    assert plant.last_tick_at == now
    assert not any(e.event_type == "dormancy" for e in events)


def test_long_idle_unattended_plant_dies_without_dormancy(session):
    # Without automation the plant dies early in the window; the loop breaks
    # on death, so a huge absence is cheap and records no dormancy (the dead
    # fast path keeps every later read O(1)).
    _, _, plant = _plant(session, humidity=75, temperature=33)
    events = engine.catch_up(session, plant, BASE + timedelta(days=400), CFG)
    assert plant.is_alive is False
    assert not any(e.event_type == "dormancy" for e in events)
    engine.catch_up(session, plant, BASE + timedelta(days=401), CFG)
    assert plant.last_tick_at == BASE + timedelta(days=401)


# ----- set_environment input validation -------------------------------------
# The engine reads pod env fields raw on every later sync, so a non-numeric
# value stored here would TypeError all future reads of every plant in the pod.
# Bounds come from balance.yaml `simulation.weather.clamps` (same authority the
# weather system clamps to).

def _env_service(session):
    return SimulationService(session, clock=FrozenClock(BASE + timedelta(hours=1)))


def test_set_environment_stores_coerced_floats(session):
    pid, pod, _ = _plant(session)
    svc = _env_service(session)
    out = svc.set_environment(pid, pod.id, "24", 55, 1000, 500, 6.5)
    assert out.temperature == 24.0 and isinstance(out.temperature, float)
    assert out.humidity == 55.0
    assert out.ph_level == 6.5


def test_set_environment_rejects_non_numeric_and_null(session):
    import pytest
    from growpodempire.services.game_service import GameError

    pid, pod, _ = _plant(session)
    svc = _env_service(session)
    with pytest.raises(GameError, match="temperature must be a number"):
        svc.set_environment(pid, pod.id, "hot", 55, 1000, 500, 6.5)
    with pytest.raises(GameError, match="humidity must be a number"):
        svc.set_environment(pid, pod.id, 24, None, 1000, 500, 6.5)
    with pytest.raises(GameError, match="co2_level must be a finite number"):
        svc.set_environment(pid, pod.id, 24, 55, float("nan"), 500, 6.5)
    with pytest.raises(GameError, match="light_intensity must be a finite number"):
        svc.set_environment(pid, pod.id, 24, 55, 1000, float("inf"), 6.5)


def test_set_environment_enforces_balance_clamp_bounds(session):
    import pytest
    from growpodempire.services.game_service import GameError

    pid, pod, _ = _plant(session)
    svc = _env_service(session)
    clamps = CFG.raw["simulation"]["weather"]["clamps"]
    lo, hi = clamps["temperature"]
    # Boundary values are accepted...
    svc.set_environment(pid, pod.id, lo, 55, 1000, 500, 6.5)
    svc.set_environment(pid, pod.id, hi, 55, 1000, 500, 6.5)
    # ...values past them are a clean GameError, not a stored absurdity.
    with pytest.raises(GameError, match="temperature must be between"):
        svc.set_environment(pid, pod.id, hi + 1, 55, 1000, 500, 6.5)
    with pytest.raises(GameError, match="ph_level must be between"):
        svc.set_environment(pid, pod.id, 24, 55, 1000, 500, 13.5)


def test_set_environment_still_blocks_engine_typeerror_regression(session):
    # The original failure mode: a string stored on the pod blew up the next
    # engine sync. Prove a valid write then a sync round-trips cleanly.
    pid, pod, plant = _plant(session)
    svc = _env_service(session)
    svc.set_environment(pid, pod.id, 26, 58, 900, 600, 6.2)
    events = engine.catch_up(session, plant, BASE + timedelta(hours=2), CFG)
    assert plant.last_tick_at == BASE + timedelta(hours=2)
    assert isinstance(events, list)
