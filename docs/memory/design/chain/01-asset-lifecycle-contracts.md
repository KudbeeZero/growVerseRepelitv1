# ⛓️ Asset Lifecycle & Contracts — the chain that mirrors a living thing

> Deep design for the on-chain asset layer: which game objects become ASAs, how a seed's whole
> life (seed → planted → flowering → harvested → cured → salvage) is represented on-chain
> **without ever violating DB-authoritative**, and the one smart contract worth building first.
> Tags: ✅ built · 🔨 partial · ⬜ planned. This is moat #3/#4 in `../00-game-vision.md`
> (Proof-of-Cultivation, the GenBank). Binding rule from `CLAUDE.md` / ARCHITECTURE invariant #1:
> **the DB is the source of truth; the chain is a mirror/settlement layer.** Every design below is
> a server-attested *projection* of DB state — the chain proves, it never governs.

## Where the chain layer is today ✅🔨
- **Provider ABC** (`src/growpodempire/chain/provider.py:34`) with a deterministic offline mock
  (`chain/mock.py:14`) and a real TestNet provider (`chain/algorand.py:20`), selected by a
  process-wide factory singleton (`chain/factory.py:39`). CI runs mock-only — never a live key.
- **ARC-3 NFT metadata** builders for strains and harvests (`chain/metadata.py:19`, `:41`) with a
  canonical SHA-256 `metadata_hash` (`chain/metadata.py:13`) stamped into the ASA.
- **MintingService** — DB-first, chain-second, idempotent: PENDING → `create_asset` → MINTED, with
  the F006 double-mint guard (a provider-scoped reconciliation registry keyed by
  `kind:row_id:metadata_hash`, `services/minting_service.py:145-191`). Mint gates live in
  `balance.yaml` `chain.nft` (`mint_min_rarity: rare`, `strain_min_stability: 0.85`).
- **GROW ASA settlement** — withdraw/deposit mirror the Decimal ledger
  (`services/settlement_service.py:105`, `:139`; `chain/token.py:14`), txids stamped onto ledger
  entries. Deposit is flagged for redesign (NEW-4, below).
- **DB anchors**: `Strain.nft_asset_id/nft_status` (`db/models.py:145-146`),
  `Harvest.nft_asset_id/nft_status` (`db/models.py:385-386`), `Player.algorand_address`
  (`db/models.py:46`), `Wallet.asa_balance` (`db/models.py:75`). **`SeedInventory` has no chain
  fields today** (`db/models.py:165`) — seeds are an off-chain quantity stack. The lifecycle asset
  below is the new thing.

---

## 1. The asset model — what becomes an ASA ⬜

The owner's vision: *a seed ASA carries its genetics; planting transitions it; flowering accrues
value; harvest/cure settles final quality; even a ruined crop salvages at a "hemp" floor; tradeable
at every state.* That is **one asset following one organism**, which today's two NFT kinds
(strain, harvest) don't capture. Proposed taxonomy:

| Game object | On-chain form | Why |
|---|---|---|
| **Strain** (cultivar) | 1/1 ARC-3 NFT ✅ (mock) | The GenBank node: genome ranges, lineage, rarity (`chain/metadata.py:19`). Immutable once stabilized — genetics don't change, so plain ARC-3 is right. |
| **Individual seed → GrowAsset** | 1/1 lifecycle NFT ⬜ | **The new asset.** Minting *individualizes* one seed out of a `SeedInventory` stack (decrement `quantity`, `db/models.py:172`; record `seed_inventory.id` provenance). Carries full genetics (the plant-time `genome` copy, `db/models.py:242`), lineage pointer to the strain ASA, rarity — and then *lives*: its metadata transitions with the organism. |
| **Seed stack** | stays DB-only | Seeds are fungible until planted; mirroring stack quantities on-chain doubles inventory bookkeeping for zero proof value. Tokenize-on-demand ("mint this seed") is the bridge. |
| **Every plant** | no | Minting is opt-in, costed (a GROW sink), and player-initiated. Compulsory per-plant ASAs are txn spam and a treasury cost with no buyer. |
| **Harvest** | folds into GrowAsset | Today's harvest NFT (`minting_service.py:71`) becomes the *terminal state* of a GrowAsset (or remains a standalone mint for plants that were never tokenized — keep both paths; same `_mint` plumbing). |

**Mapping onto the existing flow:** GrowAsset reuses `MintingService._mint` unchanged — new
`kind="grow"`, metadata served at `GET /api/game/nft/grow/<id>.json#arc3`
(`minting_service.py:65-68`), F006 external-key registry intact. New DB rows: a `GrowAsset` table
(`asset_id`, `player_id`, `seed_inventory_id`, `plant_id?`, `harvest_id?`, `state`, `nft_status`)
binding the ASA to whichever DB row currently embodies the organism. **The DB row is the asset;
the ASA is its shadow.**

---

## 2. The lifecycle state machine — mirroring without governing ⬜

DB truth already encodes the lifecycle: `GrowthStage` (`enums.py:11` — seed → germination →
seedling → vegetative → flowering → harvest), `Plant.is_alive/harvested` (`db/models.py:277-278`),
`Harvest.cure_status` (`db/models.py:378`). On-chain states are a coarser, *server-attested*
projection:

```
SEED ──plant──▶ GROWING ──flower──▶ FLOWERING ──harvest──▶ HARVESTED ──cure──▶ CURED
  │                │                    │                                       (final quality)
  └────────────────┴──────ruin──────────┴──────────────▶ SALVAGE ("hemp" floor, never zero)
```

Transitions are emitted by `services/` *after* the DB commit succeeds (DB-first, chain-second —
same discipline as minting). A failed/delayed chain update never blocks gameplay; a reconciler
retries. **On-chain state lags DB truth by design and that is correct.**

### How to represent mutation — three options evaluated

**(a) ARC-19 — reserve-address-as-CID, recommended.** The ASA URL becomes a template
(`template-ipfs://{ipfscid:1:raw:reserve:sha2-256}`); each state change is **one asset-config
transaction** rewriting the reserve address to the new metadata CID
([ARC-19](https://dev.algorand.co/arc-standards/arc-0019/)). The treasury already retains the
manager role (`chain/algorand.py:67`), so it can sign these. Pros: a real standard with wallet /
marketplace / indexer support; full metadata mutability; the entire state *history* is the asset's
config-txn history (free audit trail via indexer); one cheap txn per transition. Cons: needs IPFS
pinning per update (new ops dependency); metadata is replaced wholesale, not field-patched; other
*contracts* can't cheaply read "what state is this asset in" from a reserve address.

**(b) Re-minting per state.** Destroy + recreate the ASA at each transition. Rejected: the asset id
changes, which breaks holdings, listings, and the entire point of a persistent tradeable asset.

**(c) App-side box storage keyed by asset id.** A registry application holds
`box[asset_id] → {state, quality_bps, snapshot_hash, round}`. Pros: cheap, queryable *by other
contracts* (the escrow below needs this), no IPFS churn. Cons: invisible to wallets/marketplaces;
bespoke rather than standard.

**Recommendation: ARC-19 for the human-visible metadata, plus (c) folded into the one contract we
build anyway** (§3) so on-chain logic can read state. They're complementary, not competing: ARC-19
is the display mirror, the box is the machine mirror, and **both are written only by the server
from DB truth**. If forced to pick one first: ARC-19 — it ships with zero contract code and the
provider ABC only needs one new method (`update_asset_reserve(asset_id, digest) -> txid`), which
the mock implements trivially.

Each metadata snapshot embeds: genome fingerprint, lineage (strain ASA id + parent edges), state,
current quality/health-derived value tier, and the **Proof-of-Cultivation bundle**
(`BreedingEvent.rng_seed`, `db/models.py:351` + agronomy snapshot) per `../02-genetics.md`.

---

## 3. Smart contracts — what needs an app vs. plain ASA ⬜

Plain ASA + server-signed config/transfer txns already cover: minting, lifecycle metadata
(ARC-19), custodial transfers, GROW settlement. **No contract needed for any of that.** An
application earns its keep only where *atomicity between strangers* or *standing commitments*
are required:

| Need | App? |
|---|---|
| Mint / lifecycle attestation | No — server-signed txns (treasury is manager) |
| Custodial trade (both players in-game) | No — DB `MarketListing` (`db/models.py:493`) + ledger is authoritative; chain transfer optional mirror |
| **Non-custodial trade** (wallet ↔ wallet, GROW payment atomic with asset delivery) | **Yes — escrow** |
| **Value-floor standing offer** (anyone can redeem at floor, anytime, trustlessly) | **Yes — same app** |
| State readable by contracts | Yes — box registry, same app |

### Stack (verified current, 2026-06)
**AlgoKit + Algorand Python (Puya) + ARC-4 ABI.** `algokit init -t python`; contracts subclass
`ARC4Contract`; the PuyaPy compiler (≥5.x as of mid-2026) auto-generates ARC-4 routing and emits an
ARC-56 app spec, from which algokit-utils generates typed clients; AlgoKit LocalNet gives CI a
disposable private network. Sources:
[Algorand Python docs](https://algorandfoundation.github.io/puya/),
[puya repo](https://github.com/algorandfoundation/puya),
[ARC-4 guide](https://dev.algorand.co/algokit/languages/python/lg-arc4/),
[AlgoKit python template](https://github.com/algorandfoundation/algokit-python-template).
CI discipline unchanged: unit tests keep `MockChainProvider`; a LocalNet job is **opt-in**, never
required (ARCHITECTURE invariant #6).

### The first contract: `GrowEscrow` (attested marketplace settlement + floor)
One app, three concerns — attestation registry, escrowed trade, treasury floor redemption.

**Global state:** `admin`, `server_addr` (the attestation signer), `grow_asa_id`, `fee_bps`,
`paused`. **Boxes:** `s:<asset_id>` → `{state: u8, quality_bps: u64, snapshot_hash: b32,
updated_round: u64}`; `l:<asset_id>` → `{seller: addr, price: u64}`;
`f:<state_tier>` → `floor_price: u64` (base units).

**ARC-4 methods:**
- `attest(asset, state, quality_bps, snapshot_hash)` — sender == `server_addr` only. Writes the
  state box. *Pure mirror: the server calls this after the DB commit.*
- `get_state(asset) -> (u8, u64, b32)` — readonly.
- `list(asset, price)` — grouped with an axfer of the NFT into the app; writes listing box.
- `buy(asset)` — grouped with a GROW axfer of `price`; inner txns: NFT → buyer, GROW −fee →
  seller, fee → treasury. Atomic or nothing.
- `cancel(asset)` — seller only; NFT returned via inner txn.
- `floor_redeem(asset)` — grouped with an axfer of the NFT to the app; pays
  `f[state_tier(asset)]` GROW to the sender via inner txn from the app's treasury-funded balance.
  Works in **every** state including SALVAGE — the trustless half of the value floor.
- Admin: `set_server`, `set_floor(tier, price)`, `set_fee`, `pause`, `withdraw_assets` (recovered
  NFTs return to treasury; recycled or burned per policy).

---

## 4. The value floor — "never worth zero" 💰 ⬜

Two layers, game-side first (it is the authoritative one):

1. **Game-side salvage buyback ✅-adjacent.** Ruin (pest/disease death, botched cure) transitions
   the DB asset to `salvage` instead of deleting value: `sell` still works and pays a low-tier
   "hemp" price. This is an ordinary ledger post (`Decimal`, double-entry, e.g. a
   `SALVAGE_BUYBACK` entry type) — no chain involvement at all. Floor prices are **data**:
   a proposed `economy.salvage_floor` table in `balance.yaml` keyed by state tier (note:
   `balance.yaml` is under active edit in another lane — this doc only *proposes* keys).
2. **On-chain standing offer ⬜.** `floor_redeem` (§3) makes the same promise trustless for
   non-custodial holders: the treasury pre-funds the app with GROW, and anyone can always exit at
   the posted floor. The treasury's funding transfers are themselves ledgered (a treasury account
   in the DB ledger), so the books still balance.

**Inflation guard (invariant):** the floor is a faucet, so it must satisfy
`floor(any state) < seed cost + minting fee` — otherwise mint→ruin→redeem is an infinite money
pump. Floor payouts should be funded from marketplace `fee_bps` + mint fees (sink-backed faucet),
and the property-test harness (`tests/test_invariants.py` ledger-conservation suite) must cover
the salvage path when it lands. UI presents the floor as a "guaranteed buyback"; economically it
is a priced sink-out, never free money.

---

## 5. Phased roadmap 🗺️

| Phase | Ships | Network | Depends on |
|---|---|---|---|
| **0** | `GrowAsset` table + lifecycle metadata builder + `update_asset_reserve` on the provider ABC + mock impl + salvage state & game-side floor (ledger only) | mock | nothing chain-side; salvage floor needs `balance.yaml` keys (coordinate with the economy lane) |
| **1** | Funded treasury, live GROW ASA, today's strain/harvest ARC-3 mints for real; metadata served from the API URL (IPFS deferred) | **TestNet** | **F006-durable** (committed `minted_asset(external_key UNIQUE, asset_id)` table + indexer reconcile — the in-memory registry is single-process, `BACKLOG.md` flags it as a multi-worker blocker); encrypted treasury-key custody (ARCHITECTURE "known risks") |
| **2** | ARC-19 lifecycle: IPFS pinning, reserve-CID updates on state transitions, reconciler for missed attestations | TestNet | Phase 1; an IPFS pinning service |
| **3** | `GrowEscrow` app via AlgoKit/Puya: attest + list/buy/cancel + floor_redeem; opt-in LocalNet CI job | TestNet | Phase 2; ARC-56 typed-client wiring |
| **4** | Non-custodial money paths hardened; MainNet go/no-go | MainNet gate | **NEW-4** (`BACKLOG.md`): deposit redesigned as **player-signed, chain-confirmed, txid-idempotent** — `buy()` proceeds and `floor_redeem` credits are deposits in disguise and **must inherit NEW-4's verification design**, never credit off the `asa_balance` mirror; plus F005/F007 (withdrawal-cap locking, address checksum) |

Everything through Phase 3 is TestNet-only and mock-testable; nothing in this design weakens the
"CI never needs a live key" invariant.

## Open questions (for the round-table)
- Tokenize-at-seed vs tokenize-anytime: may a player mint a GrowAsset for an *already growing*
  plant, or only at seed (cleaner provenance, harsher UX)?
- Does the standalone harvest NFT survive, or do all premium harvests route through GrowAssets?
- Floor pricing: flat per state tier, or quality-scaled (`quality_bps`) within SALVAGE?
- Who pins IPFS metadata and what happens to ARC-19 display if a pin lapses (API URL fallback?)
- Should `attest` also anchor the Proof-of-Cultivation hash for *non-tokenized* strains (a public
  GenBank registry even for unminted cultivars)?

## Cross-links
- The genetics the asset carries: `../02-genetics.md` (genome fingerprint, Proof-of-Cultivation).
- The vision this serves: `../00-game-vision.md` §Moat #3/#4.
- The invariants this must not break: `../../ARCHITECTURE.md` #1, #3, #6.
- The hardening queue it depends on: `../../BACKLOG.md` (NEW-4, F005/F006/F007).
