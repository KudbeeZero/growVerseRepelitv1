"""Seasonal Cannabis Cup: entry, deterministic judging, lifetime champion rewards."""

import copy
import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import pytest

from growpodempire.db.models import CupEntry, LedgerEntry, Strain, SeedInventory
from growpodempire.economy.config import EconomyConfig, load_economy_config
from growpodempire.economy.ledger import balance
from growpodempire.enums import LedgerEntryType
from growpodempire.economy import pricing
from growpodempire.services.game_service import GameService, GameError
from growpodempire.services.cup_service import CupService
from growpodempire.simulation.clock import FrozenClock

CFG = load_economy_config()
BASE = datetime(2026, 1, 1)
LATE = BASE + timedelta(days=91)  # past the 90-day window


def _cfg_season(season):
    raw = copy.deepcopy(CFG.raw)
    raw["events"]["current_season"] = season
    return EconomyConfig(raw=raw)


def _harvest(svc, pid, slug="blue-dream", grams=100, quality=80):
    strain = svc.session.query(Strain).filter(Strain.slug == slug).one()
    stack = svc.buy_seed(pid, strain.id)
    pod = svc.create_pod(pid, "Tent", charge=False)
    plant = svc.plant_seed(pid, stack.id, pod.id)
    return svc.harvest_plant(pid, plant.id, weight_g=grams, quality=quality, sell=False)


# ----- pure scoring -----------------------------------------------------------
def test_cup_score_is_deterministic_and_monotonic():
    a = pricing.cup_score(120, 100, "rare", CFG, thc_actual=25, terpene_intensity=0.8)
    b = pricing.cup_score(120, 100, "rare", CFG, thc_actual=25, terpene_intensity=0.8)
    assert a == b                       # deterministic
    low_q = pricing.cup_score(120, 40, "rare", CFG, thc_actual=25, terpene_intensity=0.8)
    assert a > low_q                    # quality raises score
    common = pricing.cup_score(120, 100, "common", CFG, thc_actual=25, terpene_intensity=0.8)
    assert a > common                   # rarity prestige multiplier


# ----- entry ------------------------------------------------------------------
def test_enter_charges_fee_and_scores(session):
    svc = GameService(session)
    p = svc.create_player("cupper")
    h = _harvest(svc, p.id)
    before = balance(session, p.id)
    cup = CupService(session, clock=FrozenClock(BASE))
    out = cup.enter(p.id, h.id)
    assert out["score"] > 0
    assert balance(session, p.id) == before - 100      # entry fee sink
    assert cup.current_cup().prize_pool == 100


def test_double_entry_of_same_harvest_blocked(session):
    svc = GameService(session)
    p = svc.create_player("dupe")
    h = _harvest(svc, p.id)
    cup = CupService(session, clock=FrozenClock(BASE))
    cup.enter(p.id, h.id)
    with pytest.raises(GameError):
        cup.enter(p.id, h.id)


def test_max_entries_enforced(session):
    svc = GameService(session)
    p = svc.create_player("eager")
    cup = CupService(session, clock=FrozenClock(BASE))
    for _ in range(3):
        cup.enter(p.id, _harvest(svc, p.id).id)
    with pytest.raises(GameError):
        cup.enter(p.id, _harvest(svc, p.id).id)


# ----- judging + lifetime rewards --------------------------------------------
def test_judging_crowns_champion_with_lifetime_rewards(session):
    svc = GameService(session)
    a = svc.create_player("ace")        # best
    b = svc.create_player("bee")
    c = svc.create_player("cee")        # worst
    early = CupService(session, clock=FrozenClock(BASE))
    early.enter(a.id, _harvest(svc, a.id, grams=120, quality=100).id)
    early.enter(b.id, _harvest(svc, b.id, grams=100, quality=80).id)
    early.enter(c.id, _harvest(svc, c.id, grams=80, quality=50).id)

    a_before = balance(session, a.id)
    # Time advances past the season window -> auto-judge on read.
    cup = CupService(session, clock=FrozenClock(LATE)).current_cup()
    assert cup.status == "judged" and cup.winner_id == a.id

    # Lifetime title.
    champ_player = session.get(type(a), a.id)
    assert champ_player.cannabis_cup_title and "Champion" in champ_player.cannabis_cup_title

    # One-of-a-kind legendary trophy strain, created by the winner, descended
    # from the winning genetics.
    champion = (
        session.query(Strain)
        .filter(Strain.rarity == "legendary", Strain.created_by_player_id == a.id)
        .one()
    )
    assert champion.id == cup.champion_strain_id
    assert champion.parent_a_id is not None
    # Winner holds a seed of the trophy strain.
    seed = (
        session.query(SeedInventory)
        .filter(SeedInventory.player_id == a.id, SeedInventory.strain_id == champion.id)
        .one()
    )
    assert seed.quantity >= 1
    # First-place prize paid + XP.
    assert balance(session, a.id) == a_before + 2500
    assert champ_player.xp >= 500


def test_judging_is_idempotent(session):
    svc = GameService(session)
    p = svc.create_player("solo")
    CupService(session, clock=FrozenClock(BASE)).enter(p.id, _harvest(svc, p.id).id)
    cup1 = CupService(session, clock=FrozenClock(LATE)).current_cup()
    bal = balance(session, p.id)
    legendaries = session.query(Strain).filter(Strain.rarity == "legendary").count()
    # Re-read after judging: no double payout, no duplicate trophy.
    cup2 = CupService(session, clock=FrozenClock(LATE)).get_cup(cup1.id)
    assert cup2.status == "judged"
    assert balance(session, p.id) == bal
    assert session.query(Strain).filter(Strain.rarity == "legendary").count() == legendaries


def test_prize_payouts_bounded_by_pool_plus_sponsorship(session):
    """The faucet bound: with a tiny house sponsorship, a single-entry cup pays
    exactly prize_pool + house_sponsorship — NOT the full configured first prize."""
    raw = copy.deepcopy(CFG.raw)
    raw["cannabis_cup"]["house_sponsorship"] = 150
    cfg = EconomyConfig(raw=raw)
    svc = GameService(session)
    p = svc.create_player("capped")
    h = _harvest(svc, p.id)
    CupService(session, config=cfg, clock=FrozenClock(BASE)).enter(p.id, h.id)
    before = balance(session, p.id)

    cup = CupService(session, config=cfg, clock=FrozenClock(LATE)).current_cup()
    assert cup.status == "judged"
    # budget = pool (1 entry * 100 fee) + sponsorship (150) = 250 < first (2500)
    assert balance(session, p.id) == before + Decimal("250")
    entry = session.query(CupEntry).filter(CupEntry.cup_id == cup.id).one()
    assert entry.prize_grow == Decimal("250")  # ACTUAL paid amount recorded
    # The ledger-level invariant: sum(CUP_PRIZE_PAYOUT) <= pool + sponsorship.
    session.flush()
    paid = [
        e.amount
        for e in session.query(LedgerEntry).filter(
            LedgerEntry.entry_type == LedgerEntryType.CUP_PRIZE_PAYOUT.value,
            LedgerEntry.ref_type == "cup",
            LedgerEntry.ref_id == cup.id,
        )
    ]
    assert sum(paid, Decimal("0")) <= cup.prize_pool + Decimal("150")


def test_prize_budget_pays_top_ranks_first(session):
    """With zero sponsorship the budget is the pool alone; first place absorbs
    it and lower ranks get nothing rather than overdrawing the faucet."""
    raw = copy.deepcopy(CFG.raw)
    raw["cannabis_cup"]["house_sponsorship"] = 0
    cfg = EconomyConfig(raw=raw)
    svc = GameService(session)
    a = svc.create_player("rich_a")
    b = svc.create_player("rich_b")
    early = CupService(session, config=cfg, clock=FrozenClock(BASE))
    early.enter(a.id, _harvest(svc, a.id, grams=120, quality=100).id)
    early.enter(b.id, _harvest(svc, b.id, grams=80, quality=50).id)
    a_before, b_before = balance(session, a.id), balance(session, b.id)

    cup = CupService(session, config=cfg, clock=FrozenClock(LATE)).current_cup()
    assert cup.status == "judged"
    # budget = pool only = 200; first (configured 2500) is clamped to 200,
    # exhausting the budget; second gets 0. Net house emission: zero.
    assert balance(session, a.id) == a_before + Decimal("200")
    assert balance(session, b.id) == b_before


def test_cannot_enter_after_close(session):
    svc = GameService(session)
    p = svc.create_player("late")
    h = _harvest(svc, p.id)
    # Open the cup at BASE, then try to enter from a clock past the window.
    CupService(session, clock=FrozenClock(BASE)).open_current_cup()
    with pytest.raises(GameError):
        CupService(session, clock=FrozenClock(LATE)).enter(p.id, h.id)


# ----- seasons + hall of fame -------------------------------------------------
def test_edition_is_seasonal(session):
    cup = CupService(session, config=_cfg_season("summer"), clock=FrozenClock(BASE)).current_cup()
    assert cup.edition == "2026-summer"
    assert cup.season == "summer"
    assert "Summer 2026" in cup.title


def test_hall_of_fame_records_champions(session):
    svc = GameService(session)
    p = svc.create_player("famous")
    CupService(session, clock=FrozenClock(BASE)).enter(p.id, _harvest(svc, p.id).id)
    CupService(session, clock=FrozenClock(LATE)).current_cup()  # judges
    hof = CupService(session, clock=FrozenClock(LATE)).hall_of_fame()
    assert any(row["winner"] == "famous" and row["champion_strain"] for row in hof)
