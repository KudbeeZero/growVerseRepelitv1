# DEBATE.md — Head adjudication of remediation-cycle rebuttals (2026-06-10)

The synthesizer (head) hears both sides of every contested call and rules. Disputes are
resolved on evidence, never averaged. Sources: `reports/2026-06-10/rebuttals/*.md` +
`systems-review.md`. Verdict legend: **SHIP** (accept the fix as-is) · **SHIP+TRACK** (accept,
but the durable fix is backlogged) · **DEFER** (don't act this cycle) · **NEW** (systems-engineer
finding to backlog).

## Adjudicated this cycle

### D1 · Withdrawal-cap flush (Sloan F005/F019) — Vera 🟢
**Both sides:** Sloan fixed the same-session undercount (flush before summing); Vera verified the
arithmetic and agrees, both flag the remaining true-concurrency TOCTOU as out-of-lane.
**Ruling: SHIP+TRACK.** The flush is correct and closes the only path reachable today (one
withdrawal per request, single worker). Backlog the `SELECT … FOR UPDATE` / per-day counter row as
a **mainnet blocker before multi-worker/Postgres**. Verified separately: the withdraw route's
`except` is outside `session_scope`, so a rejected debit rolls back (Sloan #2 — no action).

### D2 · Mint reconciliation registry (Sloan F006) — Vera 🟡 object-on-durability
**Both sides:** Sloan added a provider-scoped in-memory `{external_key→asset_id}` map that survives
a DB rollback (the targeted window) and proved it with tests. Vera objects: it's process-local
(won't survive a crash or multi-worker), introduces a third source of truth against the
"DB-authoritative" invariant, and the mock can't even reproduce the real collision.
**Ruling: SHIP+TRACK, and RELABEL.** The registry is a correct same-process fast-path and the
natural seam for the durable fix — keep it. But Vera is right that it's not "closed": **F006 is
re-labeled *partially mitigated (single-process only)*, not resolved.** Backlog the authoritative
fix as a **mainnet blocker**: a committed `minted_asset(external_key UNIQUE, asset_id)` table +
indexer reconcile by ARC-3 metadata hash. Do not let the green mock test imply multi-worker safety.

### D3 · Breed ownership/self-cross (Reese F043) — Vera 🟢 + balance flag
**Both sides:** Reese ships the self-cross guard + `_player_has_strain_access`. Vera agrees it's
sound and the right layer, but flags a *balance* question: owning a **harvest** (flower, not seed)
grants breeding access — possibly a small leak against the "real genetics" moat.
**Ruling: SHIP, DEFER the balance call.** Correctness is fine. Whether harvest should confer
breeding access is a design decision → backlog "confirm against `design/02-genetics.md`; drop
`owns_harvest` if seeds-only is intended." Not a blocker.

### D4 · Address validation (Reese F007) — Vera 🟡 object-on-rigor
**Both sides:** Reese adds 58-char base32 structural validation + app-level uniqueness. Vera
objects: no checksum (so `"A"*58` passes but isn't a real address) at a **funds-out boundary**, and
uniqueness has no DB constraint (TOCTOU under concurrency).
**Ruling: SHIP+TRACK.** Structural validation is a real improvement and ships. Backlog two items:
(a) **checksum-verifying** validation (`algosdk.encoding.is_valid_address`) before any withdrawal —
**this becomes a mainnet blocker the moment `withdraw()` hits a real network**; (b) a DB unique
index on `Player.algorand_address` (partial WHERE NOT NULL) + migration.

### D5 · Accessibility (Mira) — Vera 🟢
**Ruling: SHIP.** Textbook ARIA, zero backend surface. Two follow-ups backlogged (P2): the
`role="tabpanel"` wiring in the two caller pages (`lab/strains/[id]`, `market`) that Mira couldn't
reach across lanes, and an arrow-key `onKeyDown` handler on `Tabs` (roving tabindex is in place).

### D6 · Docs + LICENSE (Theo) — Vera 🟢
**Ruling: SHIP.** Real compliance fix (MIT badge now backed by a LICENSE file); counts corrected.
Theo's two handoffs resolved: **Handoff 1** (`game-manual.md` still said "16 founders") — **fixed
by the head this cycle** (→ "47 catalog strains, 16 catalogued in full"). **Handoff 2** ("16
founders" in `strain-codex.md` is *accurate* — it names the fully-documented subset) — **upheld as
intentional; do not "fix" in future grep passes.**

### D7 · Cross-lane test collision (Reese ↔ Sloan) — resolved
Reese's F007 validation broke 4 legacy tests using short placeholder addresses; Sloan
independently proved it wasn't his. Reese (the owning lane) updated the fixtures to `"A"*58`.
**Ruling: resolved, no action** — the lane ownership + rebuttal flagging worked exactly as intended;
full suite green (214 passed).

## NEW — systems-engineer findings to backlog (Vera, systems-review)

- **NEW-1 (highest leverage): no faucet-invariant / determinism property-test harness.** Every fix
  this cycle is an idempotency or earned-state invariant, yet each is guarded by one point-test.
  Build a property layer: (1) sim reads partition-invariant under `(plant_id,hour)` seeding,
  (2) `sum(ledger) == cached_balance` after any op sequence, (3) "double-invoke ⇒ single credit"
  across **every** payout entry point. Would have caught F040/F006/deposit *by class*. **P1, do
  before more features** — this is the toothpaste-back-in-the-tube move.
- **NEW-2: `CUP_PRIZE_PAYOUT` may pay without asserting `payouts <= prize_pool`** — a potential net
  faucet. Verify + gate. **P1.**
- **NEW-3: `REWARD` entry type overloaded** across achievements *and* contracts with different
  idempotency keys — audit for double-credit. **P1/P2.**
- **NEW-4: `deposit()` is custodially incoherent** (server signs treasury→treasury; credits GROW
  off the DB `asa_balance` mirror — inverted dependency). Redesign as player-signed, chain-confirmed,
  `txid`-idempotent. **Mainnet blocker** (was F004).
- **NEW-5: catch-up "defers, not discards"** (`engine.py:263`, cap 8760h): a long-idle plant stays
  permanently behind and re-pays the cap cost every read. Converge-to-now + analytic fast-forward of
  the dormant tail. **P1 perf/correctness** (was F029/F030).

## Outcome
4 of 6 fixes shipped outright (D1,D3,D5,D6); 2 shipped-with-tracked-durable-fix (D2,D4). 5 new
systemic items backlogged. Suite 192→**214 green**, coverage **79.80%**. The durable/idempotency
work (NEW-1..5 + the FOR UPDATE/checksum/unique-index items) is the real pre-mainnet hardening
queue — see `docs/memory/BACKLOG.md`.
