# LUT round-table — 2026-06-11 (night shift)

**Chat:** night shift continuation on `claude/night-shift-pexjg3` (PR #16, same branch).
**What happened:** built the owner-requested **night board** (`web/public/nightboard.html`, a
self-contained metal-panel status display rendered from one hand-edited `BOARD` object; verified
by real-browser screenshot), then ran a 7-angle `/code-review` over the whole branch diff and
fixed what it confirmed.

## Review outcome (7 finder angles → 1-vote verify)
- **Falsified PR claim (fixed):** the idempotency fingerprint was method+path only — same
  endpoint + same key + *different body* silently replayed the first response. Now
  method+path+SHA-256(body) (`api/idempotency.py:_fingerprint`); reuse with a different body → 400.
- **Three missed routes (fixed):** `create_listing` (MARKET_FEE + seed escrow), `create_auction`
  (seed escrow), `start_cure` (one-way transition, racy sequential guard) now carry
  `@idempotent` + `record()`. 26 routes plumbed total.
- **Refuted by verification (no action):** mint endpoints are guarded at the service level
  (`nft_status == MINTED` early-return) matching the documented exclusion; `plant_seed` and
  `offer_contract` move no money; `apply_consumable` *does* have `@require_player`; NULL
  `player_id` idempotency rows are impossible (`nullable=False` + every route carries the param);
  forgotten `record()` fails safe to a 409 (DB-enforced).
- **Deferred to backlog (owner call):** pruning job for unbounded `idempotency_keys`/
  `grant_claims`; constraint-name allowlist to narrow the blanket `IntegrityError → 409`
  (sharpens RISK #12).

## Gates
`make test` → **211 passed, coverage 81.07% ≥ 79** · lint ✅ · check-memory ✅ ·
check-migrations ✅ (head `b2c3d4e5f6a7`). +4 tests in `tests/test_idempotency.py`.

## Owner decisions this chat
Fix all four review findings in PR #16 now (done); NEXT ACTION stays RISK #8; both housekeeping
items to the backlog.
