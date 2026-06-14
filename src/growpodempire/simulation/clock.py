"""
Time abstraction so the simulation never calls datetime.now() directly — tests
inject a FrozenClock they can advance deterministically.
"""

import os
from datetime import datetime, timedelta
from typing import Optional, Protocol

# Env var name for the DEV/TEST-ONLY growth acceleration. See ScaledClock and
# dev_clock(). Unset (the default) ⇒ canonical wall-clock cadence — PRODUCTION
# CADENCE IS NEVER TOUCHED. A prior approach (PR #66) tried to ship a *global*
# simulation.time_scale default for launch; that is explicitly rejected. This is
# opt-in, env-gated, and visibly flagged in the UI when active.
DEV_TIME_SCALE_ENV = "GROW_DEV_TIME_SCALE"


class Clock(Protocol):
    def now(self) -> datetime:  # pragma: no cover - protocol
        ...


class SystemClock:
    """Real wall-clock (UTC)."""

    def now(self) -> datetime:
        return datetime.utcnow()


class ScaledClock:
    """A DEV/TEST-ONLY accelerated wall-clock.

    Reports time as ``anchor + (real_elapsed * scale)``, so a ``scale`` of 240
    compresses a full ~75-day grow into a few real minutes. The simulation stays
    pure and compute-on-read: it just sees a faster-moving ``now`` and catches up
    the plant accordingly. Nothing in the engine, balance.yaml, or the economy is
    changed — this is purely a perception of elapsed time.

    NOT for production. It is constructed only by ``dev_clock()`` when the
    ``GROW_DEV_TIME_SCALE`` env var is set, and the active scale is surfaced to
    the client (``/meta``) so the UI can make it OBVIOUS that test acceleration
    is on. With the var unset the app uses ``SystemClock`` and real cadence.
    """

    def __init__(self, scale: float, anchor: Optional[datetime] = None,
                 base: Optional[Clock] = None):
        if scale <= 0:
            raise ValueError("ScaledClock scale must be > 0")
        self.scale = float(scale)
        self._base = base or SystemClock()
        self._anchor = anchor or self._base.now()
        self._real_start = self._base.now()

    def now(self) -> datetime:
        real_elapsed = self._base.now() - self._real_start
        return self._anchor + real_elapsed * self.scale


def dev_time_scale() -> Optional[float]:
    """Read + validate the dev-acceleration scale from the environment.

    Returns the positive scale factor, or ``None`` when unset/invalid/≤0 (i.e.
    canonical real-time cadence). Kept conservative: a bad value falls back to
    real time rather than ever silently distorting production timing.
    """
    raw = os.environ.get(DEV_TIME_SCALE_ENV)
    if not raw:
        return None
    try:
        scale = float(raw)
    except (TypeError, ValueError):
        return None
    return scale if scale > 0 else None


def dev_clock() -> Clock:
    """Return the dev ScaledClock when ``GROW_DEV_TIME_SCALE`` is set, else the
    canonical SystemClock. This is the single wiring point used by the services
    so production (var unset) is always real-time."""
    scale = dev_time_scale()
    if scale is None:
        return SystemClock()
    return ScaledClock(scale)


class FrozenClock:
    """A controllable clock for tests/simulations."""

    def __init__(self, start: datetime):
        self._now = start

    def now(self) -> datetime:
        return self._now

    def advance(self, **kwargs) -> datetime:
        """Advance by a timedelta (e.g. advance(hours=3, days=1))."""
        self._now = self._now + timedelta(**kwargs)
        return self._now

    def set(self, when: datetime) -> None:
        self._now = when
