# 🪙 GROW Tokenomics — faucets, the drain, and the chain mirror

> The deep design for GROW as a real token economy: a complete audit of today's faucets and
> sinks, a rank-ordered sink-expansion plan ("the drain"), the on-chain supply model, and the
> snapshot product as the first consumer-grade paid feature. Written by SAGE (token economist,
> chain team), 2026-06-10. Tags: ✅ built · 🔨 partial · ⬜ planned.
>
> Binding invariants this doc serves (CLAUDE.md): **faucets must have matching sinks**, **money
> is Decimal/ledger-based** (`src/growpodempire/economy/ledger.py:40-82`), **DB is authoritative;
> the chain mirrors**.

## 1. Faucet/sink audit — every LedgerEntryType, classified ✅

All currency moves through `post()` (`economy/ledger.py:40`). Every `LedgerEntryType`
(`src/growpodempire/enums.py:61-85`) with its call sites and `balance.yaml` magnitudes:

| Entry type | Class | Call site | Magnitude (`data/balance.yaml`) |
|---|---|---|---|
| `STARTING_GRANT` | faucet (one-time) | `services/game_service.py:125` | 500 (`:11`) |
| `DAILY_STIPEND` | faucet (recurring) | `services/progression_service.py:56` | 50/day (`:13`), 22h cooldown (`:200`) |
| `HARVEST_SALE` | **faucet (primary)** | `game_service.py:979` (`_sell_harvest`) | 2.0/g × rarity 1.0–8.0 × quality/THC/terp (`:46-61`) |
| `REWARD` (achievements) | faucet (one-time) | `progression_service.py:87` | 100–500; 1,700 total (`:201-207`) |
| `REWARD` (contracts) | faucet (recurring) | `services/contract_service.py:105` | 250/400/700 per ~7d, consumes harvest grams (`:220-225`) |
| `CUP_PRIZE_PAYOUT` | faucet (**bounded**) | `services/cup_service.py:217` | ≤ prize_pool + `house_sponsorship` 5600/cup (`:338`, Reese's bound, `cup_service.py:201-213`) |
| `AUCTION_REFUND` | neutral (escrow return) | `game_service.py:1206` | — |
| `ASA_DEPOSIT` | bridge in (not net-new) | `services/settlement_service.py:152` | mirror of prior withdrawal |
| `SEED_PURCHASE` | sink | `game_service.py:326` | 25 × rarity 1.0–40 (`:16-22`) |
| `NUTRIENT_PURCHASE` | sink (recurring) | `services/simulation_service.py:99` | 5/feed (`:25`) |
| `PEST_TREATMENT` | sink (recurring) | `simulation_service.py:112` | 15 (`:28`) |
| `DISEASE_TREATMENT` | sink (recurring) | `simulation_service.py:126` | 20 (`:31`) |
| `POD_PURCHASE` | sink (one-time) | `game_service.py:426,465` | 100/400/1200 (`:33-36`) |
| `BREEDING_FEE` | sink | `game_service.py:588` (breed), `:686` (stabilize) | 75 + 40/avg-tier (`:39-41`) |
| `MARKET_FEE` | sink (burn) | `game_service.py:1096` | 3% listing (`:77`) |
| `MARKET_BUY`/`MARKET_SALE` | transfer + 5% tax burn | `game_service.py:1127,1136,1227` | tax `:78` |
| `AUCTION_BID` | escrow → transfer + 5% tax burn | `game_service.py:1203,1225-1228` | — |
| `RESEARCH_UNLOCK` | sink (one-time, exhaustible) | `services/research_service.py:127` | 350–2,500; **14,500 total tree** (`:234-286`) |
| `SHOP_PURCHASE` | sink (recurring) | `game_service.py:395` | 30–80/consumable (`:296-313`) |
| `CUP_ENTRY_FEE` | sink (recycled → prize pool) | `cup_service.py:148` | 100/entry, max 3 (`:330-331`) |
| `TUITION` | sink (one-time, exhaustible) | `services/university_service.py:142` | 150–700/course (`data/curriculum.yaml`) |
| `ASA_WITHDRAWAL` | bridge out | `settlement_service.py:114` | daily cap (`settings.max_withdrawal_per_day`) |
| `ADJUSTMENT` | admin | (no service call site) | — |

### Net inflow per active player per day — the arithmetic

Persona: a committed mid-game player, day 60+. Two pods owned, 8 concurrent plants
(common/uncommon mix), cures everything, harvests mid-flowering (~75-day cycle:
3+5+10+26 stage days, `balance.yaml:149-154`, + ~30 days into flowering).

**Per-harvest value** (`economy/pricing.py:48-87`): ~110 g effective (under the 120 g soft cap)
× 2.0/g × 1.4 (uncommon) × 1.12 (THC 18%) × 1.10 (terp 0.4) × 0.93 (quality ~90 after cure)
≈ **353 GROW**; common ≈ 252. Mixed average ≈ **330/harvest**.

**Faucets/day:** stipend 50.0 + harvests (8 plants ÷ 75 d = 0.107/day × 330) 35.3
≈ **+85.3/day**. (Contracts are ≈ value-neutral vs. selling: a common contract pays 250 for
100 g that would sell for ~250 — a substitution, not extra emission.)

**Recurring sinks/day:** feeds (decay 24/day ÷ 30/feed × 8 plants × 5 × 0.8 IPM discount) 25.6
+ pest/disease (~25%/plant/day spawn ⇒ ~2 events × 17.5 avg × 0.8) 28.0 + seeds (0.107
replants, half bought uncommon) 3.3 + consumables (~1/3 days) 15.0 + breeding/stabilize
(~1/5 days × 115) 23.0 ≈ **−94.9/day** ⇒ early steady state ≈ **−10/day** (mildly deflationary
while capital sinks — pods/research/tuition, ~21,000 GROW total — are still being bought).

**But the sinks structurally erode and the faucet structurally grows:**
- Research stacks **−55% care cost** (ipm_basics + biocontrol_lab + automation_suite,
  `balance.yaml:259-286`) and **+35% yield**.
- **Pro pods auto-feed for free**: the engine refills nutrients with **no ledger post**
  (`simulation/engine.py:167-170`) — a one-time 1,200 purchase permanently deletes the
  per-feed recurring sink. (Correct per "no economy in the pure engine," but a sink leak.)
- Rare strains multiply the harvest faucet ×2.2–×8 with no matching cost scaling.

**Late-game net: ≈ +55 to +75 GROW/day per optimized player** (stipend 50 + rare-strain
harvests ~56 − residual treatments ~28 − seeds ~3 ≈ +75 central for a rare-strain grower;
+55 for the uncommon grower), scaling roughly **linearly with pod count** while sinks don't.
A 3-pro-pod whale plausibly nets **+200–300/day**. Headline: **the economy is deflationary for
~2 months per player, then permanently inflationary, and inflation compounds with investment.**
That is the problem the drain must fix.

## 2. The drain — rank-ordered new sinks ⬜

Ranked by (recurring? × scales-with-wealth? × fits-the-loop?). All Decimal, all through
`post()`, all tunable in `balance.yaml` (the tuning surface — no code-side constants).

| # | Sink | Loop stage | Hooks into | `balance.yaml` key | Entry type | Inflation impact |
|---|---|---|---|---|---|---|
| 1 | **Mint fee** (NFT mint of harvest/strain) | mint | `services/minting_service.py` (currently charges **nothing**) | `chain.nft.mint_fee` (~150 + rarity tier × 100) | new `MINT_FEE` | Recurring, scales with prestige; taxes the endgame whales who drive late-game inflow. Est. −20 to −50/day per minter. |
| 2 | **Snapshot purchases** (first free) | grow/care (every day) | new `snapshot_service.py` (see §4) | `snapshots.price`, `snapshots.free_per_account` | new `SNAPSHOT_PURCHASE` | The only *daily-cadence, every-player* sink; est. −10 to −25/day per engaged player. |
| 3 | **Pod upkeep** (per-harvest "facility cost") | harvest | `game_service.harvest_plant` — debit `pods.upkeep_pct` of sale value by tier | `pods.upkeep_pct: {basic: 0.03, standard: 0.05, pro: 0.08}` | new `POD_UPKEEP` | Directly counter-scales the pro-pod free-feed leak; proportional to the faucet itself, so it cannot be outgrown. ~−5%/harvest. |
| 4 | **NPC sale tax** on `HARVEST_SALE` | sell | `_sell_harvest` (`game_service.py:968`) | `harvest_sale.npc_tax_pct: 0.05` | reuse `MARKET_FEE` | Shaves the primary faucet at the source; −5% of the biggest inflow with one knob. |
| 5 | **Stabilization escalator** | stabilize | `game_service.stabilize_strain:686` — fee × `escalator^generation` | `breeding.stabilize_escalator: 1.5` | existing `BREEDING_FEE` | The road to mint-eligible stability (0.85, `:386`) becomes a meaningful burn (~75→570 over 5 selfs). |
| 6 | **Recurring university** (seasonal "continuing education" with expiring perks) | meta | `university_service.enroll:142` | `university.recurring.*` | existing `TUITION` | Converts an exhaustible sink into a recurring one. |
| 7 | **Consumable crafting/bundles** (bulk consumables, cure jars, terpene additives) | cure | shop (`game_service.buy_consumable:395`) | `shop.consumables.*` (data-only!) | existing `SHOP_PURCHASE` | Zero-code sink expansion — just add YAML rows. |
| 8 | **Marketplace rake increase + auction listing fee** | trade | `game_service.py:1093,1170` (auctions currently pay **no listing fee**) | `market.auction_listing_fee_pct` | existing `MARKET_FEE` | Burns scale with P2P volume; today auctions are fee-free vs. 3% fixed-price (an arbitrage to close). |
| 9 | **Cup entries (more editions)** | compete | `cup_service.py` — fees already recycle to the pool; house exposure stays bounded at `house_sponsorship` 5600 (`balance.yaml:338`) | `cannabis_cup.*` | existing `CUP_ENTRY_FEE` | Net-neutral-to-negative by construction (Reese's bound); more cups ⇒ more fee recycling. |
| 10 | **Withdrawal bridge fee** | chain | `settlement_service.withdraw:105` | `chain.token.withdrawal_fee_pct: 0.01` | new `BRIDGE_FEE` | Small, but makes the off-ramp itself deflationary and funds the treasury. |

Sizing target: the recurring drain should absorb **≥ 80% of recurring faucet flow** at the
optimized-player margin. #2 + #3 + #4 alone (−20 snapshot, −15 upkeep, −5% sale tax ≈ −18 on a
75-faucet day) bring the +75/day whale to ≈ **+22/day**, with #1 and #5 taxing the prestige
endgame on top. The stipend stays a deliberate retention faucet — we drain the *optional*
upside, never the floor.

## 3. On-chain GROW — supply model and the settlement invariant 🔨

**Model: fixed-supply ASA with a treasury (keep it — no mint-on-withdraw).** Already built:
`chain/token.py:14-22` creates the ASA from `balance.yaml:376-381` (10^15 base units, 6
decimals = `ledger.QUANT`, `economy/ledger.py:19`). Withdraw = treasury→player transfer;
deposit = player→treasury (`settlement_service.py:105-163`). Mint-on-withdraw is rejected: it
makes circulating supply a function of bridge traffic, needs clawback/manager keys hot, and
breaks the "chain is a mirror" invariant — a fixed treasury makes the mirror *auditable by
anyone* with an indexer.

**Reconciliation — the settlement invariant:**

```
treasury_onchain + Σ player_onchain            == chain.token.total        (Algorand enforces)
Σ player_onchain (circulating)                 == Σ Wallet.asa_balance     (the mirror)
Σ Wallet.asa_balance                           == −Σ ledger(ASA_WITHDRAWAL) − Σ ledger(ASA_DEPOSIT)
```

i.e. **on-chain circulating GROW must equal the cumulative net of bridge ledger entries** —
not the sum of in-game balances. In-game GROW is game-issued credit (faucets create it, sinks
destroy it); only the bridged portion exists on chain. The treasury is the issuance headroom:
`treasury == total − net_bridged`. A nightly reconcile job should assert line 2 via the
indexer against the DB and alarm on any drift (drift ⇒ a deposit/withdraw bypassed the ledger).

**Existing guards that this design leans on:**
- **Daily withdrawal cap** (`settlement_service.py:54-103`): bounds treasury bleed even under
  key theft; keep, and add the per-player `SELECT … FOR UPDATE` from BACKLOG F005/F007 before
  mainnet.
- **NEW-4 deposit redesign** (`docs/memory/BACKLOG.md:43-44`, mainnet blocker): today
  `deposit()` credits off the DB `asa_balance` mirror (`settlement_service.py:139-143`) — the
  redesign makes it player-signed, chain-confirmed, txid-idempotent. Tokenomics consequence:
  until NEW-4 lands, the third invariant line above is only as strong as the mirror; after
  NEW-4, deposits become *provable* burns-into-game and the reconcile becomes trustless.
- **Sink-burn semantics on chain:** in-game burns need no chain action (unbridged GROW never
  left the treasury). Optionally, a quarterly "burn ceremony" moves `Σ sinks − Σ faucets`
  surplus from treasury to a frozen burn address for public deflation optics. ⬜

## 4. Snapshot purchases — the first consumer sink ⬜

**Product:** a high-fidelity capture of a living plant — the procedural pod-particle render
plus the full simulated state card (stage, health, VPD/DLI/PPFD readouts, terpene expression,
lineage link) — minted as a shareable keepsake of *this plant, this hour*. Time is the real
axis of play (design codex 01); a snapshot is the only way to keep a moment of it.

**Pricing & free tier:**
- `snapshots.first_free: 1` — the **first snapshot per account is free** (onboarding hook:
  everyone learns the feature, shares one).
- `snapshots.price: 25` thereafter (≈ a common seed; impulse-priced), with optional premium
  variants later (`snapshots.premium_price: 75` for cinematic renders).
- **Enforcement = the achievement claim-once pattern** (`services/progression_service.py:94-105`):
  the free snapshot posts a **0-amount** `SNAPSHOT_PURCHASE` entry with
  `ref_type="snapshot_free"`, `ref_id=player_id`; eligibility = "no prior entry with that ref"
  — idempotent, no new schema, audit-visible, exactly like achievement `REWARD` claims.
- Paid snapshots post `−price` with `ref_type="snapshot"`, `ref_id=<plant_id:capture_ts>`.

**Why it is a good sink:** (1) it is the only sink with **daily cadence for every player
archetype** — growers, breeders, and traders all have plants worth showing; (2) it consumes
nothing and grants no power, so it adds **zero balance pressure** to the sim/economy (a pure
vanity burn — the healthiest kind); (3) it scales with engagement, not wealth, complementing
the wealth-scaling sinks in §2; (4) it produces shareable artifacts that market the game.
At 0.5–1 paid snapshot/day per engaged player it drains 12–25/day — single-handedly offsetting
a quarter to half of the daily stipend. Future: snapshot → ARC-3 mint path (pay the §2 mint
fee) turns the keepsake into the on-chain collectible funnel.

## 5. Inflation guardrails — metrics and the recurring economy report ⬜

**Metrics (all computable from the ledger alone — it is append-only and complete):**
- **Net issuance/day** = Σ faucet entries − Σ sink entries per UTC day, excluding bridge
  (`ASA_*`) and neutral pairs (`AUCTION_BID`/`AUCTION_REFUND`, `MARKET_BUY`/`MARKET_SALE`
  net of tax). Target: ≤ +20 GROW/day per active player, trending to 0.
- **Faucet:sink ratio** (recurring flows only, one-time grants amortized). Healthy band
  0.9–1.2; alarm > 1.5 for 7 consecutive days.
- **Top-decile net inflow** — whale inflation is the failure mode (§1); track p90/p99
  per-player net, not just the mean.
- **Sink exhaustion curve** — share of active players with > 80% of research/tuition/pods
  purchased (predicts when the drain must carry the load).
- **Money supply (M0)** = Σ `Wallet.cached_balance`; **bridge ratio** = net bridged / M0;
  **settlement drift** = on-chain circulating − Σ `asa_balance` (must be 0, §3).
- **Cup bound check**: Σ `CUP_PRIZE_PAYOUT` per cup ≤ entry fees + 5600 (already enforced
  constructively, `cup_service.py:201-213`; assert it independently).

**Recurring economy report:** extend the conceptual reach of `tests/test_invariants.py`
(NEW-1) from "conservation per player" to "conservation per economy": a property test that
runs a randomized week of service ops and asserts ΔM0 == Σ faucets − Σ sinks, plus the cup
bound and the settlement-drift zero. Operationally, piggyback the existing daily snapshot job
(`scripts/snapshot.py`, `.github/workflows/snapshot.yml`) with an `economy_report.json`:
per-entry-type daily sums, the metrics above, and a red/amber/green banner — the LiveOps
standup reads it, and `balance.yaml` knobs (never code) are the response lever.

## Open questions for the round table
1. Should the NPC sale tax (#4) apply uniformly, or only above a daily sale volume (protect
   new players, tax industrial sellers)?
2. Pod upkeep (#3): per-harvest percentage (proposed) vs. per-day rent? Rent punishes
   slow/careful growers, which fights the sim's soul — but percentage lets idle pods sit free.
3. Does the free-feed pro-pod behavior (`engine.py:167-170`) stay (a tier perk, priced into
   upkeep) or should automation post `NUTRIENT_PURCHASE` from the service-layer catch-up path?
4. Snapshot free tier: first-ever only (proposed), or first-per-plant? First-per-plant is a
   stronger habit loop but a far leakier sink.
5. Burn ceremony: is public on-chain deflation optics worth the treasury-key operational risk?
