"""Invariant / property harness — the "toothpaste back in the tube" layer.

Where `test_properties.py` randomizes the *primitives* (raw ledger posts, the
genetics cross), this harness asserts three system-level invariants over random
sequences of REAL game operations, so a whole CLASS of bug (the instant-harvest
faucet F040, the double-mint F006, a deposit double-credit) is caught by
construction rather than one point-test at a time:

  1. LEDGER CONSERVATION — after any sequence of real service calls,
     `cached_balance == sum(ledger)` and balance never goes negative. Catches any
     code path that moves money without posting a matching ledger row.
  2. COMPUTE-ON-READ DETERMINISM — the simulation is a pure function of
     (state, elapsed time): reading once at N equals reading incrementally to N
     (partition-invariance), and re-reading at the same instant is a no-op
     (idempotence). The engine seeds RNG by (plant_id, hour), so the partition
     test holds the RNG constant — comparing two different plant ids would seed
     two different pest streams (a known pitfall).
  3. NO DOUBLE-CREDIT — every payout/charge entry point is idempotent: invoking
     it twice never moves money twice (harvest, sell, daily stipend, achievement,
     contract, cup judging). Plus the REWARD-overload guard (contracts and
     achievements share LedgerEntryType.REWARD, disambiguated by ref_type) and
     the cup faucet bound (payouts <= prize_pool + house_sponsorship).

No new deps: randomized over fixed seeds, same style as test_properties.py.
"""

import copy
import os
import random
import sys
from datetime import datetime, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import pytest

from growpodempire.db.session import session_scope
from growpodempire.db.models import LedgerEntry, Strain
from growpodempire.economy.config import EconomyConfig, load_economy_config
from growpodempire.economy.ledger import balance, post, recompute_balance
from growpodempire.enums import LedgerEntryType
from growpodempire.services.contract_service import ContractService
from growpodempire.services.cup_service import CupService
from growpodempire.services.game_service import GameService, GameError
from growpodempire.services.progression_service import ProgressionService
from growpodempire.economy.ledger import InsufficientFundsError
from growpodempire.simulation import engine
from growpodempire.simulation.clock import FrozenClock

CFG = load_economy_config()
BASE = datetime(2025, 1, 1, 0, 0, 0)


def _conserved(session, player_id) -> bool:
    """The core ledger invariant: denormalized balance == summed history."""
    return balance(session, player_id) == recompute_balance(session, player_id)


# ===================================================================== #
# Layer 1 — ledger conservation under random REAL operations            #
# ===================================================================== #
def test_ledger_conserved_under_random_operations(db):
    """Drive faucets (daily stipend, harvest sale) and sinks (seed/pod/breed)
    through the real services; the ledger must stay conserved and non-negative
    after every single step, across many seeds."""
    with session_scope() as s:
        ww = s.query(Strain).filter(Strain.slug == "white-widow").one()
        bd = s.query(Strain).filter(Strain.slug == "blue-dream").one()

        for seed in range(12):
            rng = random.Random(seed)
            clock = FrozenClock(BASE)
            gs = GameService(s, clock=clock)
            prog = ProgressionService(s, clock=clock)
            p = gs.create_player(f"inv_{seed}")
            assert _conserved(s, p.id) and balance(s, p.id) >= 0

            for _ in range(25):
                action = rng.choice(["daily", "seed", "pod", "breed", "grow_sell"])
                try:
                    if action == "daily":
                        clock.advance(hours=23)  # clear the cooldown each time
                        prog.claim_daily(p.id)
                    elif action == "seed":
                        gs.buy_seed(p.id, rng.choice([ww.id, bd.id]))
                    elif action == "pod":
                        gs.create_pod(p.id, "Tent", capacity=4, charge=True)
                    elif action == "breed":
                        gs.breed(p.id, ww.id, bd.id)  # base-catalog → accessible
                    elif action == "grow_sell":
                        _grow_and_sell(s, gs, clock, p.id, ww.id)
                except (GameError, InsufficientFundsError):
                    pass  # an unaffordable/invalid action is fine; invariant must still hold
                assert _conserved(s, p.id), f"ledger drift after {action} (seed={seed})"
                assert balance(s, p.id) >= 0, f"negative balance after {action} (seed={seed})"


def _grow_and_sell(s, gs, clock, player_id, strain_id):
    """Buy→plant→mature→harvest→sell one plant, advancing the frozen clock."""
    stack = gs.buy_seed(player_id, strain_id)
    pod = gs.create_pod(player_id, "GrowTent", capacity=4, charge=True)
    plant = gs.plant_seed(player_id, stack.id, pod.id)
    for attr in ("last_tick_at", "stage_entered_at", "planted_at"):
        setattr(plant, attr, clock.now())
    pod.temperature, pod.humidity, pod.ph_level = 24, 50, 6.5
    pod.auto_water = pod.auto_feed = True
    s.flush()
    end = clock.now() + timedelta(days=55)
    engine.catch_up(s, plant, end, CFG)
    clock.set(end)
    if plant.growth_stage in ("flowering", "harvest") and plant.is_alive:
        gs.harvest_plant(player_id, plant.id, sell=True)


# ===================================================================== #
# Layer 2 — compute-on-read determinism (partition + idempotence)       #
# ===================================================================== #
def _make_plant(s, username, strain_slug="white-widow"):
    gs = GameService(s)
    p = gs.create_player(username)
    strain = s.query(Strain).filter(Strain.slug == strain_slug).one()
    stack = gs.buy_seed(p.id, strain.id)
    pod = gs.create_pod(p.id, "T", capacity=4, charge=False)
    plant = gs.plant_seed(p.id, stack.id, pod.id)
    for attr in ("last_tick_at", "stage_entered_at", "planted_at"):
        setattr(plant, attr, BASE)
    pod.temperature, pod.humidity, pod.ph_level = 24, 50, 6.5
    pod.co2_level, pod.light_intensity = 1000, 500
    s.flush()
    return plant


def _state(plant):
    return (
        plant.growth_stage,
        round(plant.height, 4),
        round(plant.health, 4),
        round(plant.lifetime_health_sum, 4),
        plant.lifetime_hours,
        round(plant.water_level, 4),
        round(plant.nutrient_level, 4),
        plant.is_alive,
        sorted(f["condition"] for f in (plant.condition_flags or [])),
    )


def test_catchup_is_partition_invariant(db, monkeypatch):
    """Reading once at N == reading incrementally to N. RNG is held constant
    (seeded by hour only) so two plant rows share one trajectory — otherwise their
    distinct ids would seed distinct pest streams and legitimately diverge."""
    monkeypatch.setattr(engine, "_rng_for", lambda pid, t: random.Random(hash(t.isoformat()) & 0xFFFFFFFF))
    for seed in range(10):
        rng = random.Random(seed)
        with session_scope() as s:
            one = _make_plant(s, f"oneshot_{seed}")
            inc = _make_plant(s, f"incr_{seed}")
            days = rng.randint(20, 60)
            end = BASE + timedelta(days=days)

            engine.catch_up(s, one, end, CFG)  # single jump

            # incremental through random split points
            t = BASE
            while t < end:
                step = min(timedelta(hours=rng.randint(6, 120)), end - t)
                t += step
                engine.catch_up(s, inc, t, CFG)

            assert _state(one) == _state(inc), f"partition divergence at seed={seed}, days={days}"


def test_catchup_is_idempotent(db):
    """A second read at the same instant must not change a thing."""
    for seed in range(8):
        with session_scope() as s:
            plant = _make_plant(s, f"idem_{seed}")
            end = BASE + timedelta(days=20 + seed * 3)
            engine.catch_up(s, plant, end, CFG)
            snap = _state(plant)
            engine.catch_up(s, plant, end, CFG)  # re-read, no time passed
            assert _state(plant) == snap, f"non-idempotent re-read at seed={seed}"


# ===================================================================== #
# Layer 3 — no double-credit at any payout/charge entry point           #
# ===================================================================== #
def test_harvest_is_not_double_creditable(db):
    with session_scope() as s:
        from growpodempire.db.models import GrowPod

        clock = FrozenClock(BASE)
        gs = GameService(s, clock=clock)
        plant = _make_plant(s, "harv")
        pod = s.get(GrowPod, plant.pod_id)
        pod.auto_water = pod.auto_feed = True  # so it reliably reaches flowering
        s.flush()
        end = BASE + timedelta(days=55)
        engine.catch_up(s, plant, end, CFG)
        clock.set(end)
        if plant.growth_stage not in ("flowering", "harvest") or not plant.is_alive:
            pytest.skip("plant did not reach a harvestable state")
        gs.harvest_plant(plant.player_id, plant.id, sell=True)
        bal_after_first = balance(s, plant.player_id)
        with pytest.raises(GameError):
            gs.harvest_plant(plant.player_id, plant.id, sell=True)
        assert balance(s, plant.player_id) == bal_after_first  # no second credit


def test_sell_is_not_double_creditable(db):
    with session_scope() as s:
        gs = GameService(s, clock=FrozenClock(BASE))
        p = gs.create_player("seller")
        ww = s.query(Strain).filter(Strain.slug == "white-widow").one()
        stack = gs.buy_seed(p.id, ww.id)
        pod = gs.create_pod(p.id, "T", capacity=4, charge=False)
        plant = gs.plant_seed(p.id, stack.id, pod.id)
        h = gs.harvest_plant(p.id, plant.id, weight_g=100, quality=80, sell=False)
        gs.sell_harvest(p.id, h.id)
        bal_after_first = balance(s, p.id)
        with pytest.raises(GameError):
            gs.sell_harvest(p.id, h.id)
        assert balance(s, p.id) == bal_after_first


def test_daily_stipend_is_not_double_creditable(db):
    with session_scope() as s:
        clock = FrozenClock(BASE)
        gs = GameService(s, clock=clock)
        prog = ProgressionService(s, clock=clock)
        p = gs.create_player("daily")
        prog.claim_daily(p.id)
        bal_after_first = balance(s, p.id)
        with pytest.raises(GameError):
            prog.claim_daily(p.id)  # still within cooldown
        assert balance(s, p.id) == bal_after_first
        # after the cooldown it credits again (faucet works, just not double)
        clock.advance(hours=23)
        prog.claim_daily(p.id)
        assert balance(s, p.id) > bal_after_first


def _common_contract_cfg():
    """A single deterministic common-rarity template, so fulfill() is reachable
    without rarity-roll loops."""
    raw = copy.deepcopy(CFG.raw)
    raw["contracts"]["templates"] = [
        {"rarity": "common", "grams": 50, "reward": 250, "xp": 0, "weight": 1}
    ]
    return EconomyConfig(raw=raw)


def _unsold_common_harvest(s, gs, player_id, grams=60):
    """One unsold common-rarity harvest (blue-dream is a common catalog strain)."""
    strain = s.query(Strain).filter(Strain.slug == "blue-dream").one()
    stack = gs.buy_seed(player_id, strain.id)
    pod = gs.create_pod(player_id, "T", capacity=4, charge=False)
    plant = gs.plant_seed(player_id, stack.id, pod.id)
    return gs.harvest_plant(player_id, plant.id, weight_g=grams, quality=80, sell=False)


def test_contract_is_not_double_creditable(db):
    """NEW-3: fulfilling a contract twice must raise and not move money twice
    (guarded by `status != "open"`, not by the REWARD ledger entry)."""
    with session_scope() as s:
        clock = FrozenClock(BASE)
        gs = GameService(s, clock=clock)
        p = gs.create_player("contract_idem")
        _unsold_common_harvest(s, gs, p.id)
        cs = ContractService(s, config=_common_contract_cfg(), clock=clock)
        contract = cs.offer(p.id, rng_seed=1)
        cs.fulfill(p.id, contract.id)
        bal_after_first = balance(s, p.id)
        with pytest.raises(GameError):
            cs.fulfill(p.id, contract.id)  # already fulfilled
        assert balance(s, p.id) == bal_after_first
        assert _conserved(s, p.id)


def test_contract_reward_does_not_mark_achievement_claimed(db):
    """NEW-3 cross-contamination guard: contracts and achievements BOTH post
    LedgerEntryType.REWARD; the achievement claim-once check must filter on
    ref_type="achievement" so a contract REWARD whose ref_id collides with an
    achievement key never marks that achievement claimed."""
    with session_scope() as s:
        clock = FrozenClock(BASE)
        gs = GameService(s, clock=clock)
        prog = ProgressionService(s, clock=clock)
        p = gs.create_player("reward_overload")
        # Adversarial: a contract-flavored REWARD whose ref_id IS an achievement key.
        post(
            s, p.id, Decimal("10"), LedgerEntryType.REWARD,
            ref_type="contract", ref_id="first_harvest",
        )
        ach = {a["key"]: a for a in prog.list_achievements(p.id)}
        assert ach["first_harvest"]["claimed"] is False  # not contaminated
        # Unlock it for real; the claim must still work — and pay exactly once.
        _unsold_common_harvest(s, gs, p.id)
        before = balance(s, p.id)
        prog.claim_achievement(p.id, "first_harvest")
        assert balance(s, p.id) > before  # the real claim paid out
        with pytest.raises(GameError):
            prog.claim_achievement(p.id, "first_harvest")  # claim-once holds
        assert _conserved(s, p.id)


def test_cup_judging_is_not_double_payable(db):
    """NEW-3 (cup leg of the no-double-credit layer): judging a closed cup again
    — directly or via the auto-judge-on-read path — must not pay prizes twice."""
    with session_scope() as s:
        gs = GameService(s)
        p = gs.create_player("cup_idem_inv")
        h = _unsold_common_harvest(s, gs, p.id)
        CupService(s, clock=FrozenClock(BASE)).enter(p.id, h.id)
        late = CupService(s, clock=FrozenClock(BASE + timedelta(days=91)))
        cup = late.current_cup()  # window closed -> judges
        assert cup.status == "judged"
        bal_after_judge = balance(s, p.id)
        late.judge(cup)        # explicit re-judge: must be a no-op
        late.get_cup(cup.id)   # auto-judge-on-read path: also a no-op
        assert balance(s, p.id) == bal_after_judge
        assert _conserved(s, p.id)


def test_cup_payouts_conserve_prize_budget(db):
    """NEW-2 conservation invariant: after judging, the sum of CUP_PRIZE_PAYOUT
    ledger entries for a cup never exceeds entries*fee + house_sponsorship —
    the house's per-cup emission is bounded by the balance.yaml sponsorship."""
    with session_scope() as s:
        gs = GameService(s)
        early = CupService(s, clock=FrozenClock(BASE))
        n_entries = 3
        for i in range(n_entries):
            p = gs.create_player(f"cup_cons_{i}")
            h = _unsold_common_harvest(s, gs, p.id, grams=60 + i * 20)
            early.enter(p.id, h.id)
        cup = CupService(s, clock=FrozenClock(BASE + timedelta(days=91))).current_cup()
        assert cup.status == "judged"
        s.flush()
        paid = Decimal("0")
        for e in (
            s.query(LedgerEntry)
            .filter(
                LedgerEntry.entry_type == LedgerEntryType.CUP_PRIZE_PAYOUT.value,
                LedgerEntry.ref_type == "cup",
                LedgerEntry.ref_id == cup.id,
            )
            .all()
        ):
            paid += e.amount
        sponsorship = Decimal(str(CFG.raw["cannabis_cup"]["house_sponsorship"]))
        assert paid <= n_entries * cup.entry_fee + sponsorship
        assert cup.prize_pool == n_entries * cup.entry_fee  # fees fund the pool


def test_achievement_is_not_double_creditable(db):
    with session_scope() as s:
        clock = FrozenClock(BASE)
        gs = GameService(s, clock=clock)
        prog = ProgressionService(s, clock=clock)
        p = gs.create_player("achiever")
        # Unlock something by producing a couple of harvests.
        ww = s.query(Strain).filter(Strain.slug == "white-widow").one()
        for _ in range(3):
            stack = gs.buy_seed(p.id, ww.id)
            pod = gs.create_pod(p.id, "T", capacity=4, charge=False)
            plant = gs.plant_seed(p.id, stack.id, pod.id)
            gs.harvest_plant(p.id, plant.id, weight_g=120, quality=85, sell=True)
        unlocked = [a for a in prog.list_achievements(p.id) if a["unlocked"] and not a["claimed"]]
        if not unlocked:
            pytest.skip("no achievement unlocked in this config")
        key = unlocked[0]["key"]
        prog.claim_achievement(p.id, key)
        bal_after_first = balance(s, p.id)
        with pytest.raises(GameError):
            prog.claim_achievement(p.id, key)
        assert balance(s, p.id) == bal_after_first
