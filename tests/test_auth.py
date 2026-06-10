"""API-key auth on write endpoints."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import pytest

from growpodempire.api.flask_api import create_app


@pytest.fixture()
def client(db):
    return create_app(init_database=False).test_client()


def _new_player(client):
    resp = client.post("/api/game/players", json={"username": "authuser"})
    body = resp.get_json()
    return body["id"], body["api_key"]


def test_create_returns_api_key(client):
    pid, key = _new_player(client)
    assert key and isinstance(key, str) and len(key) > 20


def test_write_requires_key(client):
    pid, key = _new_player(client)
    strains = client.get("/api/game/strains").get_json()
    sid = strains[0]["id"]

    # No key -> 401
    r = client.post(f"/api/game/players/{pid}/seeds/buy", json={"strain_id": sid})
    assert r.status_code == 401

    # Wrong key -> 403
    r = client.post(
        f"/api/game/players/{pid}/seeds/buy",
        json={"strain_id": sid},
        headers={"X-API-Key": "nope"},
    )
    assert r.status_code == 403

    # Correct key -> success
    r = client.post(
        f"/api/game/players/{pid}/seeds/buy",
        json={"strain_id": sid},
        headers={"X-API-Key": key},
    )
    assert r.status_code == 201


def test_reads_stay_public(client):
    # Strain catalog needs no key.
    assert client.get("/api/game/strains").status_code == 200


def test_guest_login_creates_and_resumes(client, monkeypatch):
    monkeypatch.setenv("GPE_DEV_LOGIN", "true")
    from growpodempire.config import get_settings

    get_settings.cache_clear()

    r1 = client.post("/api/game/players/guest", json={"username": "buddy"})
    assert r1.status_code == 200
    body1 = r1.get_json()
    assert body1["api_key"] and body1["username"] == "buddy"

    # Same name resumes the same account (and the key authenticates a write).
    r2 = client.post("/api/game/players/guest", json={"username": "buddy"})
    body2 = r2.get_json()
    assert body2["id"] == body1["id"]

    sid = client.get("/api/game/strains").get_json()[0]["id"]
    buy = client.post(
        f"/api/game/players/{body1['id']}/seeds/buy",
        json={"strain_id": sid},
        headers={"X-API-Key": body1["api_key"]},
    )
    assert buy.status_code == 201


def test_guest_login_can_be_disabled(client, monkeypatch):
    monkeypatch.setenv("GPE_DEV_LOGIN", "false")
    from growpodempire.config import get_settings

    get_settings.cache_clear()
    try:
        r = client.post("/api/game/players/guest", json={"username": "nope"})
        assert r.status_code == 403
    finally:
        get_settings.cache_clear()
