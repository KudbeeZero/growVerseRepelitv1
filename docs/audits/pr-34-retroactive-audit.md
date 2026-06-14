# Audit — PR #34: FTUE starter-grant rail — pod + seed on signup (one-shot, idempotent)

**Branch:** merged to trunk · **Head SHA:** `dc6ccdec8d3175ca88f3c809f787678aac353031`
**Landing:** GitHub squash-merge · **Author:** `Kudbee <dominick.ziola@gmail.com>` (owner) · committer `GitHub`
**Auditor run:** 2026-06-14 (retroactive, directive **AUDIT-034** under **DRIFT-001 / CASE A**)
**CI on the PR:** re-run locally green (see gates) · **Reviewer:** Records Dept, read-only — no code modified

> Context: this PR landed *after* the last closeout wrote the baton, so it shipped without a
> handoff-audit. AUDIT-034 supplies that audit retroactively. Audit only — no revert, no edit to code.

## Claims vs. evidence
| # | PR claims | Verified? | Evidence (`file:line`) |
|---|-----------|-----------|------------------------|
| 1 | Signup hands a new player a free Starter Pod + one starter seed | ✅ | `services/game_service.py:128 grant_starter_items` wired at `api/game_api.py:53` (signup `create_player`); `tests/test_starter_grant.py:31` asserts 1 pod + 1 seed |
| 2 | One-shot / idempotent — re-run or raced double-signup can't double-grant | ✅ | DB unique index `uq_grant_claims_player_type_key (player_id, grant_type, grant_key)` (`db/models.py:204`, migration `c7ecd7523cc8`); `_claim_grant` pre-check (`game_service.py:140`); `test_starter_grant_is_idempotent` passes |
| 3 | "No new economy/faucet currency — items are free, recorded in grant_claims, not the money ledger" | ✅ (with NOTE 2) | pod `charge=False` (`game_service.py:133`); seed `quantity += 1`; `test…grants_starter_pod_and_seed` asserts balance stays `Decimal("500.000000")` |
| 4 | Wired into the signup endpoint, not `create_player` primitive — other flows/tests stay clean | ✅ | call site is `game_api.py:create_player()` route, not `GameService.create_player()` |
| 5 | Granted items drive a full plant→harvest→sell loop | ✅ | `test_starter_grant_enables_full_grow_loop` plants the starter seed in the starter pod, harvests, asserts `sale_value > 0` |

## Gates re-run by the auditor
- `make test` → **226 passed, 80.97% ≥ 79** ✅ (the +3 vs the prior 223 are exactly this PR's `tests/test_starter_grant.py`)
- `make lint` → ✅ All checks passed
- `make check-memory` → ✅ 21 files, links + ✅ citations resolve
- `scripts/check_single_head.py` → ✅ single head `c7ecd7523cc8`
- `alembic upgrade head` on a fresh DB → ✅ clean chain `e7a9c1b3f2d8 → f1a2b3c4d5e6 → c3d4e5f6a7b8 → c7ecd7523cc8`
- web → **not touched by #34** (n/a)

## Scope check
- In-scope diff (5 files, +198): migration `c7ecd7523cc8`, `db/models.py` (`GrantClaim`), `services/game_service.py` (`grant_starter_items`/`_claim_grant`/`_starter_strain`), `api/game_api.py` (one signup call), `tests/test_starter_grant.py`.
- **Scope vs. the frozen baton:** the baton in effect declared the track "**visual/UX only — no backend**." #34 is **backend** (new table + service + signup wiring). It is **owner-authored and owner-merged**, so it is *authorized* (authorization chain terminates at the owner per the delegation charter) but it is **outside the declared visual-only scope** — the substantive driver of RISK #12. No chain / breeding / combat / crop-family code touched.
- **Hidden scope creep:** none in code. **Documentation gap (NOTE 1):** the rail shipped with **no ADR in `DECISIONS.md` and no `BACKLOG.md` entry** — the only "hidden" aspect is that it was undocumented in the memory layers.

## Carried-risks ledger check
- OPEN RISK silently dropped? **No.**
- Risk marked FIXED without a test? **No.**
- **RISK #3 (idempotency):** #34 concretely ships the **one-shot-grant** half of the remainder (DB-enforced, test-backed) — first real one-shot grant rail in the codebase. The general `Idempotency-Key` header remainder is still open.
- **New economy note → RISK #11/anti-bot backlog:** see NOTE 2.

## Device-verifiable vs agent-verifiable
- Agent proved: idempotency, no money-ledger faucet, clean migration/single-head, full grow-loop reachability, no suite regression — all above.
- Owner must confirm by hand: the **UX intent** — that a brand-new player actually lands on a dashboard with a usable pod+seed and reaches first-plant with zero setup (the retention/QA blocker this targets).

## Findings & risks
- **NOTE 1 (docs):** No ADR / BACKLOG entry for the starter-grant rail. Recommend a one-line ADR (decision: FTUE grants = free items via `grant_claims`, never the money ledger) + a BACKLOG line. *(Non-blocking; records-only fix.)*
- **NOTE 2 (economy/Sybil):** The starter grant is a **per-account non-currency item faucet** that *converts to GROW currency* through the normal grow→harvest→sell loop (proven by `test_starter_grant_enables_full_grow_loop`). Idempotency caps it at one pod+seed **per account**, so it is not repeatable within an account — but it is a per-new-account value drip, which is exactly the surface the existing **anti-bot / new-account faucet-throttle** backlog item covers. *Not launch-blocking; put on the economy radar before open signup at scale.*
- **NOTE 3 (concurrency, minor):** `_claim_grant` is pre-check-then-insert with the unique index as the hard backstop; an explicit `IntegrityError` catch is absent, so a true race would surface as a 500 rather than a graceful skip. Race is near-impossible (a freshly-generated `player_id` calling its own signup once), so **low** severity.

## Verdict
**PASS WITH NOTES** — #34 is correct, idempotent, test-backed, migration-clean, and CI-green; it does **not** open a currency faucet. It is owner-authorized but landed outside the frozen visual-only scope and without memory-layer documentation. Clear to remain in trunk for MVP; address NOTE 1 (docs) as a records fix and track NOTE 2 (Sybil/faucet) on the anti-bot backlog before scaled signup.
