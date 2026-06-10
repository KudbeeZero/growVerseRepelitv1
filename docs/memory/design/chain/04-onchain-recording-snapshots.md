# ⛓️ On-chain recording & account snapshots — the public memory layer

> Design intent for the owner's directive: *"record as much as we can on-chain — maybe daily
> snapshots of people's accounts; they can even take a snapshot, maybe the first one's always free."*
> Tags: ✅ built · 🔨 partial · ⬜ planned. Everything in this doc is ⬜ unless tagged otherwise —
> the chain layer is mocked today (`docs/memory/ARCHITECTURE.md:70-71`).

**Binding invariant (never weakened):** the DB is authoritative; the chain is a mirror/settlement
layer (`CLAUDE.md`, `ARCHITECTURE.md:46-47`). Recording is *write-behind*: the game must play
identically with the chain down, mocked, or absent. No read path, no unlock, no gameplay rule may
ever depend on a snapshot having landed on-chain.

## 1 · WHAT to record — three tiers, by value density

### Tier A — provenance events (highest value per byte) 🔨 partial
The moments that create *ownable history*: a cross, a harvest, a Cup win. These are the events the
trust layer (`docs/memory/design/04-honesty-and-trust.md`, pledge #5) promises to make provable.

| Event | Payload (canonical JSON → SHA-256) | Today |
|---|---|---|
| **Breed** | `{schema:"gpe.breed.v1", breeding_event_id, parent_a_id, parent_b_id, offspring_strain_id, rng_seed, genome_hash}` — `rng_seed` is already persisted (`db/models.py:351`) and replayable via `verify_strain` | ⬜ on-chain; ✅ replayable off-chain |
| **Harvest / strain mint** | ARC-3 metadata (`chain/metadata.py:19-60`) with 32-byte `metadata_hash` in the ASA (`metadata.py:13-16`) | 🔨 built against mock provider (`services/minting_service.py`) |
| **Cup win** | `{schema:"gpe.cupwin.v1", cup_id, edition, winner_id, champion_strain_id, score, entry_count}` | ⬜ |

Tier A events are *small* (well under the 1 KB note limit) and *permanent prestige* — record them
individually, not just inside a daily aggregate.

### Tier B — daily account snapshots (the owner's ask) ⬜
One canonical **leaf document per player per day**, hashed and committed (see §2 for *how*):

```json
{ "schema": "gpe.snapshot.v1",
  "player_id": "...", "date": "2026-06-10", "username": "...",
  "balance": "1234.500000",            // ledger-derived Decimal as string, never float
  "ledger": {"entries": 481, "tip_hash": "..."},   // hash-chain tip over ledger_entries
  "xp": 9100, "level": 12,
  "titles": {"cup": "...", "university": "..."},   // models.py:55-57
  "plants": [{"id": "...", "strain_id": "...", "stage": "flowering",
              "health": 91.2, "lifetime_health_sum": 30412.0, "lifetime_hours": 388.0,
              "genome_hash": "..."}],               // models.py:258-274
  "harvests": [{"id": "...", "quality": 88.1, "weight_g": 412.0, "nft_asset_id": 1234}],
  "lineage_holdings": [{"strain_id": "...", "generation": 3, "nft_asset_id": null}] }
```
Balance comes from the ledger sum, not the cached wallet (`db/models.py:71` says the cache is
non-authoritative). `lifetime_health_sum / lifetime_hours` go in raw (not just the derived vigor) so
a verifier can recompute `lifetime_vigor` (`models.py:280-286`) — publish inputs, not conclusions.

### Tier C — full state attestations (cheap honesty for the whole world) ⬜
The daily backup job (`scripts/snapshot.py`, ✅ built) already produces a `manifest.json` with a
git SHA, per-table row counts, and SHA-256 checksums of the DB dump (`snapshot.py:163-174`).
Anchor **one hash of that manifest on-chain daily**. This is the "we cannot rewrite history"
attestation: any later tampering with archived state is detectable against the chain.

## 2 · HOW to record — mechanisms and real cost math

Protocol parameters (box MBR verified against the
[Algorand box-storage docs](https://developer.algorand.org/articles/smart-contract-storage-boxes/);
the rest are long-stable consensus params, treated as **assumptions with formulae** until re-checked
at wiring time):
- min txn fee **0.001 ALGO** (1,000 µA); note field ≤ **1,024 bytes**
- account base MBR **0.1 ALGO**; **+0.1 ALGO per ASA** created *or* opted into (locked, refundable)
- box MBR = **2,500 + 400 × (key_len + box_size) µA** (locked, refundable on delete)

| Mechanism | Cost arithmetic | Per snapshot | Properties |
|---|---|---|---|
| (i) **Txn note** (0-ALGO self-pay + note) | 1,000 µA fee, data ≤1 KB | **0.001 ALGO** | Cheapest single record; immutable; needs an indexer to read back; nothing tradeable |
| (ii) **ARC-3 NFT per snapshot** | create 1,000 µA + treasury MBR 100,000 µA locked; +transfer 1,000 µA + player opt-in (1,000 µA + 100,000 µA their MBR) | **~0.002 ALGO fees + 0.1 ALGO locked** (~0.103 if delivered to a player wallet) | A *product*: tradeable, displayable, collectible — fits "first one's free" |
| (iii) **App box per player-day** | 2,500 + 400×(32-byte key + 64-byte record) = 2,500 + 38,400 = **40,900 µA locked** + 1,000 µA app-call fee | ~0.042 ALGO (reclaimable) | Readable by contracts; MBR scales linearly with players × days — wrong shape for archival |
| (iv) **Daily Merkle root** (one note txn for *all* players) | 1,000 µA/day total; root = 32 bytes; proof = O(log n) hashes served off-chain | **0.001 ALGO ÷ N players** | Cheapest at any scale; every account individually provable against one txid |

Cost-per-player-per-day for (iv): at 1,000 players, **0.000001 ALGO**; at 100,000 players, 10 nA.
Effectively free forever. (ii) at 10,000 snapshot NFTs would lock ~1,000 ALGO of treasury MBR —
fine as a *paid product* whose fee covers it, ruinous as a default for everyone.

### Recommendation — the hybrid ⬜
1. **Daily system-wide Merkle root** of all Tier B leaves + the Tier C manifest hash, in one
   note-field txn from the treasury (mechanism iv). Every player is snapshotted every day, for
   ~nothing, whether they ask or not.
2. **Per-player snapshot NFT on demand** (mechanism ii): a player *taps* "snapshot" and gets an
   ARC-3 collectible whose `metadata_hash` is their canonical leaf hash — also provable against
   that day's root. **First one free per account**; later ones priced (in GROW) to at least cover
   the real ALGO cost so the faucet/sink ledger stays honest (`CLAUDE.md` inflation rule).
3. **Tier A provenance events** ride the existing ARC-3 mint path (harvest/strain) and get note-txn
   records for breed/cup-win (mechanism i) — individually, because prestige shouldn't need a proof
   bundle to show off.
4. Boxes (iii): **not used** for snapshots. Reserve them for future contract-readable state
   (e.g. on-chain marketplace escrow), where contracts actually need to read the data.

## 3 · Snapshot-as-product — the player flow ⬜
```
player taps "Snapshot my account"
  → POST /players/<id>/snapshot   (API-key auth, rate-limited — writes rule, CLAUDE.md)
  → server serializes the canonical Tier-B leaf from the DB (DB is the only input)
  → leaf_hash = SHA-256(canonical JSON)   — same rules as chain/metadata.py:13-16
  → fee gate:
      first ever?  free — claim-once enforced with the ledger-ref pattern:
                   query LedgerEntry(ref_type="snapshot") for the player, exactly like
                   achievements do (services/progression_service.py:94-105); a 0-amount
                   entry with ref_id=<date> records the free claim
      otherwise:   post a SNAPSHOT_FEE sink (new LedgerEntryType, enums.py:61) — Decimal,
                   ledger-posted, ref_type="snapshot", ref_id=<date>
  → mint ARC-3 snapshot NFT via the MintingService path:
      external_key = "snapshot:{player_id}:{date}:{leaf_hash}"  — the F006 registry
      (minting_service.py:145-152, 155-191) makes chain-success → commit-fail → retry
      ADOPT the existing asset instead of double-minting
  → persist nft_asset_id + write the txid into LedgerEntry.onchain_txid (db/models.py:92)
```
Idempotency falls out of the key: same player + same day + same state ⇒ same external key ⇒ one
asset, ever. One snapshot NFT per player per day is the natural product cap (and the rate limit).
The metadata URL serves the full leaf JSON via the existing `metadata_for` pattern
(`minting_service.py:193-205`), so the NFT *displays* the account it commemorates.

## 4 · Verifiability — the honesty moat, extended on-chain
This is pledge #5 of `docs/memory/design/04-honesty-and-trust.md` ("verifiable provenance",
currently 🔨 with on-chain settlement ⬜) made concrete. The standing rule there binds us:
**nothing ships as "provably fair" until a player can actually do the proving.**

What we publish (versioned, in the open):
1. **The canonical serialization schema** (`gpe.snapshot.v1` etc.) — field order irrelevant because
   hashing uses `sort_keys` canonical JSON, exactly as `chain/metadata.py:15` already does.
2. **The hashing rules** — SHA-256 over canonical JSON; Merkle construction: leaves sorted by
   `player_id`, domain-separated prefixes (`0x00` leaf / `0x01` node) to kill second-preimage
   tricks, odd node promoted unhashed.
3. **A public root index** — `GET /chain/roots?date=` → the day's root, txid, leaf count.
4. **A proof endpoint** — `GET /players/<id>/snapshot/<date>/proof` → `{leaf_json, merkle_path}`.

A skeptic's procedure, with **zero trust in our server**: fetch the txn by txid from any Algorand
node/indexer → extract the 32-byte root → recompute `SHA-256(canonical(leaf_json))` → fold the
merkle path → compare. For lineage: the snapshot's `lineage_holdings` + the already-shipped replay
endpoints (`GET /strains/<id>/provenance`, `/lineage` — ✅ `services/game_service.py`, cited in
`04-honesty-and-trust.md:82-86`) let them re-derive the genetics from persisted seeds *and* confirm
the holdings existed on the attested date. The server can lie about nothing it has anchored; it can
only fail to anchor — which is itself publicly visible as a missing daily root.

## 5 · Pipeline & failure handling ⬜
**There is no scheduler today.** `scripts/snapshot.py:19` says "designed to run unattended from a
scheduler (see `.github/workflows/snapshot.yml`)" — that workflow does not exist (no `.github/`
directory in the repo). Needed: one external daily trigger (cron / systemd timer / hosted
scheduler) invoking a new `python -m growpodempire.scripts.anchor` in the same style.

The daily anchor job:
1. **Cut** — pick a UTC cutoff; build every Tier-B leaf from the DB; persist leaves + tree in a new
   `snapshot_days` table (status `pending`). Deterministic: same DB state ⇒ same root, so the job
   is re-runnable (mirrors `snapshot.py:156`'s same-day idempotence).
2. **Anchor** — submit the root note-txn via the `ChainProvider` ABC (`chain/provider.py:34` —
   needs a small surface addition, e.g. `record_note(payload) -> txid`; mock provider keeps CI
   key-free per `CLAUDE.md`). Idempotency key `root:{date}:{root_hex}` through the same
   registry pattern as mints. On confirmation: status `anchored` + txid.
3. **Catch up** — on every run, anchor *all* `pending` days oldest-first. Chain down for a week?
   Seven roots land when it returns. The DB never waited; the game never noticed.

Failure rules (restating the invariant as behavior):
- Chain errors mark the day `failed-retryable` and alert ops — they never surface to players and
  never block gameplay, exactly as mint failures already don't (`minting_service.py:179-181`).
- The paid snapshot flow degrades the same way minting does today: the GROW fee posts, the NFT row
  goes `PENDING`/`FAILED` (`enums.py:102`), and retry adopts via the external-key registry. If we
  charge before the chain confirms, the fee must be refundable on terminal failure (open question).
- Anchoring reads committed state only; it takes no locks the game needs. O(players) once a day is
  cheap next to the sim's O(elapsed-hours) reads (`ARCHITECTURE.md:66-68`).

## Anti-goals
- **No gameplay dependency on chain state** — ever. A snapshot is a souvenir and a proof, not a key.
- **No raw PII on-chain** — emails (`models.py:44`) never enter a leaf; usernames are already public.
- **No floats in payloads** — money serializes as Decimal strings, same discipline as the ledger.
- **No unpriced faucets/sinks** — the snapshot fee is a ledger sink; the free first one is a
  bounded, claim-once marketing cost, enforced by the ledger itself.

## Cross-links
`04-honesty-and-trust.md` (the pledge this fulfills) · `02-genetics.md` (GenBank provenance) ·
`ARCHITECTURE.md` invariants 1, 3, 6 · `DECISIONS.md` (chain-mocked decision) ·
`services/minting_service.py` (idempotency pattern) · `scripts/snapshot.py` (Tier C input).
