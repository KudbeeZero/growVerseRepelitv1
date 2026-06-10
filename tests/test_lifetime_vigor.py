"""Yield is driven by lifetime care, not the plant's health at the harvest moment.

The engine integrates hourly health over the whole grow (`lifetime_vigor`), and
`harvest_plant` sizes the wet weight off that average — so a plant neglected for
weeks can't be rescued to full weight by one good final day, the way a real grow
can't recover lost bulking.
"""

import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from growpodempire.db.models import Strain
from growpodempire.economy.config import load_economy_config
from growpodempire.services.game_service import GameService
from growpodempire.simulation import engine
from growpodempire.simulation.clock import FrozenClock

CFG = load_economy_config()
BASE = datetime(2025, 1, 1, 0, 0, 0)


def _grow(session, username, auto):
    """A plant under ideal environment; `auto` toggles pod water/feed topping."""
    clock = FrozenClock(BASE)
    svc = GameService(session, clock=clock)
    p = svc.create_player(username)
    strain = session.query(Strain).filter(Strain.slug == "white-widow").one()
    stack = svc.buy_seed(p.id, strain.id)
    pod = svc.create_pod(p.id, "Tent", capacity=4, charge=False)
    plant = svc.plant_seed(p.id, stack.id, pod.id)
    for attr in ("last_tick_at", "stage_entered_at", "planted_at"):
        setattr(plant, attr, BASE)
    pod.temperature = 24
    pod.humidity = 50
    pod.ph_level = 6.5
    pod.light_intensity = 500
    pod.co2_level = 1000
    pod.auto_water = auto
    pod.auto_feed = auto
    session.flush()
    return svc, clock, p.id, pod, plant


def test_lifetime_care_drives_yield(session):
    svc_g, clock_g, pid_g, _, plant_g = _grow(session, "diligent", auto=True)
    svc_b, clock_b, pid_b, _, plant_b = _grow(session, "neglectful", auto=False)

    end = BASE + timedelta(days=45)
    engine.catch_up(session, plant_g, end, CFG)
    engine.catch_up(session, plant_b, end, CFG)

    # The integral remembers the neglect.
    assert plant_g.lifetime_vigor > plant_b.lifetime_vigor + 5

    # Same strain → identical yield band, so the weight gap is purely lifetime care.
    clock_g.set(end)
    clock_b.set(end)
    h_g = svc_g.harvest_plant(pid_g, plant_g.id, sell=False)
    h_b = svc_b.harvest_plant(pid_b, plant_b.id, sell=False)
    assert h_g.weight_g > h_b.weight_g


def test_last_minute_rescue_does_not_restore_lost_yield(session):
    svc, clock, _, pod, plant = _grow(session, "procrastinator", auto=False)

    # Neglect: resources decay for most of the grow.
    engine.catch_up(session, plant, BASE + timedelta(days=25), CFG)
    neglected_vigor = plant.lifetime_vigor

    # Rescue: switch automation on and give it a few good days.
    pod.auto_water = True
    pod.auto_feed = True
    session.flush()
    engine.catch_up(session, plant, BASE + timedelta(days=29), CFG)

    # Instantaneous health bounces back...
    assert plant.health > neglected_vigor + 5
    # ...but the lifetime average still carries the weeks of neglect.
    assert plant.lifetime_vigor < plant.health
