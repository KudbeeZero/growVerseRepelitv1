# UNI-A06 — GrowPod University: Monetization Research (BACKLOG ONLY — PARKED)
**Directive ID:** UNI-001 · **Lead Agent:** UNI-A00 · **Worker Agent:** UNI-A06
**Status:** PARKED — research only, no implementation, Owner decision required.
**Asked:** Survey monetization *options* for GrowPod University without recommending adoption — for each, define what it is, its ethical/invariant risk, economy impact, and why it stays parked.
**Done:** Catalogued five option families (cosmetic/vanity, convenience/time-skips, premium curriculum/season-pass, diploma NFTs, faculty/persona depth) against the earned-mastery moat, the honesty pillar, and the net-deflationary faucet/sink economy; flagged study-time-skips and any paid practical bypass as anti-moat and explicitly NOT-to-build.
**Risks:**
- Any "pay to skip study time / pass a practical" option directly attacks the earned-mastery moat (`00-game-vision.md` §Moat #6: "you can't credit-card your way to the top") and the no-pay-to-win-obfuscation pledge (`04-honesty-and-trust.md` Pledge #4). Listing it at all risks it being misread as on-menu — it is NOT.
- Real-money (USD) anything is outside agent authority and outside the off-chain MVP scope (`OMNI_CHARTER.md`: "Off-chain MVP first").
- Diploma-NFT monetization is Phase-2/chain and gated behind the mocked chain layer — surfacing it must not leak into Phase-1 work (`OMNI_CHARTER.md`: "No Phase-2 leakage").
**Needs You (Owner decisions, all deferred):** (1) Is *any* university monetization desired pre-launch, or strictly post-launch? (2) Real-money storefront vs. GROW-only cosmetic sinks — which, if either? (3) Diploma NFTs as a paid mint vs. free credential — parked until chain ships. (4) Hard ruling to forbid time-skip/practical-bypass forever (recommended posture, but yours to set).
**Next:** Stays in backlog. No code, no `balance.yaml`, no `curriculum.yaml` change. Hand-off to UNI-A00; if Owner ever greenlights, a fresh directive with explicit economy sign-off is required.

---

## 0. Scope, method, and the one non-negotiable
This is a **parked options register**, not a plan. Nothing here is recommended for build. Monetization
is a **player-facing economy decision reserved for the Owner** (`CLAUDE.md` → "Stop and ask ONLY for…
player-facing economy changes (faucets/sinks/prices)"). Every option below terminates in "deferred to
Owner."

The one rule that overrides every option: **the university is the earned-mastery half of the moat**
(`06-university.md` intro; `00-game-vision.md` §Moat #6). A degree is "a genuine investment" that takes
"real study hours" and demands "you *prove it in your grow* (a practical)" (`06-university.md` §Why a
university). Any monetization that lets money substitute for that earned time or that proof is
**anti-moat and must not be built** — see §3.

Frameworks cited honestly below are standard free-to-play / live-service literature: the
cosmetics-only "ethical F2P" stance popularized by *Path of Exile* (GGG) and *Dota 2*; the
**season pass / battle pass** model (*Fortnite*, *Dota 2 Battle Pass*); the loot-box and
"pay-to-win vs. pay-for-convenience" distinction debated in academic and regulatory work (e.g. the UK
DCMS loot-box review, Zendle & Cairns' loot-box research, and the EU/Belgium/Netherlands rulings); and
the "horizontal vs. vertical progression" monetization split common in live-ops design writing. These
are referenced as *prior art*, not endorsements.

Current economy ground truth (do not break): **tuition is a GROW sink** (`LedgerEntryType.TUITION`,
`university_service.py:enroll`); **degrees pay perks/XP, never GROW**; the university is therefore
**net-deflationary** and honors the faucet↔sink invariant (`06-university.md` §Economy; `CLAUDE.md`:
"Faucets must have matching sinks"). Any monetization must preserve or improve this — it must **never
introduce a GROW faucet** and must **never** route real money into gameplay advantage.

---

## 1. Cosmetic / Vanity (lowest risk — still parked)
**What it is.** Purely decorative, **non-power** items: diploma frame styles, transcript/parchment
skins, campus/quad skins, graduation-ceremony flourishes, animated title badges around the existing
`Player.university_title` (`university_service.py:claim_degree` already sets `university_title`), and
honorific flourishes. Horizontal, not vertical — nothing touches `_EFFECT_KEYS` (the perk effect keys
in `research_service` that `degree_effects()` sums).

**Prior art.** The "ethical F2P" cosmetics-only model (*Path of Exile*, *Dota 2*): revenue from
identity/expression, zero competitive advantage. Widely regarded as the least player-hostile model.

**Ethical / invariant risk.** *Low.* Does not touch earned-mastery (no perk, no time, no practical
bypass), so the moat is intact. Honesty risk is low **iff** odds/contents are fully disclosed and there
is no randomized purchase (no loot box) — Pledge #4 forbids "loot-box manipulation" and "manufactured
FOMO" (`04-honesty-and-trust.md`). A fixed-price, see-what-you-buy cosmetic store is compatible with the
trust pillar; a gacha cosmetic crate is **not**.

**Economy impact.** If priced in **GROW**, it is a **pure new sink** — *more* deflationary, which the
ledger/inflation posture welcomes (`04-honesty-and-trust.md` Pledge #2: "the burn is visible"). It would
need its own `LedgerEntryType` (e.g. a COSMETIC sink) so the burn is auditable. If priced in **real
money (USD)**, it bypasses the GROW economy entirely (revenue, not a sink) and raises store/tax/refund
concerns — **out of agent scope**, Owner-only.

**Why deferred.** Even the safest option is still a player-facing storefront and a price decision →
Owner-only. Parked. **Deferred to Owner.**

---

## 2. Convenience (pay-for-convenience) — analyze, mostly NO
**What it is.** Time/effort reducers. Sub-variants, ranked by danger:
- **2a. Cosmetic-convenience (UI/QoL):** transcript export, a "study planner" view, catalog filters,
  multi-course dashboards. Quality-of-life that touches **no** game state.
- **2b. Soft-convenience (parallelism/slots):** more concurrent enrollments (the model is per-course;
  no hard cap is enforced in `enroll` today), reminder/notification slots.
- **2c. Hard-convenience (study-time-skip):** pay to shorten or zero-out `duration_hours` — the real-time
  study gate enforced in `complete_course` (`elapsed_h < need_h → "Study in progress"`).
- **2d. Practical bypass:** pay to satisfy a `practical` (`_practical_met`) without doing the gameplay.

**Prior art & the key distinction.** The literature splits "pay-for-convenience" from "pay-to-win." The
honest reading (DCMS loot-box review; Zendle & Cairns; live-ops design writing): convenience is benign
**only** when the skipped thing is *grind/friction*, not *the core proof of skill*. When the thing being
skipped **is the moat**, "convenience" is just pay-to-win wearing a friendlier label.

**Ethical / invariant risk.**
- 2a: *Low.* QoL with no state change — comparable to cosmetics. Compatible if not paywalling basic
  fairness/disclosure.
- 2b: *Medium.* More slots is closer to vertical advantage and could distort balance; needs careful
  analysis; parked.
- **2c & 2d: HIGH — ANTI-MOAT. DO NOT BUILD.** The university's entire value is that study time is
  *real* and the practical is *proven in your grow* (`06-university.md`). A study-time-skip directly
  contradicts `00-game-vision.md` §Moat #6 ("you can't credit-card your way to the top") and the
  honesty pillar's "no pay-to-win obfuscation" (`04-honesty-and-trust.md` Pledge #4). It would let money
  substitute for earned mastery — the exact thing the moat exists to prevent. A practical bypass is
  worse: it lets a player claim a degree **without the underlying gameplay**, hollowing the credential
  and poisoning any future reputation/knowledge economy built on degrees (`03-grower-skills.md`
  tie-in). **These are categorically excluded — see §3.**

**Economy impact.** 2a/2b as GROW sinks are deflationary-neutral-to-positive. 2c/2d are economically
irrelevant because they are forbidden on *ethics/moat* grounds regardless of pricing — the harm is to
trust and the moat, not to the ledger.

**Why deferred.** 2a/2b: still a price/store decision → Owner. 2c/2d: **not deferred, but rejected** —
flagged here only to document that they were considered and ruled anti-moat. **Deferred (2a/2b) / NOT
TO BUILD (2c/2d).**

---

## 3. EXPLICIT ANTI-MOAT LIST — options that must NOT be built
The directive asks for this to be called out plainly. The following are **not** parked-pending-Owner;
they are **architecturally incompatible** with the stated moat and honesty pillar and should be treated
as forbidden absent an explicit Owner override that knowingly rewrites the moat:

1. **Paid study-time skip** (shortening/zeroing `duration_hours`). Breaks Moat #6 + Pledge #4.
2. **Paid practical bypass** (auto-satisfying `_practical_met`). Hollows the credential; breaks honesty.
3. **Paid degree/title purchase** (buying `claim_degree` outcome or `university_title` without the
   courses). Same as #2, more direct.
4. **Paid perk boosts** (real money buying anything that lands in `_EFFECT_KEYS` via `degree_effects()` —
   yield, quality, terpene, discounts). Textbook pay-to-win; breaks the anti-whale moat and the
   transparent-economy pledge.
5. **Randomized paid crates / loot boxes** of any of the above. Compounds with regulatory risk (loot-box
   legislation is a tailwind the trust pillar deliberately leans into — `04-honesty-and-trust.md` §How
   this impacts the game).

If any of these is ever desired, it requires an explicit Owner decision that *accepts redefining the
moat*, not a worker directive.

---

## 4. Premium Curriculum / Season-Pass-style content (parked)
**What it is.** Paid *additional* content layered on the free core: bonus departments/courses (the
"Where it's going" list already names Lab Analytics & QA, Business/Law/Compliance,
Pharmacology/Medical, a Doctorate capstone — `06-university.md`), guest-lecturer series, seasonal
"semester pass" tracks with cosmetic + (carefully) perk rewards, or a Doctorate capstone behind a pass.

**Prior art.** The **season/battle pass** model (*Fortnite*, *Dota 2 Battle Pass*): a time-boxed track
of rewards, often free + premium tiers. Ethical when the premium track is **additive and
non-power-gating** and free players still get a complete experience; player-hostile when it gates
progression or core fairness behind the pass.

**Ethical / invariant risk.** *Medium, and forks sharply on reward type.*
- **Cosmetic / lore / extra-lecture rewards:** acceptable in principle (same class as §1).
- **Perk-bearing rewards (anything in `_EFFECT_KEYS`):** if those perks are obtainable **only** by
  paying, this becomes pay-to-win and collapses into §3.4. A premium track may grant power **only** if
  that *same* power is fully earnable for free via gameplay — otherwise it breaches Moat #6 and Pledge #4.
- **FOMO risk:** time-boxed passes manufacture urgency; Pledge #4 explicitly forbids "manufactured FOMO."
  Any seasonal framing must be scrutinized against that pledge.
- **Honesty risk:** premium courses must still require **real study + a real practical**, or they become
  hollow degrees (§3.2). A "premium" course is still subject to the earned-mastery rule.

**Economy impact.** If the pass is bought with **GROW**, it is a sink (deflationary, fine). If bought
with **USD**, it is revenue outside the ledger (neutral to inflation, but Owner/store scope). Tuition on
any premium course remains a GROW sink and must keep the no-GROW-faucet rule.

**Why deferred.** Content scope + pricing + the perk-gating question are all Owner-level economy/taste
calls. **Deferred to Owner.**

---

## 5. Diploma NFTs (Phase-2 / chain — PARKED behind the mocked chain layer)
**What it is.** Mint an earned degree as an **on-chain credential** — already named as planned work:
"Diploma NFTs — mint a degree as an on-chain credential (Proof-of-Cultivation kin; Sprint 4)"
(`06-university.md` §Where it's going). Monetization variants: a paid mint fee, a marketplace cut on
transfer, or premium credential cosmetics.

**Ethical / invariant risk.** *Parked-by-architecture.* The chain is **mocked** today
(`04-honesty-and-trust.md`: "on-chain provenance ⬜ chain mocked (Sprint 4)"; `06-university.md`
Invariants). The DB-authoritative invariant means **the chain is a mirror/settlement layer and must
never drive gameplay truth** (`CLAUDE.md`). So a diploma NFT must be a *mirror* of the DB-earned degree,
never a way to **buy** a degree (buying the NFT must not grant the perks/title — that would be §3.3 via
the chain). Real-money minting is also **real-money/chain settlement**, an explicit
**Owner-and-treasury-only** action (`CLAUDE.md`: "Stop and ask ONLY for… real money / chain settlement /
treasury actions").

**Economy impact.** Off-chain MVP first (`OMNI_CHARTER.md`); this cannot affect the live GROW economy
until chain ships, and even then must not become a GROW faucet. A mint fee priced in GROW could be a
sink; priced in real money it is out of scope.

**Why deferred.** Doubly parked: (a) chain is mocked — "No Phase-2 leakage into Phase-1"
(`OMNI_CHARTER.md`); (b) real-money/treasury — Owner-only by charter. **Deferred to Owner; do not begin
ahead of the chain layer.**

---

## 6. Faculty / Persona depth as a vanity surface (parked)
**What it is.** Building on planned "Professor persona depth — named faculty, course-specific voices"
(`06-university.md` §Where it's going): paid alternate professor personas/voices, cosmetic "office hours"
flair, or collectible faculty cards. The AI lecturer stack (`LecturerProvider` ABC, `MockLecturerProvider`,
`ClaudeLecturerProvider`) already exists and is CI-safe.

**Ethical / invariant risk.** *Low-to-medium.* As **pure cosmetic persona reskins** it is §1-class
(no power, no time-skip). Risk appears only if a "premium professor" gives **better lecture quality or a
gameplay edge** — that would smuggle power into a cosmetic and breach the moat. Must also keep the
CI-safe / no-live-key invariant (`06-university.md` Invariants) — a paid persona cannot require a live AI
key in CI or condition gameplay on a paid model.

**Economy impact.** GROW-priced → sink (fine). USD-priced → revenue/store scope (Owner).

**Why deferred.** Persona content + pricing are Owner calls; trivially collapses into §3 if it ever
confers power. **Deferred to Owner.**

---

## 7. Cross-cutting analysis: interaction with the two pillars
**Deflationary economy.** Every option that is *GROW-priced* is a **new sink** → *more* deflationary,
directionally healthy given the current net-deflationary stance and the visible-burn pledge. But more
sinks with **no new faucet** can over-drain GROW and starve the core loop (grow → … → sell); the right
counter is **not** a university faucet (that would break the invariant) but Owner-level tuning of
existing legitimate faucets via `balance.yaml`. Any new sink should get its own auditable
`LedgerEntryType` so the burn stays visible (`04-honesty-and-trust.md` Pledge #2). Every option that is
*USD-priced* sits **outside** the ledger — neutral to inflation, but outside agent scope and into
store/tax/refund/treasury territory.

**Trust / honesty pillar.** The university is downstream of the project's loudest promise: "the
provably-honest grow game," "no pay-to-win obfuscation," "no manufactured FOMO," "no loot-box
manipulation" (`04-honesty-and-trust.md` §Pledge #4, §How this impacts the game). Monetization is the
**single biggest threat surface** to that promise. The safe envelope is narrow and consistent:
disclosed-price, non-random, **non-power** cosmetics and **additive** content where any power is also
freely earnable. Step outside that envelope and the headline marketing claim becomes a lie — which, per
the trust doc, "defeats its own purpose."

**Summary matrix (parked — none recommended):**

| Option | Moat risk | Honesty risk | Economy effect (GROW) | Disposition |
|---|---|---|---|---|
| 1. Cosmetic/vanity | Low | Low (if no gacha) | New sink (deflationary) | Parked → Owner |
| 2a. QoL convenience | Low | Low | Neutral/sink | Parked → Owner |
| 2b. Slots/parallelism | Medium | Medium | Sink, balance risk | Parked → Owner |
| 2c/2d. Time-skip / practical bypass | **CRITICAL** | **CRITICAL** | n/a | **NOT TO BUILD (§3)** |
| 4. Premium curriculum / pass | Medium (perk-gating) | Medium (FOMO) | Sink or USD | Parked → Owner |
| 5. Diploma NFTs | Med (mirror-only) | Medium | Phase-2/chain | Parked (chain mocked) → Owner |
| 6. Faculty/persona vanity | Low–Med | Low | Sink or USD | Parked → Owner |

---

## 8. Disposition
All options above are **PARKED**. Nothing is recommended for implementation. The anti-moat set (§3) is
flagged as **NOT TO BUILD**. No `curriculum.yaml`, `balance.yaml`, ledger, or service change is proposed.
Any move from "parked" to "build" requires an explicit Owner decision with player-facing economy
sign-off, per `CLAUDE.md` and `OMNI_CHARTER.md`. **Deferred to Owner.**

## Sources & repo paths
- `docs/memory/design/06-university.md` — tuition-as-sink, degrees pay perks/XP not GROW, earned-mastery, "Where it's going" (premium depts, Diploma NFTs Sprint 4, persona depth).
- `docs/memory/design/00-game-vision.md` §Moat #6 — "earned… you can't credit-card your way to the top" (anti-whale).
- `docs/memory/design/04-honesty-and-trust.md` — Pledge #2 (transparent economy/visible burn), Pledge #4 (no dark patterns / no pay-to-win / no FOMO / no loot-box).
- `docs/OMNI_CHARTER.md` — "Off-chain MVP first," "No Phase-2 leakage into Phase-1," Monetization Analyst role.
- `CLAUDE.md` — faucets↔sinks invariant; DB-authoritative / chain-as-mirror; "Stop and ask ONLY for… player-facing economy changes, real money / chain settlement / treasury."
- `src/growpodempire/services/university_service.py` — `enroll` (TUITION sink), `complete_course` (real-time study gate + `_practical_met`), `claim_degree`/`university_title`, `degree_effects()` / `_EFFECT_KEYS`.
- External (cited as prior art, not endorsement): ethical-cosmetics F2P (Path of Exile / Dota 2); season/battle pass (Fortnite, Dota 2 Battle Pass); pay-to-win vs. pay-for-convenience & loot-box literature (UK DCMS loot-box review; Zendle & Cairns; EU/Belgium/Netherlands loot-box rulings).
