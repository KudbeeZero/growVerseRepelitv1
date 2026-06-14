# UNI-A07 — GrowPod University: Community Research
**Directive ID:** UNI-001 · **Lead Agent:** UNI-A00 · **Worker Agent:** UNI-A07
**Asked:** Research social/community learning for GrowPod University — study groups, mentorship, peer review, guilds, knowledge leaderboards, alumni networks, faculty events, accountability streaks — with the social mechanic, the retention/relatedness benefit, moderation/abuse/safety, and a phased (MVP-light → later) rollout for each, off-chain-MVP-first.
**Done:** Delivered a community/social-learning blueprint: nine mechanic families graded on social design + relatedness payoff + abuse surface + lawful/educational-safety, each phased into MVP-light vs later, all designed to extend the shipped university (`university_service.py`) without breaking the DB-authoritative, server-authoritative, faucet/sink invariants; flagged the public-read moderation gap as the hard dependency.
**Risks:**
- **Public-read + user-generated content** (peer-review notes, guild chat, mentor messages) is the single biggest new abuse surface — none exists in the university today, which is currently UGC-free. Any social text feature ships moderation *first* or not at all.
- Cannabis context: any UGC channel can drift into sourcing/sales/real-cultivation solicitation; the lawful/educational guardrail must be a launch constraint, not a later patch.
- Social faucets (streak rewards, guild bonuses, leaderboard payouts) can quietly become an inflation pump or a collusion/multi-account farm — every social reward needs a sink and an anti-Sybil gate (cross-link UNI-A05 leaderboards, UNI-A04 SDT).
**Needs You:** Owner call on (a) whether the university ever hosts free-text UGC at all vs. structured/templated-only social (huge moderation-cost delta), and (b) whether any social reward may touch the GROW ledger or stays XP/cosmetic-only.
**Next:** Hand to UNI-A00 to reconcile with UNI-A05 (leaderboard/cohort mechanics — shared schema) and UNI-A04 (relatedness/SDT framing). If approved, MVP-light tier (study cohorts + structured peer endorsement + alumni transcript-visibility) is the smallest shippable slice and should be the first work-order candidate.

---

## 0. Scope guard (read first)
Think-Tank role: **research only — no code, no mutations, no builds.** This is a blueprint, not a
work order. Everything here **extends** the shipped university
(`src/growpodempire/services/university_service.py`, `docs/memory/design/06-university.md`) and must
honor the invariants in `CLAUDE.md`:

- **DB authoritative; chain mirrors.** All social state lives in SQLAlchemy tables, off-chain. No
  social feature needs the chain for MVP (honors `OMNI_CHARTER.md` "off-chain MVP first").
- **Writes require API-key auth; reads are public.** This is the load-bearing fact for *every*
  social feature: a peer-review note, a guild roster, an alumni list — all are **publicly readable**.
  That is great for social proof and terrible for un-moderated free text. See §10.
- **Money is `Decimal`, ledgered; every faucet has a sink.** The university today is
  **net-deflationary** (tuition is a `TUITION` sink, `university_service.py:140-145`; degrees pay
  perks/XP/title, never GROW). Social rewards must not break that.
- **Server-authoritative + deterministic.** No client-submitted scores, streak counts, or
  endorsement tallies — the server computes them (mirrors `cup_score`, `05-events-and-competition.md`).

The university as built is a **single-player loop today**: enroll → study (real-time gate) → meet a
practical tied to live game state → complete → claim degree → permanent perks + `university_title`.
Community features turn that solo transcript into a **social pillar** without touching the solo loop.

---

## 1. Why community at all — the relatedness thesis
The vision frames the university as the "earned-mastery half of the moat" (`06-university.md`;
`00-game-vision.md` Moat #6) and gestures at a **knowledge economy** (`03-grower-skills.md` §The
knowledge economy: "master-grower data & consulting… verified findings become reputation assets").
Community learning is the connective tissue that turns *individual* mastery into *shared* standing.

Grounding from learning-community and self-determination research (coordinate with UNI-A04 on SDT):

- **Self-Determination Theory** (Ryan & Deci, 2000) names three needs: autonomy, competence, and
  **relatedness**. The shipped university serves competence (practicals) and autonomy (choose your
  courses). It serves relatedness **not at all** — that's the gap this directive fills. Relatedness
  is the need most correlated with *retention* in voluntary, long-horizon activities.
- **Communities of Practice** (Lave & Wenger, 1991; Wenger, 1998): learning is social participation;
  newcomers move from "legitimate peripheral participation" to full membership by doing real work
  alongside experts. Mentorship + guilds operationalize exactly this trajectory.
- **Cohort effects in online learning:** MOOCs famously bleed learners (completion often <10%, e.g.
  Jordan, 2015's meta-analysis of MOOC completion). The interventions that move the needle are
  **cohorts, deadlines, accountability partners, and peer interaction** — not more content. A
  real-time study gate (which GrowPod already has) *plus* a cohort is a known retention combo.
- **Social accountability / streaks:** Duolingo-style streaks and "study-buddy" pairings convert
  intrinsic intent into habit via mild social commitment (cf. commitment-device literature; Milkman
  et al. on accountability buddies). Powerful, but the dark-pattern line (`04-honesty-and-trust.md`,
  cited via UNI-A06) is real — streaks must motivate, not manufacture FOMO/loss-aversion guilt.

The design target: **make learning *with* and *in front of* other players the default**, while the
solo loop still works for the soloist.

---

## 2. The nine mechanic families (overview)
Graded across the four axes in the directive. MVP-light = ships with little/no UGC moderation cost;
Later = needs moderation, anti-abuse, or chain.

| # | Mechanic | Relatedness payoff | Abuse surface | Phase |
|---|----------|-------------------|---------------|-------|
| 1 | Study cohorts / classes | High (shared deadline) | Low (no free text) | **MVP-light** |
| 2 | Structured peer endorsement | Med | Low–Med (collusion) | **MVP-light** |
| 3 | Alumni network / transcript social proof | Med | Low (read-only) | **MVP-light** |
| 4 | Mentorship (grads teach newcomers) | High | Med (messaging) | Phase 2 |
| 5 | Peer review of grows (free-text/annotated) | High | **High** (UGC) | Phase 2 |
| 6 | Guilds / clubs / grow-houses | High | Med–High (chat, rosters) | Phase 2 |
| 7 | Knowledge leaderboards | Med (status) | Med (Sybil/farming) | Phase 2 (w/ UNI-A05) |
| 8 | Faculty-led events / cohort lectures | Med | Low (broadcast) | Phase 2 |
| 9 | Study-buddy streaks / accountability | High | Med (collusion) | Phase 2 |

Design principle threaded through all nine: **structured social before free-text social.** Every
relatedness win that can be delivered with *templated, server-validated, enumerated* interactions
(endorse a course, join a cohort, see who's an alum) ships first and cheap. Free text (chat, review
notes, mentor DMs) is the expensive, risky tier and is gated behind moderation.

---

## 3. Study cohorts / classes — **MVP-light**
**Social mechanic.** When a player enrolls in a course, group them into a *cohort* (e.g. the rolling
batch of players who enrolled in `PLANT-240` in the same window, or an opt-in "study together" group
of N). The cohort shares the same real-time study clock the engine already enforces
(`complete_course` time gate, `university_service.py:165-171`). A read-only cohort page shows
"7 growers studying *Cannabis Genetics* with you; 3 have met the practical." Coordinate with UNI-A05
on cohort *sizing/bucketing* mechanics (they own leaderboard/cohort formation).

**Relatedness / retention benefit.** Turns the lonely study timer into a shared journey — the single
highest-leverage, lowest-risk relatedness move. Cohorts are the #1 evidence-backed retention lever
in online learning (§1). No content to author: it's a *grouping* over the existing enrollment table.

**Moderation / abuse / safety.** Low. No free text. Surfaces only *enrollment facts* (already
implied by public reads). Privacy note: cohort membership reveals a player is studying X — keep it to
opt-in display names / handles, never anything PII. No cannabis-content risk (it's structural).

**Phased rollout.** *MVP-light:* derive cohorts from existing `CourseEnrollment` rows by
course_key + enrollment window; a public `GET .../courses/<key>/cohort` showing aggregate progress.
*Later:* named/opt-in study groups, cohort completion bonuses (XP only, see §11), cohort-vs-cohort
friendly standings (folds into §7 with UNI-A05).

---

## 4. Structured peer endorsement — **MVP-light**
**Social mechanic.** A graduate of a course can **endorse** another player *for that specific course*
(LinkedIn-skill-endorsement shape) — a single enumerated action, not free text. Server validates
both parties' transcripts (endorser must have completed/degreed the course; endorsee must have
completed it). Endorsement counts surface on the public transcript. This is the lightest possible
"peer recognition" primitive and the safe stand-in for full peer review (§5) at MVP.

**Relatedness / retention benefit.** Cheap social proof + competence signal (SDT competence ×
relatedness). Gives alumni a reason to return and engage post-graduation. Feeds the reputation/
knowledge-economy vision (`03-grower-skills.md`) without UGC.

**Moderation / abuse / safety.** Low–Medium. No text, so no content moderation. Main risk is
**collusion / endorsement-farming / multi-account rings** (Sybil). Mitigations: endorsements are
*capped* per endorser, *gated* on the endorser having actually earned the course, **non-transferable
and non-monetary** (status only, never GROW — see §11), and de-weighted by graph heuristics later
(reciprocal-endorsement and new-account discounting). Coordinate with UNI-A05 — same anti-Sybil
machinery their leaderboards need.

**Phased rollout.** *MVP-light:* a `CourseEndorsement(endorser_id, endorsee_id, course_key)` table
with the uniqueness + eligibility checks; counts on the transcript. *Later:* weighted "respected
endorsement" (endorsements from high-reputation alumni count more), endorsement decay, abuse-graph
de-weighting.

---

## 5. Alumni network / transcript social proof — **MVP-light**
**Social mechanic.** Because reads are public, the **transcript is already a public credential**
(`transcript()`, `university_service.py:225-276` returns title, degrees, courses). Lean into it: a
public **alumni directory per degree** ("Master of Cultivation — 142 graduates"), a public profile
showing a player's degrees + `university_title` + `cannabis_cup_title` (`05-events-and-competition.md`),
and "alumni of *Cornell-track Plant Pathology*" badges. No new data — it's a *view* over shipped
state.

**Relatedness / retention benefit.** Belonging ("I'm one of 142 Masters") + aspirational pull
("only 12 Doctorates exist") + identity. Alumni identity is a durable, low-churn relatedness anchor.

**Moderation / abuse / safety.** Low. Read-only over server-authoritative facts. Only safety control
needed: **display-name moderation** (a player-chosen handle is the one piece of UGC here) — run
handles through a denylist/profanity filter and a report path. No cannabis-content risk.

**Phased rollout.** *MVP-light:* `GET /university/alumni/<degree_key>` (public) + a public player
profile aggregating university + Cup honors. *Later:* alumni "class of <season>" cohorts tied to Cup
seasons, alumni-only faculty events (§8), the constellation/Hall-of-Fame visual treatment
(`00-game-vision.md` §constellation; `05-events-and-competition.md`).

---

## 6. Mentorship — graduates teaching newcomers — **Phase 2**
**Social mechanic.** A degree-holder opts in as a **mentor**; a newcomer requests/gets matched to a
mentor (match on department + level gap). The mentor gets **structured** tools first: the ability to
"co-sign" a mentee's enrollment, leave *templated* tips (pick from a server-curated list, not free
text, at MVP-of-Phase-2), and earn a **Mentor** reputation track as mentees graduate. Communities-of-
Practice newcomer→expert trajectory (§1) made literal.

**Relatedness / retention benefit.** Very high — mentorship creates *two* retention hooks (the
mentor returns to help; the mentee has a guide). Mentors gain status + a reason for long-horizon
engagement; mentees get the "legitimate peripheral participation" on-ramp that combats early churn.

**Moderation / abuse / safety.** Medium. The moment mentors message mentees you have a **private UGC
channel** → grooming/harassment/solicitation risk, plus cannabis-sourcing risk (a "mentor" telling a
newcomer where to *really* buy seeds). Controls: start **templated-only** (no free text), gate
mentorship behind a degree (raises the cost of a bad-actor account), require a **report/block** path,
log all mentor↔mentee interactions for moderation, and rate-limit. Free-text mentor chat is a *later*
sub-phase that ships only with the §10 moderation stack.

**Phased rollout.** *Phase 2a:* opt-in mentor flag, matching, templated tips, mentor-reputation track
(XP/title only). *Phase 2b:* mentor-led small cohorts. *Phase 2c (gated on §10):* free-text mentor
messaging with moderation + reporting.

---

## 7. Peer review of grows — **Phase 2 (highest UGC risk)**
**Social mechanic.** Players submit a grow (or a harvested cultivar / Cup entry) for **peer review**;
other players annotate/critique it — ideally structured (rubric sliders: VPD management, cure
quality, terpene expression — reuse `cup_score` dimensions, `05-events-and-competition.md`) plus
optional free-text notes. This is the richest "learning *in front of* peers" mechanic and the most
aligned with a real grow-community.

**Relatedness / retention benefit.** High — feedback loops, recognition, and the "teach to learn"
effect. Directly seeds the knowledge economy (`03-grower-skills.md`): good reviewers become
respected voices; reviewed-and-praised grows become reputation assets.

**Moderation / abuse / safety.** **High — this is full UGC.** Free-text critique invites harassment,
spam, brigading, and (cannabis-specific) off-platform sourcing/sales talk, dosing/medical claims, and
illegal-cultivation how-to. This feature **cannot ship before the §10 moderation stack.** Mitigations:
**structured-rubric-first** (numeric scores need no content moderation and still teach), free text
behind moderation + report + rate-limits, no DMs (reviews are public and on-record), and a clear
content policy ("educational/in-game only; no real-world sourcing, sales, or dosing advice").

**Phased rollout.** *Phase 2a:* **rubric-only** peer review (server-validated sliders, no text) —
delivers most of the learning value at near-zero moderation cost. *Phase 2b (gated on §10):* free-text
review notes with moderation. *Later:* reviewer reputation, "verified finding" peer-confirmation hooks
toward the discovery economy (`00-game-vision.md` Moat #5).

---

## 8. Guilds / clubs / grow-houses — **Phase 2**
**Social mechanic.** Player-formed groups ("grow-houses") with a roster, a shared identity/banner, a
collective progress tally (sum of members' degrees/harvests), and optional guild chat. The classic
MMO social-graph retention engine, applied to a *learning* community. Guilds can co-enroll cohorts
(§3) and field teams in Cup seasons (§7/§5).

**Relatedness / retention benefit.** The strongest long-term retention structure in social games —
guild belonging massively reduces churn. Gives the university a *persistent* social home between
courses.

**Moderation / abuse / safety.** Medium–High. A guild *name/banner/description* is UGC (filter +
report). Guild **chat** is the big one — same risks as §7 (harassment, sourcing, illegal how-to) →
gated on §10. Anti-abuse: guild leadership roles + the ability to remove members; cap guild count per
account to limit Sybil farming of any guild-scoped reward; guild rewards are **status/XP, not GROW**
(§11).

**Phased rollout.** *Phase 2a:* guild creation + roster + aggregate (read-only) progress + filtered
name/banner. *Phase 2b (gated on §10):* guild chat with moderation. *Later:* guild-vs-guild seasonal
standings (with UNI-A05), guild-shared cosmetic unlocks.

---

## 9. Knowledge leaderboards — **Phase 2 (UNI-A05 co-owned)**
**Social mechanic.** Ranked boards over server-computed knowledge metrics: most degrees, highest
"knowledge score" (a deterministic aggregate of credits × difficulty), fastest cohort completion,
most respected endorsements (§4), top reviewers (§7). **UNI-A05 owns the leaderboard/cohort mechanics
proper** — this directive only supplies the university-side metrics and the abuse constraints.

**Relatedness / retention benefit.** Status + comparison + aspirational targets (SDT competence
signaling). Best when paired with *cohort* boards (compare to peers, not just global #1) so the long
tail isn't demoralized — a known leaderboard-design pitfall.

**Moderation / abuse / safety.** Medium. No UGC, but **gaming/Sybil/collusion** is the core risk:
multi-account endorsement rings (§4), farmed "knowledge score," and the demoralization of bottom
ranks. Mitigations (shared with UNI-A05): server-authoritative scores only (no client submission),
anti-Sybil weighting, cohort/percentile boards alongside global, and **no direct GROW payout for
rank** (§11). Keep scoring **deterministic** (mirror `cup_score`) so ranks are reproducible and
cheat-proof.

**Phased rollout.** *Phase 2:* read-only public knowledge boards (global + cohort) over deterministic
metrics. *Later:* seasonal knowledge "ladders" tied to Cup seasons; reputation-weighted boards.

---

## 10. Faculty-led events / cohort lectures — **Phase 2**
**Social mechanic.** Scheduled, LiveOps-style events where the AI Professor
(`06-university.md` §The AI Professor; `ai/lecturer_*.py`) delivers a *cohort* lecture — a shared,
time-boxed "class session" many players attend at once, optionally with a synchronized quiz
(`06-university.md` §Where it's going: knowledge quizzes). A "guest lecture" can theme around a Cup
season or a newly discovered phenotype.

**Relatedness / retention benefit.** Shared synchronous moments (appointment mechanics) are a strong
return-driver; a cohort experiencing the same lecture builds belonging. Reuses the *already-shipped*
lecturer stack — content cost is low.

**Moderation / abuse / safety.** Low. **Broadcast, server-authored** content (the Professor speaks;
players receive) — the safest "social" surface because the UGC direction is reversed. Only risk is
the AI lecturer itself; it already runs a horticultural-science system prompt and is CI-mock-safe
(`06-university.md`). Keep lecture content lawful/educational by prompt + the existing structured-
output guardrails.

**Phased rollout.** *Phase 2:* scheduled cohort lectures (LiveOps knob like `events.current_season`,
cf. `05-events-and-competition.md`), optional synchronized quiz. *Later:* named faculty personas,
alumni-only masterclasses, faculty AMAs (chat → gated on §10 moderation).

---

## 11. Study-buddy streaks / accountability — **Phase 2**
**Social mechanic.** Opt-in **study-buddy pairing**: two players pair on a course; the server tracks a
**shared streak** (both met their daily/periodic study check-in within the real-time gate). A broken
streak is shown gently; a maintained streak grants small recognition. Commitment-device / accountability-
partner psychology (§1) applied to the existing real-time study clock.

**Relatedness / retention benefit.** High — pairs create mutual obligation, the strongest cheap habit
driver. Converts the (already-present) time gate into a *social* commitment rather than a solo wait.

**Moderation / abuse / safety.** Medium. **Dark-pattern line (`04-honesty-and-trust.md`):** streaks
must motivate, **not** weaponize loss-aversion/FOMO/guilt — no manufactured urgency, no punishing
"you let your buddy down" framing, easy opt-out, and **streak-freeze grace** (compassionate design).
Abuse: paired-account collusion to farm streak rewards → keep rewards **status/XP/cosmetic, never
GROW** (§12) and cap them. Pairing invites are a (thin) social channel → use enumerated invite/accept,
no free text, with block.

**Phased rollout.** *Phase 2:* server-tracked shared streak, gentle UI, streak-freeze. *Later:*
buddy-cohort blends, opt-in buddy leaderboards (with UNI-A05).

---

## 12. The economy guardrail — social rewards must not inflate
Every social mechanic above is deliberately specced to pay in **XP / title / status / cosmetic — never
GROW**, mirroring the shipped university (degrees pay perks/XP/title, not GROW;
`university_service.py:191-219`) and the net-deflationary design (`06-university.md`). Rationale:

- A GROW faucet attached to a *social* action (endorse, streak, guild bonus, leaderboard rank) is the
  easiest thing in the design to **farm via multi-accounts/collusion**, and the hardest to give a
  matching sink. Keeping social rewards **non-monetary** sidesteps both the inflation risk
  (`CLAUDE.md`: every faucet needs a sink) and most of the Sybil incentive.
- If the Owner ever wants a GROW-bearing social reward, it must (a) post to the ledger like any faucet,
  (b) carry a matching sink, and (c) pass an anti-Sybil gate. **This is an Owner economy decision**
  (`CLAUDE.md`: "Stop and ask… player-facing economy changes (faucets/sinks/prices)") — parked, see
  Needs You.

---

## 13. The moderation / safety stack — the hard dependency
The university today hosts **zero UGC**; community features (§5 text, §6 messaging, §8 chat) introduce
the first user-generated content in this subsystem. Public reads (`CLAUDE.md`) mean **anything written
is world-visible**. Before *any* free-text social feature ships, this stack must exist:

1. **Content policy, cannabis-aware.** Explicit, displayed rules: educational/in-game only; **no**
   real-world sourcing/sales solicitation, **no** dosing/medical claims, **no** illegal-cultivation
   how-to, no harassment/hate. This is a lawful/educational guardrail and a platform-risk reducer.
2. **Pre-publish filtering.** Denylist + profanity/PII filter on every UGC field (handles, guild
   names, review text). Cheap, ships with the structured features (§3–§5 handles/names).
3. **Report + block + remove.** Every UGC surface needs a report path, per-user block, and
   moderator/automated takedown. Auth + rate-limits already exist for writes (`CLAUDE.md`); extend
   with abuse rate-limits.
4. **Audit log.** Mentor↔mentee and guild messages are logged for moderation (server-authoritative,
   DB-side).
5. **Structured-before-free-text everywhere.** The cheapest mitigation: deliver relatedness with
   enumerated actions (endorse, join cohort, rubric-score) and defer free text until 1–4 are real.

**Sequencing rule:** MVP-light tier (§3, §4, §5) needs only #2 (handle/name filtering). Everything
free-text (§5 notes, §6/§8 chat) is **blocked on the full stack**. That's why the table in §2 splits
the way it does.

---

## 14. Recommended phasing (the smallest shippable slices)
- **MVP-light (low moderation cost, no free text):** Study cohorts (§3) + structured peer endorsement
  (§4) + alumni directory/social-proof profile (§5). Delivers the core relatedness win (you study
  *with* people; you're recognized *by* people; you *belong* to an alumni cohort) over **views and
  enumerated actions on shipped/near-shipped tables** — the natural first work-order.
- **Phase 2a (structured social, light moderation):** rubric-only peer review (§7a), templated
  mentorship (§6a), guild rosters (§8a), knowledge boards (§9, with UNI-A05), faculty cohort lectures
  (§10), study-buddy streaks (§11).
- **Phase 2b (free-text, gated on §13 stack):** review notes, mentor messaging, guild chat.
- **Later / chain:** alumni "class of season," guild-vs-guild seasons, constellation/Hall-of-Fame
  visuals, any on-chain credentialing (diploma NFTs are UNI-A06's parked monetization question, not
  this directive's).

---

## 15. Cross-agent dependencies
- **UNI-A05 (leaderboards/cohorts mechanics):** owns cohort *formation/bucketing* (§3), *leaderboard*
  computation + anti-Sybil weighting (§7/§9), and guild/buddy standings. This directive supplies the
  university-side metrics (knowledge score inputs, endorsement counts) and the "social rewards are
  non-GROW" constraint. **Shared schema risk** — align on a single cohort/leaderboard table shape so
  university and the broader game don't fork it.
- **UNI-A04 (relatedness / SDT):** owns the motivational framing. §1 here leans on SDT relatedness +
  Communities of Practice; A04 should be the source of truth for *which* relatedness levers to
  prioritize and the dark-pattern boundary on streaks (§11) and leaderboards (§9).
- **UNI-A06 (monetization, PARKED):** any *paid* social tier (cosmetic guild banners, alumni cosmetics)
  is A06's parked, Owner-reserved question — not specced as buildable here.

## 16. Sources / citations
**Repo:** `docs/memory/design/06-university.md`, `…/00-game-vision.md` (Moat #5/#6, constellation),
`…/03-grower-skills.md` (knowledge economy / reputation), `…/05-events-and-competition.md` (Cup,
seasons, `cup_score`, Hall of Fame), `CLAUDE.md` (invariants), `docs/OMNI_CHARTER.md` (off-chain MVP,
Think-Tank = research-only), `src/growpodempire/services/university_service.py` (enroll/study/complete/
degree/transcript; `TUITION` sink lines 140-145; perks-not-GROW lines 191-219), `…/UNI-A06-monetization-
backlog.md` (honesty/`04-honesty-and-trust.md` dark-pattern pledge, parked monetization).

**Learning-community / motivation research (general knowledge, tag: established literature):**
Ryan & Deci (2000), *Self-Determination Theory* — autonomy/competence/relatedness. · Lave & Wenger
(1991) and Wenger (1998), *Communities of Practice / legitimate peripheral participation*. · Jordan
(2015), MOOC completion-rate meta-analysis (low completion; cohort/accountability interventions help).
· Milkman et al. — accountability/commitment-device effects on follow-through. · General social-game
retention literature on guild belonging and cohort/appointment mechanics.

> *Tag honesty:* repo citations are verified against the files read this session. The external
> research is **established literature recalled from training**, not freshly fetched (no web access
> used) — directionally reliable; specific figures (e.g. exact MOOC completion %) should be
> re-verified before any public-facing claim.
