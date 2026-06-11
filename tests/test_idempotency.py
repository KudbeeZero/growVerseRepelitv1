"""Idempotency-Key replay + one-shot grant uniqueness (RISK #6 remainder).

The concurrency core (optimistic lock / CHECK / harvest-once) made double
*effects* DB-impossible; these tests prove the layer on top:
  * a duplicate `Idempotency-Key` replays the original response without
    re-running the effect (key + effect commit in one transaction),
  * the daily stipend and achievement faucets are one-shot at the DB level,
    so a raced double-claim can't double-pay.
"""

import os
import sys
from datetime import datetime

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm.exc import StaleDataError

from growpodempire.api.flask_api import create_app
from growpodempire.db.models import GrantClaim, IdempotencyKey, LedgerEntry
from growpodempire.db.session import get_sessionmaker, session_scope
from growpodempire.enums import LedgerEntryType
from growpodempire.services.game_service import GameService
from growpodempire.services.progression_service import ProgressionService
from growpodempire.simulation.clock import FrozenClock

BASE = datetime(2025, 1, 1, 12, 0, 0)


@pytest.fixture()
def client(db):
    app = create_app(init_database=False)
    with app.app_context():
        try:
            from growpodempire.api.ratelimit import limiter

            limiter.reset()
        except Exception:
            pass
    return app.test_client()


def _new_player(client, username="idem"):
    r = client.post("/api/game/players", json={"username": username})
    assert r.status_code == 201, r.get_data(as_text=True)
    body = r.get_json()
    return body["id"], body["api_key"]


def _first_strain_id(client):
    return client.get("/api/game/strains").get_json()[0]["id"]


def _balance(client, pid, key):
    return float(
        client.get(
            f"/api/game/players/{pid}/wallet", headers={"X-API-Key": key}
        ).get_json()["balance"]
    )


# ----- Idempotency-Key header: replay semantics ---------------------------
def test_duplicate_key_replays_original_response(client):
    """The same key on the same request returns the original body and pays/
    debits exactly once — the effect does not re-run."""
    pid, key = _new_player(client)
    sid = _first_strain_id(client)
    h = {"X-API-Key": key, "Idempotency-Key": "buy-1"}
    before = _balance(client, pid, key)

    first = client.post(
        f"/api/game/players/{pid}/seeds/buy", json={"strain_id": sid}, headers=h
    )
    assert first.status_code == 201
    assert "Idempotency-Replayed" not in first.headers
    after_one = _balance(client, pid, key)
    assert after_one < before  # debited once

    second = client.post(
        f"/api/game/players/{pid}/seeds/buy", json={"strain_id": sid}, headers=h
    )
    assert second.status_code == 201
    assert second.headers.get("Idempotency-Replayed") == "true"
    assert second.get_json() == first.get_json()  # byte-for-byte original body
    assert _balance(client, pid, key) == after_one  # NOT debited again
    # Inventory also unchanged: still one stack of 1 seed, not 2.
    seeds = client.get(
        f"/api/game/players/{pid}/seeds", headers={"X-API-Key": key}
    ).get_json()
    assert sum(s["quantity"] for s in seeds) == 1


def test_without_header_requests_run_normally(client):
    """No header -> no idempotency: two identical buys debit twice (opt-in)."""
    pid, key = _new_player(client)
    sid = _first_strain_id(client)
    h = {"X-API-Key": key}
    client.post(f"/api/game/players/{pid}/seeds/buy", json={"strain_id": sid}, headers=h)
    one = _balance(client, pid, key)
    client.post(f"/api/game/players/{pid}/seeds/buy", json={"strain_id": sid}, headers=h)
    assert _balance(client, pid, key) < one


def test_key_reuse_on_a_different_request_is_rejected(client):
    """A key is bound to the request it first ran; reusing it elsewhere is a
    client bug -> 400, never a silent wrong-body replay."""
    pid, key = _new_player(client)
    sid = _first_strain_id(client)
    h = {"X-API-Key": key, "Idempotency-Key": "one-key"}
    r = client.post(
        f"/api/game/players/{pid}/seeds/buy", json={"strain_id": sid}, headers=h
    )
    assert r.status_code == 201
    r2 = client.post(f"/api/game/players/{pid}/pods", json={"name": "Tent"}, headers=h)
    assert r2.status_code == 400
    assert "different request" in r2.get_json()["error"]


def test_malformed_key_is_a_clean_400(client):
    pid, key = _new_player(client)
    sid = _first_strain_id(client)
    h = {"X-API-Key": key, "Idempotency-Key": "has spaces!"}
    r = client.post(
        f"/api/game/players/{pid}/seeds/buy", json={"strain_id": sid}, headers=h
    )
    assert r.status_code == 400
    assert "Idempotency-Key" in r.get_json()["error"]


def test_same_endpoint_key_reuse_with_different_body_is_rejected(client):
    """The fingerprint binds the key to the BODY too: same URL + same key with
    a different payload is a client bug -> 400, never a wrong-body replay."""
    pid, key = _new_player(client)
    sid = _first_strain_id(client)
    h = {"X-API-Key": key, "Idempotency-Key": "body-bound"}
    r = client.post(
        f"/api/game/players/{pid}/seeds/buy", json={"strain_id": sid}, headers=h
    )
    assert r.status_code == 201
    r2 = client.post(
        f"/api/game/players/{pid}/seeds/buy",
        json={"strain_id": sid, "note": "different body"},
        headers=h,
    )
    assert r2.status_code == 400
    assert "different request" in r2.get_json()["error"]


def test_create_listing_duplicate_key_charges_fee_once(client):
    """Listing is a money mutation (fee + seed escrow): a duplicate key replays
    instead of double-charging — a fresh second run would 400 (seeds escrowed)."""
    pid, key = _new_player(client)
    sid = _first_strain_id(client)
    h = {"X-API-Key": key}
    seed_id = client.post(
        f"/api/game/players/{pid}/seeds/buy", json={"strain_id": sid}, headers=h
    ).get_json()["id"]
    hk = {**h, "Idempotency-Key": "list-1"}
    body = {"seed_id": seed_id, "quantity": 1, "unit_price": "5.00"}
    first = client.post(f"/api/game/players/{pid}/market/list", json=body, headers=hk)
    assert first.status_code == 201, first.get_data(as_text=True)
    bal = _balance(client, pid, key)
    second = client.post(f"/api/game/players/{pid}/market/list", json=body, headers=hk)
    assert second.status_code == 201
    assert second.headers.get("Idempotency-Replayed") == "true"
    assert second.get_json() == first.get_json()
    assert _balance(client, pid, key) == bal  # fee charged exactly once


def test_create_auction_duplicate_key_escrows_once(client):
    """Auction creation escrows seeds: a duplicate key replays the original
    listing instead of escrowing again."""
    pid, key = _new_player(client)
    sid = _first_strain_id(client)
    h = {"X-API-Key": key}
    seed_id = client.post(
        f"/api/game/players/{pid}/seeds/buy", json={"strain_id": sid}, headers=h
    ).get_json()["id"]
    hk = {**h, "Idempotency-Key": "auction-1"}
    body = {"seed_id": seed_id, "quantity": 1, "min_bid": "1.00"}
    first = client.post(f"/api/game/players/{pid}/market/auction", json=body, headers=hk)
    assert first.status_code == 201, first.get_data(as_text=True)
    second = client.post(f"/api/game/players/{pid}/market/auction", json=body, headers=hk)
    assert second.status_code == 201
    assert second.headers.get("Idempotency-Replayed") == "true"
    assert second.get_json() == first.get_json()
    seeds = client.get(
        f"/api/game/players/{pid}/seeds", headers=h
    ).get_json()
    assert sum(s["quantity"] for s in seeds) == 0  # escrowed once, not twice


def test_start_cure_duplicate_key_replays_without_resetting(client):
    """Curing is a one-way state transition: a duplicate key replays the
    original response — a fresh second run would 400 ('already curing') and a
    raced one would reset the cure clock."""
    pid, key = _new_player(client)
    with session_scope() as s:
        from growpodempire.db.models import Strain

        svc = GameService(s)
        strain = s.query(Strain).first()
        stack = svc.buy_seed(pid, strain.id)
        pod = svc.create_pod(pid, "Tent", charge=False)
        plant = svc.plant_seed(pid, stack.id, pod.id)
        harvest_id = svc.harvest_plant(
            pid, plant.id, weight_g=50, quality=80, sell=False
        ).id
    hk = {"X-API-Key": key, "Idempotency-Key": "cure-1"}
    first = client.post(
        f"/api/game/players/{pid}/harvests/{harvest_id}/cure", json={}, headers=hk
    )
    assert first.status_code == 200, first.get_data(as_text=True)
    second = client.post(
        f"/api/game/players/{pid}/harvests/{harvest_id}/cure", json={}, headers=hk
    )
    assert second.status_code == 200
    assert second.headers.get("Idempotency-Replayed") == "true"
    assert second.get_json() == first.get_json()  # cure clock not reset


def test_failed_request_stores_nothing_so_retry_runs_fresh(client):
    """An error response is never recorded: the same key retried after a 400
    executes for real (only committed effects pin a response)."""
    pid, key = _new_player(client)
    h = {"X-API-Key": key, "Idempotency-Key": "retry-after-fail"}
    r = client.post(
        f"/api/game/players/{pid}/seeds/buy", json={"strain_id": "nope"}, headers=h
    )
    assert r.status_code == 400
    sid = _first_strain_id(client)
    r2 = client.post(
        f"/api/game/players/{pid}/seeds/buy", json={"strain_id": sid}, headers=h
    )
    assert r2.status_code == 201
    assert "Idempotency-Replayed" not in r2.headers


def test_claim_daily_duplicate_key_replays_single_stipend(client):
    """The faucet path end-to-end: a double-submitted daily claim with one key
    pays once and replays; the ledger holds exactly one stipend entry."""
    pid, key = _new_player(client)
    h = {"X-API-Key": key, "Idempotency-Key": "daily-1"}
    first = client.post(f"/api/game/players/{pid}/daily", headers=h)
    assert first.status_code == 201
    second = client.post(f"/api/game/players/{pid}/daily", headers=h)
    assert second.status_code == 201
    assert second.headers.get("Idempotency-Replayed") == "true"
    assert second.get_json() == first.get_json()

    with session_scope() as s:
        stipends = (
            s.query(LedgerEntry)
            .filter_by(player_id=pid, entry_type=LedgerEntryType.DAILY_STIPEND.value)
            .count()
        )
    assert stipends == 1


# ----- Concurrency: raced duplicates roll back whole ----------------------
def test_concurrent_same_key_loser_rolls_back(session):
    """Two requests with the same key that both miss the replay lookup collide
    on the unique (player_id, key) at commit — the loser's transaction (and
    with it, its effect) rolls back."""
    pid = GameService(session).create_player("keyrace").id
    session.commit()

    SM = get_sessionmaker()
    s1, s2 = SM(), SM()
    try:
        for s in (s1, s2):
            s.add(IdempotencyKey(
                player_id=pid, key="K", request_fingerprint="POST /x",
                response_json="{}", status_code=201,
            ))
        s1.commit()
        with pytest.raises(IntegrityError):
            s2.commit()
        s2.rollback()
    finally:
        s1.close()
        s2.close()


def test_concurrent_stipend_claims_pay_once(session):
    """Two interleaved daily claims both pass the cooldown read, but the
    (player, day) unique grant claim lets exactly one commit — the faucet
    pays once, never twice."""
    pid = GameService(session).create_player("stipendrace").id
    session.commit()

    SM = get_sessionmaker()
    s1, s2 = SM(), SM()
    try:
        ProgressionService(s1, clock=FrozenClock(BASE)).claim_daily(pid)
        ProgressionService(s2, clock=FrozenClock(BASE)).claim_daily(pid)
        s1.commit()
        # Loser hits the unique grant claim (or the wallet's optimistic lock,
        # whichever flushes first) — either way the whole grant rolls back.
        with pytest.raises((IntegrityError, StaleDataError)):
            s2.commit()
        s2.rollback()
    finally:
        s1.close()
        s2.close()

    session.expire_all()
    stipends = (
        session.query(LedgerEntry)
        .filter_by(player_id=pid, entry_type=LedgerEntryType.DAILY_STIPEND.value)
        .count()
    )
    assert stipends == 1
    assert session.query(GrantClaim).filter_by(player_id=pid).count() == 1


def test_grant_claim_unique_is_enforced(session):
    """The DB index itself: two identical grant claims cannot both persist."""
    pid = GameService(session).create_player("grantdup").id
    session.add(GrantClaim(player_id=pid, grant_type="achievement", grant_key="first_harvest"))
    session.add(GrantClaim(player_id=pid, grant_type="achievement", grant_key="first_harvest"))
    with pytest.raises(IntegrityError):
        session.flush()
    session.rollback()


def test_concurrent_achievement_claims_pay_once(session):
    """Raced double-claim of one achievement: exactly one reward posts."""
    svc = GameService(session)
    p = svc.create_player("achrace")
    # Unlock first_harvest for real.
    from growpodempire.db.models import Strain

    strain = session.query(Strain).first()
    stack = svc.buy_seed(p.id, strain.id)
    pod = svc.create_pod(p.id, "Tent", charge=False)
    plant = svc.plant_seed(p.id, stack.id, pod.id)
    svc.harvest_plant(p.id, plant.id, weight_g=50, quality=80)
    session.commit()

    SM = get_sessionmaker()
    s1, s2 = SM(), SM()
    try:
        ProgressionService(s1, clock=FrozenClock(BASE)).claim_achievement(p.id, "first_harvest")
        ProgressionService(s2, clock=FrozenClock(BASE)).claim_achievement(p.id, "first_harvest")
        s1.commit()
        with pytest.raises((IntegrityError, StaleDataError)):
            s2.commit()
        s2.rollback()
    finally:
        s1.close()
        s2.close()

    session.expire_all()
    rewards = (
        session.query(LedgerEntry)
        .filter_by(
            player_id=p.id,
            entry_type=LedgerEntryType.REWARD.value,
            ref_type="achievement",
            ref_id="first_harvest",
        )
        .count()
    )
    assert rewards == 1
