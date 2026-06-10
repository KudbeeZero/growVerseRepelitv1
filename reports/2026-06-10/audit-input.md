# Audit Input — Consolidated Findings

**Agents reporting:** 9  `alex`: ok (3) · `blake`: ok (7) · `casey`: ok (5) · `dana`: ok (6) · `evan`: ok (7) · `fiona`: ok (5) · `gabe`: ok (6) · `harper`: ok (5) · `ivy`: ok (3)
**Accepted (merged):** 47  |  **Rejected:** 0  |  **Disputed:** 0
**By severity:** Critical 2 · High 5 · Medium 21 · Low 19

## Master table
| ID | Sev | Disp | Cat | File | Title | Ev | Conf | Agents | Corrob |
|----|-----|------|-----|------|-------|----|------|--------|--------|
| F016 | critical |  | security | `src/growpodempire/config.py` | Disable dev guest login by default (GPE_DEV_LOGIN) — it leaks any account's API key by username | command | 10 | dana | 1 |
| F040 | critical |  | economic | `src/growpodempire/services/game_service.py` | Instant harvest exploit: buy->plant->harvest in the same hour yields full top-of-band weight (no grow time), net +923 per cycle | test | 9 | harper | 1 |
| F017 | high |  | security | `src/growpodempire/api/game_api.py` | Guest login endpoint is a username/account enumeration + key-disclosure oracle | trace | 9 | dana | 1 |
| F005 | high |  | economic | `src/growpodempire/services/settlement_service.py` | MAX_WITHDRAWAL_PER_DAY cap is bypassable for un-flushed withdrawals in one session | test | 8 | blake | 1 |
| F011 | high |  | test-gap | `src/growpodempire/services/settlement_service.py` | Settlement daily-withdrawal cap (treasury drain defense) is entirely untested | test | 8 | casey | 1 |
| F041 | high |  | economic | `src/growpodempire/db/models.py` | Pre-migration / never-ticked rows get full-vigor yield via the lifetime_vigor health fallback | test | 8 | harper | 1 |
| F042 | high |  | correctness | `src/growpodempire/services/game_service.py` | Dead plants can be harvested and sold for non-trivial weight (no is_alive gate) | test | 8 | harper | 1 |
| F009 | medium |  | test-gap | `tests/test_settlement.py` | No test exercises MAX_WITHDRAWAL_PER_DAY enforcement at all | command | 9 | blake | 1 |
| F035 | medium |  | docs | `README.md` | README says "16 founding strains" but the catalog now ships 47 | trace | 9 | gabe | 1 |
| F045 | medium |  | integration | `src/growpodempire/api/serialize.py` | plant_dict serializes lifetime_vigor but Plant TS interface omits it (serializer↔client drift) | command | 9 | ivy | 1 |
| F046 | medium |  | integration | `src/growpodempire/api/serialize.py` | strain_dict serializes `season` but Strain TS interface omits it (serializer↔client drift) | command | 9 | ivy | 1 |
| F001 | medium |  | ux | `web/src/components/plant/plantRenderer.ts` | Chamber canvas is fully inert under prefers-reduced-motion, but UI still tells users to swipe to brush | trace | 8 | alex | 1 |
| F008 | medium |  | integration | `src/growpodempire/chain/mock.py` | Mock and real providers diverge on transfer source — mock cannot surface the deposit duplication bug | trace | 8 | blake | 1 |
| F012 | medium |  | test-gap | `src/growpodempire/services/minting_service.py` | MintingService strain-ownership check ('only the breeder can mint') has no test | test | 8 | casey | 1 |
| F013 | medium |  | test-gap | `src/growpodempire/services/minting_service.py` | Mint chain-failure path (row -> FAILED, no asset id) is untested for both harvest and strain | test | 8 | casey | 1 |
| F018 | medium |  | test-gap | `src/growpodempire/services/settlement_service.py` | No test covers the 24h per-player withdrawal cap (treasury drain control) | command | 8 | dana | 1 |
| F022 | medium |  | ux | `web/src/components/ui/Toast.tsx` | Toast region is not a live region — error/success toasts are silent to screen readers (covers money/auth failures) | trace | 8 | evan | 1 |
| F023 | medium |  | ux | `web/src/components/ui/Button.tsx` | No visible keyboard focus indicator on primary controls (Button, Tabs, onboarding tabs) — app-wide | command | 8 | evan | 1 |
| F029 | medium |  | performance | `src/growpodempire/simulation/engine.py` | Compute-on-read catch-up is O(hours) single-threaded; ~410ms per idle-year per plant on one read | command | 8 | fiona | 1 |
| F034 | medium |  | compliance | `README.md` | README claims "MIT Licensed" (badge + footer) but no LICENSE file exists in the repo | command | 8 | gabe | 1 |
| F004 | medium |  | economic | `src/growpodempire/services/settlement_service.py` | deposit() never reclaims the player's on-chain ASA — withdraw+deposit duplicates real tokens | doc | 7 | blake | 1 |
| F006 | medium |  | correctness | `src/growpodempire/services/minting_service.py` | NFT mint is not idempotent across a chain-success / DB-rollback boundary — duplicate on-chain assets | trace | 7 | blake | 1 |
| F007 | medium |  | security | `src/growpodempire/db/models.py` | Linked Algorand address is not unique and not validated — multiple players can share an address | trace | 7 | blake | 1 |
| F019 | medium |  | security | `src/growpodempire/services/settlement_service.py` | Withdrawal daily-cap check is TOCTOU-racey under concurrent requests | trace | 7 | dana | 1 |
| F020 | medium |  | security | `src/growpodempire/api/flask_api.py` | Bump vulnerable web dependencies: Flask-Cors 4.0.0 (and aging Flask/Werkzeug) | command | 7 | dana | 1 |
| F030 | medium |  | performance | `src/growpodempire/simulation/engine.py` | max_catchup_hours cap defers, not discards: a multi-year-idle plant needs one ~400ms read per capped year to fully catch up | command | 7 | fiona | 1 |
| F031 | medium |  | performance | `web/src/components/plant/plantRenderer.ts` | One rAF loop + ResizeObserver per PlantCanvas; dashboard mounts N independent renderers with no visibility gating | command | 7 | fiona | 1 |
| F043 | medium |  | correctness | `src/growpodempire/services/game_service.py` | Breed accepts any strain ids: no ownership/discovery gate and no self-cross guard | trace | 6 | harper | 1 |
| F037 | low |  | docs | `docs/memory/MAP.md` | Design Codex MAP.md says KB covers "all 22 catalog strains" — now 47 | trace | 9 | gabe | 1 |
| F010 | low |  | correctness | `src/growpodempire/services/settlement_service.py` | deposit() trusts DB asa_balance counter as 'on-chain ASA balance' but never reads the chain | command | 8 | blake | 1 |
| F036 | low |  | docs | `README.md` | README test badge says "139 green" but the suite has 186 tests | command | 8 | gabe | 1 |
| F038 | low |  | docs | `docs/manual/strain-codex.md` | User-facing Strain Codex manual says "all 16 founding strains" — catalog is 47 | trace | 8 | gabe | 1 |
| F047 | low |  | test-gap | `tests/test_openapi.py` | No automated guard for serializer↔TS wire-format parity (drift is silently allowed) | command | 8 | ivy | 1 |
| F002 | low |  | correctness | `web/src/components/plant/plantRenderer.ts` | Renderer rebuild key omits wall-clock grow day, so a live plant never ripens between stage/health changes | trace | 7 | alex | 1 |
| F014 | low |  | test-gap | `src/growpodempire/services/minting_service.py` | metadata_for() ARC-3 metadata helper (harvest/strain/unknown/missing) had no coverage | test | 7 | casey | 1 |
| F024 | low |  | ux | `web/src/components/ui/Field.tsx` | Text inputs strip the focus outline without an equivalent (focus:outline-none, border-only replacement) | trace | 7 | evan | 1 |
| F025 | low |  | ux | `web/src/components/plant/PlantCanvas.tsx` | PlantCanvas aria-label is non-descriptive ('<stage> plant') — omits health, strain, and stress state the visual encodes | trace | 7 | evan | 1 |
| F026 | low |  | ux | `web/src/components/ui/Gauge.tsx` | Gauge SVG (VPD/scientist readouts) has no accessible name or text alternative — value invisible to AT | trace | 7 | evan | 1 |
| F027 | low |  | ux | `web/src/components/onboarding/OnboardingPanel.tsx` | Onboarding tab buttons lack tab semantics and type=button (custom TabButton, not the shared Tabs) | trace | 7 | evan | 1 |
| F039 | low |  | docs | `docs/manual/game-manual.md` | lifetime_vigor / care-over-time yield mechanic is undocumented in the player game-manual | trace | 7 | gabe | 1 |
| F044 | low |  | test-gap | `src/growpodempire/simulation/engine.py` | compute-on-read cadence-invariance is correct but untested at the suite level | test | 7 | harper | 1 |
| F003 | low |  | correctness | `web/src/components/plant/PlantCanvas.tsx` | PlantCanvas writes propsRef.current during render (render-phase side effect) | doc | 6 | alex | 1 |
| F021 | low |  | security | `src/growpodempire/api/auth.py` | require_player distinguishes 404 (no such player) from 403 (bad key), enabling player-id enumeration | trace | 6 | dana | 1 |
| F028 | low |  | ux | `web/src/components/ui/Tabs.tsx` | Shared Tabs widget incomplete: no tabpanel association, no arrow-key roving focus, buttons lack type | trace | 6 | evan | 1 |
| F032 | low |  | performance | `src/growpodempire/services/simulation_service.py` | set_environment syncs every plant in a pod in a Python loop; cost stacks with catch-up amplification | trace | 6 | fiona | 1 |
| F033 | low |  | performance | `src/growpodempire/simulation/engine.py` | compute_conditions() runs every catch-up hour, doubling the per-step work for onset-event diffing | command | 6 | fiona | 1 |
| F015 | low |  | test-gap | `src/growpodempire/chain/algorand.py` | chain/algorand.py real provider is 0% covered; chain/factory.py provider selection 47% | command | 5 | casey | 1 |

## Disputed items (Jordan-Audit MUST resolve by re-running evidence)
_none_

## Audit worklist (re-verify all Critical + top High ≤15, spot-check 3 Medium)
- [ ] F016 (critical) — re-run: `.venv/bin/python -c "import os; os.environ.pop('GPE_DEV_LOGIN',None); os.environ['DATABASE_URL']='sqlite:///:memory:'; os.environ['RATELIMIT_ENABLED']='false'; from growpodempire.config import get_settings; get_settings.cache_clear(); from growpodempire.api.flask_api import create_app; app=create_app(); c=app.test_client(); r=c.post('/api/game/players',json={'username':'victim'}); vk=r.get_json()['api_key']; r2=c.post('/api/game/players/guest',json={'username':'victim'}); print('status',r2.status_code,'TAKEOVER',r2.get_json().get('api_key')==vk)"`
- [ ] F040 (critical) — re-run: `.venv/bin/python -m pytest -q reports/proposed-tests/test_harper_instant_harvest_profit.py -s`
- [ ] F017 (high) — re-run: `src/growpodempire/services/game_service.py:117-133`
- [ ] F005 (high) — re-run: `.venv/bin/python -m pytest reports/proposed-tests/test_blake_withdrawal_cap.py -q`
- [ ] F011 (high) — re-run: `PYTHONPATH=src .venv/bin/python -m pytest reports/proposed-tests/test_casey_settlement_cap.py --cov=growpodempire.services.settlement_service --cov-report=term-missing -q`
- [ ] F041 (high) — re-run: `.venv/bin/python -m pytest -q reports/proposed-tests/test_harper_lifetime_vigor_edges.py::test_pre_migration_row_fallback -s`
- [ ] F042 (high) — re-run: `.venv/bin/python -m pytest -q reports/proposed-tests/test_harper_lifetime_vigor_edges.py::test_dead_plant_can_be_harvested_and_sold -s`

## Rejected (no/insufficient evidence — not backlog candidates)
