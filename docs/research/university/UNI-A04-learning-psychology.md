# UNI-A04 — GrowPod University: Learning Psychology
**Directive ID:** UNI-001 · **Lead Agent:** UNI-A00 · **Worker Agent:** UNI-A04
**Asked:** Research the learning science that should shape GrowPod University so players genuinely learn and stay engaged without it feeling like a chore.
**Done:** Surveyed the core learning-science literature (SDT, mastery learning, retrieval practice/spaced repetition, cognitive load, scaffolding, feedback timing, desirable difficulty) and translated each into concrete design recommendations for the existing time-gated study model, quizzes, practicals, and lecture pacing — with explicit dark-pattern guardrails tied to the honesty invariant.
**Risks:**
- The real-time gate is a *desirable difficulty* only if framed as honest investment; mis-framed it reads as an artificial paywall-style timer (the dark pattern the charter forbids).
- Mastery learning + retrieval practice add UI surface (quizzes, review prompts) that, done wrong, becomes nag-ware and violates "no manufactured FOMO."
- Extrinsic perks (yield %, XP) can crowd out the intrinsic satisfaction of learning if they become the only reason to study (over-justification effect).
**Needs You:** nothing.
**Next:** Hand to UNI-A05 (gamification mechanics) and UNI-A00 to merge psychology-of-why with mechanics-of-how; recommend a curriculum-data quiz schema spike for the engineering backlog.

---

## 0. Scope & de-confliction with UNI-A05
This document is the **psychology of *why* learning mechanics work and *when* they backfire**. UNI-A05 owns the **gamification mechanics themselves** (points, streaks, badges, leaderboards, progress bars). The boundary:

| Question | Owner |
|---|---|
| *Why* does a streak motivate, and when does it become a coercive dark pattern? | **UNI-A04 (this doc)** |
| *What* the streak counter looks like, its reset rules, its reward table | UNI-A05 |
| *Why* a practical-before-credit gate produces durable learning | **UNI-A04** |
| *What* perks/XP a degree pays | UNI-A05 (+ existing `curriculum.yaml`) |

Where this doc names a mechanic, it is to state the **psychological constraint** the mechanic must satisfy — not to design the mechanic.

Grounding read: `docs/memory/design/06-university.md`, `00-game-vision.md`, `04-honesty-and-trust.md`, `OMNI_CHARTER.md` ("Player attachment over complexity"; "Emotional attachment is a first-class metric"; North Star "I can't wait to wake up tomorrow and check my plant"), and the shipped model in `src/growpodempire/services/university_service.py` + `src/growpodempire/data/curriculum.yaml`.

---

## 1. The frame: Self-Determination Theory is the spine
**Deci & Ryan's Self-Determination Theory (SDT)** holds that durable, non-coercive motivation comes from satisfying three innate needs: **autonomy** (I chose this), **competence** (I'm getting better), and **relatedness** (this connects me to others/a world I care about). This is the right spine because the North Star is *attachment*, and SDT is the most validated account of intrinsically motivated, attachment-style engagement (vs. the brittle extrinsic loops of skinner-box idle games the moat explicitly rejects, `00-game-vision.md` §The Moat #6).

**Autonomy — design implications**
- The catalog is already non-linear (prereq chains, multiple departments in `curriculum.yaml`). Keep it that way: a player picks *which* degree path matches their grow style (genetics-focused vs. cultivation-focused). Never force a single track.
- The time-gate must be framed as *the player's investment*, not *the system's permission*. Language matters: "Your coursework is maturing" (autonomy-supportive) vs. "Locked for 48h" (controlling). Autonomy-supportive language is a measured driver of intrinsic motivation (Reeve, 2009).
- Never auto-enroll or auto-nag. Offers, not obligations.

**Competence — design implications**
- The single most attachment-relevant lever. Competence satisfaction requires **optimally challenging tasks + informative feedback** (see §3, §6). The practical-tied-to-real-grow model (`_practical_met`) is already a competence engine: you don't just *say* you learned VPD, you *harvested a quality-70 plant*. This is the doc's strongest existing asset — protect and extend it.
- Surface competence *visibly*: a transcript that shows the player a real before/after ("your median harvest quality rose from X to Y since this degree") converts effort into felt growth.

**Relatedness — design implications**
- The AI Professor (`ai/lecturer_*`) is the relatedness surface inside a single-player loop: a *named* faculty persona who remembers your grow makes study feel like mentorship, not a content dump (`06-university.md` "Professor persona depth" ⬜). Relatedness in solo games is largely *parasocial* — a credible mentor character carries it.
- Degrees + titles (`Player.university_title`) are relatedness-via-status: they signal membership in a community of serious growers. Keep titles meaningful (earned, scarce), not participation trophies.

> **SDT guardrail:** the *over-justification effect* (Lepper, Greene & Nisbett, 1973) — paying people to do something they already enjoy can *reduce* intrinsic interest. The degree perks (yield %, quality bonus) are extrinsic. If "learn to grow better" collapses into "grind courses for the yield buff," the learning becomes a chore. Mitigation in §7.

---

## 2. Mastery learning — the time-gate's true justification
**Bloom's Mastery Learning** (1968) and the "**2 Sigma Problem**" (Bloom, 1984): when learners must *demonstrate mastery* of one unit before advancing (rather than advancing on a fixed schedule regardless of understanding), outcomes improve dramatically. The university already implements the structural core of mastery learning:

- **Prereq chains** = mastery gating (`prereqs` in curriculum; enforced in `enroll()`).
- **Practical-before-credit** = a competency demonstration, not a seat-time credit (`_practical_met`).

**Recommendations**
- Treat the practical as the *mastery criterion*, and keep the bar real. Resist lowering thresholds for retention metrics — a degree that can be claimed without actually growing a good plant destroys the competence signal and violates the honesty invariant ("nothing ships as 'earned' that wasn't," paraphrasing `04-honesty-and-trust.md`).
- Mastery learning tolerates *re-attempts without penalty*. A failed practical (e.g., harvest quality below threshold) should be framed as "not yet," never "failed" — the player simply grows another plant. The current model already supports this naturally (the check re-evaluates live state). Make the copy growth-mindset positive (Dweck, 2006): "Your best harvest is 64 — the practical needs 70. Dial VPD and try the next run."
- Add a thin **knowledge mastery** layer alongside the practical: the planned quizzes (`06-university.md` ⬜) are the *cognitive* mastery check, complementing the *behavioral* practical. Together: "you can explain it AND you can do it."

---

## 3. Retrieval practice & spaced repetition — make quizzes do real work
The planned quizzes (`06-university.md` "Knowledge quizzes ⬜") are an opportunity to deploy the two best-evidenced techniques in learning science:

- **Retrieval practice / the testing effect** (Roediger & Karpicke, 2006): *recalling* information strengthens memory far more than re-reading it. A quiz is not assessment overhead — it is itself the most efficient *learning* event.
- **Spaced repetition** (Ebbinghaus's forgetting curve; Cepeda et al., 2006 meta-analysis): the same total study time produces far more retention when distributed across days than massed in one sitting. The real-time gate *already enforces spacing for free* — a 48–96h `duration_hours` course physically cannot be crammed. This is a hidden pedagogical gift of the time-gate; make it explicit.

**Recommendations**
- **Quizzes as retrieval, not gatekeeping.** Low-stakes, formative, re-attemptable. Per question give immediate, explanatory feedback (§6). Grade deterministically from curriculum data (`06-university.md` already specifies "deterministically graded"), keeping the honesty/determinism invariant.
- **Space the recall across the study window.** Instead of one quiz at completion, surface 2–3 short retrieval check-ins *during* the `duration_hours` (e.g., a single concept question when the player next opens the university tab mid-course). This converts dead waiting time into spaced retrieval — and gives the player a reason to come back tomorrow (North Star alignment).
- **Interleave departments, don't block them.** Mixing related-but-distinct topics (interleaving; Rohrer & Taylor, 2007) beats blocking. A player studying nutrients who gets an occasional VPD recall question retains both better. Use sparingly to avoid confusion.
- **Re-surface earned material.** Long after a degree is claimed, an occasional "from your Plant Genetics degree…" callout in the advisor is spaced repetition that also pays off relatedness (the world remembers what you learned).

> **Dark-pattern guardrail:** spaced repetition prompts must be *invitations tied to natural visits*, never push-notification nags engineered to manufacture daily logins. The line is honesty: a prompt that helps you remember = good; a prompt engineered to exploit loss-aversion to drive DAU = the forbidden dark pattern (`04-honesty-and-trust.md` pledge #4, "no manufactured FOMO").

---

## 4. Cognitive Load Theory — protect working memory in lectures
**Sweller's Cognitive Load Theory** (1988): working memory is tiny (~4 chunks; Cowan, 2001). Learning fails when *extraneous* load (poor presentation) crowds out *germane* load (schema-building). The AI Professor lectures (`lecturer_service.py`) are the highest cognitive-load surface.

**Recommendations**
- **Segment lectures.** Mayer's segmenting principle: break a lecture into learner-paced chunks rather than one wall of text. The existing `objectives` list in `curriculum.yaml` is a natural segmentation skeleton — deliver one objective at a time.
- **Worked-example effect** (Sweller & Cooper, 1985): for novices, a fully worked example ("here's how *this* grow hit VPD targets") teaches more efficiently than problem-solving from scratch. Early courses (cult-101) should lean on worked examples grounded in the player's *own plant data* (the advisor stack already has this state) — maximally concrete, minimally abstract.
- **Coherence principle:** cut seductive details. A lecture should not pad with lore or flavor that competes with the load-bearing concept. (This is in tension with relatedness/persona; resolve by putting *persona* in tone/voice, not in extra informational content.)
- **Expertise reversal effect** (Kalyuga et al., 2003): scaffolding that helps novices *hurts* experts. As a player levels (the system knows `player.level` and their transcript), lectures should shed hand-holding — fewer worked examples, more open practicals for advanced courses. This argues for **level-tiered lecture depth** (the lecturer already takes `level` as a param — exploit it).

---

## 5. Scaffolding & the Zone of Proximal Development
**Vygotsky's Zone of Proximal Development (ZPD)** + **Wood, Bruner & Ross (1976) scaffolding**: optimal learning happens at the edge of current ability, with temporary support that is *faded* as competence grows.

**Recommendations**
- The prereq DAG *is* a scaffold: cult-101 (harvest 1 plant) → cult-201 (quality ≥70). Each course's practical sits just beyond the last. Audit the curriculum so each step is a *reachable stretch*, never a cliff. Concretely: a practical threshold should be achievable by a player who *applied the lecture's lesson*, not one who must first grind 20 unrelated plants.
- **Fade the scaffold.** Early courses: explicit objectives, worked examples, low practical thresholds, optional hints. Capstone/Doctorate (`06-university.md` ⬜): open-ended practicals ("breed a stabilized line that places in the Cup"), minimal hand-holding. The fade is itself a felt competence reward.
- **The Professor as a contingent scaffold:** the advisor/lecturer should answer at the player's level and *withdraw* help as they progress, matching the expertise-reversal point in §4.

---

## 6. Feedback timing — immediate for facts, delayed-by-design for skill
Feedback is the second pillar of competence (with optimal challenge). The research is nuanced:

- **Immediate feedback** aids acquisition of facts/procedures and prevents error entrenchment (Hattie & Timperley, 2007 — feedback is among the highest-effect-size interventions in education).
- **Some delay can help transfer** for complex skills (Schmidt's guidance hypothesis in motor learning): constant immediate feedback can create dependence; spacing it builds self-monitoring.

**Recommendations**
- **Quizzes (facts): immediate, explanatory feedback.** Not just right/wrong — *why*, tied to the lecture objective. This is where most learning actually happens (testing effect + feedback).
- **Practicals (skill): the feedback is the grow itself, and it is naturally delayed** — you find out if you nailed VPD when the plant harvests days later. This is *good*: it's authentic, high-stakes, and builds the self-monitoring the guidance hypothesis predicts. Don't short-circuit it with constant hand-holding; the advisor can *coach during*, but the verdict is the harvest.
- **Make the feedback diagnostic, never punitive.** Per Hattie & Timperley, effective feedback answers "Where am I going? How am I doing? Where to next?" The practical-not-met message in `complete_course()` already does this ("harvest quality >= 70 (best 64)") — extend that pattern everywhere: always show the gap *and the next action*.

---

## 7. Intrinsic vs. extrinsic motivation — keep perks from eating the joy
The degrees pay extrinsic rewards (perks on the same effect keys as research, XP, title — `degree_effects()`). Extrinsic rewards are not evil; SDT distinguishes *controlling* rewards (which crowd out intrinsic motivation) from *informational* rewards (which signal competence and *support* it).

**Recommendations to keep rewards informational, not controlling**
- **Frame perks as evidence of mastery, not the price of grinding.** "Master Breeder — your stabilized lines now express +X" reads as *you became this good*. The same perk framed as "complete 6 courses to unlock +X yield" reads as a grind quest. Same number, opposite psychology.
- **Unexpected > contingent for sustaining interest.** Deci's work shows *task-contingent* rewards crowd out intrinsic motivation more than *unexpected* or *performance-contingent* ones. The current model is performance/mastery-contingent (you earned it by demonstrating skill) — the *better* of the options. Preserve that; avoid pure seat-time or pure spend rewards.
- **Don't let perks be the *only* reason to learn.** Counterweight with intrinsic hooks: genuine "huh, that's how VPD works" insight moments (a good lecture), and competence feedback that's satisfying independent of any buff. If a course's only draw is its perk, the course has failed as *learning*.
- **Tuition (the GROW sink) is a useful commitment device** (sunk-cost can support follow-through) but must never become pay-to-win-around-learning: you can pay tuition, but you still must *do the practical*. The model already enforces this — never weaken it. (Aligns with anti-whale moat, `00-game-vision.md` #6.)

---

## 8. The real-time gate as a *desirable difficulty* (and where it flips to a dark pattern)
**Bjork & Bjork's "desirable difficulties"** (1994): conditions that make learning feel *harder and slower* (spacing, effortful retrieval, delayed feedback) often produce *better long-term retention and transfer* than easy, fast, fluent study. The real-time study gate is, pedagogically, a textbook desirable difficulty:

- It **enforces spacing** (can't cram a 96h course) → better retention (§3).
- It **forces effort over time** → the learning feels earned → competence (§1).
- It aligns with the moat's "grows take real days, mastery is earned not bought" ethos and the North Star (a reason to return tomorrow).

**But desirable difficulty has a knife-edge.** A difficulty is *desirable* only when:
1. It is **honest** (the time genuinely buys something — spacing, real study, your plant actually growing), and
2. It is **framed as investment, not punishment**, and
3. It is **not artificially monetizable** (the moment "skip the timer for $" appears, it stops being a learning gate and becomes the exact pay-to-skip dark pattern the charter and `00-game-vision.md` Anti-goals forbid).

**Recommendations**
- **Never sell a study-time skip.** This is the single most important guardrail in this document. A purchasable skip converts a desirable difficulty into a Fogg-style coercion-monetization loop, violates the anti-whale moat (#6), and violates `04-honesty-and-trust.md` pledge #4. The time-gate's integrity *is* the product.
- **Fill the wait with value, don't just count it down.** The wait should *be* study: spaced retrieval check-ins (§3), the parallel grow (§6), professor office-hours snippets. An empty countdown is a chore; a countdown full of small, optional, genuinely-helpful learning moments is the North Star.
- **Calibrate `duration_hours` to plant-cycle reality, not friction-for-friction's-sake.** The gate is defensible because it mirrors how real cultivation knowledge accrues alongside a real grow. If a course's hours are arbitrary padding unrelated to any real process, players will (correctly) read it as fake — and the honesty wedge breaks. Tie study duration conceptually to the grow stage it teaches.
- **Show the why.** A one-line honest disclosure ("This course is paced over real days so you can apply it to a live grow") turns an opaque timer into a transparent, trust-building feature — exactly the "honesty as a product surface" move of `04-honesty-and-trust.md`.

---

## 9. Difficulty that motivates, not punishes — flow & challenge calibration
**Csíkszentmihályi's Flow** (1990): engagement peaks when challenge matches skill — too hard → anxiety, too easy → boredom. **Yerkes-Dodson**: performance is an inverted-U over arousal/difficulty. **Vygotsky's ZPD** (§5) is the educational form of the same idea.

**Recommendations**
- **Adaptive thresholds, honestly disclosed.** Practical thresholds could scale gently with player level/history so each course stays in the ZPD — but any adaptivity must be *transparent and deterministic* (honesty + determinism invariants). No hidden difficulty-tuning that players can't replay/verify.
- **Never punish; always "not yet."** Failure states should cost nothing but time and offer a clear next action (§2, §6). The current re-evaluable practical model is already non-punitive — preserve it. Avoid streak-loss penalties, lost-progress mechanics, or shame framing (those are the gamification dark patterns UNI-A05 must also avoid; flagged here as the *psychological reason* they backfire: they trigger loss-aversion/anxiety, pushing the player out of flow into avoidance).
- **Multiple difficulty paths.** Because the catalog is non-linear, a stuck player can pivot to a parallel department rather than hammering one wall — preserving autonomy and keeping them in flow somewhere. Protect this branchiness.

---

## 10. Adult / self-directed learning — treat the player as an andragogical learner
**Knowles' Andragogy** (1980): adult learners are self-directed, bring experience, are problem-centered (not subject-centered), and are motivated by immediate applicability. GrowPod's audience ("serious players," `06-university.md`) maps cleanly onto this.

**Recommendations**
- **Problem-centered, not subject-centered.** Frame every course around a grow problem the player has *felt* ("my plants keep stretching" → DLI/light course), not abstract botany. The practical model already enforces application; the lecture framing should match.
- **Honor existing experience.** Let players *test out* via the practical: if a high-level player already meets a course's practical from prior play, the course should recognize that experience rather than pretend they're a novice (avoids the expertise-reversal pain, §4). The system already checks live state — a player who already harvested a 70-quality plant has effectively pre-completed cult-201's practical.
- **Immediate applicability is the retention engine.** Andragogy + the North Star agree: the reason to study tonight is that it makes *tomorrow's plant-check* better. Every course should answer "what does this change about my next grow?" in one sentence.

---

## 11. Synthesis — the ten principles, as design rules
1. **SDT is the spine:** every feature must serve autonomy, competence, or relatedness (§1).
2. **Mastery-gate honestly:** practical-before-credit is the competence engine; never lower the real bar (§2).
3. **Quizzes are retrieval practice, not gatekeeping:** low-stakes, spaced, explanatory feedback (§3).
4. **The time-gate already enforces spacing for free** — make that benefit explicit, fill the wait with study (§3, §8).
5. **Protect working memory:** segment lectures, use worked examples for novices, fade them for experts (§4).
6. **Scaffold and fade** along the prereq DAG; each practical a reachable stretch (§5).
7. **Immediate feedback for facts; the grow is the (delayed, authentic) feedback for skill** (§6).
8. **Keep perks informational, not controlling** — frame as evidence of mastery, never as the grind's payout (§7).
9. **The real-time gate is a desirable difficulty *only while honest*:** never sell a skip, never pad arbitrarily (§8).
10. **Difficulty stays in the ZPD/flow band:** "not yet," never "failed"; non-linear paths keep stuck players moving (§9, §10).

> The throughline is the honesty invariant: every one of these mechanics works *because* it is genuine, and breaks the moment it is faked or monetized into coercion. Learning science and `04-honesty-and-trust.md` point at the same north: respect the player's mind and time, and attachment follows.

---

## 12. Repo anchors & cited research
**Repo paths:** `src/growpodempire/services/university_service.py` (time-gate `complete_course`, `_practical_met`, mastery-style prereqs in `enroll`) · `src/growpodempire/data/curriculum.yaml` (course objectives = segmentation skeleton; practical thresholds = mastery criteria) · `src/growpodempire/ai/lecturer_*` + `services/lecturer_service.py` (lecture delivery, `level` param for expertise-reversal tiering) · `docs/memory/design/06-university.md` (planned quizzes, professor persona, doctorate capstone) · `docs/memory/design/04-honesty-and-trust.md` (no-dark-patterns charter) · `docs/memory/design/00-game-vision.md` (anti-whale, earned-mastery moat) · `OMNI_CHARTER.md` (attachment-first principles, North Star).

**Research cited (named):**
- Deci & Ryan — Self-Determination Theory (autonomy/competence/relatedness); over-justification (Lepper, Greene & Nisbett, 1973); informational vs. controlling rewards.
- Reeve (2009) — autonomy-supportive language.
- Bloom — Mastery Learning (1968) & the 2-Sigma Problem (1984).
- Roediger & Karpicke (2006) — testing effect / retrieval practice.
- Ebbinghaus (forgetting curve); Cepeda et al. (2006) — spacing-effect meta-analysis.
- Rohrer & Taylor (2007) — interleaving.
- Sweller — Cognitive Load Theory (1988); Sweller & Cooper (1985) worked-example effect; Kalyuga et al. (2003) expertise-reversal effect; Cowan (2001) working-memory capacity; Mayer — multimedia/segmenting/coherence principles.
- Vygotsky — Zone of Proximal Development; Wood, Bruner & Ross (1976) — scaffolding.
- Hattie & Timperley (2007) — feedback effect sizes & the three feedback questions; Schmidt — guidance hypothesis (delayed feedback for skill transfer).
- Bjork & Bjork (1994) — desirable difficulties.
- Csíkszentmihályi (1990) — Flow; Yerkes-Dodson law.
- Knowles (1980) — Andragogy (adult/self-directed learning).
- Dweck (2006) — growth mindset ("not yet" framing).

**Tagging honesty:** All recommendations are design proposals (⬜ planned) layered on the shipped time-gate/practical model (✅). No claim here asserts a feature exists that doesn't; quizzes, spaced check-ins, persona depth, and adaptive thresholds are explicitly proposals.
