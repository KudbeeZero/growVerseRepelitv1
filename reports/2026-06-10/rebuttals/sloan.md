# Sloan (treasury / settlement + minting) — rebuttal & cross-lane notes — 2026-06-10

Lane: `services/settlement_service.py`, `services/minting_service.py`, new tests only.
Findings disarmed: F005+F019 (withdrawal cap), F006 (mint idempotency). Both fixed and
covered by new regression tests (all green — see final reply for run output).

---

## 1. F005/F019 — true concurrency needs a row-lock (OUT OF LANE: schema/locking)

**What I did:** `_enforce_daily_cap` now `flush()`es the just-posted (un-flushed,
autoflush=False) debit before summing the rolling-24h window, and compares the *post-debit*
total against the cap directly. This closes the exploitable single-session undercount: two
same-session withdrawals over the cap now ALWAYS block the second (proved in
`tests/test_settlement_cap_hardening.py`).

**What I did NOT do (and why):** the cap is still TOCTOU-racey under *true* concurrency — two
parallel committed transactions (separate sessions / Postgres workers) can each read the window
before the other commits and both pass. Making that safe needs one of:
- `SELECT ... FOR UPDATE` on a per-player withdrawal-window / counter row (real row-lock), or
- a per-player serialized counter (advisory lock or a `UNIQUE`-constrained per-day bucket row),
- or `REPEATABLE READ`/`SERIALIZABLE` isolation on the withdraw transaction.

All three require either a **schema change** (a lockable counter/bucket row) or
transaction-isolation/session config — both outside my assigned files. The plan already marks
F005 as "not exploitable via current HTTP routing" (single-threaded request handling today), so
this is a pre-mainnet / pre-multi-worker hardening, not a live exploit.

**Recommendation:** before enabling multiple API workers or Postgres in prod, add a
`withdrawal_daily_bucket(player_id, day)` row with a UNIQUE constraint and do a locked
read-modify-write inside the withdraw transaction. Assign to whoever owns `models.py` +
the migration. Until then the flush fix is correct and sufficient.

## 2. Rejected-withdrawal rollback hygiene (caller contract, observed while testing)

The cap raises a `GameError` *after* `post()` has already debited the ledger in the session.
Correctness depends on the surrounding transaction ROLLING BACK on that error so the rejected
debit never persists. `session_scope()` does roll back on a propagated exception — but a caller
that catches the `GameError` *inside* an open `session_scope` (without rolling back) would
commit a phantom debit and corrupt the rolling sum. My cross-session regression test documents
this by letting the error propagate out of the scope. Route handlers in `api/` (not my lane)
should ensure the withdraw error path does not swallow-and-commit. Worth a one-line check by the
API-lane owner; no code change needed in my files.

## 3. F006 — registry is process-local; cross-process/restart needs an indexer reconcile

**What I did:** `_mint` reconciles against a provider-scoped `{external_key -> asset_id}` map
(`external_key = kind:row_id:metadata_hash`) recorded the instant the chain call returns, BEFORE
any DB commit. A retry after chain-success → commit-fail → rollback now ADOPTS the existing asset
instead of minting a duplicate (proved in `tests/test_mint_idempotency.py`).

**Residual risk (OUT OF LANE to fully close):** the registry lives on the `shared_provider`
singleton, so it survives a DB rollback within one process — which is the F006 window. It does
NOT survive a process restart, nor is it shared across multiple workers. A commit-fail whose
retry lands on a *different* worker, or after a restart, could still double-mint. The durable fix
is to reconcile against the chain itself (query the indexer by the ARC-3 `metadata_hash` /
external key, or persist the external-key→asset-id mapping in its own table that is committed in
the SAME transaction segment as the chain call's bookkeeping). Both are out of my lane
(needs `models.py`/migration for a persistent table, or `chain/`+indexer wiring). The in-memory
registry is the correct same-process guard and the natural seam for that durable reconcile later.

**Recommendation:** add a committed `minted_asset(external_key UNIQUE, asset_id)` table, or an
indexer-backed `find_asset_by_metadata_hash`, before multi-worker prod. Tracked as F006 residual.

## 4. Cross-lane COLLISION breaking the green-suite contract (NOT my changes)

`tests/test_settlement.py` (3 tests) and `tests/test_minting.py::test_link_wallet` currently FAIL
because a teammate added Algorand-address validation to `game_service.link_wallet`
(`_is_valid_algorand_address`, 58-char base32 — F007/B4). Those legacy tests link short
placeholder addresses (`"ALGOADDR123"`, `"ADDR"`, `"ABC123ALGOADDRESS"`) that the new validation
rejects.

**Proof it is not mine:** reverting BOTH my source files to HEAD and re-running reproduces the
exact same 4 failures (same traceback at `game_service.py:169`). My new tests use valid 58-char
addresses and pass. `game_service.py` is explicitly outside my lane, so I did not touch those
tests or the validator.

**Recommendation:** the lane that owns `game_service.py` (F007/B4) must update those 4 legacy
tests to use a valid 58-char address (e.g. `"A"*58`). Tiny, mechanical, but it belongs to that
lane to avoid a double-edit collision on the same test files.
