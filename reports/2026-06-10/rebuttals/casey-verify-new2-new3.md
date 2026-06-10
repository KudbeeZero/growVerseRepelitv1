# CASEY — independent verification: NEW-2 / NEW-3 (Reese) + check_memory rstrip (orchestrator)

Date: 2026-06-10 · Branch: `claude/grow-chamber-plants-6ud1q4` (uncommitted working tree)
Method: re-ran every claim from scratch with `.venv/bin/python`; mutation-tested the new
tests; re-derived the budget arithmetic numerically. All scratch mutations were restored;
`git status --short` afterwards shows only the builder/orchestrator files (verified below).

## Verdict table

| # | Claim | Verdict |
|---|-------|---------|
| 1 | Full suite 227 passed (baseline 221 + 6) | **CONFIRM** |
| 2 | Coverage ≥ 78 gate; claimed 79.91% | **CONFIRM-WITH-NOTES** (I measured **79.88%**, not 79.91%; gate passes either way) |
| 3 | Ruff E9,F63,F7,F82 clean | **CONFIRM** |
| 4 | `make check-memory` OK (and the rstrip fix is load-bearing) | **CONFIRM** |
| 5 | NEW-2 invariant: payouts ≤ prize_pool + house_sponsorship | **CONFIRM** (adversarial read + numeric sweep; see 5a–5f) |
| 6 | NEW-3 tests have teeth | **CONFIRM** (mutation kill verified) |
| 7 | BACKLOG.md ✅ claims accurate | **CONFIRM-WITH-NOTES** (one rationale is conservative, not tight — see 5f) |
| 8 | No L4 heuristic violations introduced | **CONFIRM** |

## Commands run and outputs

```text
$ .venv/bin/python -m pytest -q
227 passed in 65.66s

$ git stash push -m casey-baseline-check && .venv/bin/python -m pytest --collect-only -q
221 tests collected            # baseline confirmed; stash popped, 227 collected after restore

$ .venv/bin/python -m pytest -q --cov
TOTAL ... 80%
Required test coverage of 78.0% reached. Total coverage: 79.88%
227 passed in 96.60s

$ .venv/bin/python -m ruff check --select=E9,F63,F7,F82 src tests scripts
All checks passed!

$ make check-memory
OK: memory layer integrity verified (links, ✅ claims, codex map).
```

### check_memory rstrip fix is real and load-bearing
I restored the committed (pre-fix) `scripts/check_memory.py` via `git show HEAD:` and ran it:

```text
Memory integrity check FAILED:
  - docs/memory/design/chain/01-asset-lifecycle-contracts.md:6: ✅ cites missing path -> `../00-game-vision.md`
OLD-VERSION EXIT: 1
```

The old `token.strip().strip(".,;:)")` ate the leading `..` of doc-relative paths
(`../00-game-vision.md` → `/00-game-vision.md` → unresolvable). The `rstrip` version
resolves it via the citing doc's directory. Fixed version restored; re-ran `make
check-memory` against the final tree (including the orchestrator's concurrent
`MAP.md`/`design/README.md` chain-codex registrations) → OK. CONFIRM.

## 5. The NEW-2 invariant itself — adversarial line-by-line (`cup_service.py` `judge()`, lines 186–238)

**(a) Decimal end-to-end — YES.** `cup.prize_pool` is a `MONEY`-mapped `Decimal` column
(models.py:423), initialized `Decimal("0")` and incremented by `cup.entry_fee` (Decimal,
models.py:422). Sponsorship enters as `Decimal(str(self._cfg.get("house_sponsorship", 0)))`.
`_prize_for` now returns Decimal (was `float` — the diff removes the last float from this
money path). `min(Decimal, Decimal)`, `budget -= prize`, and `post(..., entry.prize_grow)`
are all Decimal. `post()` additionally runs `to_money()` (quantize 1e-6, ROUND_HALF_UP).
No float touches a `post()`.

**(b) Can the sum exceed pool + sponsorship for ANY entry count — NO.** Inductive: each
payout is `min(configured, budget)` and decrements `budget`; the budget is never
replenished, so Σ payouts ≤ initial budget. Edge cases I checked explicitly:
- **0 entries:** loop body never runs, `if entries:` is falsy, cup flips to "judged" with
  zero payouts. Safe.
- **>10 entries:** `_prize_for(rank>top_n)` returns `Decimal("0")`; `min(0, budget)=0`,
  `if prize > 0` skips the post. Verified numerically for N up to 199 (script below).
- **Hostile config:** negative `house_sponsorship` can make `budget < prize_pool`, but
  `min(prize, budget)` then yields ≤ budget and a negative result fails `prize > 0` — no
  negative posts. Negative configured prizes likewise fail `prize > 0`. Fail-closed.
- **Idempotency:** `status != "open"` early-returns; re-judge and auto-judge-on-read both
  no-op (pinned by `test_cup_judging_is_not_double_payable`, which I re-ran).
- **Residual (pre-existing, not a regression):** the idempotency guard is status-based, so
  two truly concurrent `judge()` calls in separate sessions could both see "open" and
  double-pay. Same class as the F005 concurrency item already on the backlog; cup judging
  fires once per 90 days, so I rate it acceptable to defer — but it belongs under the
  existing `SELECT … FOR UPDATE` follow-up.

**(c) `entry.prize_grow` == ledger amount — YES for any sane config.** `prize_grow` is
assigned first and the same object is passed to `post()`. Theoretical wrinkle: `post()`
quantizes to 1e-6 (ROUND_HALF_UP), so a YAML prize with >6 decimal places would store an
unquantized value on the entry vs a quantized ledger amount. Unreachable with the shipped
integer config; not worth code.

**(d) `Decimal(str(x))` for YAML ints/floats — CORRECT.** Ints are exact; a YAML float
like `99.99` goes through `str()` → `Decimal("99.99")` (the repr round-trip avoids the
binary-float artifact of `Decimal(99.99)`). Matches the ledger's own `to_money` idiom.

**(e) `.get("house_sponsorship", 0)` default — FAIL-CLOSED.** Missing key ⇒ budget =
prize_pool alone ⇒ zero net house emission, prizes degrade rather than overdraw. The
sponsorship-0 path is exercised by `test_prize_budget_pays_top_ranks_first` (same value
the default produces). Correct polarity for a faucet bound.

**(f) Re-deriving 5600 — the bound NEVER clamps under shipped config.** Numeric sweep over
N = 0..199 entries (fee 100; table 2500+1200+600+7×200 = 5700):
- cumulative-configured(k ranks): 2500 / 3700 / 4300 / +200… / 5700 at k=10.
- budget(N) = 100·N + 5600 ≥ cumulative(min(N,10)) for **all** N ≥ 1. **No prize is ever
  clamped at any entry count**; minimum clamping entry count: **does not exist** with the
  default config. Player-visible clamping in practice: none (and irrelevant to the
  3-entries/player cap).
- Max house **net** emission = 4700 GROW, at exactly N=10 (pays 5700 against 1000 fees).
  The minimum sponsorship that never clamps is therefore **4700**, not 5600. The builder's
  "5700 − one entry fee" rationale over-approximates (it assumes the full table is payable
  at N=1, but rank k requires N ≥ k entries). The chosen 5600 is **correct and safe** —
  just 900 GROW more headroom than strictly needed. The BACKLOG/YAML comments describe the
  reasoning honestly; I'd only note the tight bound for the record.

## 6. NEW-3 tests — mutation kill (teeth confirmed)

Scratch-mutated `progression_service._claimed_keys` to drop the
`LedgerEntry.ref_type == "achievement"` filter, re-ran the guard test:

```text
FAILED tests/test_invariants.py::test_contract_reward_does_not_mark_achievement_claimed
1 failed in 0.37s
```

It fails at exactly the contamination assertion (`ach["first_harvest"]["claimed"] is False`,
line 296) — the test pins the guard, not an incidental behavior. Restored; `git diff` of the
file clean afterwards. I also independently read `contract_service.fulfill()` (lines 65–110):
the double-fulfill guard is `status != "open"` plus the deadline expiry path, and the
contract REWARD posts `ref_type="contract"` — so the shared `LedgerEntryType.REWARD` is
fully disambiguated. The builder's "code was already correct, pin it" conclusion is right.

Also mutation-tested NEW-2: removed the `min(..., budget)` clamp in `judge()`:

```text
FAILED tests/test_cup.py::test_prize_payouts_bounded_by_pool_plus_sponsorship
FAILED tests/test_cup.py::test_prize_budget_pays_top_ranks_first
2 failed, 1 passed
```

Both tiny-sponsorship tests kill the mutant. **Note:** the invariants-layer
`test_cup_payouts_conserve_prize_budget` PASSED under the mutant — with the default 5600
sponsorship and 3 entries the bound is never binding (per 5f), so that test alone is a
conservation *check*, not a clamp *pin*. The teeth live in `tests/test_cup.py`; fine as a
layered pair, just don't delete the cup tests thinking the invariant test covers them.

## 7. BACKLOG.md ✅ claims

Both new ✅ lines cite real paths (`tests/test_cup.py`, `tests/test_invariants.py`,
`balance.yaml` key `cannabis_cup.house_sponsorship`, the ref_type/status guards) — all
verified to exist and to say what the line claims; `make check-memory` (which validates ✅
citations) passes. The NEW-2 line's stated invariant `sum ≤ entries×fee + house_sponsorship`
matches the code and my re-derivation. Accurate, modulo the conservative-not-tight 5600
rationale noted in 5f. CONFIRM.

## 8. L4 heuristics sweep (memory/agent-memory.md)

- **No floats in money:** the change *removes* a float (`_prize_for` float→Decimal). The
  pre-existing `float(balance(...))` in `enter()`'s response dict is display-only
  serialization, not a posted amount — unchanged, acceptable.
- **autoflush=False windows:** the new tests `session.flush()` before summing ledger rows;
  `judge()` itself sums no prior ledger rows (budget is constructive), so no flush hazard.
- **Faucet without bound:** this change is the bound. XP (`champion_xp`/`placer_xp`) is
  gated behind `prize > 0`, so a budget-starved rank gets neither money nor XP — XP is not
  currency, so tying it to the clamp is a (defensible) judgment call, see below.
- **balance.yaml as tuning surface:** respected — the bound is a data key, not a constant.
- **Ledger conservation:** all four new invariant tests assert `_conserved`; re-ran green.

## Independent opinion on the contestable calls

1. **Rank-priority exhaustion vs pro-rata:** I side with the builder. Rank-priority is
   deterministic, ledger-friendly (whole quantized amounts, no rounding-dust
   reconciliation), and matches competitive intuition (the winner gets paid first). Pro-rata
   only matters when the budget binds, which the shipped config makes unreachable.
2. **Decimal in `_prize_for`:** unambiguously correct; the old `float` return was a latent
   L4 violation this change retires.
3. **XP-clamp edge:** under a starved budget, a placing entry gets 0 GROW *and* 0 XP. XP
   isn't a monetary faucet, so awarding placer XP on rank rather than payout would also be
   defensible; with the shipped config the edge is unreachable, so I'd leave it. Note the
   champion's title + legendary trophy strain are (correctly) NOT budget-gated.
4. **The 5600 value:** safe and well-documented, but derived from a worst case that can't
   occur. The tight never-clamp bound is 4700 (binding at exactly 10 entries); max house
   net emission per cup is 4700 GROW either way. If the goal was "smallest sponsorship that
   never clamps," 4700 is the number; 5600 merely buys headroom for future table tweaks.
   Not a defect.

## Discrepancies vs builder claims

- Coverage: builder said **79.91%**, I measured **79.88%** (same tree, full suite). Both
  clear the 78 gate; likely a stale or single-run-jitter figure. Immaterial.
- Everything else reproduced exactly (227 passed; 221 baseline via stash; lint clean;
  check-memory OK).

## Scratch-mutation hygiene

All three scratch mutations (old check_memory.py, `_claimed_keys` filter, budget clamp)
were restored from saved copies before any commit existed; intermediate `git status` checks
after each restoration matched the builder's diff exactly. **Mid-session the orchestrator
committed the verified tree** (`04f38f2` NEW-2/NEW-3 + check_memory fix at 15:02:23Z,
`dc1094c` chain codex + MAP/README registration at 15:02:42Z — both authored by the
orchestrator, not by CASEY). Final `git status --short` shows ONLY this report file as
untracked; a targeted post-commit re-run of `tests/test_cup.py tests/test_invariants.py`
passed (22 passed), confirming the committed content is byte-identical to what I verified.
No CASEY residue in the commits; CASEY committed/pushed nothing.
