"""The MVP feature-flag layer gates non-MVP systems off (api/feature_gates.py).

A gated route 404s when its flag is off and is reachable when on; the gate runs
*before* auth; and the core grow loop is never affected by the flags.
"""
import pytest

from growpodempire.api.flask_api import create_app
from growpodempire.config import get_settings


def _client(monkeypatch, **flags):
    """A test client for an app built with the given ENABLE_* flags."""
    for key, val in flags.items():
        monkeypatch.setenv(key, val)
    get_settings.cache_clear()
    return create_app(init_database=False).test_client()


# One representative public read per gated system.
GATED_READS = [
    ("ENABLE_MARKETPLACE", "/api/game/market"),
    ("ENABLE_CUP", "/api/game/cup/current"),
    ("ENABLE_CUP", "/api/game/cup/hall-of-fame"),
    ("ENABLE_UNIVERSITY", "/api/game/university/catalog"),
]


@pytest.mark.parametrize("flag,path", GATED_READS)
def test_gated_read_404_when_disabled(db, monkeypatch, flag, path):
    client = _client(monkeypatch, **{flag: "false"})
    assert client.get(path).status_code == 404


@pytest.mark.parametrize("flag,path", GATED_READS)
def test_gated_read_reachable_when_enabled(db, monkeypatch, flag, path):
    client = _client(monkeypatch, **{flag: "true"})
    assert client.get(path).status_code == 200


def test_gate_runs_before_auth(db, monkeypatch):
    """A gated write 404s even with no API key — the gate precedes auth."""
    client = _client(monkeypatch, ENABLE_CHAIN="false")
    r = client.post(
        "/api/game/players/nobody/wallet/link", json={"address": "ADDR"}
    )
    assert r.status_code == 404  # not 401: hidden system looks absent


def test_core_loop_unaffected_when_all_disabled(db, monkeypatch):
    """With every non-MVP flag off, the core grow loop stays reachable."""
    client = _client(
        monkeypatch,
        ENABLE_MARKETPLACE="false",
        ENABLE_CHAIN="false",
        ENABLE_CUP="false",
        ENABLE_UNIVERSITY="false",
        ENABLE_CONTRACTS="false",
    )
    assert client.get("/api/game/strains").status_code == 200
