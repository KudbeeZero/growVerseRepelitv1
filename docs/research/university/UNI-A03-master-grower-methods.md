# UNI-A03 — GrowPod University: Master Grower Methods
**Directive ID:** UNI-001 · **Lead Agent:** UNI-A00 · **Worker Agent:** UNI-A03
**Asked:** Compile the advanced/expert cultivation *craft* (training, defoliation, canopy/light, VPD/environment, feeding/diagnosis, IPM, ripening/harvest, dry/cure) as teachable, practical-backed methods mapped to GrowPod University course practicals.
**Done:** A master-grower techniques compendium — each technique with real method, why-it-works, skill tier (beginner→master), and an in-game practical proposal in the existing check vocabulary (plus a small set of proposed new checks). Mapped to existing `curriculum.yaml` courses and the sim state the engine already tracks.
**Risks:**
- Several proposed practicals (e.g. "trained N plants", "defoliated", "ran a wet/dry cycle") require **new event/telemetry the sim does not yet log** — they are honestly tagged ⬜ NEW-CHECK and depend on the sim deepening in `01-simulation-horticulture.md` (Phases B/C). Until then they degrade to the existing quality/count proxies.
- Craft realism can outrun the sim: a practical that claims to verify "supercropping" is only meaningful once training is a modeled action. Where the sim can't yet prove the craft, I map to the nearest *outcome* proxy (`harvest_quality`, `cure`) and flag the gap.
- Do **not** let a craft practical bypass the sim (CLAUDE.md / `03-grower-skills.md`): a technique widens a safe band, it never deletes one.
**Needs You:** nothing — research only. One product decision deferred to UNI-A00: how many *new* practical-check types to greenlight vs. lean on existing proxies (see §7).
**Next:** Hand to UNI-A00 to merge with UNI-A02 (science) and UNI-A01/curriculum-structure work; new-check proposals in §7 should be routed to whoever owns `university_service._practical_met` + `db/models.py` event logging.

---

## 0. Scope & how this differs from UNI-A02 (science)
This doc is the **craft** half: the grower's *hands* — what a master does to the plant and the room,
when, and how you'd *prove they did it* in live game state. UNI-A02 owns the **underlying science**
(why VPD is a transpiration driver, the biochemistry of cannabinoid synthesis, ion availability vs.
pH curves). Where this doc says "VPD steers transpiration," that's the one-line operator rationale;
the full physiology is A02's. I extend `06-university.md` (the learning system) and
`03-grower-skills.md` (the use-based mastery axis), and I stay inside the **practical-check
vocabulary** the service already implements (`university_service._practical_met`):
`harvest_count · harvest_quality · breed · stabilize · cure · cup_entry · research · level`
(`src/growpodempire/services/university_service.py:299-344`,
`src/growpodempire/data/curriculum.yaml:14-18`).

**Skill-tier ladder** (mirrors `03-grower-skills.md` Cultivation/IPM/Nutrient/Post-harvest domains):
Beginner → Intermediate → Advanced → **Master**. Tiers below are the *craft* tier, not the course
level_req (the course gates by `level_req` + prereq chain already).

**Sim-anchoring legend:** ✅ the sim already tracks the state a practical needs · 🔨 partial proxy
exists · ⬜ NEW-CHECK (needs new event logging / sim depth from `01-simulation-horticulture.md`).
Optimal bands cited are the live ones (`knowledge/grow-tent-rules.md:35-37`,
`01-simulation-horticulture.md:30-34`): Temp ~20–28 °C · RH ~40–60 % · PPFD ~300–900 · CO₂
~800–1500 · pH 6.0–7.0; VPD/DLI are derived (`simulation/horticulture.py`, Phase A shipped).

---

## 1. PLANT TRAINING — shaping the canopy
*Course home: `cult-301` Advanced Canopy & Yield Management; mastery domain: Cultivation.*

Training redistributes a plant's apical-dominance hormones (auxin) so growth energy spreads across
many tops instead of one, producing an **even canopy** that intercepts light better → more, denser
top-quality colas per watt. This is the single biggest craft lever on yield-per-area.

| Technique | Real method | Why it works (operator rationale) | Tier |
|-----------|-------------|-----------------------------------|------|
| **Topping** | Cut the apical meristem above a node (usually 3rd–5th) in veg. | Removes auxin source → the two nodes below become co-dominant → 2 main colas instead of 1; repeat for 4, 8, 16. | Beginner |
| **FIMing** | "F*ck I Missed" — pinch ~75 % of the new growth tip, not a clean cut. | Damages but doesn't fully remove the meristem → 3–5 messy new tops; less stress shock than topping. | Beginner |
| **LST** (Low-Stress Training) | Bend & tie down branches to flatten the canopy; no cutting. | Breaks apical dominance *positionally* — lower nodes now sit at canopy height and get equal light; zero recovery time. | Beginner→Intermediate |
| **SCROG** (Screen of Green) | Weave the canopy through a horizontal net during veg/early flower. | Forces a flat, even table of tops at one light-distance plane → uniform DLI across every cola site. | Advanced |
| **Mainlining / manifolding** | Top to a symmetric "hub", train each branch as an equal spoke. | Equal hydraulic/photosynthate distance to every cola → uniform, repeatable bud size; the connoisseur's structure. | Advanced |
| **Supercropping** (HST) | Pinch/crush the inner stem to bend it without snapping; it heals with a knuckle. | Controlled wound thickens the stem, boosts nutrient/water flow, lowers the branch into the canopy. | Master |

**Proposed practicals.**
- `cult-301` already gates on `harvest_quality >= 85` (`curriculum.yaml:74`) — a *good outcome* proxy
  for "you ran a managed canopy." Keep this as the shipping practical (✅, no new code).
- ⬜ NEW-CHECK `trained` (`{type: trained, threshold: N}`): true once the player has logged ≥N
  training actions on plants that later reached harvest. Requires a `PlantEvent`/training log the sim
  does not have yet (`01-simulation-horticulture.md` lists no training action). Cleanest mapping for
  the *craft*, but explicitly deferred behind sim depth.
- 🔨 Intermediate proxy available today: `level` + `harvest_count` chained as prereqs already force
  many cycles, which is where training habit forms.

---

## 2. DEFOLIATION & LOLLIPOPPING — light and airflow management
*Course home: `cult-301`; supporting `ipm-201` (airflow ↔ mildew). Mastery: Cultivation + Plant-health.*

Removing leaves and lower growth is a *quality* lever, not a yield faucet — over-do it and you starve
photosynthesis. Master growers remove the **right** leaves at the **right** time.

| Technique | Real method | Why it works | Tier |
|-----------|-------------|--------------|------|
| **Selective defoliation** | Pull fan leaves shading bud sites, around days 0–3 and ~21 of flower ("Schwazzing" is the aggressive version). | Light reaches lower bud sites; airflow through the canopy drops humidity at the bud surface → less botrytis. | Intermediate→Advanced |
| **Lollipopping** | Strip the bottom third of larf/popcorn growth pre-flower. | Plant stops spending energy on shaded, airy bottom buds → bigger, denser tops; far better airflow at the base. | Advanced |
| **Timing discipline** | Heavy defo only in veg/early flower, never deep into flower. | Late leaf loss = lost sugar factory during bulking → smaller, lighter yield. The master knows *when to stop*. | Master |

**Why it ties to environment:** opening the canopy lowers leaf-surface humidity and raises effective
airflow — the same lever IPM uses against mildew (`01-simulation-horticulture.md:32`: humidity ≥64
drives mildew). So a clean, defoliated canopy *should* read in the sim as lower disease pressure.

**Proposed practicals.**
- Ship on `harvest_quality >= 85` (shared with §1) — a defoliated/lollipopped canopy is part of how
  you reach that quality (✅).
- ⬜ NEW-CHECK `defoliated` (or fold into `trained`): N plants where leaf-removal events were logged
  *and* final disease_level stayed low. Needs the same event log as §1 plus reading the existing
  `disease_level` plant field (`01-simulation-horticulture.md:79`). Strong design but sim-gated.

---

## 3. CANOPY & LIGHT MANAGEMENT — DLI, PPFD, distance
*Course home: `cult-201` Environmental Control: VPD & DLI; `cult-301`. Mastery: Cultivation.*

Light is the yield engine. The master targets **DLI** (the daily dose, mol·m⁻²·day⁻¹), not just
brightness, and keeps the canopy at one plane so every cola gets the same dose.

- **PPFD targets by stage** (instantaneous, the 0–1000 light scalar the sim now reads,
  `01-simulation-horticulture.md:60`): seedling ~150–300, veg ~300–600, flower ~600–900 (+CO₂ to push
  the ceiling). Live no-penalty band is ~300–900 (`grow-tent-rules.md:37`).
- **DLI** is derived (PPFD × photoperiod, `horticulture.dli`, Phase A): the real "did I dose the plant
  enough light today" number. Flower target DLI ~35–45 mol·m⁻²·day⁻¹.
- **Light bleaching / stress:** PPFD >~850 already triggers foxtailing + top-stretch in the bud
  renderer (`knowledge/environment-rules.md:23`) — the master rides the line just below it.
- **Even canopy = even DLI:** the §1/§2 craft exists to make PPFD uniform across the table.

| Skill | Tier |
|-------|------|
| Set a stage-appropriate PPFD inside band | Beginner |
| Hold DLI across a full flower cycle without stress flags | Advanced |
| Push high-DLI + CO₂ enrichment without bleaching | Master |

**Proposed practicals.**
- `cult-201` ships on `harvest_quality >= 70` (`curriculum.yaml:58`) — a light-managed grow proxy (✅).
- ⬜ NEW-CHECK `dli_dialed` / `env_band` (`{type: env_band, metric: dli|vpd|ppfd, hours: N}`): true
  when a plant accumulated ≥N hours inside the optimal band for a chosen derived metric. The sim
  *already computes* PPFD/VPD/DLI per tick and exposes them on `/state`
  (`01-simulation-horticulture.md:59-61`), so this is the **most sim-ready** new check — it needs a
  per-plant "hours-in-band" accumulator, not new physiology. Recommended as the first new check to add
  (see §7). 🔨 (derivable today, just not persisted/counted).

---

## 4. VPD & ENVIRONMENT DIALING — the climate the canopy feels
*Course home: `cult-201`. Mastery: Cultivation. Science depth: UNI-A02.*

VPD (vapour-pressure deficit, kPa) is the *real* transpiration driver — the number commercial growers
target instead of bare RH. It's derived from temp + RH + a leaf-temperature offset
(`simulation/horticulture.py`, Phase A) and already feeds plant health.

- **Stage VPD targets** (operator rule of thumb): clones/seedlings ~0.4–0.8 kPa · veg ~0.8–1.2 kPa ·
  flower ~1.2–1.5 kPa. Low VPD (damp) → sluggish transpiration + mildew; high VPD (dry) → stomata
  close, growth stalls, tip burn.
- **Dialing = co-moving temp & RH** to hit a VPD target, not chasing RH alone — the master's mental
  model is the VPD chart, with the room's optimal bands as guardrails (Temp 20–28, RH 40–60).
- **Night/day differential** ("cool nights") deepens purple expression (`environment-rules.md:21`) —
  a craft lever the sim already honors visually.

| Skill | Tier |
|-------|------|
| Keep temp & RH each inside band | Beginner |
| Hold a stage-appropriate VPD target across a cycle | Advanced |
| Steer VPD + CO₂ together to lift the light ceiling | Master |

**Proposed practicals.**
- Ship `cult-201` on `harvest_quality >= 70` (✅, as today).
- ⬜→🔨 NEW-CHECK `env_band` with `metric: vpd` (the §3 check, reused) — *the* canonical "you dialed
  the room" practical, and it's derivable from existing sim output. **Strong recommend.**

---

## 5. FEEDING & DEFICIENCY DIAGNOSIS — nutrient craft
*Course home: `nut-101` Soil & Nutrient Science, `nut-201` Hydroponics & EC/pH. Mastery: Nutrient science.*

The master feeds to **EC** (strength) and reads **pH** as the availability gate, then diagnoses by
leaf symptom and corrects *before* lockout. Honest sim caveat: nutrients are a **single scalar** today
(no EC, no N-P-K, no per-ion deficiencies — `01-simulation-horticulture.md:30,67-69`), so full
deficiency-diagnosis craft is **gated on Phase B** ("Nutrient uptake + deficiency/toxicity",
`01-simulation-horticulture.md:103`). I map craft to what's provable now and flag the rest.

| Technique | Real method | Why it works | Tier | Sim state |
|-----------|-------------|--------------|------|-----------|
| **Feed to band** | Keep the nutrient scalar / EC inside its optimal range; pH 6.0–7.0. | Avoids burn (too strong) and starvation (too weak); pH out-of-band sap-stress is weighted ×10 today (`01-simulation-horticulture.md:33`). | Beginner | ✅ scalar + pH banded |
| **Avoid lockout** | Hold root-zone pH in band so ions stay available. | pH governs *which* ions uptake; out-of-band = lockout even with nutrients present (real); sim currently sap-health only. | Intermediate | 🔨 pH sap-only |
| **Read deficiencies** | Diagnose N (older-leaf yellowing), Ca/Mg (interveinal/rust spots), etc. by leaf sign and correct. | Each ion has a visual signature; the master corrects the cause, not the symptom. | Advanced | ⬜ per-ion (Phase B) |
| **Wet/dry-back cycling** | Let substrate dry to a target before re-watering. | Drives root growth + oxygenation; over-watering suffocates roots (sim: water stress band [40,78], `01-simulation-horticulture.md:30`). | Advanced | 🔨 scalar proxy |
| **Flush/clean finish** | Plain water / reduced EC late in flower (contested in literature). | Aims to clear residual salts for a smoother burn; mostly a *finish-quality* lever. | Master | ⬜ |

**Proposed practicals.**
- `nut-101` ships on `harvest_count >= 2`, `nut-201` on `harvest_quality >= 75` (`curriculum.yaml:138,154`) — both ✅, "you fed plants to a good outcome."
- ⬜ NEW-CHECK `no_lockout` / `clean_feed` (`{type: clean_feed, threshold: N}`): N harvests where pH
  and nutrient stayed in-band for the whole cycle (no nutrient-burn / lockout condition flag raised).
  The sim already derives "nutrient burn" as a visible condition (`01-simulation-horticulture.md:39`),
  so this is **moderately sim-ready** — it needs a per-plant "never flagged X" accumulator. Reuses the
  §3 `env_band`/condition-history machinery. Full per-ion deficiency practicals wait for Phase B.

---

## 6. IPM — scouting, thresholds, prevention-first
*Course home: `ipm-101` Pest & Disease ID, `ipm-201` Integrated Pest Management. Mastery: Plant-health/IPM.*

IPM is a **systems discipline**, not spraying: prevent → scout → threshold → escalate controls in
priority order (cultural → biological → physical → chemical, last). The curriculum already teaches
exactly this hierarchy (`curriculum.yaml:181-187`). The sim is unusually well-suited here: it already
models stochastic **pests** (spawn, worsen-until-treated, `pest_resistance` gene) and **mildew**
(grows in damp air, clears in dry, `disease_resistance` gene) — `01-simulation-horticulture.md:34-35`.

| Technique | Real method | Why it works | Tier |
|-----------|-------------|--------------|------|
| **Scouting routine** | Regular canopy/underside inspection + a monitoring log. | Early detection = cheap fix; a small mite count is a wipe-down, a large one is a crop loss. | Beginner |
| **Action thresholds** | Treat at a defined pressure level, not at first sighting (or at panic). | Avoids both under-reaction (infestation) and over-spraying (cost, resistance, residue). | Advanced |
| **Prevention-first / cultural control** | Airflow, RH<60 %, sanitation, defoliation (§2), resistant genetics. | Removes the *conditions* pests/mildew need — the sim's humidity≥62 (pests) / ≥64 (mildew) triggers are exactly this lever. | Advanced |
| **Control hierarchy** | Biological (predators) → physical → chemical as last resort. | Lowest-collateral control that works; chemical last protects quality + resistance. | Master |
| **Clean recovery** | Bring a struggling plant back to health (the `03-grower-skills.md` IPM XP hook). | Diagnosing & recovering is the mastery signal, not just never having a problem. | Master |

**Proposed practicals.**
- `ipm-101` ships on `harvest_count >= 2`, `ipm-201` on `harvest_quality >= 70` (`curriculum.yaml:170,186`) — ✅.
- 🔨 NEW-CHECK `pest_free_harvest` / `recovered` (`{type: recovered, threshold: N}`): N harvests
  where the plant **had** pest_level/disease_level rise and was brought back to health before harvest —
  this is the explicit `03-grower-skills.md` IPM mastery signal ("Diagnosing & recovering struggling
  plants"). The sim already stores `pest_level`/`disease_level` and `health` per plant
  (`01-simulation-horticulture.md:79`); this needs a per-plant max-then-recovered flag. **Best
  sim-fit of the new checks** because the underlying state already exists and changes over a tick.

---

## 7. FLUSHING, RIPENING & HARVEST TIMING — trichome reading
*Course home: `cult-301` (harvest window) + `ph-101`. Mastery: Cultivation + Post-harvest.*

The master harvests by **trichome maturity**, not the calendar. Read the heads under magnification:
clear (immature, harsh) → cloudy/milky (peak THC) → amber (CBN, couch-lock). Target is a milky:amber
ratio (e.g. ~70:30) tuned to the desired effect. Pistil color (white→amber) is the coarse cue;
trichomes are the fine one.

- **Why timing matters:** secondary metabolites build along a flowering curve — *when* you chop sets
  how close you get to the genome's ceiling (`01-simulation-horticulture.md:90,110`, Phase B target).
  Early = lower potency; late = degraded, sedative.
- **Ripening / senescence:** late-flower cues (fading leaves, swelling calyxes) signal the finish;
  some growers run cooler nights / lower N to push color and ripeness.
- **Flushing:** see §5 — a finish lever, contested, mapped to quality not yield.

| Skill | Tier |
|-------|------|
| Harvest near the right window (pistil cue) | Beginner |
| Hit the trichome ratio for a target effect | Advanced |
| Time harvest to maximize the genome's quality/terpene ceiling | Master |

**Proposed practicals.**
- `cult-301` `harvest_quality >= 85` rewards good timing as part of quality (✅).
- ⬜ NEW-CHECK `harvest_window` (`{type: harvest_window, threshold: N}`): N harvests taken inside the
  optimal maturity window (the sim would need to expose a ripeness/maturity scalar — a Phase B
  secondary-metabolite curve). Until that lands, `harvest_quality` is the honest proxy.

**Consolidated new-check recommendation for UNI-A00 (the §7 product call):** of the proposed checks,
prioritize the two that **reuse state the sim already has**: `env_band` (§3/§4 — VPD/DLI/PPFD
hours-in-band, derivable today) and `recovered` (§6 — pest/disease rise-then-heal). These give the
craft curriculum real teeth without waiting on Phase B. Defer `trained`/`defoliated`/`clean_feed`/
`harvest_window` until the matching sim depth (training events, per-ion nutrients, ripeness) lands —
keep shipping their courses on the existing `harvest_quality`/`cure`/`harvest_count` proxies meanwhile.
This honors `03-grower-skills.md`: **skills gate technique, they never bypass the sim.**

---

## 8. DRYING, CURING & BURPING — the final 20 %
*Course home: `ph-101` Harvest, Drying & Curing; `ph-201` Post-Harvest Quality & Storage. Mastery: Post-harvest.*

Curing is where good flower becomes great — and where the sim **already gives us a real practical**
(`cure`): post-harvest quality is a sqrt-curve bonus with an over-dry penalty
(`simulation/curing.py`, `01-simulation-horticulture.md:40`), and the check counts harvests with
`cure_status == "cured"` (`university_service.py:327-333`).

| Technique | Real method | Why it works | Tier |
|-----------|-------------|--------------|------|
| **Controlled dry** | ~60 °F / ~60 % RH, slow (7–14 days) until small stems snap. | Slow water loss preserves terpenes + lets chlorophyll degrade (smoother smoke); too fast = hay/harsh, too damp = mold. | Beginner |
| **Cure in jars** | Trim, jar at ~62 % RH; equilibrate water activity. | Enzymatic breakdown of sugars/chlorophyll develops aroma + smoothness; water-activity control (the `ph-201` topic) prevents mold. | Intermediate |
| **Burping** | Open jars daily early, tapering over weeks. | Releases moisture/ammonia gas, prevents anaerobic rot, re-equilibrates RH — the discipline that separates a 2-week from an 8-week cure. | Advanced |
| **Long cure + storage** | Hold quality through storage; manage water activity (`ph-201`). | Extended cure raises the quality ceiling; storage craft holds it without degradation/contamination. | Master |

**Proposed practicals.**
- `ph-101` ships on `cure >= 1`, `ph-201` on `cure >= 3` (`curriculum.yaml:234,250`) — **✅ both already
  ship and are the best-grounded craft practicals in the catalog.** No new code needed.
- 🔨 Optional NEW-CHECK `cure_quality` (`{type: cure_quality, threshold: Q}`): require a cured harvest
  whose *post-cure* quality exceeded a threshold (not just `cure_status == cured`). The curing service
  already computes the bonus, so this is low-cost and rewards *good* curing over merely curing. A nice
  master-tier upgrade for `ph-201`.

---

## 9. Master-grower craft → course map (summary table)

| Technique cluster (§) | Course(s) | Shipping practical (today) | Proposed craft practical | Sim state |
|-----------------------|-----------|----------------------------|--------------------------|-----------|
| Training (§1) | cult-301 | `harvest_quality≥85` ✅ | `trained` | ⬜ NEW |
| Defoliation/lollipop (§2) | cult-301, ipm-201 | `harvest_quality≥85` ✅ | `defoliated` | ⬜ NEW |
| Canopy/light/DLI (§3) | cult-201, cult-301 | `harvest_quality≥70` ✅ | `env_band(dli/ppfd)` | 🔨 derivable |
| VPD/environment (§4) | cult-201 | `harvest_quality≥70` ✅ | `env_band(vpd)` | 🔨 derivable |
| Feeding/diagnosis (§5) | nut-101, nut-201 | `harvest_count≥2`/`quality≥75` ✅ | `clean_feed` | 🔨/⬜ |
| IPM (§6) | ipm-101, ipm-201 | `harvest_count≥2`/`quality≥70` ✅ | `recovered` | 🔨 state exists |
| Ripening/harvest timing (§7) | cult-301 | `harvest_quality≥85` ✅ | `harvest_window` | ⬜ NEW |
| Dry/cure/burp (§8) | ph-101, ph-201 | `cure≥1` / `cure≥3` ✅ | `cure_quality` | 🔨 cheap upgrade |

**Master Grower capstone (`ms-master-grower`, `curriculum.yaml:286`)** requires all six 300/200-level
craft courses (cult-301, gen-301, nut-201, ipm-201, chem-201, ph-201) — i.e. it already demands the
player demonstrate the *full* craft stack: a high-quality trained/dialed harvest (cult-301), a
stabilized line (gen-301), clean hydro feeding (nut-201), an IPM-survived crop (ipm-201), an analyzed
chemotype (chem-201), and a proper cure (ph-201). The capstone needs **no new check** to be coherent;
the new checks above only make the *individual* craft proofs more honest.

---

## 10. Sources
**Repo (grounding):** `docs/memory/design/06-university.md`, `…/03-grower-skills.md`,
`…/01-simulation-horticulture.md`; `src/growpodempire/data/curriculum.yaml`;
`src/growpodempire/services/university_service.py` (practical checks `:299-344`);
`knowledge/grow-tent-rules.md`, `knowledge/environment-rules.md`, `knowledge/macro-bud-rules.md`,
`knowledge/botanical-bible.md`; `docs/research/2026-06-08-cannabis-education-curriculum.md`;
`CLAUDE.md` (invariants); `simulation/horticulture.py` (VPD/DLI, cited via `01-…`).

**Real-world craft (standard cultivation literature, model-knowledge — no live fetch this session):**
Cervantes, *The Cannabis Encyclopedia*; Rosenthal, *Marijuana Grower's Handbook*; Penn State PLANT 240
*Fundamentals of Cannabis* (training/IPM/post-harvest modules); university IPM extension material
(scouting + action-threshold + control-hierarchy framework); commercial VPD/DLI horticulture practice
(VPD charts; DLI targets by stage). Trichome-maturity harvest reading and jar-cure/burping protocols
are standard community + extension craft. **Tag:** these are well-established consensus techniques, not
novel claims; specific numeric targets (PPFD/DLI/VPD ranges) are tuned to the repo's live bands above
and should be reconciled with `balance.yaml` + UNI-A02 before any are written into lecture copy.
