# PIPER — Player Advocate Position on the Six Owner Questions

*Read against: `docs/memory/design/chain/00-overview.md` (rulings + open questions), `03-tokenomics-grow.md`, `04-onchain-recording-snapshots.md`, `05-custody-security.md`, `../04-honesty-and-trust.md` (the five pledges, treated as binding), and the live code (`src/growpodempire/simulation/engine.py:164-170`, `src/growpodempire/data/balance.yaml`).*

## Q1 — Snapshot pricing after the free first one

**RULING: 25 GROW base / 75 GROW premium, first-ever-free (not first-per-plant), with the price and its cost basis published openly.**

**RATIONALE:** 25 GROW is impulse-priced — the cost of one common seed and half a daily stipend. A casual player who logs in daily can buy one every other day without touching their grow budget, which is exactly what "vanity sink, zero power" should feel like (03-tokenomics §4). First-ever-free over first-per-plant: first-per-plant is "a far leakier sink", and a leaky economy hurts casuals most — their stipend is the income hyperinflation debases first. The price covering real chain cost (locked decision #8) is honest, not extractive — and pledge #2 ("no hidden money printing") cuts both ways: no hidden house *margin* either.

**CONDITIONS:**
1. **Publish the cost basis.** The transparency view should show "25 GROW covers ~0.1 ALGO locked MBR + fees + treasury margin of X" — disclosed margin, not hidden edge.
2. **Refund on terminal mint failure** — automatic ledger refund, not a support ticket.
3. **Price lives in `balance.yaml`, changes pre-announced** (7 days minimum), never surged, never time-limited (pledge #4).
4. **Snapshots stay pure vanity forever.** The day a snapshot grants a stat or gated access, this becomes pay-for-power. Write that into the no-dark-patterns charter.

## Q2 — Whale-inflation control

**RULING: Both sinks, but threshold-gated. NPC sale tax of 5% only on daily NPC-sale volume above ~350 GROW/player/day, escalating to 10% above ~700. Pod upkeep as per-harvest percentage (3/5/8% by tier), never per-day rent.**

**RATIONALE:** The inflation audit is real: late-game +55–75 GROW/day per optimized player, whales +200–300/day — and whale inflation debases the casual's stipend, so a drain is pro-player. But a flat tax punishes the new player selling their first 250-GROW harvest as hard as the industrial seller. The committed mid-game persona harvests ~330 GROW every ~9 days — a 350/day threshold means a casual essentially **never** pays it, while the whale's volume is shaved at the source. Per-day rent "punishes slow/careful growers, which fights the sim's soul" — the careful slow grower IS the casual archetype. Per-harvest percentage is proportional to actual earnings and cannot bankrupt an idle player.

**CONDITIONS:**
1. Thresholds/rates in `balance.yaml` only, **publicly disclosed in-game at the point of sale** — a hidden progressive tax is a hidden house edge (pledge #2).
2. **Never tax the stipend or achievement rewards** — charter line.
3. Tune against p90/p99 net-inflow, and verify monthly that the **median** player's net is unhurt; if the median drops, the threshold is too low.
4. Upkeep shown as a line item on the harvest receipt, not silently netted out.

## Q3 — Pro-pod free auto-feed (the engine sink leak)

**RULING: Charge it. Auto-feed posts a discounted `NUTRIENT_PURCHASE` from the service-layer catch-up path — 50% of manual feed cost. The perk becomes "automation + half-price nutrients," not "nutrients are free forever."**

**RATIONALE:** Free auto-feed is textbook pay-to-win obfuscation — exactly what pledge #4 forbids. A one-time 1,200 GROW purchase "permanently deletes the per-feed recurring sink" (verified at `simulation/engine.py:167-170` — refill with no ledger post). The richest players permanently exit a cost every other player pays, and the asymmetry compounds into the +200–300/day whale figure. Players accept "premium = convenience and a discount"; they do not forgive discovering premium = hidden exemption from the economy. Implementation stays clean per CLAUDE.md: the pure engine never posts money — the charge lands in `services/` during lazy catch-up.

**CONDITIONS:**
1. **Do this before launch** — pre-launch there are no grandfathering optics; this decision gets more expensive every week.
2. Shop description says exactly what the perk is: "auto-feeds your plants at half nutrient cost."
3. Zero balance → automation pauses with a clear notification; no silent free feeding, no silent plant death, no debt.
4. Discount in `balance.yaml` (`pods.autofeed_discount_pct`).

## Q4 — Tokenize-at-seed only, or any lifecycle stage

**RULING: Tokenize-anytime, with the tokenization stage disclosed in metadata. If engineering insists on at-seed for launch, accept only with tokenize-anytime as a committed, dated deliverable — not a "someday."**

**RATIONALE:** At-seed-only punishes exactly the wrong player: the casual who didn't understand the chain feature on day one, fell in love with a plant by flowering, and now learns their best plant is permanently ineligible — a forced up-front financial decision before the player has context (a soft dark pattern). The "cleaner provenance" argument is weaker than it looks: the DB is authoritative and complete from seed regardless, the sim is deterministic and replayable (pledge #1), and once daily Merkle anchoring ships, every plant's daily state is *already* chain-attested in the Tier-B leaves before any NFT exists. A mid-life mint can carry honest, third-party-verifiable history: "DB-attested from germination, chain-anchored daily since date D, tokenized at flowering."

**CONDITIONS:**
1. Metadata must include `tokenized_at_stage` and `tokenized_at_date` — honest provenance, not laundered provenance.
2. **Same mint fee regardless of stage** — no penalty pricing recreating the forced-early-decision pressure.
3. ATLAS's floor invariant (`floor(any state) < seed cost + mint fee`) must hold for late-stage mints too, covered by the property test.

## Q5 — Snapshot NFT custody

**RULING: Accept the ruling (custodial default, claim-to-wallet opt-in, player pays own ~0.1 ALGO MBR) — genuinely the pro-casual shape — but extract four hard conditions.**

**RATIONALE:** The alternative hurts casuals more: forcing wallet delivery gates a 25-GROW keepsake on owning ALGO and a wallet. The player paying their own opt-in MBR is honest — it is *their* locked, refundable minimum on *their* wallet. What I fight for is making custodial ownership feel and function like ownership, because "we hold it for you" is the canonical rug-pull setup in this category.

**CONDITIONS:**
1. **The claim path ships in Phase 2, dated, no slippage.** Custodial-forever with a perpetually-deferred claim button is a rug in slow motion.
2. **Zero GROW fee to claim** — the snapshot price already covered treasury costs; any "claim fee" is charging twice for ownership.
3. **Verifiable custody:** publish the treasury address holding custodial snapshot NFTs so anyone can count them against the DB ownership records. UI says "Held in game custody — claim to your wallet anytime," never just "owned."
4. **A wind-down pledge:** if the game ever sunsets, a published claim window (e.g. 12 months) before any custodial assets are abandoned. Costs nothing today; strongest anti-rug-pull signal available.

## Q6 — Burn ceremonies

**RULING: No — not pre-multisig, and honestly, probably not even after. Deliver the trust signal through the public economy dashboard, daily anchors, and the publicly verifiable settlement invariant instead.**

**RATIONALE:** The player-trust move and the security move are the same move. Today the treasury is a single hot key that is simultaneously ASA creator, manager, and reserve — adding a recurring ceremonial key operation, for theater, before the 2-of-3 multisig rung exists is risking the actual treasury to perform trustworthiness. The deeper point: in-game sinks already destroy GROW with no chain action (unbridged GROW never left the treasury) — a quarterly burn would be moving tokens between two addresses we control and calling it deflation. The crypto-adjacent audience reads burn ceremonies as manipulation; the honest version of the signal is showing the books.

**ALTERNATIVE (the better trust signal, mostly already designed):**
1. **Ship the public economy dashboard** — `economy_report.json` (net issuance/day, faucet:sink ratio) at a public endpoint with the red/amber/green banner visible to players.
2. **Publish the settlement invariant live**: on-chain circulating == net bridged ledger entries, checkable by anyone with an indexer — provable non-printing, strictly stronger than a burn.
3. The daily Merkle root is itself a public heartbeat: the server can lie about nothing it has anchored; it can only fail to anchor — which is itself publicly visible.
4. **If** a burn ever happens: post-multisig only, pre-announced, with the exact sink-surplus arithmetic published alongside. A burn justified by an open ledger is a receipt; a burn without one is a magic trick.

## Closing — the one decision that matters most

**Question 3 — charging for pro-pod auto-feed — is the load-bearing decision for player trust.** Everything else is about communicating honestly; Q3 is about *being* honest. The game's wedge is "the provably-honest grow game in a category that trained players to expect scams," and its most explicit promise is no pay-to-win obfuscation (pledge #4). A premium tier that silently exempts its buyers from the economy — uncharged, inside the engine, invisible in the ledger — is precisely the obfuscation the pledge forbids, and it feeds the whale inflation that debases every casual's income. It is also the only one of the six that gets strictly more expensive to fix with time: today it's a pre-launch config change; six months post-launch it's a nerf, a community revolt, and a broken promise. Fix the leak now, label the perk honestly, and the other five decisions all get easier to defend — because the books will actually say what the game claims they say.
