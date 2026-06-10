# 🔐 Custody & Chain Security — the defensive posture before a real network

> Design Codex, chain track. GROWv2 is headed for Algorand MainNet; the moment the GROW ASA has a
> market price, the treasury becomes a honeypot and every settlement path becomes an attack surface.
> This doc states the **current custody reality** (verified against code, cited), the **hardening
> ladder** per launch phase, and the designs for the known pre-mainnet blockers (BACKLOG NEW-4,
> F005/F006/F007 follow-ups). Tags: ✅ built · 🔨 partial · ⬜ planned. Orientation throughout:
> assume the API key is stolen, the worker crashes mid-transaction, and the attacker reads this doc.

## 0. Threat model in one paragraph
The DB is gameplay truth; the chain is a mirror/settlement layer (CLAUDE.md invariant). So the
crown jewels are: (a) the **treasury secret key** — total loss of all on-chain value; (b) the
**withdraw faucet** — converts ledger bugs into real money; (c) the **deposit credit path** — lets
an attacker print in-game GROW from fake "chain" events; (d) the **mint path** — duplicates
permanent on-chain assets. Defenses must hold against stolen player API keys, replayed requests,
concurrent workers, partial failures (chain-success/DB-rollback), and a compromised app host.

## 1. Treasury custody — current reality and the hardening ladder

**Today (verified):** the treasury is a single Algorand account whose 25-word mnemonic lives in the
`ALGO_TREASURY_MNEMONIC` env var (`config.py:93`), converted to a private key held in process memory
for the life of the app (`chain/algorand.py:40-41`). That one account is simultaneously the ASA
creator, **manager, and reserve** (`chain/algorand.py:67-68`), the NFT minter, and the hot wallet
that signs every withdrawal (`chain/algorand.py:117-124`). The provider is a process-wide singleton
(`chain/factory.py:39-43`); with no mnemonic configured the offline mock runs instead
(`chain/factory.py:19`) — which is why dev/CI never touch a secret. ✅ for TestNet; unacceptable
for value.

**The ladder (each rung is a phase gate, not optional polish):**

| Phase | Custody | Why it's enough — and what it still doesn't cover |
|---|---|---|
| **TestNet (now)** ✅ | Env-var mnemonic via host secret store, never committed (`config.py:84`) | Funds are worthless; the rung's job is to keep the *habit* clean: no mnemonic in code, logs, DB, or docs. |
| **Soft launch (small real value)** ⬜ | Move signing behind **KMS/HSM** (e.g. cloud KMS envelope-encrypting the key, decrypted only inside the signer; or an HSM-backed signer service). App host compromise no longer yields the raw key. Plus: **hot/cold split** — hot wallet holds ≤ a configured float (e.g. 2× max daily outflow); cold reserve is an offline-keyed account that tops up the hot wallet manually. | A compromised app can still *ask* the signer to sign malicious withdrawals — the velocity limits in §3 are the complementary control. |
| **MainNet** ⬜ | **2-of-3 multisig** on the cold reserve and on ASA manager/reserve roles (ops key + founder key + offline backup). Reassign the ASA `manager`/`reserve` away from the hot account (an `AssetConfigTxn`; today both point at the hot treasury, `chain/algorand.py:67-68`). Hot wallet stays single-sig but *small*. | Single-key loss or theft can no longer reconfigure/destroy the ASA (`destroy_asset`, `chain/algorand.py:74-81`) or drain the reserve. |
| **Mature MainNet** ⬜ | **Smart-contract treasury** with role separation: an app account holding the reserve, with on-chain logic enforcing per-period outflow caps and a multi-party admin for parameter changes; the server's hot key becomes a low-privilege "operator" that can only trigger capped flows. | Defense survives full server compromise: the chain itself enforces the cap. |

**Standing rules at every rung:** the secret enters the process exactly once, at provider init —
never logged, never serialized, never stored in the DB (`chain/algorand.py:5-7` states this; keep it
true). The `transfer_asset(sender_mnemonic=...)` parameter (`chain/provider.py:63-66`,
`chain/algorand.py:83-90`) and `create_account()` returning a mnemonic (`chain/provider.py:42-43`)
are **custody footguns**: no production code path may ever generate, accept, or transport a *player*
mnemonic through the server. Players bring their own wallets (Pera/WalletConnect, BACKLOG "non-
custodial path"); the server signs only as itself. ⬜ Recommend deprecating both surfaces from the
ABC once the deposit redesign (§2) lands — the mock can keep them internally for tests.

## 2. Deposit redesign (NEW-4 / F004) — player-signed, chain-confirmed, txid-idempotent ⬜

**Why the current flow is custodially incoherent.** `SettlementService.deposit()`
(`services/settlement_service.py:139-163`) "moves" the player's ASA to the treasury by calling
`provider.transfer_asset(self.asset_id, TREASURY, ...)` with **no sender mnemonic** — so the real
provider signs with the treasury key (`chain/algorand.py:86-89`), i.e. treasury pays treasury, and
the player's actual on-chain holdings never move. Eligibility is checked against the DB *mirror*
`wallet.asa_balance` (`settlement_service.py:141-143`, `db/models.py:75`) — a number the server
wrote to itself at withdraw time. On the mock this round-trips; on a real network it credits in-game
GROW (`settlement_service.py:152-155`) against tokens the player may have **already spent on a DEX**.
The server cannot sign for the player — and must never be able to (L4 lesson,
`memory/agent-memory.md:62-63`). This is the mainnet blocker; the mirror must never be a credit
oracle.

**Target flow (the only sound shape for a custodial credit):**
1. **Intent (optional but recommended):** authed `POST /players/<id>/deposits/intent` returns the
   treasury address + a one-time nonce; server records `(player_id, nonce, expires_at)`.
2. **Player signs & sends** — in their own wallet — an ASA transfer of GROW to the treasury with
   `note = "gpe:deposit:<player_id>:<nonce>"`. The server holds no player key at any point.
3. **Confirmation:** a poller (or authed `POST /deposits/claim {txid}`) fetches the txn from the
   **indexer** (`INDEXER_URL`, `config.py:90-92`) and verifies *all of*: sender == player's linked
   `algorand_address`; receiver == treasury; `asset_id` == the GROW ASA; note parses and the nonce
   matches an unexpired intent for that player; and `confirmed-round` is ≥ N rounds old (reuse the
   provider's `_CONFIRM_ROUNDS = 6`, `chain/algorand.py:17` — Algorand finality is fast; 6 is ample).
4. **Credit, keyed by txid:** insert into a new table, then post the ledger credit in the same DB
   transaction. The UNIQUE txid is the idempotency key — replays, double-claims, and concurrent
   workers all collapse to one credit.

```text
chain_deposit(
  id PK, txid VARCHAR UNIQUE NOT NULL,      -- the idempotency key (chain truth)
  player_id FK NOT NULL, asset_id BIGINT NOT NULL,
  amount_base_units BIGINT NOT NULL, amount MONEY NOT NULL,
  sender_address VARCHAR(64) NOT NULL, confirmed_round BIGINT NOT NULL,
  note_nonce VARCHAR, status ENUM(seen, confirmed, credited, rejected, refund_pending, refunded),
  ledger_entry_id FK NULL, created_at, credited_at)
```

**Failure / refund paths (enumerate them — each is an attack rehearsal):**
- *Wrong asset / dust / unknown sender (no linked address, bad note):* record `rejected`; never
  credit. Refunds are a **manual, treasury-signed, ops-approved** queue (`refund_pending`) — an
  automatic refund path is itself a faucet an attacker will probe.
- *Valid txn, expired nonce:* sender and amount still verify against the linked address — credit
  (the nonce is anti-confusion, not the security boundary; the txid + sender check is).
- *Chain reorg:* Algorand has near-instant finality; still, only credit at `confirmed_round + N`.
- *Credit transaction rolls back after insert:* both rows are in one DB txn — they roll back
  together; the next poll re-confirms and retries. The UNIQUE txid makes the retry safe.
- *Same txid claimed twice / by two workers:* second insert hits the UNIQUE constraint → no-op.
- *Deposit while settlements are halted (§3 kill switch):* leave at `confirmed`, credit on resume.

Then delete the old `deposit()` body and the `wallet.asa_balance`-as-oracle pattern; the mirror
becomes display-only. Mock provider grows a `simulate_inbound(txid, ...)` test hook so the suite
stays keyless (CLAUDE.md: CI never requires a live key).

## 3. Withdrawal hardening — the faucet with real money behind it 🔨

`withdraw()` (`services/settlement_service.py:105-137`) is DB-first (debit, then send) — correct
shape. Harden around it:

- **Checksum address validation ⬜ (blocker for real sends).** Link-time validation is structural
  only — 58 base32 chars, explicitly *not* a checksum (`services/game_service.py:75-85`). A
  typo'd-but-well-formed address burns funds irrecoverably. Before any real-network send, validate
  with `algosdk.encoding.is_valid_address` (decodes + verifies the 4-byte SHA-512/256 checksum) —
  at `link_wallet` when the real provider is active, and again defensively in `withdraw()` before
  `transfer_asset` (`settlement_service.py:123-125`). Keep the cheap structural check as the
  no-algosdk fallback for mock mode. Also ⬜ the **DB unique index on `Player.algorand_address`**
  (`db/models.py:46` is indexed, not unique; today uniqueness is only an app-level query,
  `game_service.py:179` — two concurrent links can both pass).
- **Daily-cap TOCTOU ⬜.** The cap guard (`settlement_service.py:54-103`) flushes before summing —
  fixing the same-session undercount (F005, autoflush lesson `memory/agent-memory.md:60-61`) — but
  its own docstring concedes (`settlement_service.py:70-75`) that two *parallel committed
  transactions* on Postgres can each see headroom and both pass. Fix with a serialized per-player
  counter row: `withdrawal_window(player_id, window_date, total MONEY)`, read with
  `SELECT … FOR UPDATE` (`with_for_update()`), increment, compare to cap — all inside the same
  transaction as the ledger debit. The row lock serializes concurrent withdrawals per player;
  SQLite degrades gracefully (single writer anyway).
- **Velocity limits ⬜.** The daily cap (`config.py:79-80`, default 10000) bounds magnitude, not
  shape. Add: per-withdrawal max; min interval between withdrawals per player; a **global** daily
  outflow cap sized to the hot-wallet float (§1) so even N compromised accounts can't drain the hot
  wallet; and an anomaly alert (single withdrawal > X% of treasury balance → page a human).
- **Kill switch ⬜.** `SETTLEMENTS_ENABLED` (default true) in `config.py`, checked at the top of
  `withdraw()`/deposit-credit: when false, raise a clean "settlements paused" `GameError`. Halts the
  chain edge **without halting the game** — growing, breeding, selling, the whole DB economy keeps
  running (it's authoritative; the chain is a mirror, so pausing the mirror is always safe). This is
  the first lever pulled in any incident. Read it per-request, not via the `lru_cache`d settings
  snapshot (`config.py:131-134`), so a flip doesn't need a deploy.
- **Mint dedupe, durable ⬜ (F006).** The current double-mint guard is an in-memory registry on the
  provider singleton (`services/minting_service.py:128-191`) — correct logic, single-process scope.
  Before multi-worker MainNet: a committed `minted_asset(external_key UNIQUE, asset_id, txid)` table
  written in its own short transaction the moment `create_asset` returns, plus an indexer
  reconciliation job (the metadata hash in the external key, `minting_service.py:145-152`, is the
  on-chain fingerprint to match). Same principle as §2: **every chain-credit/mint is idempotent by
  an external key the chain can verify.** `LedgerEntry.onchain_txid` (`db/models.py:92`) should gain
  a UNIQUE (partial, non-null) index for the same reason.

## 4. Smart-contract security posture — when escrow/marketplace contracts arrive ⬜

No contracts exist yet (the chain layer is ASA-only). When they come (escrow trading, the
smart-contract treasury of §1, on-chain Cup trophies), the pipeline — in order, each a gate:

1. **AVM-semantics unit tests** — every approval-program branch, with adversarial cases first:
   wrong sender, replayed group, fee-stealing, rekey-to, close-to, opt-in griefing, clear-state
   abuse. Written before the happy path.
2. **AlgoKit LocalNet CI.** Reconciling with CLAUDE.md's "CI runs with mocks — never require a live
   key": the invariant's *substance* is no live network and no real secrets. LocalNet satisfies
   both — a hermetic, dockerized, deterministic chain with throwaway funded accounts, no external
   keys. Read it as "no live keys/networks," and run LocalNet contract tests as a separate CI job
   so the core suite stays dependency-free; the Python suite keeps `MockChainProvider`. Record this
   interpretation in `DECISIONS.md` when the first contract lands.
3. **Property/invariant tests** in the `tests/test_invariants.py` style (its charter:
   `memory/agent-memory.md:69-76`): conservation (escrow in == out + fees, ∀ random op sequences),
   no state where funds are stranded or double-spendable, authorization (∀ ops, only the authorized
   role succeeds), and idempotence of every credit path — run against LocalNet, mirroring how the
   ledger invariants run against the DB.
4. **Third-party audit gate** — an external Algorand-fluent auditor before MainNet deployment, plus
   a published deployment hash so players can verify the audited program is the deployed one (this
   is the trust layer's "verifiable claims" pledge, `04-honesty-and-trust.md`, applied to our own
   contracts). No MainNet contract without it — non-negotiable.

## 5. Invariants to enforce forever

1. **Never log, store, echo, or commit a mnemonic or private key** — not in the DB, not in error
   messages, not in these memory docs (`memory/agent-memory.md:6` already commands this). The
   treasury secret exists only in the host secret store and the signer's memory. Add a CI grep/
   secret-scan for mnemonic-shaped strings as cheap insurance.
2. **Constant-time secret comparison.** ✅ verified: API-key auth uses `hmac.compare_digest`
   (`api/auth.py:36`). Any future secret check (webhook signatures, admin tokens, intent nonces)
   uses the same primitive — never `==`.
3. **Chain reads never drive gameplay truth.** The DB stays authoritative (CLAUDE.md; L4
   `memory/agent-memory.md:22-23`). §2's deposit credit is the *one* sanctioned chain→DB flow, and
   it is narrow: verified inbound value, confirmed N rounds, credited exactly once through the
   ledger. Nothing else — no gameplay logic — may branch on chain state.
4. **Every chain-originated credit/mint is idempotent by an external key** (txid for deposits,
   `kind:row:metadata-hash` for mints) enforced by a DB UNIQUE constraint, not by in-memory state
   or status flags alone. Retries and crashes must be free.
5. **Secure-by-default OFF for anything that bypasses a control** (the `GPE_DEV_LOGIN` lesson,
   `memory/agent-memory.md:58-59`; `config.py:126-128`). The kill switch is the inverse: settlements
   default ON only because OFF would be wrong-by-default for the mock; on real networks, deploys
   start paused until ops flips the switch.
6. **The hot wallet is always drainable-and-survivable.** Size it so total loss is an incident, not
   an extinction — the cold reserve and the DB ledger can always reconstitute player balances on a
   fresh ASA (`chain/token.py:25-41` already encodes "the DB ledger is authoritative, so abandoning
   an ASA is safe" — that property is the ultimate disaster-recovery primitive; preserve it).
