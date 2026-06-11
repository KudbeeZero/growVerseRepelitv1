# 🛰️ LUT Report — 2026-06-11

**Covers:** PR #11 handoff audit + the RISK #6 remainder (Idempotency-Key replay + one-shot
grants) · **Repo:** KudbeeZero/growVerseRepelitv1 · **Branch:** `claude/night-shift-pexjg3`
**Health at a glance:** ✅ **207/207 tests green** · coverage **80.31% ≥ 79 gate** · ✅ lint ·
✅ check-memory · ✅ single head `b2c3d4e5f6a7` · ✅ fresh-DB migration matches models (no drift).

---

## 0) One-paragraph summary
The session opened with the protocol's `/handoff-audit` of PR #11 (API-validation hardening):
**CONCERNS** — every code claim verified with file:line evidence and all gates re-ran green, but
`/closeout` had only half-rewritten the baton (its narrative sections still described the previous
concurrency chat) and RISK #8's ledger text had silently dropped the mint-endpoint blind spot.
Owner approved: patch the baton, then proceed. The baton was corrected, and the scoped NEXT ACTION
landed in full: an opt-in **`Idempotency-Key` header** on the money mutations whose response is
stored **in the same transaction as the effect** (duplicate → replay of the original body +
`Idempotency-Replayed: true`, cross-request reuse → 400), plus **one-shot grant claims** so the
daily-stipend and achievement faucets are unique at the DB level (stipend per UTC day, achievement
per key) — a raced double-claim now rolls back whole and surfaces as a clean 409 via a new
`IntegrityError → 409` handler. RISK #6 is now **fully closed, test-backed**.

## 1) What shipped
- `docs/audits/PR-11-api-validation-hardening.md` — independent post-merge audit (CONCERNS).
- Baton repair (`docs/HANDOFF.md`): PR #11 narrative restored, RISK #8 mint blind spot re-listed.
- `api/idempotency.py` — `@idempotent` decorator (under `@require_player`; auth first) +
  `record(session, payload, status)` called inside each route's `session_scope` → key + effect
  commit atomically. Replay lookup, fingerprint binding (`METHOD /path`), key-format 400.
- 23 money-mutation routes plumbed in `api/game_api.py` (seeds/pods/breed/stabilize/harvest/
  cure-finish/sell/research/shop/care×4/bid/buy/settle/daily/achievement/contract-fulfill/
  cup-enter/enroll/withdraw/deposit).
- `db/models.py` + migration `b2c3d4e5f6a7`: `idempotency_keys` (unique `(player_id, key)`) and
  `grant_claims` (unique `(player_id, grant_type, grant_key)`).
- `services/progression_service.py`: stipend writes a `(player, day)` claim, achievement a
  `(player, key)` claim — deliberately not flushed eagerly, so a raced loser fails at commit
  (no SQLite lock-wait) while sequential re-claims keep their friendly 400s.
- `api/errors.py`: `IntegrityError → 409` (logged; a non-race hit implies an app bug).
- `tests/test_idempotency.py` (+10): replay returns the original body and pays once; opt-in
  (no header = no idempotency); cross-request key reuse rejected; malformed key 400; errors are
  never stored (retry runs fresh); raced duplicate key / stipend / achievement each commit
  exactly once (two-real-sessions pattern from `test_concurrency.py`).

## 2) Verification split
**Agent-proved:** all of §1 (gates above; fresh-sqlite `alembic upgrade head` + `compare_metadata`
clean; race tests drive two real DB sessions).
**Owner-verifiable:** UX of the deliberate stipend tightening — at most one stipend per UTC
calendar day even where the bare 22h cooldown would have allowed an early-morning second claim;
and whether the web client should start sending `Idempotency-Key` on money POSTs (it can adopt
incrementally — the header is opt-in).

## 3) Risks / notes
- The idempotency store holds **responses**, never money truth; the ledger stays authoritative.
- The generic `IntegrityError → 409` handler maps *any* constraint hit at commit to 409; on this
  API those are raced one-shots (sequential paths 400 first), but a logged 409 spike would mean an
  app bug worth chasing.
- Mint endpoints intentionally not plumbed (chain-adjacent; RISK #7 still gates real value).
