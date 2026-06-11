# Decision Log (Layer 2)

Append-only, lightweight ADRs. Newest at the bottom. To change a past decision, add a new entry
that **supersedes** the old one (don't delete history).

Format: `### YYYY-MM-DD — Title` · **Decision** · **Why** · **Consequences**.

---

### 2026-06-07 — DB-authoritative, chain-as-mirror
**Decision:** Gameplay truth lives in the relational DB; Algorand (ASA token + ARC-3 NFT) is a
settlement/mirror layer behind a provider ABC.
**Why:** On-chain latency/cost/availability can't gate the core loop; tests and CI must run with no
network. **Consequences:** A mock chain provider exists and is the default in tests; real wiring
(funded TestNet, IPFS metadata, reconciliation) is deferred to its own sprint.

### 2026-06-07 — Pure, compute-on-read simulation engine
**Decision:** `simulation/` derives plant state lazily from elapsed time + stored inputs and stays
free of player-scoped logic. **Why:** Determinism (testable, reproducible) and cheap writes.
**Consequences:** Research/consumable perks are applied in `services/` around the engine, never
inside it. Accepted risk: read cost is O(elapsed hours) — flagged for batching at scale.

### 2026-06-07 — Decimal, ledger-based economy with sinks
**Decision:** All currency is `Decimal`; every economic effect posts to an auditable ledger; faucets
are paired with sinks. **Why:** Avoid float rounding bugs and runaway inflation in a persistent
economy. **Consequences:** Property tests assert ledger invariants and pricing monotonicity.

### 2026-06-07 — Swappable providers for chain & AI (mock + real, config-selected)
**Decision:** `chain/` and `ai/` each expose an ABC, a deterministic Mock, a real impl, and a
factory. Config (env) selects the impl; CI uses mocks. **Why:** Keep CI key-free and offline;
make prod a config flip. **Consequences:** New external integrations should follow this same shape.

### 2026-06-07 — AI "Master Grower": read-only advisor first, then guarded agentic auto-care
**Decision:** Ship the advisor as read-only (`AdvisorService`) before letting it act
(`AutoCareService`), and gate actions behind a per-invocation `SpendGuard` (GROW budget + action
cap) that posts through the normal ledger care path. **Why:** Server stays authoritative; an agent
literally cannot overspend. **Consequences:** `ENABLE_AUTO_CARE` flag + budget live in
`balance.yaml:auto_care`; mock loop covers CI.

### 2026-06-07 — Removed the legacy v1 subsystem
**Decision:** Deleted in-memory `app.py`/`models/`/`blockchain/`/CLI/demo + `ENABLE_LEGACY_API`,
and dropped now-unused numpy/pandas. **Why:** Two parallel implementations is debt; OpenAPI at
`/openapi.json` + `/docs` is the single API source of truth. **Consequences:** Stale `API.md` /
`IMPLEMENTATION.md` removed; README rewritten for the real GROWv2.

### 2026-06-08 — Adopt a Markdown memory-layer system
**Decision:** Introduce `CLAUDE.md` (Layer 0) + `docs/memory/` (Layers 1–4) as the project's
persistent memory, with a daily LUT standup ritual. **Why:** Work was moving fast across many
sessions with no durable, structured context; higher layers were drifting from reality (roadmap,
build log). **Consequences:** Invariant changes must update Layer 0/1 in the same change; one
standup per working day under `standups/`.

### 2026-06-08 — Adopt a Design Codex sub-layer (vision/intent beside Layer 1)
**Decision:** Add `docs/memory/design/` as a low-volatility, vision-forward sub-layer next to
ARCHITECTURE: a global game-vision doc that leads with the **proprietary moat** (a real
plant-physiology sim → generative genetics → Proof-of-Cultivation → on-chain GenBank → discovery
economy → earned mastery → AI data flywheel), plus deep docs for the scientist-grade simulation,
generative genetics, and grower-skill mastery. Every capability is tagged `✅/🔨/⬜`.
**Why:** Work was moving fast with no durable home for *deep design intent* — what makes the game
different and how the sim/genetics get there — separate from ARCHITECTURE's "what must not break."
The user wants the depth (horticulture realism, endless genetics, time-as-investment) to be the
differentiator and to be captured before it's built. **Consequences:** The codex *proposes* shape;
work still becomes real via BACKLOG. Moat claims lean on planned (⬜) systems — especially anything
on-chain (the chain is mocked; GenBank/Proof-of-Cultivation are ⬜) — and must stay tagged so the
docs never oversell. When a 🔨/⬜ ships, flip its tag and update ARCHITECTURE/CLAUDE in the same
change if an invariant moved.

### 2026-06-08 — Phase A horticulture: derive VPD/DLI, read light in the tick
**Decision:** Add `simulation/horticulture.py` (pure Tetens SVP + leaf-VPD + DLI derivations); the
engine now reads the stored pod light scalar and the derived VPD as gentle, generously-banded health
terms (tuned in `balance.yaml` under `simulation.light` / `simulation.vpd`); VPD/DLI/PPFD are exposed
on `/state`. **Why:** "Derive first" is the cheapest scientist-grade realism — it honors the
compute-on-read / O(elapsed-hours) cost risk, so heavier physiology (photosynthesis, transpiration,
EC) waits for Phase B behind the sim-cost-cap. It also turns moat #1 ("a real plant-physiology
engine, not a timer") into running code. **Consequences:** Bands are neutral at the optimal
environment, so the suite stayed green; new tuning knobs live in `balance.yaml`; the engine is now a
small physiology model. The other 11 genes + spectrum/photoperiod remain 🔨/⬜ (see
`docs/memory/design/01-simulation-horticulture.md`).

### 2026-06-08 — Provably-fair breeding: replay-and-verify
**Decision:** Expose `GET /strains/<id>/provenance` (`services/game_service.py:verify_strain`) that
re-runs the deterministic `cross()` from the persisted `BreedingEvent.rng_seed` + the immutable
parent genomes and confirms the stored genome matches. The breed endpoint already refuses a
client-supplied seed (anti seed-shopping). **Why:** the seed was already persisted for determinism;
exposing a public replay turns an internal invariant into a *player-facing* trust property — nobody
can fabricate or tamper a cultivar's genetics without detection. **Consequences:** establishes the
"replay & verify" pattern (generalizable to sim/weather/discovery draws), and promotes a new
invariant — randomness stays seeded so gameplay is auditable (ARCHITECTURE invariant #9). The trust
layer now has a shipped affordance (🔨 — breeding done; see `docs/memory/design/04-honesty-and-trust.md`).

### 2026-06-08 — Coverage gate completes "make truth automatic"
**Decision:** Add a `pytest --cov` gate with a ratchet floor (`pyproject.toml` `[tool.coverage]
fail_under=78`, operational `scripts/` omitted), wired into `make test` and the CI test step.
**Why:** the ruff lint gate guards syntax and `scripts/check_memory.py` guards the docs; coverage
guards the test safety net itself from silently eroding — the third leg of the 2026-06-08 standup's
§4A "make truth automatic." **Consequences:** CI fails below the floor; **raise the floor as
coverage climbs, never lower it.** One-shot ops scripts are excluded (run by ops, not the unit suite).

### 2026-06-08 — Strain knowledge base as a separate data layer
**Decision:** Keep `data/strains.yaml` as the canonical game **genome** and add a separate
`data/strain_knowledge.yaml` — a scientist-grade **encyclopedia** keyed by slug (lineage, origin,
sensory/effect profile, cannabinoid & terpene detail, cultivation parameters) — surfaced read-only at
`GET /strains/<id>/knowledge` (`services/game_service.py:strain_knowledge`). Grow the catalog 16→22.
**Why:** reference/horticulture metadata is the differentiator ("every piece of data a scientist
would want") but must not entangle the genome/balance that drives gameplay; separating them keeps the
sim/economy clean and lets the KB grow independently. **Consequences:** a test enforces 1:1
catalog↔KB sync (every strain has an entry, no orphans); the KB ships from source like the other data
files (no `package_data`). The encyclopedia figures are reference ranges, not per-plant sim outputs;
a `/deep-research` campaign will verify/deepen them.

### 2026-06-08 — Seasonal Cannabis Cup with lifetime champion rewards
**Decision:** Add a seasonal competition (`services/cup_service.py`, `db/models.py:CannabisCup`/
`CupEntry`): one Cup per season (`edition = "<year>-<season>"`, keyed off `events.current_season`),
players enter unsold harvests for a fee, entries are ranked by a deterministic server-side
`cup_score` (`economy/pricing.py`), and the champion earns **lifetime** prestige — a one-of-a-kind
LEGENDARY trophy strain (minted from the winning genetics, with the winning strain as its parent),
a permanent `Player.cannabis_cup_title`, and a permanent Hall-of-Fame record. Lifecycle is lazy
(opens on access, auto-judges when the season window closes), idempotent, ledger-guarded.
**Why:** the grow/genetics depth needed a recurring, social endgame that turns quality into prestige
("rare realities that are lifetime"); seasons make it a renewing LiveOps loop and advance the
discovery-economy/mastery moat (#5/#6). **Consequences:** two new `LedgerEntryType`s (`CUP_ENTRY_FEE`
sink, `CUP_PRIZE_PAYOUT` faucet); a forward-only Alembic migration (`d5e6f7a8b9c0`) — **note:** the
true migration head was `c7e2f4a16b80` (a fork existed at `fbb8fceedacd`), caught by testing
`alembic upgrade head` (single-head check belongs in CI). On-chain trophy NFT + judged
terpene-cluster categories are ⬜ (Sprint 4 / `05-events-and-competition.md`).

### 2026-06-08 — GrowPod University: earned degrees with time + practical gating
**Decision:** Add a learning subsystem (`services/university_service.py`, `data/curriculum.yaml`,
`db/models.py:CourseEnrollment`/`DegreeProgress`): enroll (pay **tuition**, a sink) → study real time
→ complete by meeting a **practical tied to live gameplay** → earn **degrees** that grant permanent
perks + a `Player.university_title` + XP. An AI **Professor** (`LecturerProvider` mirroring the
advisor stack: deterministic mock for CI, Claude in prod) delivers lectures. Curriculum grounded in
real programs (`docs/research/2026-06-08-cannabis-education-curriculum.md`). **Why:** the moat's
earned-mastery axis (#6) needed a *do-to-learn* counterpart to the GROW-spend research tree, and the
game's depth deserved a teachable home; time + practical gating rewards serious players. **Consequences:**
degree perks reuse the research `_EFFECT_KEYS` and are summed into the `_research()` effect helpers
(no parallel apply path); new `LedgerEntryType.TUITION` (sink, no GROW faucet → net-deflationary);
forward-only migration `e7a9c1b3f2d8` (single head verified). Quizzes, more departments, a Doctorate
tier, and diploma NFTs are ⬜ (`06-university.md`).

### 2026-06-08 — Strain names are lore, not genetic ground truth (research-backed)
**Decision:** Per a 5-agent deep-research campaign (`docs/research/2026-06-08-cannabis-strain-genetics-and-cultivation.md`),
treat strain **names** and the `indica_ratio`/genotype label as *loose phenotype/morphology lore*, not
reliable predictors of genetics, chemistry, or effect; keep the genome + verifiable lineage as the
authoritative identity. Annotate disputed clone-era lineages (OG Kush, Chemdawg, Sour Diesel, Bubba
Kush, GG4; Maui Wowie as landrace-derived) as such in the KB, and add the THC-inflation / chemotype
caveats to the KB header. **Why:** the peer-reviewed evidence is strong and convergent — Sawler 2015
(names/ancestry unreliable; r²=0.36), Schwabe 2019 (90% of strains had a genetic outlier), McPartland
& Guy 2017 (vernacular indica/sativa is botanically inverted), Reimann-Philipp 2020 (hundreds of names
→ ~3 terpene chemovars), Schwabe 2023 (THC labels inflated ~15–35%). Honesty is a product pillar
(`04-honesty-and-trust.md`), so the KB must not present marketing as fact. **Consequences:** future
enrichment adds a `terpene_cluster` per strain and models assayed THC as an inflation-biased
distribution; the research also confirms light (PPFD/DLI→yield, ~linear to ~1500–1800) as the
best-evidenced Phase B sim lever, and validates today's VPD/DLI bands as defensible (vendor-tier).

### 2026-06-10 — Bounded compute-on-read via dormancy-snap (not a lower cap, not grind-forward)
**Decision:** A single `engine.catch_up` simulates at most `simulation.max_catchup_hours`
(balance.yaml, 8760 = 1 year); an absence beyond that puts the plant in **dormancy** for the
remainder — `last_tick_at` and `stage_entered_at` shift past the gap so the plant lands exactly at
`now` with its stage clock paused, and an auditable `dormancy` PlantEvent records `skipped_hours`.
**Why:** the pre-existing clamp left `last_tick_at` behind `now`, so a derelict plant repaid the
full cap window on *every* read (measured 310 ms/read, repeated once per year of absence) — the
clamp bounded a single loop but not convergence. Lowering the knob instead would change gameplay
outcomes for legitimate long grows (worst-case stretched lifecycle ≈ 4,500 h); grinding forward
kept unbounded total cost. One year comfortably exceeds any real lifecycle, so no live plant loses
true progress, and unattended plants die early in the window anyway (loop breaks on death).
**Consequences:** worst case is one 311 ms read **once ever** per derelict plant (then 0.1 ms);
near-term reads (< cap) are bit-identical to before (parity asserted in tests); `dormancy` joins
the event vocabulary (consumers treat `event_type` as opaque — verified); the residual at-scale
risk (many first-reads in one burst) stays on ARCHITECTURE's watch list with background
materialization as the eventual answer. Tests: `tests/test_simulation.py` (bounded step count,
one-read convergence, stage-clock pause, normal-read parity, death path).

### 2026-06-10 — Concurrency safety via DB-enforced invariants + optimistic locking
**Decision:** Close the highest-value concurrency exploits (carried RISK #6) at the **database
level**, not just in application checks: (1) wire `Wallet.version` as SQLAlchemy `version_id_col`
so two concurrent debits can't both commit — the loser gets `StaleDataError`, rolls back, and the
API maps it to a clean **409**; (2) a `CHECK(cached_balance >= 0)` backstop so a wallet can never
persist negative even on an app bug; (3) a unique index on `harvests.plant_id` so a plant is
harvested exactly once (a raced double-harvest can't mint duplicate currency). Migration
`f1a2b3c4d5e6` (single head; `compare_metadata` clean). **Why:** the prior guards were
check-then-act with no row lock, and `Wallet.version` was dead code — on prod `gunicorn -w 2`,
two requests double-spend / double-harvest. Declarative DB constraints hold under *any*
concurrency model and are portable SQLite↔Postgres, so correctness no longer depends on Python
evaluation order. Chose to remove the manual `wallet.version += 1` in `ledger.post()` (SQLAlchemy
now owns the column). **Consequences:** concurrent conflicting writes fail safe (409 + rollback,
client retries) instead of corrupting; +4 concurrency tests (`tests/test_concurrency.py`) prove
double-spend, harvest-once, and the CHECK floor; the F5 flaky rate-limit test is fixed (limiter
storage reset per `client` fixture). **Still open (next baton):** a general `Idempotency-Key`
header so a duplicate returns the *original* response instead of a 409 (nicer UX), plus
one-shot-grant uniqueness (daily stipend, achievements). 189 tests, 79.26%.

### 2026-06-11 — Idempotency-Key replay + one-shot grant claims (RISK #6 finished)
**Decision:** Finish RISK #6's remainder on top of the concurrency core: (1) an opt-in
`Idempotency-Key` request header on the money-mutation routes — the first request stores its JSON
response in `idempotency_keys` (`(player_id, key)` unique) **inside the same transaction as the
effect** (`api/idempotency.py:record` is called within the route's `session_scope`), and a
duplicate replays the stored body + status with `Idempotency-Replayed: true` instead of 409-ing or
re-running; a key reused on a *different* request is a 400, never a wrong-body replay. (2) One-shot
faucet grants: `grant_claims` rows unique per `(player_id, 'daily_stipend', UTC-day)` and
`(player_id, 'achievement', key)`, written by `ProgressionService` with each grant. Raced
duplicates of either kind collide on the unique index at commit, roll back **whole** (key+effect /
claim+payout are atomic), and surface via a new `IntegrityError → 409` handler. Migration
`b2c3d4e5f6a7` (single head; `compare_metadata` clean). **Why:** the concurrency core made double
effects impossible but left double-submits with an opaque 409 and the faucets guarded only by
check-then-act ledger reads; the store holds *responses*, never money truth — the ledger stays
authoritative. Chose NOT to flush grant claims eagerly so a raced loser fails at commit (no SQLite
lock-wait), while sequential re-claims keep their friendly 400s from the existing cooldown/claimed
checks. **Consequences:** clients can safely retry any money mutation by attaching a key; stipend
is now also hard-capped at one per UTC calendar day (a ≤2h-later claim that the bare 22h cooldown
would have allowed gets deferred to midnight — deliberate tightening); the generic
`IntegrityError` handler turns *any* constraint race into a 409 (logged, since a non-race hit
implies an app bug). +10 tests (`tests/test_idempotency.py`): replay, opt-in, cross-request reuse
rejection, malformed key, no-store-on-error, raced key/stipend/achievement each pay exactly once.
207 tests, 80.31%.

### 2026-06-11 (night shift) — Body-aware idempotency fingerprint + three missed routes
**Decision:** A 7-angle code review of PR #16 falsified its "never a wrong-body replay" claim: the
request fingerprint was `METHOD path` only, so the *same* endpoint retried with the same key but a
**different JSON body** (different `strain_id`, bid `amount`, …) silently replayed the first
response. Fixed by folding a SHA-256 of the raw request body into the fingerprint
(`api/idempotency.py:_fingerprint`) — key reuse with a different body is now a 400 like any other
fingerprint mismatch (`request.get_data()` caches, so the view's `get_json()` is unaffected). The
review also found three mutation routes the plumbing missed, now decorated + `record()`-ed:
`create_listing` (posts MARKET_FEE + escrows seeds), `create_auction` (escrows seeds), and
`start_cure` (one-way state transition whose sequential guard didn't survive a race). **Why:** the
fingerprint exists precisely to prevent wrong-body replays; binding it to the body makes the
documented guarantee true instead of path-deep. **Consequences:** a client retry must resend
byte-identical body content to replay (industry-standard strictness); +4 tests (body-bound reuse →
400, listing fee charged once, auction escrowed once, cure replay doesn't reset the cure clock).
211 tests, 81.07%. Deferred to backlog (owner call): pruning job for the unbounded
`idempotency_keys`/`grant_claims` tables, and a constraint-name allowlist to narrow the blanket
`IntegrityError → 409` (RISK #12).
