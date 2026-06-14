"""
Deterministic end-to-end grow loop (PR #31 / STEP 4).

The whole core loop, driven entirely by advancing an injected FrozenClock — no
wall-clock waiting — so it runs in milliseconds and is reproducible in CI:

    create account -> buy seed -> create pod -> set environment -> plant
        -> care -> advance stages (FrozenClock) -> harvest -> sell to NPC
        -> assert the ledger is internally consistent.

This is the MVP smoke test: if the simulation timing, care economy, harvest
faucet, or ledger drift, this fails. It exercises the real services a player
hits, not engine internals.
"""

import os
import sys
from decimal import Decimal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from growpodempire.db.session import session_scope  # noqa: E402
from growpodempire.db.models import Strain  # noqa: E402
from growpodempire.enums import LedgerEntryType  # noqa: E402
from growpodempire.simulation.clock import FrozenClock  # noqa: E402

from helpers.grow import BASE, make_services, plant_and_anchor, grow_to_harvest  # noqa: E402


def test_e2e_grow_loop_sells_and_ledger_balances(db):
    with session_scope() as s:
        clock = FrozenClock(BASE)
        svc, sim, prog = make_services(s, clock)

        # --- Create account (starting grant). --------------------------------
        player = svc.create_player("e2e_grower")
        start_balance = svc.get_wallet(player.id).cached_balance
        assert start_balance == Decimal(str(svc.cfg.starting_balance))

        # --- Buy a seed. -----------------------------------------------------
        strain = s.query(Strain).filter(Strain.slug == "blue-dream").one()
        stack = svc.buy_seed(player.id, strain.id)
        assert stack.quantity == 1

        # --- Create a (charged) starter pod and set a healthy environment. ---
        pod = svc.create_pod(player.id, "E2E Tent", tier="basic", charge=True)
        # Humidity kept below the disease/pest-bonus thresholds so the grow is
        # survivable on a starter pod with periodic care.
        sim.set_environment(
            player.id, pod.id,
            temperature=24.0, humidity=55.0, co2_level=900.0,
            light_intensity=600.0, ph_level=6.2,
        )

        # --- Plant (anchored to the frozen clock so the grow is deterministic). -
        plant = plant_and_anchor(svc, s, clock, player.id, stack.id, pod.id)
        assert plant.growth_stage == "seed"

        # --- A care action up front (guarantees a nutrient-purchase entry). --
        sim.water(player.id, plant.id)
        sim.feed(player.id, plant.id)

        # --- Advance stages deterministically until harvest-ready. -----------
        plant, steps = grow_to_harvest(svc, sim, prog, clock, player.id, plant.id)
        assert plant.growth_stage == "harvest"
        assert steps > 1  # it actually took simulated time, not an instant flip

        # --- Harvest and sell to the NPC market. -----------------------------
        harvest = svc.harvest_plant(player.id, plant.id, sell=True)
        # The session runs autoflush=False (a request commits at its boundary);
        # flush so the harvest-sale ledger row is queryable below, as it would be
        # after a real request commit.
        s.flush()
        assert harvest.sold is True
        assert harvest.weight_g > 0
        assert harvest.sale_value is not None and harvest.sale_value > 0

        # --- Assert the ledger. ----------------------------------------------
        # Pull the FULL ledger (a long grow posts many stipend/care rows; the
        # default limit would truncate and break the integrity sum).
        ledger = svc.get_ledger(player.id, limit=10_000)
        types = {e.entry_type for e in ledger}
        for expected in (
            LedgerEntryType.STARTING_GRANT.value,
            LedgerEntryType.SEED_PURCHASE.value,
            LedgerEntryType.POD_PURCHASE.value,
            LedgerEntryType.NUTRIENT_PURCHASE.value,
            LedgerEntryType.HARVEST_SALE.value,
        ):
            assert expected in types, f"missing ledger entry {expected}"

        # Double-entry integrity: the cached wallet balance is exactly the signed
        # sum of every ledger row — money never appears or vanishes off-ledger.
        ledger_sum = sum((e.amount for e in ledger), Decimal("0"))
        assert svc.get_wallet(player.id).cached_balance == ledger_sum
        assert ledger_sum >= 0  # the CHECK constraint also enforces this
