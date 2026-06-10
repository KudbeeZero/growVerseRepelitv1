"""Regression tests for the breed access/self-cross guards (F043) and the
link_wallet address validation + uniqueness guards (F007)."""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from growpodempire.db.session import session_scope
from growpodempire.db.models import Strain
from growpodempire.services.game_service import (
    GameService,
    GameError,
    _is_valid_algorand_address,
)


def _strain(session, slug):
    return session.query(Strain).filter(Strain.slug == slug).one()


# A structurally-valid 58-char base32 Algorand-style address (for tests only).
VALID_ADDR = "A" * 58
VALID_ADDR_2 = "B" * 58


# ----- F043: breed ownership / self-cross --------------------------------
def test_breed_rejects_self_cross(db):
    with session_scope() as s:
        svc = GameService(s)
        p = svc.create_player("selfer")
        a = _strain(s, "blue-dream")
        with pytest.raises(GameError, match="itself"):
            svc.breed(p.id, a.id, a.id, rng_seed=1)


def test_breed_allows_base_catalog_parents(db):
    # Base-catalog strains are publicly buyable, so any player may breed them.
    with session_scope() as s:
        svc = GameService(s)
        p = svc.create_player("catalog_breeder")
        a = _strain(s, "blue-dream")
        b = _strain(s, "white-widow")
        offspring = svc.breed(p.id, a.id, b.id, rng_seed=7)
        assert offspring.parent_a_id == a.id and offspring.parent_b_id == b.id


def test_breed_rejects_strain_player_has_no_access_to(db):
    # Player B breeds a private (non-catalog) strain; Player A — who has never
    # touched it — must not be able to use it as breeding stock.
    with session_scope() as s:
        svc = GameService(s)
        owner = svc.create_player("owner")
        outsider = svc.create_player("outsider")
        a = _strain(s, "haze")
        b = _strain(s, "afghani")
        bred = svc.breed(owner.id, a.id, b.id, rng_seed=42)
        assert bred.is_base_catalog is False

        # Outsider knows the bred strain id but has no seed/plant/harvest of it.
        catalog = _strain(s, "blue-dream")
        with pytest.raises(GameError, match="access"):
            svc.breed(outsider.id, bred.id, catalog.id, rng_seed=43)


def test_breed_allows_strain_player_owns_seed_of(db):
    # The breeder of a strain receives a seed of it, so they retain access to
    # cross their own bred line with a catalog strain.
    with session_scope() as s:
        svc = GameService(s)
        p = svc.create_player("self_owner")
        a = _strain(s, "haze")
        b = _strain(s, "afghani")
        bred = svc.breed(p.id, a.id, b.id, rng_seed=11)  # creator + a seed reward
        catalog = _strain(s, "white-widow")
        offspring = svc.breed(p.id, bred.id, catalog.id, rng_seed=12)
        assert offspring.parent_a_id == bred.id


# ----- F007: link_wallet validation + uniqueness -------------------------
def test_address_validator_accepts_well_formed():
    assert _is_valid_algorand_address(VALID_ADDR)


@pytest.mark.parametrize(
    "bad",
    [
        "",
        "A" * 57,      # too short
        "A" * 59,      # too long
        "a" * 58,      # lowercase not in base32 alphabet
        "1" * 58,      # 0/1/8/9 not in base32 alphabet
        "A" * 57 + "=",  # padding char
    ],
)
def test_address_validator_rejects_malformed(bad):
    assert not _is_valid_algorand_address(bad)


def test_link_wallet_rejects_invalid_address(db):
    with session_scope() as s:
        svc = GameService(s)
        p = svc.create_player("badwallet")
        with pytest.raises(GameError, match="Invalid Algorand address"):
            svc.link_wallet(p.id, "not-a-real-address")


def test_link_wallet_accepts_valid_address(db):
    with session_scope() as s:
        svc = GameService(s)
        p = svc.create_player("goodwallet")
        out = svc.link_wallet(p.id, VALID_ADDR)
        assert out.algorand_address == VALID_ADDR


def test_link_wallet_rejects_duplicate_address(db):
    with session_scope() as s:
        svc = GameService(s)
        p1 = svc.create_player("first")
        p2 = svc.create_player("second")
        svc.link_wallet(p1.id, VALID_ADDR)
        with pytest.raises(GameError, match="already linked"):
            svc.link_wallet(p2.id, VALID_ADDR)


def test_link_wallet_idempotent_relink_same_player(db):
    # Re-linking the same address to the SAME player must not trip the uniqueness
    # guard (the clash query excludes the player themself).
    with session_scope() as s:
        svc = GameService(s)
        p = svc.create_player("relinker")
        svc.link_wallet(p.id, VALID_ADDR)
        out = svc.link_wallet(p.id, VALID_ADDR)
        assert out.algorand_address == VALID_ADDR
