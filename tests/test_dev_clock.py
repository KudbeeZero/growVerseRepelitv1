"""DEV/TEST-ONLY growth acceleration (ScaledClock + GROW_DEV_TIME_SCALE gate).

Guards the Director ruling: acceleration is opt-in and env-gated; PRODUCTION
CADENCE (env var unset) is the canonical real-time SystemClock and is never
distorted. Also covers the /meta surface the UI reads to flag test pacing.
"""

import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import pytest

from growpodempire.simulation.clock import (
    DEV_TIME_SCALE_ENV,
    ScaledClock,
    SystemClock,
    dev_clock,
    dev_time_scale,
)
from growpodempire.api.flask_api import create_app


@pytest.fixture(autouse=True)
def _clear_env(monkeypatch):
    monkeypatch.delenv(DEV_TIME_SCALE_ENV, raising=False)
    yield


def test_unset_means_real_time_system_clock():
    assert dev_time_scale() is None
    assert isinstance(dev_clock(), SystemClock)


def test_set_scale_yields_scaled_clock(monkeypatch):
    monkeypatch.setenv(DEV_TIME_SCALE_ENV, "240")
    assert dev_time_scale() == 240.0
    assert isinstance(dev_clock(), ScaledClock)


@pytest.mark.parametrize("bad", ["", "0", "-5", "abc", "  "])
def test_invalid_or_nonpositive_falls_back_to_real_time(monkeypatch, bad):
    monkeypatch.setenv(DEV_TIME_SCALE_ENV, bad)
    assert dev_time_scale() is None
    assert isinstance(dev_clock(), SystemClock)


def test_scaled_clock_compresses_elapsed_time():
    # Drive a deterministic base clock so the test is not wall-clock dependent.
    class _Tick:
        def __init__(self, start):
            self._t = start

        def now(self):
            return self._t

        def advance(self, **kw):
            self._t += timedelta(**kw)

    base = _Tick(datetime(2026, 1, 1, 0, 0, 0))
    anchor = datetime(2026, 6, 14, 0, 0, 0)
    c = ScaledClock(scale=240.0, anchor=anchor, base=base)

    assert c.now() == anchor  # no real time passed yet
    base.advance(minutes=1)  # one real minute
    # 1 real minute * 240 == 240 perceived minutes == 4 hours.
    assert c.now() == anchor + timedelta(hours=4)


def test_scaled_clock_rejects_nonpositive_scale():
    with pytest.raises(ValueError):
        ScaledClock(scale=0)


def test_meta_endpoint_reports_null_in_production(db):
    client = create_app(init_database=False).test_client()
    r = client.get("/api/game/meta")
    assert r.status_code == 200
    assert r.get_json() == {"dev_time_scale": None}


def test_meta_endpoint_reports_scale_when_gated(db, monkeypatch):
    monkeypatch.setenv(DEV_TIME_SCALE_ENV, "120")
    client = create_app(init_database=False).test_client()
    r = client.get("/api/game/meta")
    assert r.status_code == 200
    assert r.get_json() == {"dev_time_scale": 120.0}
