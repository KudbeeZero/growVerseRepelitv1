# Rebuttals — Vera challenges the in-flight fixes · 2026-06-10 @ 0fb544c

READ-ONLY. I reviewed each teammate's working-tree diff (`git diff`) and the code around it.
Format per item: **Claim → Counter-argument (evidence) → Recommendation.** Where I agree, I say
so plainly. Verdict legend: 🟢 agree · 🟡 agree-with-caveat · 🔴 object.

---

## Sloan — withdrawal cap flush (F005) + mint idempotency (F006)

### S1 · Withdrawal-cap flush — 🟢 AGREE (correct fix, right layer)
**Claim:** `_enforce_daily_cap` undercounted un-flushed same-session debits; fix is to
`flush()` before summing and compare the post-debit `total > cap`
(`settlement_service.py:79-100`).

**Counter / check:** I tried to break the new arithmetic. The refactor moved from
`already + amount > cap` to `total > cap` where `total` now *includes* the in-flight debit (the
flush folds it in). The `remaining = cap - (total - amount)` reporting is also correct
(`total - amount` = prior committed total). The flush at `:81` is the load-bearing change and it's
the same pattern L4 already prescribes ("flush before summing"). **No objection — this matches the
audit's "exploitable single-session path" and closes it.**

**One caveat (Sloan already flagged it, so this is concurrence not objection):** the flush does
**not** fix true TOCTOU under parallel committed transactions on Postgres — two requests in
separate sessions can each flush, each see the other's row uncommitted-and-invisible, and both pass.
Sloan correctly scoped that to a row-lock/serialized counter as out-of-lane. **Recommendation:
ship the flush; track the `SELECT ... FOR UPDATE` (or an advisory lock on `player_id`) as a
mainnet blocker, and add the determinism note that the cap is per-process-honest only.** This is
the same concurrency gap I raise in systems-review §A2/§"concurrency."

### S2 · Mint reconciliation registry (F006) — 🟡 AGREE the bug is real; OBJECT to the mechanism as shipped
**Claim:** A chain-success→commit-fail→retry double-mints; fix is a provider-scoped in-memory
`{external_key → asset_id}` registry recorded *before* commit, so a retry adopts the existing asset
(`minting_service.py:128-188`).

**Counter-argument (evidence):**
1. **The registry is process-local, in-memory state on the singleton provider**
   (`chain/factory.py:36-43` — `_provider` is a module global; the registry hangs off it via
   `provider._mint_reconciliation`, `minting_service.py:138-142`). It survives a *DB rollback* — the
   exact window Sloan targets — but it does **NOT** survive (a) a process restart/crash between the
   chain call and the retry, or (b) **multiple workers/processes** (gunicorn -w N, or Postgres prod
   with several app instances). The plan itself lists multi-worker Postgres as the unexamined
   prod target. So this fixes the *single-process, same-uptime* retry and silently fails the
   *crash* and *multi-worker* cases — which are the realistic ones for "the commit failed."
   The docstring even concedes this ("natural hook for cross-process reconciliation against a chain
   indexer in production") — meaning the durable fix is explicitly deferred while the symptom looks
   closed. That's the dangerous shape: a green test masking an unsolved distributed problem.
2. **It introduces non-DB authoritative state into the value path.** CLAUDE.md: "DB is
   authoritative." This registry is a *third* source of truth (not DB, not chain) that gates
   whether a real ASA exists. If the process dies, that truth evaporates and you're back to the
   double-mint — but now with a false sense of safety and no DB/chain trace of the orphaned asset.
3. **The mock never re-collides anyway** (`chain/mock.py:33-46`: `create_asset` returns a
   fresh `next(self._asset_ids)` every call), so the *test* for this will pass without exercising
   the real failure mode (a real chain assigning the same logical asset). The guard is validated
   against a mock that can't reproduce the hazard.

**Recommendation:** Keep the registry as a **fast-path optimization**, but make the **DB the
idempotency authority**: persist a `mint_intent` / external-key row (kind+row_id+metadata_hash →
asset_id, status) in the *same* transaction lifecycle, and on retry **reconcile against the chain
indexer** by that key before minting (query the chain for an asset created by treasury with that
metadata_hash/note field). Record the chain `note`/metadata_hash on-chain at mint time so the chain
itself is queryable for "did I already mint this?" — that's the only source that survives a crash.
Until the indexer reconciliation exists, **label F006 as partially-mitigated (single-process only),
not closed**, and don't let the mock test imply otherwise. Same `txid`/external-key idempotency
class as the deposit fix I recommend in systems-review §A2 — solve them with one pattern.

---

## Reese — breed guard (F043) + Algorand address validation/uniqueness (F007)

### R1 · Breed self-cross + ownership guard — 🟢 AGREE, with one game-balance flag
**Claim:** `breed` accepted any strain ids; fix rejects `parent_a_id == parent_b_id` and requires
`_player_has_strain_access` (base-catalog OR creator OR owns seed/plant/harvest)
(`game_service.py:508-588`).

**Counter / check:** The access predicate mirrors existing ownership patterns
(`SeedInventory`/`Plant`/`Harvest` filtered by `player_id`) and flushes first — consistent with the
autoflush=False lesson. The self-cross rejection correctly routes selfing to `stabilize_strain`
(it raises stability deliberately) so a player can't farm the `first_breed`/`master_breeder`
achievement or a `BRED`-lineage reward off one line. Tests in `test_breed_and_wallet_guards.py`
cover self-cross, base-catalog, outsider-denied, and owner-seed-access. **Sound, right layer
(services, not the pure engine).**

**Caveat (balance, not correctness):** `_player_has_strain_access` treats **owning a single
harvest** of a strain as breeding access (`game_service.py:543-550`). But breeding consumes
genetics conceptually, while a harvest is *flower*, not *seed/pollen*. Letting a harvest grant
breeding rights is a design choice — it means a player who *bought* flower on the market (not
seeds) can breed with that genome. If genetics are meant to be gated behind seed ownership (the
moat: "real strain genetics"), harvest-grants-access is a small leak. **Recommendation: confirm
with the design codex (`design/02-genetics.md`) whether harvest should confer breeding access; if
not, drop `owns_harvest`. Not a blocker — flag for the genetics owner.**

### R2 · Address validation is structural-only — 🟡 AGREE it's an improvement; OBJECT to calling it "validation"
**Claim:** `link_wallet` now validates a 58-char base32 address and enforces app-level uniqueness
(`game_service.py:158-187`, `_is_valid_algorand_address` at `:72-86`).

**Counter-argument (evidence):**
1. **No checksum.** The docstring is honest ("not a checksum verification"), but the *consequence*
   matters: an Algorand address is 58 chars = 32-byte pubkey + 4-byte checksum, base32-encoded.
   `"A"*58` passes this validator (and is used as the test fixture, `test_breed_and_wallet_guards.py:25`)
   but is **not** a valid address — its checksum doesn't verify. A withdrawal to such an address
   (`settlement_service.py:123`) would be **accepted by this guard and then fail or burn funds at
   the real chain layer**. Structural validation gives false confidence at the exact boundary
   where money leaves the system.
2. **Uniqueness is app-level only, under autoflush=False, with no DB constraint.** The flush+query
   (`game_service.py:170-184`) closes the same-session case but two concurrent `link_wallet` calls
   in separate transactions can both pass (same TOCTOU class as the withdrawal cap). The docstring
   says "a DB unique constraint should follow" — so the durable guard is again deferred.

**Recommendation:** (a) If `algosdk` is available in the wallet path (it is, for the real
provider), use `algosdk.encoding.is_valid_address()` for a **checksum-verifying** check before any
withdrawal — keep the cheap regex as a pre-filter only. At minimum, do not let funds-out routes
trust the structural check. (b) Add a **DB unique index** on `Player.algorand_address` (partial,
WHERE NOT NULL) so uniqueness is enforced at the layer that's actually authoritative under
concurrency; the app check becomes a friendly-error fast-path. Both are S. Not a launch blocker
*if* no real withdrawals ship pre-mainnet; **the checksum gap becomes a blocker the moment
withdraw() hits a real network.**

---

## Mira — accessibility (Toast aria-live, Gauge label, Tabs, focus-visible)

### M1 · 🟢 AGREE — clean, correct, no system risk
**Claim:** Add `role=status`/`aria-live=polite` to the toast region with `assertive`+`role=alert`
for errors (`Toast.tsx:46-57`); `:focus-visible` ring (`globals.css:21-30`); `role=img`+`<title>`
readout on `Gauge` (`Gauge.tsx:52-60`); `role=tablist`/`tab`/`aria-selected`/roving `tabIndex` on
Tabs + onboarding (`Tabs.tsx`, `OnboardingPanel.tsx`).

**Counter / check:** These are textbook ARIA, scoped to the web client, zero backend/economy/sim
surface. The error-toast escalation to `assertive` is the right call for money/auth feedback (the
E1 finding). `:focus-visible` (not `:focus`) correctly leaves pointer focus alone. The Gauge
`aria-label` recomputes `inBand`/readout from the same props the visual uses, so SR and visual
can't drift. **No objection — ship it.**

**Caveat (out of Mira's lane, noting for completeness):** the roving-tabindex on `Tabs.tsx`
(`tabIndex={on ? 0 : -1}`) implies arrow-key navigation between tabs (WAI-ARIA tab pattern) but I
see no `onKeyDown` handler added — so keyboard users get focus skipping but not arrow-key tab
switching. Minor; either add the keydown handler or accept Tab-key-only traversal. Not a blocker.

---

## Theo — docs + LICENSE

### T1 · 🟢 AGREE — accurate, and the LICENSE is a real compliance fix
**Claim:** Add `LICENSE` (MIT, matching the README badge), bump doc counts (16→47 strains,
139→190+ tests, MAP 22→47), `setup.py` license metadata, document lifetime-vigor to players.

**Counter / check:** The README badge claimed MIT with **no LICENSE file** — a genuine compliance
gap before any public release; the added MIT text + `setup.py` classifier resolve it. Count bumps
match reality (211 tests collected via `pytest --co -q`; 47 strains per the catalog/KB). The
"190+ green" badge is a safe lower bound (suite is 211 collected, ~192 was last green per
agent-memory). The player-facing lifetime-vigor note (README:134-139) is accurate to the harvest
math (`game_service.py:921-924`, weight off `lifetime_vigor`) and is good anti-frustration UX.
**No objection.**

**Nit:** README still shows the Algorand badge as "TestNet" — coherent with no-mainnet status, so
fine, but make sure no copy implies deposits work on-chain today (they don't — systems-review §2).

---

## Where I land + the highest-leverage gap the team is NOT addressing

I **agree with 4 of the 6 fixes outright** (S1, R1, M1, T1) and **agree-with-objection on the two
that defer the durable solution while making the symptom look closed**: S2 (mint registry =
process-local, won't survive crash/multi-worker; mock can't even reproduce the hazard) and R2
(structural-only address check trusted at a funds-out boundary; uniqueness lacks a DB constraint).
Neither is *wrong* — both are the right *direction* at the wrong *durability*.

**Single highest-leverage thing the team is NOT addressing this cycle:** there is **no
determinism/idempotency property-test harness**, and **no ledger-conservation invariant test**,
even though *every* fix this cycle (harvest gate, withdrawal cap, mint dedupe, deposit, breed
guard, address uniqueness) is fundamentally an *idempotency or earned-state invariant*. The team
keeps writing one point-test per named bug. One property-test layer — (1) sim reads partition-
invariant under `(plant_id,hour)` seeding, (2) `sum(ledger) == cached_balance` after any op
sequence, (3) "double-invoke ⇒ single credit" across all payout entry points — would have caught
F040, F006, and the deposit double-credit *by class*, and would guard the next one. That's the
toothpaste-in-the-tube move; see systems-review §1.3 (A1) and §4. **Build the invariant harness
before adding more features.**
