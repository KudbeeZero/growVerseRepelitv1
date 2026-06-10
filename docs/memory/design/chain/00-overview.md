# ⛓️ Chain Codex — Overview, Locked Decisions, Rulings, Roadmap

> Synthesis of the five chain-track design docs (2026-06-10), written by JORDAN after reading all
> five against each other and against the code. Where ≥2 docs independently converge, the point is
> **locked**; where they pull apart, there is a **ruling** below — adjudicated on evidence, not
> averaged. Tags: ✅ built · 🔨 partial · ⬜ planned. Binding rule over everything here
> (`CLAUDE.md`, ARCHITECTURE #1): **the DB is gameplay truth; the chain mirrors and settles.**

## Mission
The owner's vision, in one breath: a player signs in with the Algorand wallet they already own
(`02-wallet-login.md`); a seed becomes an ASA that carries its real genetics through its whole life
— planted, flowering, harvested, cured, even ruined — tradeable at every state and **never worth
zero** thanks to a salvage floor (`01-asset-lifecycle-contracts.md`); the game records as much as it
honestly can on-chain, headlined by daily account snapshots a player can mint as a keepsake, the
first one always free (`04-onchain-recording-snapshots.md`); GROW becomes a real token economy with
a real drain so the faucets don't debase it (`03-tokenomics-grow.md`); and none of it touches
MainNet until the custody ladder and the deposit redesign make the treasury and the bridge
attack-worthy-and-defended (`05-custody-security.md`). The chain proves; it never governs.

## The shelf
| # | Doc | Author | Owns |
|---|-----|--------|------|
| 1 | `01-asset-lifecycle-contracts.md` | ATLAS | GrowAsset taxonomy, ARC-19 lifecycle, `GrowEscrow`, the value floor |
| 2 | `02-wallet-login.md` | NOVA | Wallet connect, challenge–response sign-in, sessions, linking |
| 3 | `03-tokenomics-grow.md` | SAGE | Faucet/sink audit, the drain, supply model, snapshot pricing |
| 4 | `04-onchain-recording-snapshots.md` | ORACLE | Recording tiers, Merkle-root anchoring, snapshot product, verifiability |
| 5 | `05-custody-security.md` | WARDEN | Custody ladder, NEW-4 deposit, withdrawal hardening, contract gates |

## Locked decisions (≥2 docs converged independently)
1. **DB-authoritative; chain is a write-behind mirror.** All five docs restate it unprompted; chain
   failure never blocks gameplay; a reconciler retries (ATLAS §2, ORACLE §5, WARDEN §3 kill switch).
2. **External-key idempotency is THE chain-write pattern.** Mints keyed `kind:row:metadata_hash`
   (ATLAS), snapshots `snapshot:{player}:{date}:{leaf_hash}` and roots `root:{date}:{root_hex}`
   (ORACLE), deposits keyed by txid (WARDEN §2, invariant #4) — always enforced by a DB UNIQUE
   constraint, never by in-memory state alone.
3. **NEW-4 (player-signed, chain-confirmed, txid-idempotent deposit) is the universal MainNet
   blocker.** WARDEN designs it (§2); SAGE's settlement invariant is only trustless after it (§3);
   ATLAS rules that `buy()` proceeds and `floor_redeem` credits are deposits in disguise and must
   inherit it (§5). The `asa_balance` mirror is never a credit oracle.
4. **Secure-default-OFF flags for every new credential/bypass surface.** `GPE_WALLET_LOGIN` ships
   dark (NOVA §5); WARDEN invariant #5 generalizes it; the settlement kill switch is the deliberate
   inverse (ON for mock, deploys start paused on real networks).
5. **CI stays mock-only and keyless; AlgoKit LocalNet is a separate opt-in job.** ATLAS §3, NOVA §5
   (local throwaway keypairs), WARDEN §4.2 (LocalNet is hermetic — "no live keys/networks" is the
   invariant's substance; record the interpretation in `DECISIONS.md` when the first contract lands).
6. **The durable `minted_asset(external_key UNIQUE, asset_id, txid)` table precedes any
   multi-process deploy.** ATLAS gates Phase 1 on it; WARDEN §3 specifies it; `BACKLOG.md` F006
   already tracks it. The in-memory registry is single-process and that is its ceiling.
7. **Free-first is the claim-once ledger-ref pattern.** SAGE §4 and ORACLE §3 independently land on
   the achievement pattern (`services/progression_service.py`): a 0-amount ledger entry with
   `ref_type="snapshot*"` is the eligibility record — no new schema, audit-visible.
8. **Snapshots are a paid product after the free one, priced ≥ real chain cost.** SAGE prices the
   sink (~25 GROW, the only daily-cadence every-player drain); ORACLE prices the mechanism (NFT
   MBR + fees must be covered). Compatible and now joint policy.
9. **Fixed-supply GROW ASA with a treasury; no mint-on-withdraw.** SAGE §3 (auditable-by-anyone
   mirror); WARDEN leans on "abandoning an ASA is safe because the ledger is authoritative" as the
   disaster-recovery primitive; ATLAS ledgers every treasury funding move.
10. **Before launch: DB unique index on `Player.algorand_address` + algosdk checksum validation.**
    NOVA §3/§4 (pre-ship for wallet login) and WARDEN §3 (pre-real-send for withdrawals) — same
    two fixes, demanded from both directions. F007 in `BACKLOG.md`.

## The debate — rulings
**(a) Who holds the ASA manager key — hot treasury (ATLAS needs it for ARC-19 rewrites) vs
multisig (WARDEN's MainNet rung)?**
*Ruling: split by asset class.* These are different ASAs with different stakes. For **GrowAsset
lifecycle NFTs**, the reserve address is *data* (the ARC-19 CID), not custody, and rewrites are
frequent low-value operations — a 2-of-3 ceremony per plant-stage transition is operationally
absurd. They get a **dedicated hot operator/manager key**, separate from the treasury hot wallet.
For the **GROW ASA**, manager/reserve can destroy or reconfigure the token itself — WARDEN wins
outright: 2-of-3 multisig at the MainNet rung, reassigned away from the hot account.
*Tracked condition (WARDEN's concern preserved):* a stolen NFT-manager key can vandalize or
reassign manager on lifecycle assets. Mitigations owed before MainNet: alarm on any asset-config
txn the server didn't originate; metadata is recomputable from DB truth so vandalism is repairable;
a manager-key rotation rehearsal in the incident runbook.

**(b) Snapshot NFT custody — treasury-held (ORACLE's cost math) vs delivered to NOVA's
wallet-linked players (who'd bear the 0.1 ALGO opt-in MBR)?**
*Ruling: custodial by default, claim-to-wallet opt-in.* The default mint goes to the treasury with
DB ownership — same shape as today's strain/harvest NFTs, and the only shape that works for the
(majority, pre-wallet-login) players with no linked address. A wallet-linked player may **claim**
the NFT to their own wallet: their opt-in covers their MBR; the snapshot price covers the
treasury's fees and locked MBR (locked decision #8). The free first snapshot is custodial-only — a
bounded marketing cost, not a bounded-plus-0.1-ALGO one.
*Tracked condition (NOVA's concern):* "players should really own things" — the claim path is a
Phase 2 deliverable, not a someday; and the claim transfer is a withdrawal-shaped flow (treasury
signs as itself only).

**(c) Are SAGE's mint fee and ATLAS's floor invariant numerically consistent?**
*Ruling: consistent today — vacuously, so pin it.* Neither doc sets floor prices yet; ATLAS states
the invariant (`floor(any state) < seed cost + mint fee`, else mint→ruin→redeem is a money pump)
and SAGE sets the fee (~150 + rarity tier × 100, vs seed costs 25–1000). Adopt both, and make the
consistency *structural*: a property test asserting the invariant per rarity tier over the actual
`balance.yaml` values, added to the `tests/test_invariants.py` suite when `economy.salvage_floor`
lands. Floors are funded from `fee_bps` + mint fees (sink-backed faucet, per ATLAS §4).
*Tracked condition (SAGE's concern):* once floors ship, the economy report must include floor
payouts in net-issuance, and the numbers stay in `balance.yaml` — the economy lane, not code.

**(d) WARDEN deprecates `ChainProvider.create_account()` / `sender_mnemonic` — does anything break?**
*Ruling: deprecate, in two steps — verified against the code.* `create_account` has **zero callers**
outside the providers themselves: remove it from the ABC now; the mock keeps an internal helper for
tests. `transfer_asset(sender_mnemonic=...)` is never passed by any caller — the parameter exists
only to enable the custodially-incoherent `deposit()` shape; it dies with NEW-4.
*Tracked condition:* the NEW-4 mock grows `simulate_inbound(txid, ...)` so the suite stays keyless.

**(e) Indexer reconciliation — ORACLE's anchor catch-up and WARDEN's mint/deposit reconcile: one
design or two?**
*Ruling: one reconciler, three checks.* A single scheduled job (the daily anchor cadence ORACLE
already needs) sharing one indexer client and the durable external-key tables: (1) mint adoption —
match on-chain assets to `minted_asset` rows, adopt orphans (WARDEN §3); (2) settlement drift —
assert on-chain circulating == net bridged ledger entries, alarm on drift (SAGE §3); (3) anchor
catch-up — submit all `pending` daily roots oldest-first (ORACLE §5). One ops surface, one failure
dashboard. *Tracked condition:* each lane keeps its own invariant assertions and tests — shared
plumbing, not shared correctness.

**(f) One signing story — NOVA's ARC-60 vs note-field/txn approaches elsewhere?**
*Ruling: three signers, one sentence each; no conflict once stated.* **Players sign data to prove
identity** (ARC-60 AUTH scope for login; the zero-value never-broadcast txn is the fallback, never
the preference). **Players sign transactions only to move value** (the NEW-4 deposit, escrow
`list`/`buy`, the snapshot claim opt-in) — a wallet rendering a real txn for a real transfer is
correct UX, not phishing training. **The server signs transactions only as itself** (mints, ARC-19
rewrites, anchors, withdrawals) — never with, for, or via a player key.
*Tracked condition (NOVA's caveat):* per-wallet ARC-60 `signData` support is unverified — confirm
before W2, and keep the strict txn-template fallback regardless.

## Phased roadmap (merged, gated)
| Phase | Network | Ships | Gate to pass |
|---|---|---|---|
| **0 — mock/dev** | mock | `GrowAsset` table + lifecycle metadata + `update_asset_reserve` on the ABC; salvage state + game-side floor (ledger only); wallet-login backend dark behind `GPE_WALLET_LOGIN`; snapshot service + `SNAPSHOT` fee + claim-once free; drain wave 1 in `balance.yaml` (mint fee, pod upkeep, NPC sale tax); unique-address migration + checksum validation | Suite green w/ mock only; floor-vs-mint-fee property test; no live key anywhere |
| **1 — TestNet live** | TestNet | Funded treasury; live GROW ASA; real strain/harvest ARC-3 mints (metadata from API URL, IPFS deferred); wallet connect UI + ARC-60 login flagged on; daily Merkle-root anchor job | **Durable `minted_asset` table + the unified reconciler running** (locked #6, ruling e); secrets in host store only |
| **2 — lifecycle + snapshots** | TestNet | ARC-19 rewrites on state transitions (IPFS pinning); snapshot NFT product — custodial mint + claim-to-wallet (ruling b); Tier A provenance note-txns (breed, Cup win) | Reconciler covers missed attestations; pin-lapse fallback decided; snapshot price covers real cost |
| **3 — contracts** | TestNet + LocalNet CI | `GrowEscrow` via AlgoKit/Puya (attest, list/buy/cancel, `floor_redeem`); opt-in LocalNet CI job; ARC-56 typed clients | WARDEN §4 pipeline: adversarial AVM tests first, property/invariant suite green on LocalNet; `DECISIONS.md` entry for the LocalNet-CI interpretation |
| **4 — MainNet gate** | MainNet | Nothing new ships; everything proves | **Blockers, all of:** NEW-4 deposit redesign (incl. `buy()`/`floor_redeem` credits); durable mint table live in prod; `SELECT … FOR UPDATE` withdrawal-cap counter (F005); checksum + unique address (F007); custody ladder rung — KMS/HSM signer + hot/cold split, then 2-of-3 multisig on GROW ASA manager/reserve (ruling a); third-party contract audit + published deployment hash; kill switch deployed, deploys start paused |

## Owner questions — DECIDED (council adjudication, 2026-06-10)
The owner delegated all six with the compass "morally, logically, profitably, safely, honestly."
Two independent council positions (player advocate + business/safety officer,
`reports/2026-06-10/council/`) were adjudicated by the head; the full rulings with conditions are
the ADR in `../../DECISIONS.md` (2026-06-10, "Chain-economy policy"). In brief:
1. **Snapshots:** 25/75 GROW, first-EVER free (custodial-only); price ≥1.5× chain cost with a
   standing peg check; cost basis published; auto-refund on terminal mint failure; pure vanity forever.
2. **Whale drain:** per-harvest pod upkeep 3/5/8% by tier (never per-day rent) + progressive NPC
   sale tax (0% ≤350 GROW/day, 5% to 1,000, 8% above); stipend/achievements never taxed; targets
   mean ≤+20 and p99 ≤+50 GROW/day; economy report ships first; one combined "facility costs" patch.
3. **Auto-feed leak closed:** discounted `NUTRIENT_PURCHASE` (50%) posted from the service-layer
   catch-up; zero balance ⇒ pause + notify, never debt; done pre-launch; honestly labeled.
4. **Multisig rehearsal:** on TestNet during Phase 1 (sign/rotate/recover); must complete before
   Phase 2 exits.
5. **Tokenize-at-seed only at launch;** tokenize-anytime is a committed Phase-3 deliverable with
   immutable stage metadata, same fee at any stage, and per-stage floor property tests; the
   harvest-NFT path ships at launch as the regret escape valve.
6. **No burns pre-multisig; none as marketing ever.** Trust ships as the public books (economy
   dashboard + live settlement invariant + daily Merkle heartbeat); post-multisig burns only as
   quarterly receipts of realized sink surplus riding a scheduled multisig session.

## Cross-links
`../00-game-vision.md` (moat #3/#4) · `../04-honesty-and-trust.md` (pledge #5, fulfilled by
ORACLE's anchors) · `../../ARCHITECTURE.md` invariants 1/3/6 · `../../BACKLOG.md` (NEW-4,
F005/F006/F007 — the hardening queue this roadmap consumes) · `../../DECISIONS.md` (entries owed at
Phase 3).
