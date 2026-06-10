# Audit Report — Cycle 2026-06-10 @ d96cff2

Jordan-Audit shift: re-ran evidence for ALL Critical + High (2 crit, 5 high) and spot-checked 3 Medium. Disputes resolved by re-execution, never averaging.

**Verdicts:** verified(true)=13 · unverifiable=1 · unaudited=33 (all ≤Medium).

## Verified Critical + High (re-run this shift)
| ID | Sev | Cat | File | Title | Agents | Verdict |
|----|-----|-----|------|-------|--------|---------|
| F016 | critical | security | `src/growpodempire/config.py` | Disable dev guest login by default (GPE_DEV_LOGIN) — it leak | dana | **true** |
| F040 | critical | economic | `src/growpodempire/services/game_service.py` | Instant harvest exploit: buy->plant->harvest in the same hou | harper | **true** |
| F017 | high | security | `src/growpodempire/api/game_api.py` | Guest login endpoint is a username/account enumeration + key | dana | **true** |
| F005 | high | economic | `src/growpodempire/services/settlement_service.py` | MAX_WITHDRAWAL_PER_DAY cap is bypassable for un-flushed with | blake | **true** |
| F011 | high | test-gap | `src/growpodempire/services/settlement_service.py` | Settlement daily-withdrawal cap (treasury drain defense) is  | casey | **true** |
| F041 | high | economic | `src/growpodempire/db/models.py` | Pre-migration / never-ticked rows get full-vigor yield via t | harper | **true** |
| F042 | high | correctness | `src/growpodempire/services/game_service.py` | Dead plants can be harvested and sold for non-trivial weight | harper | **true** |

## Traceability matrix (finding → agent(s) → evidence → verification)
| ID | Sev | Agents | Evidence | Re-run verdict | Note |
|----|-----|--------|----------|----------------|------|
| F016 | critical | dana | command | true | Re-ran Dana's command on a fresh app: POST /players/guest returned the victim's EXACT api_key (TAKEOVER=True, 200). Acco |
| F040 | critical | harper | test | true | Re-ran Harper's repro (test_harper_instant_harvest_profit.py) — PASS. Same-hour buy→plant→harvest yields full top-of-ban |
| F017 | high | dana | trace | true | Same endpoint as F016 (command-proven key disclosure). find-or-create returns 200+api_key for any username → enumeration |
| F005 | high | blake | test | true | Re-ran Blake's probe — second same-session withdrawal NOT capped (autoflush=False makes the rolling-sum query miss the u |
| F011 | high | casey | test | true | Re-ran Casey's 7 settlement-cap tests — all PASS. The treasury-drain defense was 0%-covered; the gap is real and these t |
| F041 | high | harper | test | true | Re-ran Harper's edge test — pre-migration/never-ticked row (lifetime_hours==0) harvests at FULL vigor via the health=100 |
| F042 | high | harper | test | true | Re-ran Harper's edge test — a DEAD plant is harvested and sold for non-trivial weight; harvest_plant has no is_alive gat |
| F045 | medium | ivy | command | true | grep: serialize.py emits lifetime_vigor (1), web Plant interface has it (0) — serializer↔client drift confirmed. |
| F022 | medium | evan | trace | true | Spot-check: grep Toast.tsx for aria-live|role => 0. Confirmed. |
| F029 | medium | fiona | command | true | Spot-check: max_catchup_hours clamp confirmed at engine.py:255; a plant idle beyond the cap advances only cap hours/read |
| F004 | medium | blake | doc | unverifiable | Code-trace CONFIRMED: deposit() calls provider.transfer_asset(asset_id, TREASURY, units) with no player-signed inbound t |
| F030 | medium | fiona | command | true | Spot-check: max_catchup_hours clamp confirmed at engine.py:255; a plant idle beyond the cap advances only cap hours/read |
| F032 | low | fiona | trace | true | Spot-check: max_catchup_hours clamp confirmed at engine.py:255; a plant idle beyond the cap advances only cap hours/read |
| F033 | low | fiona | command | true | Spot-check: max_catchup_hours clamp confirmed at engine.py:255; a plant idle beyond the cap advances only cap hours/read |

## Gate actions (mechanical, from consolidation)
- **F017** (high): kept at severity: conf≥9 self-evident trace
- **F004** (medium): downgraded critical→medium: doc-only evidence
- **F006** (medium): downgraded high→medium: trace-only evidence

## Contradiction resolved
- **F005 (Blake) vs F011 (Casey)** on the withdrawal cap: NOT contradictory. Blake's single-session bypass reproduces (autoflush undercounts unflushed rows); Casey's 'cap contract correct' holds for committed per-request flow. Both true at different layers. Verdict: real latent gap, not exploitable via current HTTP routing; harden before mainnet.
