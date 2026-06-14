# UNI-A06 — GrowPod University: Monetization Research (BACKLOG ONLY — PARKED)
**Directive ID:** UNI-001 · **Lead Agent:** UNI-A00 · **Worker Agent:** UNI-A06
**Status:** PARKED — research only, no implementation, Owner decision required.
**Asked:** Survey monetization *options* for GrowPod University without recommending adoption — for each, define what it is, its ethical/invariant risk, economy impact, and why it stays parked.
**Done:** Catalogued five option families (cosmetic/vanity, convenience, premium curriculum/season-pass, diploma NFTs, faculty/persona) against the earned-mastery moat, the honesty pillar, and the faucet/sink economy; flagged study-time-skips as anti-moat and not-to-build.
**Risks:**
- Any "pay to skip study hours / practicals" directly attacks the earned-mastery moat (`00-game-vision.md` Moat #6) and the honesty pillar — must NOT be built.
- Real-money entry pulls the university out of the *net-deflationary* design; a careless price/perk pairing could turn a degree into a soft pay-to-win advantage.
- Diploma NFTs are Phase-2/chain and would leak Phase-2 into Phase-1 if scoped now (`OMNI_CHARTER.md` "No Phase-2 leakage").
**Needs You (Owner monetization decisions):** Whether GrowPod University ever monetizes at all; if so, which families are permitted (cosmetic-only vs. premium content); the hard line on convenience/time-skips; and whether diploma NFTs are ever in scope post-chain.
**Next:** Stays in backlog. No work order. Re-open only on an explicit Owner go-ahead; a follow-up could draft cosmetic-only catalog stubs *if* approved.

---

## 0. Scope guard (read this first)
This is a **parked options register**, not a plan. Per `CLAUDE.md` ("Stop and ask ONLY for…
player-facing economy changes (faucets/sinks/prices)") and the OMNI Charter
(`docs/OMNI_CHARTER.md`: "Off-chain MVP first… No Phase-2 leakage"), monetization is an
Owner-reserved decision. **Every option below ends in "deferred to Owner."** Nothing here is a
recommendation to build. The Think-Tank role is research-only: no code, no mutations.

The university as shipped (`src/growpodempire/services/university_service.py`,
`docs/memory/design/06-university.md`) is deliberately **net-deflationary**: enrolling posts a
GROW *sink* (`LedgerEntryType.TUITION`, `university_service.py:140-145`); degrees pay **perks +
title + XP, never GROW** (`claim_degree`, lines 191-219). That balance is the baseline every
monetization option below must be measured against — and most of them risk disturbing it.

## 1. The three lenses every option is graded on
1. **Moat lens — earned mastery.** The university *is* the "earned-mastery half of the moat"
   (`06-university.md` intro; `00-game-vision.md` Moat #6: "Mastery + time as the gate — and the
   anti-whale… you can't credit-card your way to the top"). Anything that lets money substitute for
   *time studied* or *practical proven in the grow* erodes the single most defensible thing here.
2. **Honesty lens — trust as a product surface.** `04-honesty-and-trust.md` pledge #4 is an
   explicit "**No dark patterns** — disclosed odds, no loot-box manipulation, no manufactured FOMO,
   no pay-to-win obfuscation." A monetization model that contradicts a *published* trust charter is
   strictly worse than no monetization, because it spends the wedge that differentiates the game.
3. **Economy lens — faucets ↔ sinks.** `CLAUDE.md`: "Money is `Decimal`, ledger-based… Faucets must
   have matching sinks (watch inflation)." Real-money (USD/fiat) purchases live *outside* the GROW
   ledger and so don't directly inflate GROW — but any perk they grant lands *inside* gameplay and
   must be modelled like any other faucet/effect.

## 2. Monetization framework grounding (honest citations)
Standard free-to-play / live-service monetization taxonomy used to structure this survey:
- **Cosmetic / vanity ("horizontal" monetization)** — sells expression, not power. Riot/*League
  of Legends* skins and Epic/*Fortnite* are the canonical "no competitive advantage purchased"
  model; widely regarded as the least-predatory mainstream model.
- **Convenience / time-skip ("soft pay-to-win")** — sells *time*. *Clash of Clans*-style "finish
  now" timers, energy refills, boosters. The contested category: framed as "respecting players'
  time," but trades directly against the value of the time-gate that makes progression meaningful.
- **Battle-pass / season-pass ("content cadence")** — a time-boxed track of unlocks for a flat
  fee; popularized by *Fortnite*, now genre-standard. Mixes cosmetic + sometimes power; ethics
  depend on whether the rewards are vanity or advantage, and on FOMO pressure.
- **Premium content / DLC / "expansion"** — sells *more game* (new curricula, departments) for a
  one-off or subscription fee. The traditional, least-controversial model when the base game is
  complete and the DLC is additive rather than gating.
- **NFT / on-chain credential** — tokenizes an asset (here, a diploma) as tradable/ownable
  on-chain. In a game whose whole trust thesis is *anti-rug-pull* (`04-honesty-and-trust.md`),
  this family carries the heaviest reputational and regulatory load.

Regulatory backdrop worth flagging for the Owner: loot-box and "disclosed-odds" legislation is
expanding (Belgium/Netherlands bans, UK & EU consumer-protection scrutiny), and the honesty codex
already treats "disclosed odds + no dark patterns" as a *regulatory tailwind*
(`04-honesty-and-trust.md` §How this impacts the game). Any randomized-purchase mechanic would
walk straight into that.

---

## 3. Option family A — Cosmetic / vanity (LOWEST risk of the set)
**What it is.** Real-money (or premium-currency) purchases that change *appearance/expression*
only, with zero gameplay effect. Candidates specific to the university:
- **Diploma frames / parchment skins** — visual styling on the transcript/degree view
  (`transcript()` already returns the degree rows the UI renders, `university_service.py:225-276`).
- **Campus / lecture-hall skins** — themed backdrops for the lecture surface
  (`GET …/courses/<key>/lecture`, `06-university.md` §The AI Professor).
- **Faculty persona / professor-voice cosmetics** — named-faculty styling layered on the existing
  `LecturerProvider` stack (`ai/lecturer_*.py`); a *cosmetic* re-skin of an already-planned feature
  ("Professor persona depth," `06-university.md` §Where it's going).
- **Vanity titles** beyond the earned `Player.university_title` — purely decorative flair.

**Ethical / invariant risk — LOW.** Sells expression, not power → does **not** touch the earned-
mastery moat and is the model the honesty charter implicitly endorses (the anti-pay-to-win pledge).
Caveat: cosmetic *titles* must stay visibly distinct from **earned** degree titles, or they
undercut the prestige signal the university exists to create — a cosmetic "Master Grower" that
looks identical to an earned one would be a soft dishonesty.

**Economy impact — NEUTRAL-to-clean.** If sold for **fiat**, sits entirely outside the GROW
ledger → no inflation. If ever sold for **GROW**, it becomes an additional *sink* (deflationary,
consistent with the tuition model) — arguably the cleanest way to add a GROW sink without a faucet.

**Why deferred.** Even pure cosmetics are a *price-bearing, player-facing* surface → Owner-reserved
per `CLAUDE.md`. **Deferred to Owner.**

## 4. Option family B — Convenience / time-skip (ANTI-MOAT — flagged DO-NOT-BUILD)
**What it is.** Purchases that compress the *time* or *effort* gate: buy-out of `duration_hours`
study time, instant course completion, practical-waivers, or "study boosters" that accelerate the
clock. The mechanical hooks exist — completion is gated on `elapsed_h >= need_h` **and** the
practical (`complete_course`, `university_service.py:165-175`).

**Ethical / invariant risk — SEVERE. This is the anti-moat case.**
- **Study-time skips directly attack Moat #6.** The vision states the anti-whale property
  explicitly: "Reputation and rare phenotypes are **earned**… you can't credit-card your way to the
  top" (`00-game-vision.md`). A paid time-skip is *exactly* "credit-card your way to the top." It
  converts the university from an earned-mastery engine into a pay-to-win store.
- **Practical-waivers are worse.** The practical is the "prove it in your grow" mechanic
  (`06-university.md` §Why a university). Selling a waiver means a degree no longer certifies that
  the player *did the thing* — it makes the credential **dishonest**, violating the honesty pillar
  at its root.
- **Contradicts the published trust charter.** `04-honesty-and-trust.md` pledge #4 names "no
  pay-to-win obfuscation" as a commitment. Shipping a time-skip would force the game to either break
  its own charter or never publish it — either way the trust wedge is forfeit.

**Economy impact — corrosive.** Even if priced in fiat (no GROW inflation), the *effect* injected
(a degree's permanent perks, which feed real apply-sites via `degree_effects()`,
`university_service.py:55-69`) is a power faucet bought with money — the precise pattern the
anti-whale design forbids.

**Verdict: ANTI-MOAT — must NOT be built.** This family is recorded here only to be explicitly
ruled out. A narrow, *defensible* exception the Owner may want to consider separately (and only the
Owner) is a **purely cosmetic "fast-forward animation"** that does not change real elapsed-time
gating — but the moment money moves the actual gate, it is pay-to-win. **Deferred to Owner with a
standing recommendation that the time/practical gate itself remain unpurchasable.**

## 5. Option family C — Premium curriculum / season-pass content
**What it is.** Selling *additional* learning content rather than shortcuts:
- **Premium departments / courses** — e.g. the planned "Lab Analytics & QA, Business/Law/Compliance,
  Pharmacology/Medical" departments (`06-university.md` §Where it's going) sold as paid expansions.
- **Season-pass cadence** — a time-boxed track of *new* courses, lectures, and cosmetic rewards.

**Ethical / invariant risk — MEDIUM, and entirely dependent on the perk design.**
- *Additive content* (new lectures, new flavor, cosmetic rewards) is close to traditional DLC and
  defensible. The risk is **the perks attached to premium degrees.** If a paid-only course grants
  `degree_effects()` perks unavailable to non-payers, the premium track becomes *vertical* (power-
  selling) and re-enters pay-to-win territory — even though the player still studies for it.
- The honest design constraint: a premium track may sell *access to more knowledge/expression*, but
  the **competitive perk ceiling should remain reachable without paying**, or the moat erodes.
- Season-pass **FOMO** ("expires in 3 days!") collides directly with honesty pledge #4's "no
  manufactured FOMO." A premium track that pressures via expiry timers is a dark pattern by the
  game's own definition.

**Economy impact — fiat-clean but perk-sensitive.** Fiat purchase → no GROW inflation. But premium
perks still flow through the same effect-key aggregation as research/degrees
(`degree_effects()` reuses `_EFFECT_KEYS`, `university_service.py:31, 55-69`), so any power granted
must be balance-modelled exactly like a free perk. `balance.yaml` is the right tuning surface if it
ever ships (`CLAUDE.md`: "Prefer data-driven balance changes").

**Why deferred.** Player-facing content + pricing + potential perk-balance shift = squarely
Owner-reserved. **Deferred to Owner.**

## 6. Option family D — Diploma NFTs (PHASE-2 / CHAIN — PARKED BEHIND THE MOCK)
**What it is.** Minting an earned degree as an on-chain credential — already named as a *planned*
(⬜) item: "**Diploma NFTs** — mint a degree as an on-chain credential (Proof-of-Cultivation kin;
Sprint 4)" (`06-university.md` §Where it's going).

**Ethical / invariant risk — gated, not yet evaluable.** The chain layer is **mocked**
(`00-game-vision.md` pillar 5: "live TestNet/IPFS is deferred… Sprint 4"; `04-honesty-and-trust.md`
pledge #5 lists on-chain provenance as ⬜). Per `CLAUDE.md`: "DB is authoritative; the chain is a
mirror/settlement layer. Never let on-chain state drive gameplay truth" — a diploma NFT must stay a
*mirror* of the DB-authoritative `DegreeProgress` row, never a gate. **Scoping this now would be
Phase-2 leakage into Phase-1, which the OMNI Charter forbids.** It also carries the heaviest
reputational load: a game whose pitch is "the provably-honest, anti-rug-pull grow game" must be
especially careful that any *tradable* credential can't be misread as a speculative asset.

**Economy impact — out of scope until chain is live.** No GROW-economy interaction off-chain; any
mint fee / settlement is a real-money/chain action — and real-money/chain/treasury actions are an
explicit **"Stop and ask"** item in `CLAUDE.md`.

**Why deferred.** Double-locked: (a) blocked on the mocked chain layer / Sprint 4, and (b)
chain-settlement is an Owner-reserved action regardless. **Deferred to Owner; remains parked behind
the chain mock — do not build pre-Phase-2.**

## 7. Option family E — Faculty personas / "endowment" flair (cosmetic-adjacent)
**What it is.** Named-faculty packs, professor-voice variants, or a vanity "donate to the
university / name a lecture hall" flourish layered on the lecturer stack
(`ai/lecturer_*.py`, `06-university.md` §The AI Professor; persona depth is already a planned ⬜).

**Ethical / invariant risk — LOW (treat as a sub-case of cosmetics, §3).** Risk only if a persona
secretly improves lecture *quality in a way that affects outcomes* — but lectures are informational,
not perk-bearing, so a persona re-skin is expression-only. A GROW-priced "endowment" donation could
double as a clean **sink**.

**Economy impact — NEUTRAL (fiat) or deflationary SINK (GROW).** Same shape as §3.

**Why deferred.** Player-facing + priced. **Deferred to Owner.**

---

## 8. Summary register (all PARKED)
| Family | Moat risk | Honesty risk | Economy shape | Build status |
|---|---|---|---|---|
| A. Cosmetic / vanity | None | Low (keep cosmetic ≠ earned titles) | Fiat-neutral; GROW = clean sink | PARKED → Owner |
| B. Convenience / time-skip | **SEVERE — anti-moat** | **Severe — breaks pledge #4** | Power faucet bought w/ money | **DO-NOT-BUILD** → Owner |
| C. Premium curriculum / season-pass | Medium (perk-dependent) | Medium (FOMO/expiry risk) | Fiat-clean; perk-balance sensitive | PARKED → Owner |
| D. Diploma NFTs | Gated (chain mock) | High reputational load | Out of scope pre-chain | PARKED (Phase-2) → Owner |
| E. Faculty personas / endowment flair | None | Low | Fiat-neutral; GROW = clean sink | PARKED → Owner |

## 9. Cross-cutting observations (for the Owner, not a recommendation)
- **The cleanest-fit families (A, E) are the cosmetic ones** — they reinforce rather than dilute the
  earned-mastery moat, and GROW-priced variants would *add deflationary sinks* consistent with the
  tuition model.
- **The single bright line** is selling the *gate itself* (Family B). Time-skips and practical-
  waivers are where monetization and the moat are mutually exclusive; this is the one family the
  research can confidently flag as never-build, independent of any Owner pricing decision.
- **Premium content (C) is viable only if perks stay non-exclusive** — sell knowledge/expression
  and cadence, never a competitive ceiling payers reach and non-payers can't.
- **NFTs (D) are not a Phase-1 question at all** and should stay out of any near-term discussion to
  avoid Phase-2 leakage.

## 10. Hand-off
Stays in backlog. **No work order generated, no implementation proposed.** Re-open only on explicit
Owner direction. If approved, the *only* low-risk first step worth a follow-up directive would be a
**cosmetic-only** (Family A/E) catalog stub, GROW-priced as a sink, with earned-vs-purchased titles
kept visibly distinct — but that, too, is **deferred to Owner**.

### Sources cited
Repo: `docs/memory/design/06-university.md`, `docs/memory/design/00-game-vision.md`,
`docs/memory/design/04-honesty-and-trust.md`, `docs/OMNI_CHARTER.md`, `CLAUDE.md`,
`src/growpodempire/services/university_service.py` (tuition sink lines 140-145; perk aggregation
55-69 / 31; completion gate 165-175; claim_degree 191-219).
External frameworks (named honestly, from general industry knowledge): cosmetic/horizontal
monetization (Riot *League of Legends*, Epic *Fortnite*); convenience/time-skip soft-pay-to-win
(*Clash of Clans*); battle-/season-pass cadence (*Fortnite*); premium-content/DLC model; and the
loot-box / disclosed-odds regulatory trend (Belgium/Netherlands bans, UK/EU consumer-protection
scrutiny).
