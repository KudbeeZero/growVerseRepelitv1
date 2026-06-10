"""Guest 'quick play' login is secure-by-default OFF.

It returns an existing account's API key for a bare username (account takeover),
so it must be disabled unless an operator explicitly sets GPE_DEV_LOGIN=true.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import pytest

from growpodempire.api.flask_api import create_app


@pytest.fixture()
def client(db):
    return create_app(init_database=False).test_client()


def test_guest_login_off_by_default(client, monkeypatch):
    monkeypatch.delenv("GPE_DEV_LOGIN", raising=False)
    from growpodempire.config import get_settings

    get_settings.cache_clear()
    try:
        r = client.post("/api/game/players/guest", json={"username": "anyone"})
        assert r.status_code == 403
    finally:
        get_settings.cache_clear()


def test_guest_login_opt_in_still_works(client, monkeypatch):
    monkeypatch.setenv("GPE_DEV_LOGIN", "true")
    from growpodempire.config import get_settings

    get_settings.cache_clear()
    try:
        r = client.post("/api/game/players/guest", json={"username": "buddy"})
        assert r.status_code == 200 and r.get_json()["api_key"]
    finally:
        get_settings.cache_clear()
