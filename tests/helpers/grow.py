"""
Reusable deterministic grow-loop harness (PR #31 / STEP 4).

Drives the REAL services under an injected ``FrozenClock`` — no wall-clock
waiting — so CI (and a future FTUE/tutorial test) can grow a plant from seed to
harvest in milliseconds and fully reproducibly. Each step advances the clock and
lets the compute-on-read engine catch up, exactly like a live poll advances the
simulation.

Keep this layer test-only and thin: it composes the public service API the game
already exposes (no private engine pokes), so if the loop here passes, the loop a
real player walks passes too.
"""

from datetime import datetime
from typing import Tuple

from growpodempire.services.game_service import GameService, GameError
from growpodempire.services.progression_service import ProgressionService
from growpodempire.services.simulation_service import SimulationService
from growpodempire.simulation.clock import FrozenClock

# A fixed, arbitrary epoch so every run starts from the same instant.
BASE = datetime(2025, 1, 1, 12, 0, 0)


def make_services(session, clock) -> Tuple[GameService, SimulationService, ProgressionService]:
    """A GameService + SimulationService + ProgressionService sharing one
    session, config, and clock — so time advances coherently across all of them."""
    svc = GameService(session, clock=clock)
    sim = SimulationService(session, config=svc.cfg, clock=clock)
    prog = ProgressionService(session, config=svc.cfg, clock=clock)
    return svc, sim, prog


def plant_and_anchor(svc: GameService, session, clock: FrozenClock, player_id, seed_id, pod_id):
    """Plant a seed and anchor its simulation clock to the FrozenClock.

    A plant's time fields (planted_at / last_tick_at / stage_entered_at) default
    to the ORM wall-clock (datetime.utcnow), which sits in the FrozenClock's
    *future* — so without this, catch-up sees negative elapsed time and the plant
    never grows. Re-stamping them to clock.now() makes the grow fully
    clock-driven and deterministic.
    """
    plant = svc.plant_seed(player_id, seed_id, pod_id)
    now = clock.now()
    plant.planted_at = now
    plant.last_tick_at = now
    plant.stage_entered_at = now
    session.flush()
    return plant


def grow_to_harvest(
    svc: GameService,
    sim: SimulationService,
    prog: ProgressionService,
    clock: FrozenClock,
    player_id: str,
    plant_id: str,
    *,
    step_hours: int = 24,
    max_steps: int = 400,
) -> Tuple[object, int]:
    """Advance the clock one in-game day at a time until the plant is harvest-ready.

    Per step (mirrors a daily player check-in): advance the clock, claim the daily
    stipend (the faucet that funds a long grow), trigger compute-on-read catch-up,
    then keep the plant alive — water (free) and feed when low, treat pests/disease
    when present. Returns ``(plant, steps_taken)``.

    Raises AssertionError if the plant dies or never ripens within ``max_steps`` —
    either is a real regression in stage timing or the survival economy.
    """
    for step in range(1, max_steps + 1):
        clock.advance(hours=step_hours)

        # Daily stipend: a player logging in each day. Cooldown-guarded, so just
        # try and ignore the "too soon" error if a step lands inside the cooldown.
        try:
            prog.claim_daily(player_id)
        except GameError:
            pass

        plant = sim.get_state(player_id, plant_id)
        assert plant.is_alive, f"plant died during grow at step {step}"

        # Keep it alive. Water is free; feed/treat cost GROW (funded by stipend).
        if plant.water_level < 60:
            sim.water(player_id, plant_id)
        if plant.nutrient_level < 40:
            sim.feed(player_id, plant_id)
        if plant.pest_level > 0:
            sim.treat_pests(player_id, plant_id)
        if plant.disease_level > 0:
            sim.treat_disease(player_id, plant_id)

        if sim.forecast(plant)["is_harvest_ready"]:
            return plant, step

    raise AssertionError(f"plant not harvest-ready after {max_steps} steps")
