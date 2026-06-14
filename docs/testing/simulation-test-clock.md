# Simulation Test Clock (STEP 3)

> A safe way for tests and QA to advance **simulated** time and exercise the grow
> loop without wall-clock waiting — and without ever touching production timing or
> the economy.

## Why it exists

The simulation engine is **compute-on-read**: `engine.catch_up(...)` advances a
plant from its `last_tick_at` up to a `now` it is *given*. Every service takes
that `now` from an injected **clock** (`clock.now()`), defaulting to the real
wall clock. So the entire grow loop can be fast-forwarded simply by swapping in a
clock you control and advancing it — no `sleep`, no real days passing.

This is the seam STEP 4's end-to-end grow-loop test builds on.

## The pieces

All in `src/growpodempire/simulation/clock.py`:

| Symbol | Role |
|--------|------|
| `Clock` | Protocol: anything with `now() -> datetime`. |
| `SystemClock` | Real wall-clock (UTC). **The production default.** |
| `TestClock` | Controllable clock: `advance(...)`, `advance_hours(h)`, `advance_days(d)`, `set(when)`. |
| `FrozenClock` | Back-compat alias for `TestClock` (the original name the suite uses). |
| `new_test_clock(start=None)` | **Gated factory** — the sanctioned entry point. Fails closed unless the boundary is open. |
| `TestClockDisabled` | Raised by `new_test_clock` when the boundary is closed. |

## The safe config boundary

`ENABLE_TEST_CLOCK` (env → `Settings.enable_test_clock`) defaults to **`false`**.

- **Direct construction** (`TestClock(start)` / `FrozenClock(start)`) is always
  allowed and is how the test suite injects a clock through each service's
  `clock=` parameter. It only affects the service instance you hand it to — it
  cannot reach a live player.
- **The gated factory** `new_test_clock()` is what any *runtime/QA tooling*
  should call. It **fails closed** with `TestClockDisabled` unless
  `ENABLE_TEST_CLOCK` is on, so a production process can never mint a
  time-warping clock through the sanctioned path.

The flag is surfaced as `app.config["ENABLE_TEST_CLOCK"]` for visibility; no HTTP
route consumes it today (see *Not in scope* below).

## Allowed usage

**In backend tests** — inject a `TestClock` and advance it. Reusable helpers live
in `tests/helpers/clock.py`:

```python
from helpers.clock import make_test_clock, anchor_plant_times, TEST_EPOCH
from growpodempire.services.simulation_service import SimulationService

clk = make_test_clock(TEST_EPOCH)
anchor_plant_times(plant, TEST_EPOCH)        # pin a fresh plant's time fields
sim = SimulationService(session, clock=clk)
for _ in range(40):                          # 40 simulated days, instantly
    clk.advance_days(1)
    sim.sync(plant)                          # compute-on-read catch-up
```

**In a dev/QA process** — set `ENABLE_TEST_CLOCK=true` and obtain a clock through
`new_test_clock()`; inject it explicitly into the service(s) under test. Never
set this flag in production.

## Invariants this guarantees (and tests prove)

`tests/test_simulation_test_clock.py` covers:

- The clock is deterministic — `now()` is stable until advanced; advance/set move
  by exactly the delta.
- `FrozenClock` still works (65+ existing tests depend on the name).
- `ENABLE_TEST_CLOCK` defaults off; `new_test_clock` raises `TestClockDisabled`
  when off and returns a `TestClock` when on.
- **Economy neutrality** — advancing the clock and re-syncing moves the plant
  through its lifecycle but posts **no ledger entries** and changes **no
  balance**. Time travel cannot mint money.

## Not in scope (natural next checkpoint)

A *running-server* "time-travel" HTTP endpoint that injects a shared clock
app-wide is intentionally **not** built here: it would touch every service's
construction path and add API surface, so it needs owner sign-off. The boundary
above is designed so that such an endpoint, if later added, still cannot function
in production unless `ENABLE_TEST_CLOCK` is deliberately flipped on.
