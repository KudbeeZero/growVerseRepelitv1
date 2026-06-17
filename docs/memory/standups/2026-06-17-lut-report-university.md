# LUT Round-Table — 2026-06-17 — University Content Expansion

**Theme:** Lift the structure-only freeze on GrowPod University; activate built-but-dormant
infrastructure and add new progression paths. Three PRs, all merged to `main`.

## Shipped
- **PR #73 — specialist professors + on-chain diplomas.**
  - Wired the 5 dormant faculty personas (atlas/flora/verdant/mycelia/nova) to all 14 core courses
    via the existing `faculty` key — they were written yet referenced by nothing.
  - On-chain diplomas: earned degrees mint as Algorand ASA verifiable credentials, mirroring the
    strain/harvest NFT path. DB-authoritative, idempotent, mock-in-CI. `DegreeProgress.nft_*` +
    migration `e1a7c4d92b08`, `diploma_metadata`, `MintingService.mint_diploma`,
    `POST /players/<id>/degrees/<key>/mint` (gated by `chain`).
- **PR #76 — Lab QA + Pharmacology departments + Doctorate tier (structure-only).**
  - 2 departments (`labqa`, `pharma`), 6 courses, 5 degrees including a new `doctorate` tier
    (`phd-cannabis-science`, capstone requiring every track's terminal course).
  - 2 new faculty personas (`assay`, `remedy`).
  - Owner-specced; perk values reviewed before coding.

## Verification split
- **Agent-verified (CI/local):** `make test` 294 passed (84.66% cov), `make lint`, `make check-memory`
  all green on merged `main`. Faculty-guard + doctorate-integration tests added. Migration up/down/up
  checked on sqlite. Diploma mint proven against the mock chain.
- **Device/owner-verifiable (NOT yet done):** real Algorand TestNet diploma mint; real Claude lecture
  with the new personas; any player-visible UI (there is none yet — all backend/API).

## Invariants — verified, not assumed
- Only **degree** perks aggregate into gameplay (`degree_effects`); course `perks` are display-only.
- All perks use the canonical 9 keys in `research_service._EFFECT_KEYS`.
- `doctorate` is a free-text tier string — no enum / `claim_degree` / migration change.
- Achievements key off harvests/breeds/NFTs/balance — new degrees don't perturb them.

## Carried risk (new finding)
- **`tuition_discount_pct` is a dead perk.** The merged bizlaw degrees grant it, but it is not in
  `_EFFECT_KEYS`, so `degree_effects` silently drops it. Needs a separate ticket: add the key + an
  apply-site, or remap to an existing key. Not fixed here (out of scope).

## NEXT ACTION
**Frontend wiring** (owner-chosen): mint-diploma button on `/university/transcript`, faculty nameplate
on the course page, and the 2 new departments/degrees surfaced in the catalog UI — turning all the
merged backend into something a player can click.
