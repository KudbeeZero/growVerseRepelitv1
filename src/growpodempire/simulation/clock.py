"""
Time abstraction so the simulation never calls ``datetime.now()`` directly —
tests and QA inject a controllable clock they can advance deterministically.

The simulation engine is compute-on-read: it advances a plant by reading
``clock.now()``. Swapping the clock therefore advances *simulated* time without
touching wall-clock timing or the economy. Three clocks live here:

* ``SystemClock`` — real wall-clock (UTC). The production default.
* ``TestClock``   — a controllable clock for tests/QA (advance / set).
* ``FrozenClock`` — the original name for the controllable clock, kept as an
  alias so the existing suite keeps working.

**Safe config boundary.** Direct construction of a ``TestClock`` is always
allowed (the test suite injects one explicitly through each service's ``clock=``
parameter). What is *gated* is the convenience factory ``new_test_clock()``,
which is the entry point any runtime/QA tooling should use: it **fails closed**
with ``TestClockDisabled`` unless ``ENABLE_TEST_CLOCK`` is on (default off). So a
production process — where the flag is off — can never mint a controllable clock
through the sanctioned path, and a test clock can never silently drive a live
player's economy. See ``docs/testing/simulation-test-clock.md``.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, Protocol, runtime_checkable


@runtime_checkable
class Clock(Protocol):
    def now(self) -> datetime:  # pragma: no cover - protocol
        ...


class SystemClock:
    """Real wall-clock (UTC). The production default."""

    def now(self) -> datetime:
        return datetime.utcnow()


class TestClock:
    """A controllable clock for tests/QA.

    ``now()`` is pure (same value until advanced), so a compute-on-read
    simulation reading it is fully deterministic. Advance it to drive the grow
    loop forward without any wall-clock waiting.
    """

    # Stop pytest from collecting this as a test class (name starts with "Test").
    __test__ = False

    def __init__(self, start: datetime):
        self._now = start

    def now(self) -> datetime:
        return self._now

    def advance(self, **kwargs) -> datetime:
        """Advance by a ``timedelta`` (e.g. ``advance(hours=3, days=1)``)."""
        self._now = self._now + timedelta(**kwargs)
        return self._now

    def advance_hours(self, hours: float) -> datetime:
        """Advance by whole/fractional simulated hours."""
        return self.advance(hours=hours)

    def advance_days(self, days: float) -> datetime:
        """Advance by whole/fractional simulated days."""
        return self.advance(days=days)

    def set(self, when: datetime) -> None:
        """Pin the clock to an absolute instant."""
        self._now = when


# Back-compat: the controllable clock was originally named ``FrozenClock`` and is
# injected explicitly across the test suite. Keep the name working.
FrozenClock = TestClock


class TestClockDisabled(RuntimeError):
    """Raised when a test clock is requested through the gated factory while
    ``ENABLE_TEST_CLOCK`` is off (i.e. in production)."""

    __test__ = False  # not a pytest test class


def test_clock_enabled(settings=None) -> bool:
    """Whether the safe config boundary permits the test-clock factory.

    Defaults to the cached process settings; pass an explicit ``settings`` to
    check a one-off configuration without touching the global cache.
    """
    if settings is None:
        from ..config import get_settings

        settings = get_settings()
    return bool(getattr(settings, "enable_test_clock", False))


def new_test_clock(start: Optional[datetime] = None, *, settings=None) -> TestClock:
    """Gated factory for a controllable clock (the sanctioned QA/tooling entry).

    Fails closed with :class:`TestClockDisabled` unless ``ENABLE_TEST_CLOCK`` is
    on, so it can never produce a time-warping clock in a production process.
    ``start`` defaults to the current wall-clock instant.
    """
    if not test_clock_enabled(settings):
        raise TestClockDisabled(
            "Test clock is disabled. Set ENABLE_TEST_CLOCK=true (dev/test only) "
            "to use new_test_clock(); production must never enable it."
        )
    return TestClock(start or datetime.utcnow())
