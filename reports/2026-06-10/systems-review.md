# Systems Review — Vera (engineering/systems architect) · 2026-06-10 @ 0fb544c

READ-ONLY analysis. Mission: look past the point-fixes at the issue **classes** this
cycle surfaced and propose durable, general guards ("toothpaste back in the tube") so the
same class can't recur. Every claim is grounded in code (file:line) and read-only commands.

---

## 1. Faucet/sink integrity & payout gating — the "value minted without a real grow" class

### 1.1 The class, restated
F040 (instant buy→plant→harvest) and F042 (dead-plant payout) were not two bugs — they were
one **class**: a credit (`HARVEST_SALE`, a GROW faucet) fired without proving the plant
*actually grew*. Harper's fix (`game_service.py:904-911`) gates the **auto-harvest** path on
`is_alive` + stage ≥ flowering. Good — but it's a *point* fix on one faucet. The systemic
question: **does every other faucet have an equivalent "did the player earn this?" gate, and a
matching sink?**

### 1.2 Faucet/sink map (every `LedgerEntryType`, evidenced)
Source: `enums.py:61-85` + the `ledger.post(...)` call-sites
(`grep LedgerEntryType\.` over `src`).

| EntryType | Dir | Call-site | Earned-state gate today | Matching sink? |
|-----------|-----|-----------|--------------------------|----------------|
| `STARTING_GRANT` | faucet | `game_service.py:129` | once-per-player (username-unique create) | n/a (one-shot) |
| `DAILY_STIPEND` | faucet | `progression_service.py:56` | **cooldown via ledger query** (`:37-53`), flush-first | retention faucet; no direct sink |
| `REWARD` (achievement) | faucet | `progression_service.py:88` | unlock check + claimed-set dedupe (`:81-90`) | one-shot per key |
| `REWARD` (contract) | faucet | `contract_service.py:106` | **consumes harvests** (`:96-103`) before paying | yes — harvests burned |
| `CUP_PRIZE_PAYOUT` | faucet | `cup_service.py:208` | `judge()` idempotent on `status` (`:187`); prizes from `prize_pool` fed by entry fees | `CUP_ENTRY_FEE` sink (`:148`) |
| `HARVEST_SALE` | faucet | `game_service.py:983` | **NOW gated** (`:904-911`); `sold` flag dedupes | n/a (terminal sale) |
| `MARKET_SALE` | faucet | `game_service.py:1140`,`1228` | escrow/listing lifecycle | `MARKET_BUY` sink (`:1131`) |
| `AUCTION_REFUND` | faucet | `game_service.py:1207` | refund of prior `AUCTION_BID` | `AUCTION_BID` sink (`:1203`) |
| `ASA_DEPOSIT` | faucet | `settlement_service.py:153` | **checks `wallet.asa_balance`** (`:142`) — but see §2 | mirrors off-chain → on-chain |
| `ADJUSTMENT` | faucet/sink | admin | `allow_negative` admin path | manual |
| (all `*_PURCHASE`, `*_FEE`, `TUITION`, `RESEARCH_UNLOCK`, `AUCTION_BID`, `CUP_ENTRY_FEE`) | sink | various | n/a | — |

**Finding (no live exploit, but two soft spots):**

- **`CUP_PRIZE_PAYOUT` can pay out more than was staked.** `judge()` (`cup_service.py:199-213`)
  pays prizes from a `prizes` config table (`balance.yaml`), not strictly from `cup.prize_pool`.
  The entry fees feed `prize_pool` (`:151`) but the payout loop never checks
  `sum(prizes) <= cup.prize_pool`. If the configured prize schedule exceeds collected fees (few
  entrants, generous schedule), the Cup is a **net GROW faucet** with no sink. This is a *balance*
  faucet, not an exploit — but it's exactly the "value minted without backing" class. **Recommend:
  assert payouts ≤ prize_pool, or document the subsidy as an intentional, capped faucet in
  `balance.yaml`.** (S)

- **`REWARD` is overloaded** across achievements AND contracts (`progression_service.py:88`,
  `contract_service.py:106`). They're disambiguated only by `ref_type`. The achievement dedupe
  (`_claimed_keys`) filters `ref_type=="achievement"`; the contract path relies on
  `contract.status` transitions. Overloading one EntryType across two faucets with different
  idempotency keys is fragile — a future query that sums "REWARD" for analytics or a cap will
  conflate them. **Recommend a distinct `CONTRACT_REWARD` type** (S, data-only).

### 1.3 The systemic chokepoint — RECOMMENDED
Today the "did it grow?" knowledge is **scattered** in each service. The instant-harvest class
will recur the next time someone adds a payout path (e.g. a quest reward off plant state, a
referral bonus, a future "sell to NPC vendor" route) and forgets the gate.

**Recommendation A1 (LAUNCH BLOCKER, M): a single ledger-level invariant + a property test, not
another scattered guard.** Two layers:

1. **A `ledger.post()` faucet contract.** Add an optional `earned: bool | None` kwarg that
   *credit* posts (amount > 0, non-administrative types) must pass `True`, with the caller having
   evaluated the earned-state predicate. A credit with `earned is None` for a faucet type raises
   in tests/dev. This makes "I added a faucet and forgot the gate" a loud failure at the
   chokepoint every faucet already flows through (`ledger.py:40`), instead of silent minting.
   Keep it cheap: a frozenset of `FAUCET_TYPES` in `enums.py`, asserted in `post()`.
2. **A ledger invariant property test** (`tests/test_ledger_invariants.py`): for a randomized
   sequence of game operations, assert (a) every faucet credit has a `ref_type/ref_id` (no
   anonymous minting), (b) no faucet fires for a plant that is `not is_alive` or stage < flowering,
   (c) total faucet inflow is reconcilable against sinks within a tunable band (inflation guard).
   This is the durable "toothpaste in the tube" — it catches the *next* F040 by class, not by name.

Effort: M. **Launch blocker for the economy invariant test (1); the `earned=` kwarg is a
strong S-M follow-on.** Rationale: the audit re-verified F040/F041/F042 all true; the gate closed
the known instances but nothing prevents reintroduction.

---

## 2. DB-authoritative vs chain-mirror — the deposit (F004) coherence gap

### 2.1 What the code actually does
`settlement_service.deposit()` (`settlement_service.py:139-163`) is **custodially incoherent**:

```
142  if (wallet.asa_balance or 0) < amount:  raise   # trusts a DB mirror column
146  txid = self.provider.transfer_asset(self.asset_id, TREASURY, units)  # SERVER signs
152  post(... ASA_DEPOSIT, +amount)   # credits in-game GROW
157  wallet.asa_balance -= amount
```

The server calls `transfer_asset(asset_id, TREASURY, units)` — i.e. the **treasury signs a
transfer to itself**. On the real provider a treasury key cannot move a *player's* ASA into the
treasury; only the player can authorize that outbound transfer. So on mainnet the on-chain asset
**never moves**, yet the DB credits GROW and decrements `asa_balance`. The guard at `:142` reads
`wallet.asa_balance` — a **DB mirror** — to decide a chain action, which is precisely the
inverted dependency CLAUDE.md forbids ("on-chain state must never drive gameplay truth," and its
converse: a gameplay credit must not be gated on an unverified mirror of chain state).

Withdraw (`:115-131`) is coherent — the treasury *owns* the asset it sends out, so the server can
sign. **Deposit is the asymmetric, broken direction.** Audit marked F004 unverifiable only for
lack of TestNet; the **code trace is unambiguous** and confirmed in audit-report.md:31.

### 2.2 The right architecture (recommendation, not implementation)
**Recommendation A2 (MAINNET BLOCKER, L): make deposit a player-signed, server-confirmed pull, and
never credit GROW off a mirror.**

- Player→treasury must be a **player-signed inbound transfer**. Two coherent shapes:
  1. **Client-signed txn submission**: client builds + signs an ASA transfer to TREASURY (via
     wallet connect / algosdk in the browser), submits, returns the `txid`. Server **confirms the
     txn on-chain** (waits for confirmation, validates receiver==TREASURY, asset_id, amount,
     sender==player's linked address) *before* posting `ASA_DEPOSIT`.
  2. **Treasury-initiated `AssetTransferTxn` + player signature** (clawback is wrong here unless the
     ASA is explicitly clawback-enabled — avoid; clawback is a centralization smell for a player
     economy).
- The DB credit must be gated on **confirmed chain truth**, not `wallet.asa_balance`. Flow:
  `chain-confirmed → then post ASA_DEPOSIT`. This keeps "DB authoritative for *gameplay*, chain is
  the settlement source for *deposits*" — they reconcile, the mirror never *drives*.
- **Idempotency by `txid`.** A confirmed `txid` must credit exactly once (unique index on
  `LedgerEntry.onchain_txid` for deposits). Same class as the mint double-credit (§4, F006).

This is correctly tagged ⛓ mainnet-blocker in the plan; with mocks the current code "works,"
which is the trap. **Not a launch blocker for a no-real-chain soft launch; hard blocker before any
mainnet ASA movement.**

---

## 3. Compute-on-read scaling (F029/F030) — catch-up cost + the deferring cap

### 3.1 What's there
`engine.catch_up()` (`engine.py:237-283`) runs an **hour-by-hour Python loop**
(`for _ in range(elapsed_hours)`, `:259`), each iteration doing an ORM `PlantEvent` insert per
event and `compute_conditions`. `elapsed_hours` is clamped to `max_catchup_hours` (config = **8760**,
confirmed via read-only load; `:255`). Crucially, **`plant.last_tick_at = t` is advanced *inside*
the loop** (`:263`), so after a clamped catch-up the plant's `last_tick_at` is left **behind `now`
by (elapsed − cap) hours**. That is "defers, not discards": a plant idle 2 years catches up 1 year
this read, and is *still* a year behind on the next read — it never converges while idle, and each
read pays the full cap cost. Audit confirmed the clamp at engine.py:255 (audit-report F029/F030).

The cost is **O(hours) × per-hour ORM work**, and it is **on the read path** — a player opening a
dashboard with several long-idle plants pays seconds of CPU + thousands of INSERTs synchronously.

### 3.2 The right fix + trade-offs (recommendation, not implementation)
**Recommendation A3 (NOT a launch blocker; M): fast-forward math for the dormant tail, discard
(don't persist) per-hour events past a recency window, and converge `last_tick_at` to `now`.**

- **Converge, don't defer.** After the simulated window, set `plant.last_tick_at = now` (not the
  last simulated hour). A plant idle past the cap should be modeled as *stably dormant*, not
  *perpetually lagging*. Today's defer means unbounded re-work and a permanent "ghost debt."
- **Fast-forward the tail analytically.** For the hours beyond a small "detailed" window (say last
  N=168h), don't loop: integrate the deterministic state (vigor accumulation, stage progression,
  death-if-untended) in closed form or coarse steps, and **do not emit per-hour `PlantEvent` rows**
  for the dormant tail (only a single "catch_up_summary" event). The per-hour event spam is the
  real cost, not the float math.
- **Trade-off — determinism.** The current loop is RNG-seeded per `(plant_id, hour)` (`:261`,
  `_rng_for`) and is the *definition* of correct state. A fast-forward approximation diverges from
  the hour-loop unless you (a) keep the loop for the recent window and only approximate the
  long-idle tail, and (b) pin the approximation with a property test asserting
  `fast_forward(0..T) ≈ loop(0..T)` within tolerance for tended plants and *exact* for the dormant
  "no-care death" trajectory (which is monotone and analytic). Choose **approximate-tail, exact-recent**.
- **Alternative — materialize dormant plants** (a background sweep that ticks idle plants off the
  read path). Heavier (needs a scheduler/worker, which the repo lacks — see plan's "CI absent"),
  and reintroduces a non-pure write path. **Prefer the fast-forward** until there's a worker.

Effort: M. Not a launch blocker at expected early concurrency, but it **will** bite under Postgres
+ parallel workers (plan §"Not examined: concurrency/load"). The defer-not-discard convergence bug
(perpetual lag) I'd fix *now* even if the fast-forward waits — it's a small change with outsized
correctness value.

---

## 4. Determinism / idempotency invariants worth encoding as property tests

These are the invariants this cycle's bugs keep violating. Encode them once; they guard forever.

1. **Sim determinism (engine purity).** `catch_up(plant, T)` from a fixed initial state must be
   **byte-identical** across runs and **independent of read granularity**: one read to hour T must
   equal K reads that sum to T. RNG is seeded `(plant_id, hour)` (`engine.py:261`) — so this should
   hold; a property test (`hypothesis`: random tick partitions of [0,T]) **proves** it and catches
   any future non-seeded randomness or wall-clock leak. (S–M) **Highest-leverage test the team is
   not writing.**
2. **Ledger conservation / no-anonymous-mint.** `recompute_balance` (sum of entries) must equal
   `wallet.cached_balance` after any operation sequence (`ledger.py:90-103` already exists as the
   oracle — wire it into a property test). Plus: every faucet entry has `ref_type`+`ref_id`. (S)
3. **Payout idempotency by external key.** Re-running `judge(cup)`, `fulfill(contract)`,
   `claim_daily`, `claim_achievement`, `mint_*`, and `deposit(txid)` **twice** must credit **once**.
   Several rely on flag/status transitions; a single parametrized "double-invoke ⇒ single credit"
   test across all payout entry points is the durable guard. (M)
4. **`autoflush=False` sum-guards flush first.** Any "sum prior rows in this window" guard
   (withdrawal cap, daily stipend cooldown, address-uniqueness, breed-access) must `flush()` before
   summing. Sloan/Reese added flushes; a lint-style test that greps for `query(...).filter(... ==
   <Type>).` rolling-sums lacking a preceding `flush()` would prevent regression — or better, fold
   the flush into a shared helper. (S)

---

## Summary table

| Rec | Class | Effort | Launch blocker? |
|-----|-------|--------|-----------------|
| A1 — ledger faucet invariant + property test (chokepoint, not scattered gates) | faucet integrity | M | **Yes** (the invariant test) |
| A1b — `earned=` kwarg on `post()`; split `CONTRACT_REWARD`; cap cup payout ≤ pool | faucet integrity | S–M | No (harden) |
| A2 — player-signed, chain-confirmed, txid-idempotent deposit | DB↔chain coherence | L | **Mainnet blocker** |
| A3 — converge `last_tick_at=now` + fast-forward dormant tail (no per-hour event spam) | compute-on-read | M | No (concurrency risk) |
| A4 — determinism + ledger-conservation + double-invoke property tests | invariants | S–M | Strongly recommended |
