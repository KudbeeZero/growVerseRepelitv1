# Stage PNG Generation

> Canonical rendered stills for every launch strain × growth stage (PR #29). These
> PNGs are the art-direction source of truth — encyclopedia art, dashboard
> previews, marketing shots, NFT metadata references, onboarding assets. This is an
> **export/generation system only**: no gameplay/renderer changes. See
> `procedural-generation.md` and `strain-dna.md`.

## What it produces
**7 launch strains × 5 growth stages = 35 PNGs**, written to
`web/public/strains/canonical/<strain-slug>-<stage>.png`.

- **Strains:** `g13`, `purple-diddy-punch`, `animal-mints`, `white-rhino`,
  `white-fire-og`, `gelato`, `wedding-cake`.
- **Stages:** `seedling`, `vegetative`, `early-flower`, `late-flower`,
  `harvest-ready`.
- **Naming:** `<strain-slug>-<stage>.png` (e.g. `g13-seedling.png`).

## How it works
The existing Canvas-2D chamber renderer (`web/src/components/viz/GrowChamber.tsx`)
is reused unchanged. The pipeline:

1. **Canonical config** — `web/src/lib/chamber/canonicalStages.ts` holds the launch
   strains' DNA (`indicaRatio`, `floweringTime`), the 5 stages' canonical grow-day
   anchors, neutral environment defaults, and `resolveChamberProps(strain, stage)`
   which composes the pure helpers (`morphologyFor`, `silhouetteFor`,
   `budColorForStrain`, `budDnaFor`, `applyEnvironmentToBudDNA`, `stageForDay`,
   `previewDev`) into the full GrowChamber prop bundle. This is the SAME path the
   live chamber page's growth-preview scrubber uses — a still equals what a player
   sees scrubbing that strain's timeline.
2. **Export route** — `web/src/app/export/chamber/page.tsx` renders one
   `GrowChamber` still at a fixed 768×1024 wrapper from `?strain=&stage=` params.
   No API/auth. Sets `window.__chamberReady` once painted.
3. **Generator** — `web/scripts/export-stage-pngs.mjs` drives headless Chromium
   (Playwright) to each cell URL, waits for `__chamberReady`, reads the canvas via
   `toDataURL`, and writes the PNG.

## Export process
```bash
cd web
npm i -D playwright && npx playwright install chromium   # one-time
npm run export:stages            # boots `next dev`, writes 35 PNGs, exits
# or, against a running server:
BASE_URL=http://localhost:3000 npm run export:stages
```

## Camera / framing rules
- One **fixed canvas size (768×1024 portrait)** for all 35 → identical framing,
  camera, lighting and pod position for clean side-by-side comparison.
- View is `chamber` (the pod/chamber shell is the standardized background).
- Plant centred; full silhouette in frame; no macro close-ups. If a stage clips,
  adjust the wrapper size in the export route — the only camera knob (no renderer
  change).

## Stage targets
- **Seedling** (day 12): tiny, no buds. **Vegetative** (day 35): leaf architecture,
  no buds. **Early Flower** (≈+18% of flowering): small flower sites. **Late
  Flower** (≈+78%): major flower masses. **Harvest Ready** (end of flowering):
  maximum expression, strongest strain identity.

## Determinism guarantee
Geometry is fully deterministic (seeded `mulberry32` via `seedForPlant`). The
harness pins everything that affects pixels: fixed canvas size, fixed
`deviceScaleFactor` (×2 → 1536×2048 output), `reducedMotion:'reduce'` (GrowChamber
then paints a single static `draw(0)` — no physics/dust), neutral environment, and
chamber view. **Within the same Chromium build, regeneration reproduces the
committed PNGs.** Byte-identical output across different Chromium
versions/platforms is *not* promised (Canvas-2D anti-aliasing varies) — the
committed PNGs are the canonical artifacts.

## Phenotype-foundation compatibility
`resolveChamberProps` is the single seam where a future `ResolvedPhenotype` (PR #27,
parked) would plug in. It returns a plain resolved bundle, so swapping the internals
later needs no change to the export route or generator.
