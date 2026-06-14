"""
STEP 3 — Simulation Test Clock.

Proves the test clock is (a) a deterministic, controllable time source, (b)
gated by a safe config boundary that fails closed in production, and (c)
economy-neutral: advancing simulated time drives the grow loop but never mints
money or touches the ledger.
"""

import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from growpodempire.config import Settings
from growpodempire.db.models import Strain
from growpodempire.economy.config import load_economy_config
from growpodempire.economy.ledger import balance
from growpodempire.services.game_service import GameService
from growpodempire.services.simulation_service import SimulationService
from growpodempire.simulation.clock import (
    Clock,
    FrozenClock,
    SystemClock,
    TestClock,
    TestClockDisabled,
    new_test_clock,
)
# Aliased so pytest does not collect this imported predicate as a test function.
from growpodempire.simulation.clock import test_clock_enabled as clock_enabled

from helpers.clock import TEST_EPOCH, anchor_plant_times, make_test_clock

CFG = load_economy_config()


# --- The controllable clock is deterministic ------------------------------

def test_test_clock_is_pure_until_advanced():
    clk = TestClock(TEST_EPOCH)
    assert clk.now() == TEST_EPOCH
    assert clk.now() == TEST_EPOCH  # reading does not move it


def test_advance_helpers_move_exactly():
    clk = TestClock(TEST_EPOCH)
    clk.advance_hours(3)
    assert clk.now() == TEST_EPOCH + timedelta(hours=3)
    clk.advance_days(2)
    assert clk.now() == TEST_EPOCH + timedelta(days=2, hours=3)
    clk.advance(minutes=30)
    assert clk.now() == TEST_EPOCH + timedelta(days=2, hours=3, minutes=30)
    clk.set(TEST_EPOCH)
    assert clk.now() == TEST_EPOCH


def test_frozen_clock_is_the_test_clock_alias():
    # 65+ existing tests construct FrozenClock; the name must keep working.
    assert FrozenClock is TestClock
    assert isinstance(FrozenClock(TEST_EPOCH), TestClock)


def test_clocks_satisfy_the_clock_protocol():
    for clk in (SystemClock(), TestClock(TEST_EPOCH)):
        assert isinstance(clk, Clock)


# --- Safe config boundary --------------------------------------------------

def test_flag_defaults_off():
    # A fresh Settings with no override must leave the boundary closed.
    os.environ.pop("ENABLE_TEST_CLOCK", None)
    assert Settings().enable_test_clock is False
    assert clock_enabled(Settings()) is False


def test_factory_fails_closed_when_disabled():
    disabled = SimpleNamespace(enable_test_clock=False)
    with pytest.raises(TestClockDisabled):
        new_test_clock(settings=disabled)


def test_factory_opens_when_enabled():
    enabled = SimpleNamespace(enable_test_clock=True)
    clk = new_test_clock(TEST_EPOCH, settings=enabled)
    assert isinstance(clk, TestClock)
    assert clk.now() == TEST_EPOCH


def test_env_flag_opens_the_boundary():
    os.environ["ENABLE_TEST_CLOCK"] = "true"
    try:
        assert Settings().enable_test_clock is True
        assert clock_enabled(Settings()) is True
    finally:
        os.environ.pop("ENABLE_TEST_CLOCK", None)


# --- Economy neutrality: time advances, money does not ---------------------

def _seed_a_plant(session, slug="white-widow"):
    svc = GameService(session)
    player = svc.create_player("clockfarmer")
    strain = session.query(Strain).filter(Strain.slug == slug).one()
    stack = svc.buy_seed(player.id, strain.id)
    pod = svc.create_pod(player.id, "Tent", capacity=4, charge=False)
    plant = svc.plant_seed(player.id, stack.id, pod.id)
    # Healthy, in-band environment so the plant actually develops.
    pod.temperature = 24
    pod.humidity = 50
    pod.ph_level = 6.5
    pod.light_intensity = 500
    anchor_plant_times(plant, TEST_EPOCH)
    session.flush()
    return player.id, plant


def test_advancing_the_clock_drives_the_grow_loop(session):
    """Advancing simulated time moves the plant through its lifecycle."""
    player_id, plant = _seed_a_plant(session)
    assert plant.growth_stage == "seed"

    clk = make_test_clock(TEST_EPOCH)
    sim = SimulationService(session, config=CFG, clock=clk)
    for _ in range(40):  # 40 simulated days, no wall-clock waiting
        clk.advance_days(1)
        sim.sync(plant)

    assert plant.growth_stage != "seed"  # the loop advanced under the test clock


def test_advancing_the_clock_never_touches_the_economy(session):
    """The mission invariant: a test clock must not alter the real economy."""
    player_id, plant = _seed_a_plant(session)
    session.flush()
    before = balance(session, player_id)

    clk = make_test_clock(TEST_EPOCH)
    sim = SimulationService(session, config=CFG, clock=clk)
    for _ in range(40):
        clk.advance_days(1)
        sim.sync(plant)
    session.flush()

    # Pure time advancement posts no ledger entries and changes no balance.
    assert balance(session, player_id) == before
    assert isinstance(before, Decimal)
