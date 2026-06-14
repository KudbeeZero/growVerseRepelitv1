"""
Backend test support for STEP 3's simulation test clock.

Reusable helpers so tests and QA harnesses can advance *simulated* time
deterministically without wall-clock waiting and without reaching for
``datetime`` plumbing in every file. The simulation engine is compute-on-read,
so a plant grows simply by advancing the clock and re-syncing.

These helpers construct a ``TestClock`` directly (always allowed). The gated
``new_test_clock`` factory — which honours the ``ENABLE_TEST_CLOCK`` boundary —
is tested separately in ``tests/test_simulation_test_clock.py``.
"""

from datetime import datetime

from growpodempire.simulation.clock import TestClock

# A fixed, deterministic epoch for grow-loop tests. Stable across runs.
TEST_EPOCH = datetime(2025, 1, 1, 0, 0, 0)


def make_test_clock(start: datetime = TEST_EPOCH) -> TestClock:
    """A controllable clock anchored at a deterministic instant."""
    return TestClock(start)


def anchor_plant_times(plant, when: datetime) -> None:
    """Pin a freshly-planted plant's time fields to ``when``.

    ``plant_seed`` stamps ``planted_at``/``last_tick_at``/``stage_entered_at``
    with wall-clock ``utcnow``; re-anchoring them to the test clock's start lets
    the engine's compute-on-read catch-up be driven purely by advancing the
    clock. Mirrors the long-standing pattern in ``tests/test_simulation.py``.
    """
    for attr in ("last_tick_at", "stage_entered_at", "planted_at"):
        if hasattr(plant, attr):
            setattr(plant, attr, when)
