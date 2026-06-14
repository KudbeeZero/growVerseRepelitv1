# UNI-A05 — GrowPod University: Gamification Systems
**Directive ID:** UNI-001 · **Lead Agent:** UNI-A00 · **Worker Agent:** UNI-A05
**Asked:** Design the engagement/gamification mechanics for GrowPod University — XP & leveling, streaks & comeback loops, badges, certifications & prestige titles, transcripts/progress, knowledge leaderboards, unlock chains, and daily/weekly study loops — each with a target retention behavior, a deflation-safe reward type, and anti-burnout/anti-exploit guardrails.
**Done:** Delivered a gamification blueprint that layers engagement systems on top of the shipped university (`university_service.py`, `curriculum.yaml`) without minting GROW; every reward is XP / perk / title / cosmetic / badge / standing. All mechanics tagged ✅ built · 🔨 partial · ⬜ proposed, mapped to repo apply-sites, and tied to the "I can't wait to check my plant tomorrow" North Star.
**Risks:**
- Streaks can feel coercive (loss-aversion fatigue) if punitive — mitigated by forgiving windows + freeze tokens.
- Knowledge leaderboards can ossify (top players permanent) — mitigated by seasonal + cohort + percentile framing (coordinate UNI-A07).
- Badge inflation devalues prestige if over-issued — mitigated by tiering + scarcity reserved for titles.
- The deflation invariant is easy to violate accidentally (a "study reward" that pays GROW) — every mechanic here is faucet-free by construction; flagged where tempting.
**Needs You:** nothing — proposals are data-shaped (balance.yaml / curriculum.yaml) and reuse existing services; owner sign-off only if knowledge rank is wired into the player-facing reputation economy (a player-facing economy change per CLAUDE.md).
**Next:** Hand to UNI-A00 to sequence against UNI-A04 (psychology) and UNI-A07 (social/cohorts); a build agent can land Tier-1 items (XP events, streak ledger, badge data) as a `balance.yaml`/`curriculum.yaml` + `university_service` extension.

---

## 0. Scope, stance, and what already exists

This document is **mechanics-only**. The *why-it-works* psychology (variable reward,
loss aversion, flow, autonomy/competence/relatedness) is owned by **UNI-A04** — I cite
the frameworks honestly but do not re-derive them. Social surfaces of leaderboards and
cohorts (who you compete with, how cohorts form) are owned by **UNI-A07** — I define the
*ranking mechanic*; A07 defines the *social container*.

**Frameworks referenced (credited honestly):**
- **Hook Model** — Nir Eyal, *Hooked* (2014): trigger → action → variable reward → investment.
- **Self-Determination Theory (SDT)** — Deci & Ryan (1985): autonomy, competence, relatedness as intrinsic-motivation drivers.
- **Octalysis** — Yu-kai Chou, *Actionable Gamification* (2015): 8 core drives; I lean on Development & Accomplishment, Ownership, Scarcity, Epic Meaning.
- **Flow** — Csikszentmihalyi (1990): challenge ≈ skill; used for difficulty pacing of unlock chains.
- **Goal-Gradient Effect** — Hull (1932), Kivetz et al. (2006): effort accelerates near a goal; used for progress bars/transcripts.
- **Fogg Behavior Model** — B.J. Fogg (2009): B = MAP (motivation, ability, prompt); used for daily-loop triggers.

**Hard constraint — the deflationary invariant (CLAUDE.md):** *Rewards are perks/XP/title/
cosmetic, NOT GROW faucets.* The shipped university already honors this — tuition is a
**sink** (`LedgerEntryType.TUITION`), and degrees pay **perks + title + XP**, never GROW
(`docs/memory/design/06-university.md` §Economy; `university_service.py:claim_degree`).
**Every mechanic below is faucet-free by construction.** Where a designer would be tempted
to pay GROW, I flag it and route to a non-currency reward instead.

**The North Star this serves:** *"I can't wait to wake up tomorrow and check my plant."*
The university's job is to make the *between-harvest* hours engaging — study is the thing
you can do **while the plant is growing**, so the daily loop has a second hook beyond the
grow timer.

**Reward-type taxonomy (the only currencies this blueprint spends):**
| Reward type | Deflation-safe? | Mechanism / apply-site |
|---|---|---|
| **XP** | ✅ (not GROW; drives level, which gates content) | `leveling_service.award_xp` |
| **Perk** (stat effect) | ✅ (perks reuse research `_EFFECT_KEYS`) | `degree_effects()` aggregation |
| **Title** (prestige string) | ✅ (cosmetic identity) | `Player.university_title` |
| **Badge / achievement** | ✅ (non-currency token) | extends `progression_service` pattern, **reward field = XP/badge, NOT GROW** |
| **Cosmetic** (frame, diploma art, constellation node) | ✅ (no economy weight) | `web/` + future Diploma NFT |
| **Standing / rank** (knowledge ladder position) | ✅ (positional, not minted) | new read-model over transcripts |

> Note: the *existing* `progression_service` achievements **do** pay GROW (a deliberate,
> bounded retention faucet — `balance.yaml:206`). **University badges must NOT copy that.**
> University is the deflationary half. Badges here pay XP + cosmetic + standing only.

---

## 1. XP & Leveling for knowledge

**Status:** 🔨 partial (course XP and degree XP exist; no university-specific XP track or "knowledge level").

### 1a. Course / degree XP (✅ built, extend)
- **Mechanic:** Completing a course awards `course_xp` (default 50, `university_service.complete_course`); claiming a degree awards `xp_reward` (200–1500 by tier, `curriculum.yaml:degrees`). XP flows into the *same* player level curve as grow actions (`leveling_service`, quadratic `curve_base*L*(L-1)/2`).
- **Retention behavior targeted:** *competence* (SDT) + *development & accomplishment* (Octalysis) — measurable forward motion that also **unlocks more of the game** (level gates courses *and* research nodes), so knowledge XP is never a dead-end stat.
- **Reward type:** XP (faucet-free).
- **Guardrails:** XP is already capped by course supply (finite curriculum) and time-gated by `duration_hours` — you cannot grind it. **Anti-exploit:** completion requires both the time gate **and** a live-state practical, so XP can't be farmed by re-enroll loops (`CourseEnrollment` is unique per course; re-enroll is rejected).

### 1b. Knowledge XP track / "Scholar Level" (⬜ proposed)
- **Mechanic:** A **second, university-scoped progression** — `scholar_xp` / `scholar_level` — distinct from grow-level, earned only by university actions (course completion, quiz mastery, lecture attendance, study-loop participation). Mirror `grower_skills` precedent (`03-grower-skills.md`: "do-to-unlock" axis separate from spend-to-unlock). Scholar level gates **prestige content** (advanced seminars, the Doctorate capstone, honors tracks) without touching the core grow level.
- **Retention behavior targeted:** gives knowledge its own visible identity (a transcript GPA-like number), so a player who loves *learning* has a ladder even between harvests.
- **Reward type:** XP/level (faucet-free); scholar-level milestones grant **titles + cosmetic frames**, not GROW.
- **Guardrails:** Curve must be **steeper at the top** so Scholar Level isn't trivially maxed; cap any single action's contribution; **no decay** (knowledge earned is kept — respects the "lifetime" ethos of `05-events-and-competition.md`).
- **Data shape:** `leveling.scholar_xp:` block in `balance.yaml`; `Player.scholar_xp/scholar_level` columns (mirror `xp/level`). Reuses `leveling_service` curve helpers.

---

## 2. Daily streaks & comeback mechanics

**Status:** ⬜ proposed (no streak system today; `progression_service.claim_daily` is a 22h GROW stipend — a *separate* faucet, not a study streak).

### 2a. Study streak
- **Mechanic:** A **Study Streak** counts consecutive days the player performs a qualifying *university* action (attend a lecture, advance an enrolled course's study clock by checking in, complete a quiz, or progress a practical). Streak length unlocks escalating **non-currency** rewards: streak-badge tiers (7/30/100/365 day), a streak-length cosmetic flame on the transcript, and small **temporary** study-XP multipliers (e.g. +5% scholar-XP at a 7-day streak, capped at +15%).
- **Retention behavior targeted:** the **Hook Model trigger→action loop** (Eyal) and **loss aversion** — a streak is an *investment* the player won't want to forfeit; this is the literal "wake up and check tomorrow" driver.
- **Reward type:** badge tiers + cosmetic + a *scholar-XP* multiplier (faucet-free; the multiplier amplifies XP, never mints GROW).
- **Guardrails (anti-burnout, critical):**
  - **Forgiving window:** the day boundary is ~22–26h (mirror `daily_cooldown_hours: 22`, `balance.yaml:205`) so a player isn't punished for checking in a few hours late.
  - **Streak freeze tokens:** earn 1 freeze per N days of streak (or per degree); a freeze auto-protects one missed day. Caps the punishment of real life (vacation/illness). Borrowed from Duolingo's streak-freeze, which measurably reduces churn-on-break.
  - **No pay-to-restore-with-GROW:** a broken streak cannot be bought back with currency (would be a sink, but it gates emotion behind money — disallowed by taste, and out of scope per CLAUDE.md unless owner approves). Freezes are *earned*, not bought.
  - **Cap the multiplier** so streaks don't create a runaway power gap between obsessive and casual players (anti-whale/anti-bot ethos, `03-grower-skills.md`).

### 2b. Comeback / win-back mechanic
- **Mechanic:** When a lapsed player returns after ≥7 days away, surface a **"Welcome back to campus"** state: their streak isn't shamed (show "Best streak: N"), one freeze is gifted, and a **catch-up bounty** offers bonus *scholar-XP* (not GROW) for completing one course practical that week. Pair with a re-engagement trigger (email/push owned by UNI-A07/LiveOps).
- **Retention behavior targeted:** resurrection of churned users; reduces the shame-cost of returning (a known churn amplifier).
- **Reward type:** scholar-XP bounty + gifted freeze (faucet-free).
- **Guardrails:** Catch-up bounty is **rate-limited to once per lapse** (ledger-style idempotency, like `claim_daily`/`claim_achievement` use); cannot be triggered by deliberately lapsing (the bounty value < the XP foregone by being away, so lapsing is never net-positive — **anti-exploit by incentive design**).

---

## 3. Badges & achievements (knowledge-flavored)

**Status:** 🔨 partial (a generic achievement system exists in `progression_service`, but it pays GROW and is grow-flavored, not university-flavored).

- **Mechanic:** A university **badge set** layered over the existing achievement pattern, but with **XP/cosmetic/standing rewards only** (NOT the GROW rewards in `balance.yaml:206`). Categories:
  - **Milestone badges:** "First Lecture", "First Degree", "Honor Roll" (complete a course with practical met on first attempt), "Dean's List" (a full department completed).
  - **Mastery badges:** "Department Master" per department (all courses in `cultivation`/`genetics`/`nutrients`/`ipm`/`chemistry`/`postharvest`), "Polymath" (one course in every department).
  - **Behavioral badges:** streak tiers (§2), "Night Owl"/"Early Bird" cosmetic flavor, "Perfect Quiz" (100% on a knowledge quiz — quizzes are ⬜ planned in `06-university.md`).
  - **Hidden/discovery badges:** unannounced, fire on surprising actions (e.g., enroll in a course whose practical you'd *already* met) — variable-reward surprise (Octalysis "unpredictability").
- **Retention behavior targeted:** *collection drive* (Octalysis Ownership), completionism, and surprise (variable reward — UNI-A04 owns the depth here).
- **Reward type:** badge token + scholar-XP + (for rare tiers) a cosmetic transcript frame. **Never GROW.**
- **Guardrails:**
  - **Tiered scarcity** so badges don't inflate: common milestones are plentiful; "Master"/"Polymath" are scarce and feed §4 titles. Over-issuing the rare tier destroys prestige (Octalysis Scarcity).
  - **Idempotent claim** via the existing ledger-as-guard pattern (`progression_service._claimed_keys`) or a dedicated `BadgeProgress` table mirroring `DegreeProgress`.
  - **Data-driven:** badge defs live in `curriculum.yaml` (a `badges:` block) or `balance.yaml`, so balance stays in data (CLAUDE.md: "balance.yaml is the tuning surface").

---

## 4. Certifications & prestige titles

**Status:** ✅ built (degrees grant a permanent `Player.university_title`); 🔨 extend for prestige depth.

- **Mechanic (built):** Each degree carries a `title` (e.g. "Master Grower", "Cannabis Geneticist") set permanently on the player at `claim_degree` (`university_service.py:206`; `curriculum.yaml:degrees`). Titles are **lifetime** and idempotent (unique `degree_progress` constraint).
- **Mechanic (proposed depth):**
  - **Doctorate capstone (⬜, already named in `06-university.md` §Where it's going):** a top-tier title ("Dr. of Cannabis Science") gated behind a capstone *thesis practical* — e.g. stabilize a novel line **and** place top-N in a Cannabis Cup. This fuses university with `05-events-and-competition.md`, making the highest title genuinely rare.
  - **Title display & selection:** if a player holds multiple titles, let them **choose which to display** (autonomy — SDT) while the transcript shows all. Currently `university_title` is a single overwrite; a proposal is to keep the *set* of earned titles and let the player pick the active one.
  - **Honorary/prestige titles** from §6 leaderboard standing (e.g. "Valedictorian — Summer 2026").
- **Retention behavior targeted:** *epic meaning & identity* (Octalysis) — a title is who you *are* on the leaderboard, in trades, and in the Cup Hall of Fame; long-horizon aspiration.
- **Reward type:** title string (cosmetic identity, faucet-free) + the degree's existing perks.
- **Guardrails:** Titles are **earned, lifetime, non-tradeable, non-purchasable** (a title you can buy is worthless — preserves prestige). Doctorate gating must respect Flow (challenge ≈ skill): hard but not gatekept by RNG.

---

## 5. Progress bars, transcripts & the goal gradient

**Status:** 🔨 partial (`transcript()` returns rich per-course status + `study_hours_remaining` + `practical_met`; no synthesized progress visualization or GPA).

- **Mechanic:** The transcript (`university_service.transcript`) already exposes, per course: `status` (available/locked/enrolled/completed), `study_hours_remaining`, `practical_met`, and per-degree `completed_required`/`claimable`. Build **player-facing progress surfaces** on this:
  - **Per-course dual progress bar:** a *time* bar (study hours) **and** a *practical* checklist — two independent gauges, both must fill. This is honest (you see exactly what's left) and creates two goal gradients.
  - **Per-degree completion ring:** `len(completed_required)/len(required_courses)` — the **goal-gradient effect** (Hull/Kivetz) accelerates effort as the ring nears full; surface "1 course from your B.S."
  - **GPA / honors score (⬜):** a synthesized number from quiz scores + practical-on-first-try, feeding §1b Scholar Level and §6 leaderboard.
  - **The "constellation" transcript (⬜, ties to `00-game-vision.md` constellation visual):** degrees rendered as a growing star-map of mastery.
- **Retention behavior targeted:** **goal-gradient** acceleration near completion; **endowed progress** (showing prereqs already met as "head start").
- **Reward type:** none (pure visualization) — but it *amplifies* every other reward by making proximity visible.
- **Guardrails:** Never show a bar that can regress (no decay) — knowledge-progress regression feels punitive and violates the lifetime ethos. Bars must be **truthful** (the practical detail strings already are, `_practical_met`).

---

## 6. Knowledge leaderboards & ranking

**Status:** ⬜ proposed (no university leaderboard; the Cup Hall of Fame exists as precedent, `cup_service`/`GET /cup/hall-of-fame`). **Coordinate with UNI-A07 on social container & cohorts.**

- **Mechanic:** A **Knowledge Ranking** — a read-model ladder over transcripts. Ranking key = a composite *Knowledge Score* from: degrees earned (weighted by tier), courses completed, Scholar Level (§1b), honors/GPA (§5), and badge-tier count (§3). Surfaces:
  - **Seasonal knowledge leaderboard** (resets per season like the Cup edition, `05-events-and-competition.md` §Seasonal editions) — top scholars of the season earn a **"Valedictorian"** prestige title (§4) + cosmetic, **not GROW**.
  - **Cohort / class leaderboards (UNI-A07 owns the cohort model):** rank within your enrollment cohort or guild, not just globally — keeps mid-tier players competitive (relatedness — SDT).
  - **Percentile framing** ("Top 12% of scholars") rather than only absolute rank, so the long tail still gets positive feedback (anti-discouragement).
- **Reputation / Cup tie-in:** Knowledge Score feeds **grower reputation** (`03-grower-skills.md` §The knowledge economy: "degrees + Cup standing feed a grower-reputation/knowledge economy") and can **gate or seed Cup judging categories** (a Master Geneticist's terpene entries get a knowledge-credential flag). This makes the university *matter* in the competitive endgame, not just for solo perks.
- **Retention behavior targeted:** social comparison & status (Octalysis Social Influence; SDT relatedness via cohorts); a recurring seasonal reason to return.
- **Reward type:** rank/standing (positional, faucet-free) + seasonal title + cosmetic. **No GROW prizes** (the Cup already owns the bounded GROW faucet; the university leaderboard stays deflationary).
- **Guardrails:**
  - **Seasonal reset of the *ranking*** (not of earned knowledge) so the ladder doesn't ossify around early adopters — fresh Valedictorian each season (mirrors Cup's "fresh champion every season").
  - **Cohort sizing** to keep ranks meaningful (UNI-A07).
  - **Anti-exploit:** score derives from *completed, time-gated, practical-verified* courses — you cannot inflate rank by spending money (anti-whale, `03-grower-skills.md`). Read-only, server-authoritative (no client-submitted scores — same stance as `cup_score`).
  - **Owner gate:** wiring Knowledge Score into the *tradeable* reputation economy is a player-facing economy change → flag for owner sign-off per CLAUDE.md.

---

## 7. Unlock chains (the curriculum as a tree)

**Status:** ✅ built (prereq chains + level gates exist and are enforced).

- **Mechanic:** Courses form **prerequisite chains** (`prereqs` in `curriculum.yaml`; enforced in `university_service.enroll` and reflected as `status: locked` in `transcript`). Degrees are **meta-unlocks** requiring sets of courses. Three gating axes already compose: **prereq chain** + **`level_req`** + **`practical`** (live game state). Proposed extensions:
  - **Branching honors tracks (⬜):** optional advanced electives that unlock only after a department master, giving *autonomy* (choose your specialization path — SDT) rather than a single linear spine.
  - **Cross-discipline capstones (⬜):** the Doctorate (§4) as a unlock that requires breadth (multiple departments) — the top of the tree.
- **Retention behavior targeted:** **Flow** (challenge ramps with `level_req` and practical difficulty); curiosity ("what's behind the next lock?"); long-horizon planning.
- **Reward type:** access (the unlock itself is the reward) + the unlocked course's perks.
- **Guardrails:**
  - **No pay-to-unlock-past-prereqs** — tuition pays to *enroll* in an *eligible* course, never to skip the chain or the practical (the engine rejects this today). Preserves the earned-mastery moat.
  - **Locked states must be legible** (`transcript` already returns *why* a course is locked via prereqs/level) — a lock you can't understand is frustrating, not motivating.
  - **Difficulty pacing:** `level_req` and `duration_hours` should ramp smoothly (the curriculum already does: 48h→96h→168h→192h) so no single wall stalls progression (Flow).

---

## 8. Daily & weekly study loops

**Status:** ⬜ proposed (the time-gated study clock exists; there's no *daily ritual* layered on it).

- **Daily loop (the Hook):**
  - **Mechanic:** A once-per-day **"Attend today's lecture"** check-in on an enrolled course: the AI Professor (`lecturer_service`, ✅ built) delivers a short fresh lecture beat; checking in advances streak (§2), grants a trickle of scholar-XP, and may surface a **daily knowledge quiz** (⬜ planned in `06-university.md`) graded deterministically. Pairs with the existing daily stipend prompt so "open the game daily" has a *study* reason, not only a *currency* reason.
  - **Fogg Behavior Model:** prompt (daily trigger) + low ability cost (one tap) + motivation (streak + XP + a new lecture beat) = reliable daily action.
  - **Reward:** scholar-XP trickle + streak advance + quiz-mastery badge chance (faucet-free).
- **Weekly loop (the bigger pull):**
  - **Mechanic:** A **weekly study goal** ("complete one practical" / "advance two courses" / "ace a quiz") with a **non-currency** weekly reward (a cosmetic, a freeze token, a scholar-XP bonus). Resets weekly; pairs naturally with the seasonal leaderboard cadence (§6).
  - **Reward:** cosmetic / freeze / scholar-XP (faucet-free).
- **Retention behavior targeted:** daily habit formation (Hook) + a weekly "session" that justifies a longer engagement; complements the multi-day grow cycle so the player has *something to do every day* while plants mature.
- **Guardrails:**
  - **Anti-burnout:** daily check-in is **one low-effort action**, not a chore list; **no penalty for skipping** beyond streak math (which §2 softens with freezes). Weekly goals are *opt-in* targets, not mandatory.
  - **Anti-exploit:** daily scholar-XP is **capped per day** (a small trickle, not a grind faucet); quizzes are **deterministically graded** and **answer-rotated** so they can't be brute-forced/scripted (mirror the deterministic stance of `cup_score` and `MockLecturerProvider`).
  - **No GROW in any loop** — the daily stipend faucet stays in `progression_service`; the university loops pay XP/cosmetic/standing only.

---

## 9. How it all composes (the engagement flywheel)

```
        ┌──────────────── Daily trigger (push/open) ────────────────┐
        ▼                                                            │
  Daily lecture check-in ──► Study streak++ ──► Scholar-XP trickle   │
        │                         │                   │              │
        ▼                         ▼                   ▼              │
  Advance course clock     Streak badge tiers    Scholar Level ──► unlock prestige content
        │                         │                   │              │
        ▼                         │                   ▼              │
  Practical met (real grow) ──────┴──► Course complete ──► course XP + badge
        │                                     │                      │
        ▼                                     ▼                      │
  Degree claimable ──► claim ──► TITLE + PERKS + degree XP           │
        │                                     │                      │
        ▼                                     ▼                      │
  Knowledge Score ↑ ──► Seasonal leaderboard ──► Valedictorian title │
        │                                     │                      │
        └──► feeds Cup categories / reputation (05/03) ──────────────┘  (investment → next trigger)
```

This is the **Hook Model** end-to-end: the daily trigger drives a low-cost action, the
**variable reward** (streak/quiz/badge/lecture novelty) reinforces it, and the
**investment** (accruing transcript, climbing knowledge rank, approaching a degree) loads
the *next* trigger. Critically, the loop's payoff is **knowledge, identity, and standing —
not minted currency** — so it deepens engagement while staying net-deflationary.

---

## 10. Build sequencing (suggested; for UNI-A00 / a build agent)

| Tier | Items | Effort | Touches |
|---|---|---|---|
| **T1 (data + small service)** | University badge set (XP/cosmetic-only), study streak ledger, daily lecture check-in, weekly goal | low–med | `curriculum.yaml`/`balance.yaml` + `university_service`/new `study_loop` helper; reuse ledger-as-idempotency |
| **T2 (new track + read-models)** | Scholar XP/Level, GPA/honors score, dual progress bars + degree rings (web read-models) | med | `Player.scholar_xp/level`, `leveling_service` curve reuse, `transcript()` enrichment, `web/` |
| **T3 (competitive/social)** | Knowledge leaderboard (seasonal), cohort ranks (with UNI-A07), Valedictorian titles, Doctorate capstone | med–high | new read-model over transcripts; season knob reuse (`events.current_season`); Cup/reputation tie-in (owner gate) |
| **T4 (prestige/cosmetic)** | Constellation transcript, Diploma NFT cosmetic, displayed-title selection | high | `web/` + chain (Sprint 4, mocked) |

Every tier keeps `balance.yaml`/`curriculum.yaml` as the tuning surface and mirrors
existing service patterns (`research_service`/`progression_service`/`leveling_service`) —
no new architecture, no engine changes (effects stay in `services/`, per ARCHITECTURE).

---

## 11. Invariant & cross-agent audit

- **Deflationary invariant:** ✅ honored — no mechanic mints GROW. XP/perk/title/cosmetic/standing only. The one GROW-paying achievement system (`progression_service`) is explicitly **not** copied into university badges.
- **DB authoritative / server-authoritative / deterministic:** ✅ — leaderboards and quizzes are read-models and deterministic checks (mirror `cup_score`, `_practical_met`, `MockLecturerProvider`); no client-submitted scores.
- **Balance is data-driven:** ✅ — all tuning proposed as `balance.yaml` / `curriculum.yaml` blocks.
- **Cross-agent dependencies:**
  - **UNI-A04 (psychology):** owns the *why* behind streaks/variable-reward/flow — I reference, don't re-derive. A04 should pressure-test §2 (streak coercion) and §3 (variable-reward badges) for ethical dark-pattern risk.
  - **UNI-A07 (social/community):** owns the leaderboard *container* and *cohort model* (§6) and the re-engagement triggers/notifications behind §2b and §8. I define the ranking mechanic; A07 defines who you see and how cohorts form.
  - **UNI-A06 (monetization):** must ensure no cosmetic/freeze proposed here is sold in a way that turns a streak into pay-to-win or pay-to-restore (kept out of scope here by design).
- **Owner gate (CLAUDE.md):** wiring Knowledge Score into the *tradeable reputation economy* (§6) is a player-facing economy change → owner sign-off before that specific link ships.
