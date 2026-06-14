# UNI-A02 — GrowPod University: Cannabis Science
**Directive ID:** UNI-001 · **Lead Agent:** UNI-A00 · **Worker Agent:** UNI-A02
**Asked:** Build the teachable cannabis-science knowledge base for GrowPod University courses, mapped to what the sim actually models.
**Done:** A module-organized science KB (botany → physiology → grow cycle → environment → nutrients → chemistry → genetics → analytics), each topic mapped to concrete sim variables/files and tagged sim-accurate (✅), partial (🔨), or teach-ahead (⬜).
**Risks:** Some real science is deeper than the engine models (NPK, photosynthesis, photoperiod trigger) — lectures must flag "teach-ahead" so the AI tutor doesn't promise mechanics the game lacks. THC/VPD numbers are vendor/lore-tier; cite confidence.
**Needs You:** nothing (research only). One open call for UNI-A00: whether teach-ahead content ships now or waits for sim Phase B.
**Next:** Hand to UNI-A01 (curriculum sequencing) and UNI-A09 (AI tutor grounding). Cross-deps flagged inline and in the summary.

---

## How to read this document

This is the **content backbone** for university lectures: the real cannabis science, organized by
course module so UNI-A01 can sequence it and UNI-A09 can ground the AI Professor in it. For **every**
topic, two things are made explicit:

1. **Sim mapping** — the exact engine variable / file / `balance.yaml` key the topic corresponds to,
   so a lecture about (say) VPD teaches the same number the player's plant actually reacts to.
2. **Fidelity tag** — how close the science is to the current engine:
   - **✅ sim-accurate** — the engine models this; teach it as a live game mechanic.
   - **🔨 partial** — the engine models a simplified proxy; teach the science, note the simplification.
   - **⬜ teach-ahead** — real science the sim does **not** yet model; teach as horticultural theory,
     flag "not yet a live mechanic" (lines up with the Phase B/C roadmap in `01-simulation-horticulture.md`).

**Honesty rule (inherited from the strain-genetics research):** numbers below carry confidence tags
where the literature is thin. PPFD/light→yield is **High** confidence; VPD/RH breakpoints are
**Low–Med** (vendor charts); THC label values are **inflation-biased**. Sources:
`docs/research/2026-06-08-cannabis-strain-genetics-and-cultivation.md`,
`docs/research/2026-06-08-cannabis-education-curriculum.md`.

**Course key legend** (from `src/growpodempire/data/curriculum.yaml`): `cult-101/201/301`,
`gen-101/201/301`, `nut-101/201`, `ipm-101/201`, `chem-101/201`, `ph-101/201`.

---

## MODULE 1 — Cannabis Botany & The Plant (course: `cult-101`)

**Real science**
- *Cannabis sativa* L. is the single botanical species for all drug cannabis (McPartland & Guy 2017,
  **High**). The vernacular "indica/sativa" axis is **botanically inverted** and a poor predictor of
  effect/chemistry — it is a morphology/lore axis (broad-leaf ↔ narrow-leaf), not a chemotype.
- **Plant organs:** roots (uptake/anchorage), stem/internodes (structure, R:FR-driven stretch),
  fan leaves (photosynthesis), nodes, and the inflorescence (the harvested flower). Cannabis is
  **dioecious** (separate male/female plants); growers cultivate unpollinated females for seedless
  "sinsemilla" flower.
- **Flower anatomy:** calyxes/bracts (the teardrop, ridge-lined building block), pistils/stigmas
  (white→cream→orange→amber with ripeness), sugar leaves, and **trichomes** (resin glands:
  clear→cloudy→amber maturity, the cannabinoid/terpene factory).

**Sim mapping**
| Topic | Sim variable / file | Tag |
|-------|--------------------|-----|
| Whole-plant morphology from indica_ratio | `web/src/lib/chamber/morphology.ts`; `indica_ratio` trait (`genetics/traits.py`) | ✅ |
| Calyx / pistil / trichome / sugar-leaf anatomy (rendered) | `knowledge/plant-anatomy-reference.md`; `GrowChamber.tsx` `calyxPath()`/`drawMacro()` | ✅ (visual) |
| Trichome density as a strain trait + UV response | `trichomeDensity`, `knowledge/environment-rules.md` (light > ~600 → +density) | 🔨 (client visual; server has no trichome state) |
| Pistil/trichome maturity → harvest readiness | growth_stage `harvest`; `simulation/engine.py` `_STAGE_ORDER` | 🔨 (stage gate, no per-trichome ripeness) |
| Dioecy / sex / pollination | — | ⬜ teach-ahead (no sex/pollination model; breeding is abstract `cross()`) |

**Teaching note:** teach indica/sativa as morphology + lore only; explicitly correct the "indica =
couch-lock" folk claim (it has no genetic signature — Schwabe 2019, **High**). The renderer's
"identify a strain by silhouette/frost/coloration alone" goal (`knowledge/botanical-bible.md`) is a
great visual lab for anatomy lectures.

---

## MODULE 2 — Plant Physiology & The Grow Cycle (courses: `cult-101`, `cult-301`)

**Real science**
- **Lifecycle stages:** germination → seedling → vegetative (18+ h light typical) → flowering
  (triggered by 12/12 photoperiod in photoperiod genetics; autoflowers bypass via ruderalis genes) →
  ripening → harvest. Every canonical strain is originally **photoperiod**; "auto" lines are
  ruderalis crosses with reduced yield/potency (cultivation research, **High**).
- **Photosynthesis** converts light + CO₂ + water into the sugars that build biomass; this is the
  *engine of growth*, and yield should integrate from accumulated biomass, not a flat timer.
- **Transpiration** (water loss through stomata) is driven by VPD; it pulls water + nutrients up and
  couples humidity to both water use and disease risk.
- **Flowering time tracks sativa-ness:** indica/Afghan 6.5–9 wk · balanced hybrids 8–10 wk · sativa
  landraces 11–20 wk (Thai up to 20).

**Sim mapping**
| Topic | Sim variable / file | Tag |
|-------|--------------------|-----|
| Stage progression seed→harvest | `simulation/engine.py` `_STAGE_ORDER` (l.23), health-modulated durations | ✅ |
| Flowering length is genetic | `flowering_time` trait → engine consumes it (`01-simulation-horticulture.md`) | ✅ |
| Growth = cm/hr by stage × health | `engine.py:61`, `balance.yaml` `simulation.growth.*` (e.g. `seedling_cm_per_day`) | 🔨 (flat-rate, not photosynthesis-derived) |
| Photoperiod **triggers** flowering | — | ⬜ teach-ahead (flowering is a fixed genetic duration; photoperiod assumed, `balance.yaml` `photoperiod_hours: 18`) |
| Photosynthesis / biomass / leaf area | — | ⬜ teach-ahead (Process model #1, Phase B in `01-simulation-horticulture.md`) |
| Transpiration model | — | 🔨 (VPD is derived but does not yet drive water draw; "Next within Phase A") |
| Autoflower vs photoperiod | — | ⬜ teach-ahead (no ruderalis/auto genetics) |

**Teaching note:** this module is the cleanest example of teach-ahead. Lectures should teach
photosynthesis and the photoperiod trigger as real horticulture while saying "in the current pod,
flowering is timed by genetics, not your light schedule." This sets up `cult-301`'s harvest-window
practical (`harvest_quality >= 85`).

---

## MODULE 3 — Environmental Science: Light, VPD, Temp, Humidity, CO₂ (course: `cult-201`)

This is the highest-fidelity module — the engine landed VPD + DLI in Phase A
(`simulation/horticulture.py`).

**Real science + evidence**
- **Light is the best-grounded yield lever.** Flower yield rises ~**linearly with canopy PPFD to
  ~1500–1800 µmol·m⁻²·s⁻¹**, well above leaf-level saturation (~1500) because the *canopy* keeps
  responding (Eaves 2020; Rodriguez-Morrison 2021/2022, **High**).
- **PPFD** = instantaneous photosynthetic light; **DLI** = daily dose (PPFD × photoperiod, mol·m⁻²·d⁻¹);
  veg DLI ~20–40, flower ~35–50 (USU/Bugbee, **Med–High**).
- **VPD** (vapour-pressure deficit, kPa) is the real transpiration driver: clones 0.4–0.8 · veg/early
  flower 0.8–1.2 · mid/late flower 1.2–1.6 kPa. **Caveat:** these breakpoints are **vendor charts
  only** (Aroya/Pulse) — physiology sound, numbers unvalidated (**Low–Med**).
- **Temperature:** photosynthetic optimum **25–30 °C** (Chandra 2008/2011, leaf-level, **High**);
  cooler 20–24 °C late flower for quality/mold.
- **Humidity / RH:** seedling 65–80 · veg 55–70 · early flower 50–60 · **late flower <50%** for
  botrytis suppression (the best-justified RH claim, **Low–Med**).
- **CO₂:** ambient ~400 ppm; enrichment to ~1000–1200 ppm lifts the light-response ceiling (~+40%
  yield, ~95% of gain by 1200 ppm) (Chandra + USU, **Med–High**).

**Sim mapping**
| Topic | Sim variable / file | Tag |
|-------|--------------------|-----|
| PPFD as live input | stored `light_intensity` (0–1000) read by tick; `balance.yaml` `simulation.light.optimal_ppfd: [300, 900]` | ✅ (band saps health; not yet a yield input) |
| DLI readout | derived `horticulture.dli` (PPFD × `photoperiod_hours: 18`) | ✅ exposed; ⬜ not yet a yield input |
| VPD | derived from temp+RH+leaf-offset; `balance.yaml` `simulation.vpd.optimal: [0.8, 1.6]`; `vpd_stress_weight: 0.5` | ✅ (feeds health, exposed on `/state`) |
| Temperature band | `engine.py:104`, `balance.yaml` `[20, 28]°C` | ✅ |
| Humidity band + disease/pest triggers | `engine.py:109`, `[40, 60]%`; pests ≥62, mildew ≥64 | ✅ |
| Light→yield scaling to 1500–1800 PPFD | — | ⬜ teach-ahead (Phase B; "the strongest future lever") |
| Spectrum (blue/red/far-red/UV) | — | ⬜ teach-ahead (morphology/R:FR/UV-trichome; Phase C) |
| CO₂ as photosynthesis co-substrate | `balance.yaml` `co2_level: [300, 2000]`, `co2_enrichment` | 🔨 stored + clamped, **inert** (no effect yet) |
| Weather perturbs pod temp/RH | `services/weather_service.py`, `balance.yaml:160` | ✅ |

**Teaching note:** `cult-201`'s lecture topic already names VPD + DLI as "the levers commercial
growers actually dial" — this module is the science behind that course. Teach VPD/RH with the
**confidence caveat** (vendor-tier) so the AI tutor doesn't overclaim precision. The engine bands
(`[0.8, 1.6]` kPa VPD, `[300, 900]` PPFD) are *consistent with* but narrower than the real optima —
worth noting that the game band is conservative.

---

## MODULE 4 — Nutrient & Soil Science (courses: `nut-101`, `nut-201`)

**Real science**
- **Macronutrients** N-P-K (nitrogen=vegetative growth, phosphorus=root/flower, potassium=overall
  vigor/flower) + **secondary** Ca, Mg, S + **micros** (Fe, Mn, Zn, B…). Each deficiency/toxicity has
  a leaf-symptom signature growers diagnose visually.
- **EC / PPM** (total dissolved salts) is the master nutrient-strength dial: too high → salt
  burn/lockout; too low → deficiency.
- **Root-zone pH gates ion availability** — the same nutrient solution is unavailable at the wrong pH
  (lockout). Soil ~6.0–7.0; hydro/coco ~5.5–6.5.
- **Soil food web** (soil) vs **soilless/hydro** nutrient-solution formulation (coco, DWC/RDWC).
  Wet/dry-back cycles matter in substrate moisture.

**Sim mapping**
| Topic | Sim variable / file | Tag |
|-------|--------------------|-----|
| "Feeding the plant" (single nutrient scalar) | `nutrient_level` decays 1.0/hr; stress outside `[35, 82]` (`engine.py:137`, `balance.yaml:97`) | 🔨 (one scalar — no NPK, no per-ion) |
| Root-zone pH | pH stress outside `[6.0, 7.0]`, weighted ×10 (`engine.py:110`) | 🔨 (saps health; does **not** yet gate uptake/lockout) |
| EC / PPM as strength dial | — | ⬜ teach-ahead (Process model #3, Phase B) |
| Per-ion N-P-K-Ca-Mg + deficiency symptoms | — | ⬜ teach-ahead (the visual-diagnosis content has no sim state yet) |
| Hydro / soilless mediums | research yield buffs only (`balance.yaml:213` hydroponics/aeroponics) | 🔨 (buff, not a medium model) |
| Substrate moisture / wet-dry-back | proxied by `water_level` (decays 1.5/hr, band `[40, 78]`) | 🔨 (scalar proxy) |

**Teaching note:** the biggest teach-ahead gap. `nut-101`/`nut-201` lectures already promise
"diagnose deficiency by leaf signs" and "EC as the strength dial, pH as the availability gate" — the
**science is rich, the sim is one scalar**. Recommend the AI tutor frame these as "what a real grower
watches; in the current pod, nutrients are a single health resource and pH currently affects health
directly rather than gating specific ions." This is the clearest place where UNI-A01 should mark a
lecture "teach-ahead, sim Phase B." Cross-dep: flag to whichever agent owns sim deepening.

---

## MODULE 5 — Cannabinoid & Terpene Biosynthesis, Chemotypes (course: `chem-101`)

**Real science**
- **Cannabinoid biosynthesis:** CBGA ("the mother cannabinoid") → THCA / CBDA / CBCA via synthase
  enzymes; **decarboxylation** (heat/time) converts THCA→THC, CBDA→CBD. **CBN is a degradation
  marker** (aging/oxidation of THC), not a genetic trait.
- **Chemotype (THC:CBD ratio)** is genetically controlled (the B locus, THCA-synthase vs
  CBDA-synthase). ~96.5% of US commercial flower is **THC-dominant** (CBD <1%); CBG elevated in the
  terpinolene group; THCV is an African/SE-Asian landrace trait, largely absent here.
- **Terpenes** (myrcene, limonene, caryophyllene, pinene, terpinolene, linalool, humulene…) are
  synthesized in trichomes and drive aroma; they're volatile and shift with grow/harvest/cure.
- **Three peer-reviewed terpene super-clusters** collapse hundreds of names (Reimann-Philipp 2020;
  Smith/Vergara 2022, **High**): **myrcene-dominant** (~59%, "OG/indica" default),
  **terpinolene-dominant** (rarest, *most diagnostic* — when present the name is trustworthy), and
  **limonene/caryophyllene** (dessert/gas). Genotype and chemotype are roughly **independent** — the
  12 genetic clades did not map to the 3 chemotypes.

**Sim mapping**
| Topic | Sim variable / file | Tag |
|-------|--------------------|-----|
| THC / CBD as genome traits | `thc`, `cbd` traits (`genetics/traits.py`) | ✅ (genome value; expressed at harvest) |
| 4 terpenes as genome traits | `myrcene, limonene, caryophyllene, pinene` (`genetics/traits.py`) | ✅ |
| Terpene cluster framing | `strain_knowledge.yaml`; research recommends a `terpene_cluster` field | 🔨 (clusters documented in research; 4-terpene vector, no terpinolene trait yet) |
| Cannabinoid/terpene **accumulation over flowering** | terpenes expressed *at harvest* (`genetics/traits.py`) | 🔨 (assigned at harvest, not built along a curve — Process model #6) |
| Decarboxylation / CBGA pathway / CBN aging | — | ⬜ teach-ahead (no biosynthesis-over-time or decarb model) |
| THCV / CBG / minor cannabinoids | — | ⬜ teach-ahead (only thc/cbd in genome) |

**Teaching note:** `chem-101` already lists "the three terpene chemotype clusters" as an objective —
this module is its source. Flag that the engine has a **4-terpene vector** but the research's
diagnostic **terpinolene** cluster isn't a separate trait; the AI tutor should teach the 3-cluster
model as science while mapping game terpenes (myrcene/limonene/caryophyllene/pinene) onto it. **Teach
that *when you chop matters*** even though the sim assigns terpenes at harvest — it primes Phase B.

---

## MODULE 6 — Genetics & Inheritance (courses: `gen-101`, `gen-201`, `gen-301`)

**Real science**
- **Genotype vs phenotype; G×E:** the genome sets the ceiling, the grow decides how close you get
  ("the same genome grown differently expresses differently").
- **Mendelian inheritance:** dominant/recessive/codominant alleles, Punnett-square prediction for
  single-gene traits.
- **Polygenic / quantitative traits:** most real traits (THC, yield, flowering time) are the sum of
  many small-effect loci → bell-curve segregation, not clean 3:1 ratios.
- **Selection & breeding schemes:** mass selection, recurrent selection, hybridization (F1 vigor),
  backcrossing; defining a breeding objective.
- **Stabilization:** inbreeding/selfing across generations fixes a line so it breeds true (narrow
  phenotype range); pheno-hunting selects standout individuals.
- **The name-reliability meta-finding:** strain names are weak genetic identifiers (Sawler 2015 —
  35% of same-name pairs more similar to *differently*-named samples; Schwabe 2019 — 90% of strains
  had a genetic outlier, both **High**). **The genome + verifiable lineage is the authoritative
  identity, not the name.**

**Sim mapping**
| Topic | Sim variable / file | Tag |
|-------|--------------------|-----|
| Genome = trait dict with dominance | `genetics/traits.py` (14 traits, dominance ∈ dominant/recessive/codominant) | ✅ |
| Crossbreeding (dominance-weighted blend + segregation noise) | `cross()` (`genetics/breeding.py`), seeded/deterministic | ✅ |
| Mendelian dominance re-inheritance | `cross()` re-inherits dominance probabilistically | ✅ |
| Stability / stabilization (selfing) | `stabilize_increment: 0.15` (`balance.yaml:43`), `services/game_service.py` | ✅ |
| Stability narrows expressed ranges | `derive_strain_fields()` | ✅ |
| Rarity climb from extreme + stable traits | `assign_rarity()` | ✅ |
| Verifiable lineage / pedigree | `verify_lineage` (`game_service.py`), `BreedingEvent.rng_seed` | ✅ |
| Polygenic (many loci per trait) | — | ⬜ teach-ahead (planned Move #1, `02-genetics.md`; today 1 value/trait) |
| Mutation / novel alleles | — | ⬜ teach-ahead (Move #2) |
| Epistasis (gene × gene) | — | ⬜ teach-ahead (Move #3) |
| G×E (genome expresses differently by grow) | partial: only `flowering_time`, `disease_resistance`, `pest_resistance` reach the engine | 🔨 teach-ahead (the bridge `vigor/difficulty/indica_ratio → sim` is planned) |

**Teaching note:** this is the **most sim-accurate module** — `gen-101/201/301` practicals
(`breed`, `stabilize`) map directly to live mechanics. Teach Mendelian single-gene inheritance as the
foundation, then teach polygenic/epistasis/G×E as where breeding mastery is going (great for the
`gen-301` pheno-hunting course). Always teach the **name-unreliability** finding — it's the
intellectual core of the genetics department and justifies the lineage system.

---

## MODULE 7 — Analytics: CoA Reading, GC/LC, Lab Trust (course: `chem-201`)

**Real science**
- **Chromatography:** **GC** (gas) vs **HPLC/LC** (liquid) separate and quantify cannabinoids and
  terpenes; LC reads acidic forms (THCA/CBDA) without decarbing, GC typically decarbs in the injector.
- **Reading a Certificate of Analysis (CoA):** total THC = THC + (THCA × 0.877), cannabinoid panel,
  terpene panel, plus safety (pesticides, heavy metals, microbials, residual solvents, **water
  activity / moisture**).
- **Trust problems (true-to-life):** dispensary **THC labels are inflated ~15–35%** (Schwabe 2023:
  measured mean 14.98% vs labeled 20.3–24.1%; ~57% of samples >30% below label, **High**). **"Lab
  shopping":** THC varies *systematically by testing facility* (Jikomes & Zoorob 2018, n=175,136,
  **High**). There's a reported-THC discontinuity right at the 20% marketing threshold.

**Sim mapping**
| Topic | Sim variable / file | Tag |
|-------|--------------------|-----|
| Cannabinoid/terpene quantities to "assay" | `thc`/`cbd`/terpene genome traits surfaced at harvest | 🔨 (values exist; no assay/CoA artifact) |
| Water activity / moisture on a CoA | curing model proxies moisture | 🔨 (`simulation/curing.py`; no water-activity number) |
| GC vs LC method, calibration | — | ⬜ teach-ahead (no analytics instrument model) |
| Label inflation + lab-shopping mechanic | — | ⬜ teach-ahead (research recommends it as a trust/quality sink; not built) |
| CoA document / safety panel | — | ⬜ teach-ahead |

**Teaching note:** `chem-201`'s lecture already promises "reading a certificate of analysis (incl.
label inflation)" and a practical of `harvest_quality >= 80`. This is **rich teach-ahead**: the
science (GC/LC, CoA structure, label inflation) is fully teachable from the strain-genetics research,
but there is **no in-game CoA or assay artifact yet**. Strong candidate for a future feature — a CoA
view + label-inflation/lab-trust subsystem is explicitly recommended in the research action items.
**Cross-dep:** if UNI-A0x is scoping new game features, the CoA/lab-trust mechanic is the most
"shovel-ready" idea this module surfaces.

---

## MODULE 8 — Post-Harvest Science (courses: `ph-101`, `ph-201`)

**Real science**
- **Harvest timing** by trichome maturity (clear→cloudy→amber) and pistil browning sets the
  cannabinoid/terpene peak.
- **Controlled drying** (slow, ~60 °F / 60% RH, ~7–14 days) preserves terpenes and prevents
  chlorophyll/"hay" off-notes; over-drying is irreversible.
- **The cure:** sealed, burped containers over weeks let enzymes break down chlorophyll/sugars and
  redistribute moisture — develops aroma and smoothness; stabilizes cannabinoids.
- **Storage / water activity:** hold ~0.55–0.65 aw / ~58–62% RH; too wet → mold (botrytis/aspergillus),
  too dry → harsh + terpene loss. Light/heat/oxygen degrade THC→CBN over time.

**Sim mapping**
| Topic | Sim variable / file | Tag |
|-------|--------------------|-----|
| Cure quality bonus (sqrt curve) | `simulation/curing.py`, `balance.yaml` `curing.optimal_hours: 72` | ✅ |
| Over-dry penalty | `over_dry_grace_hours: 48` (`balance.yaml:72`) | ✅ |
| Harvest-timing window | growth_stage `harvest`; `cult-301` harvest-quality practical | 🔨 (stage gate; no trichome-maturity window) |
| Moisture / water-activity / mold in storage | curing proxies moisture | 🔨 (no explicit aw; mold is a grow-stage humidity mechanic) |
| THC→CBN degradation over storage | — | ⬜ teach-ahead (no aging/degradation of stored product) |

**Teaching note:** `ph-101` (`cure` practical, `cure_bonus_pct` perk) and `ph-201` map cleanly to the
curing model — teach the cure as a **live** mechanic. Teach water-activity/CBN-aging as teach-ahead
science. Note the cure curve is a **72-hour** game abstraction of a real multi-week process — be
honest about the time-compression.

---

## Cross-module synthesis tables (for UNI-A01 sequencing + UNI-A09 grounding)

### Fidelity dashboard — what to teach as live vs theory
| Module | Sim-accurate ✅ | Partial 🔨 | Teach-ahead ⬜ |
|--------|----------------|-----------|---------------|
| 1 Botany | morphology, anatomy (visual) | trichome density, ripeness | sex/pollination |
| 2 Physiology/cycle | stages, genetic flowering length | growth rate | photoperiod trigger, photosynthesis, autoflower |
| 3 Environment | PPFD/VPD/temp/RH bands, DLI readout, weather | CO₂ (inert) | light→yield, spectrum |
| 4 Nutrients | — | nutrient scalar, pH (health-only), water | NPK, EC, lockout, deficiency symptoms |
| 5 Chemistry | thc/cbd/terpene traits | clusters, harvest-time terpenes | decarb/CBGA, CBN, minors |
| 6 Genetics | cross, dominance, stability, lineage, rarity | G×E (3 genes reach sim) | polygenic, mutation, epistasis |
| 7 Analytics | — | trait values exist | GC/LC, CoA, label-inflation/lab-trust |
| 8 Post-harvest | cure curve, over-dry | harvest window, moisture | water activity, CBN aging |

### Confidence tags for the AI tutor (don't overclaim)
- **High:** light→yield linearity to 1500–1800 PPFD; name-unreliability (Sawler/Schwabe); 3 terpene
  clusters; temperature photosynthetic optimum 25–30 °C; THC label inflation.
- **Med:** DLI ranges; CO₂ enrichment magnitude; lineage of breeder hybrids.
- **Low–Med:** VPD/RH stage breakpoints (vendor charts); disputed clone-era lineages (OG Kush,
  Chemdawg, Sour Diesel, Bubba Kush, GG4 — teach as **lore, not fact**).

---

## Risks & honesty flags

- **Teach-ahead dominates Modules 4 and 7.** Nutrient science (NPK/EC/lockout) and analytics
  (GC/LC/CoA) are deep in the lecture topics but thin in the sim. If lectures present them as live
  mechanics, players will look for game controls that don't exist. **Mitigation:** the AI tutor must
  use the ⬜ tag to say "real grower knowledge; not yet a pod control."
- **Number precision.** VPD `[0.8, 1.6]` kPa and PPFD `[300, 900]` in `balance.yaml` are *narrower
  and more conservative* than the literature optima. Teach the science range, then the game band, and
  note the game is intentionally forgiving.
- **THC values are inflation-biased.** Never teach dispensary-label THC as truth; teach the ~−35%
  correction and the lab-trust problem.
- **Time compression.** Cure (72 game-hours) and flowering durations are abstractions of weeks-long
  real processes — be explicit so the science stays credible.

---

## Cross-agent dependencies noticed
- **UNI-A01 (curriculum):** every course in `curriculum.yaml` now has a sourced science backbone +
  fidelity tags here. The 8 modules map ~1:1 to the 6 departments (chemistry splits into Module 5
  biosynthesis + Module 7 analytics, matching `chem-101`/`chem-201`). Sequencing should respect the
  teach-ahead density (Modules 4 & 7 need the strongest "not-yet-live" framing).
- **UNI-A09 (AI tutor):** the fidelity dashboard + confidence tags are the guardrails so the Professor
  teaches real science without promising absent mechanics. Feed the ✅/🔨/⬜ tags directly into the
  lecturer system prompt (`ai/lecturer_claude.py`).
- **Sim-deepening owner (whoever owns Phase B):** Modules 4 (NPK/EC/lockout), 2 (photosynthesis/
  photoperiod), 5 (metabolite accumulation), 7 (CoA/lab-trust) name the exact gaps where curriculum
  is ahead of the engine — a ready-made priority list aligned with `01-simulation-horticulture.md`
  Phase B and the strain-genetics research action items.

## Sources / repo paths
- Sim: `src/growpodempire/simulation/{engine.py,horticulture.py,curing.py,reactions.py}`,
  `src/growpodempire/genetics/{traits.py,breeding.py}`, `src/growpodempire/data/balance.yaml`,
  `services/{game_service.py,weather_service.py}`.
- Game science model: `knowledge/{botanical-bible.md,plant-anatomy-reference.md,genetics-system.md,environment-rules.md}`.
- Design: `docs/memory/design/{01-simulation-horticulture.md,02-genetics.md,06-university.md}`.
- Research (peer-reviewed citations within): `docs/research/2026-06-08-cannabis-strain-genetics-and-cultivation.md`,
  `docs/research/2026-06-08-cannabis-education-curriculum.md`.
- Curriculum data: `src/growpodempire/data/curriculum.yaml`.
