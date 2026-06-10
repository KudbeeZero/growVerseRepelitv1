"""Server-authoritative harvest gate (closes the instant-harvest currency faucet).

The network path POST .../harvest passes no weight, so the server computes yield.
That path must reflect a real grow: a seed-stage plant or a dead plant cannot be
auto-harvested. Fixtures that pass an explicit weight_g intentionally bypass the
gate (they use harvest as a shortcut to produce a Harvest row).
"""

import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import pytest

from growpodempire.db.models import Strain
from growpodempire.economy.config import load_economy_config
from growpodempire.economy.ledger import balance
from growpodempire.services.game_service import GameService, GameError
from growpodempire.simulation import engine
from growpodempire.simulation.clock import FrozenClock

CFG = load_economy_config()
BASE = datetime(2025, 1, 1, 0, 0, 0)


def _fresh_plant(session, username):
    clock = FrozenClock(BASE)
    svc = GameService(session, clock=clock)
    p = svc.create_player(username)
    strain = session.query(Strain).filter(Strain.slug == "white-widow").one()
    stack = svc.buy_seed(p.id, strain.id)
    pod = svc.create_pod(p.id, "Tent", capacity=4, charge=False)
    plant = svc.plant_seed(p.id, stack.id, pod.id)
    for attr in ("last_tick_at", "stage_entered_at", "planted_at"):
        setattr(plant, attr, BASE)
    # Ideal, automated environment so a grown plant reliably reaches flowering.
    pod.temperature = 24
    pod.humidity = 50
    pod.ph_level = 6.5
    pod.auto_water = True
    pod.auto_feed = True
    session.flush()
    return svc, clock, p.id, plant


def test_instant_harvest_is_blocked(session):
    """buy -> plant -> harvest in the same hour must NOT mint currency."""
    svc, clock, pid, plant = _fresh_plant(session, "exploiter")
    start = balance(session, pid)
    clock.set(BASE)  # no time has passed; plant is still a seed
    with pytest.raises(GameError, match="not ready to harvest"):
        svc.harvest_plant(pid, plant.id)
    assert plant.growth_stage == "seed"
    assert balance(session, pid) == start  # no faucet


def test_dead_plant_cannot_be_auto_harvested(session):
    svc, clock, pid, plant = _fresh_plant(session, "necromancer")
    plant.is_alive = False
    plant.growth_stage = "flowering"
    session.flush()
    clock.set(BASE)
    with pytest.raises(GameError, match="dead plant"):
        svc.harvest_plant(pid, plant.id)


def test_matured_plant_harvests(session):
    """A plant grown to flowering can be auto-harvested (the happy path)."""
    svc, clock, pid, plant = _fresh_plant(session, "grower")
    end = BASE + timedelta(days=55)
    engine.catch_up(session, plant, end, CFG)
    assert plant.growth_stage in ("flowering", "harvest")
    clock.set(end)
    h = svc.harvest_plant(pid, plant.id, sell=False)
    assert h.weight_g > 0


def test_explicit_weight_bypasses_gate(session):
    """Fixtures that supply weight_g (admin/test) are trusted and skip the gate."""
    svc, clock, pid, plant = _fresh_plant(session, "fixture")
    clock.set(BASE)
    h = svc.harvest_plant(pid, plant.id, weight_g=100, quality=80, sell=False)
    assert h.weight_g == 100
