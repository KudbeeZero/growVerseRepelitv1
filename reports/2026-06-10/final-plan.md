# Final Plan — Night/Audit/Quantum Cycle 2026-06-10 @ d96cff2

**Inputs:** 9 night agents → 47 findings → consolidated 47 (0 evidence-rejected after the
casing fix) → Audit re-ran 2 Critical + 5 High (all verified) + 3 spot-checked Medium.
**Adapted target:** GROWv2 (the FRONTIERNeXt "mainnet checklist" maps to this repo's
**live-game launch readiness**).

Status legend: ✅ fixed this cycle (in the open PR, unmerged) · 🔧 proposed · ⛓ needs TestNet.

## P0 — launch blockers
| ID | Sev | Finding | Owner | Effort | Status | Acceptance |
|----|-----|---------|-------|--------|--------|-----------|
| F040 | Critical | Instant buy→plant→harvest mints full-band weight (currency faucet, +923/cycle) | harper | S | ✅ fixed | Server-authoritative harvest gate: immature plant via auto path raises; `tests/test_harvest_gate.py` |
| F016 | Critical | Guest login default-ON returns any account's API key by username (takeover) | dana | S | ✅ fixed | `GPE_DEV_LOGIN` now defaults **off**; `/players/guest`→403 unless opted in; `tests/test_guest_login_default.py` |
| F042 | High | Dead plants can be harvested & sold (no is_alive gate) | harper | S | ✅ fixed | Same gate rejects dead-plant auto-harvest |
| F004 | Med→⛓ | `deposit()` can't custodially pull a user's ASA on the real provider (DB debits, asset never moves) | blake | L | ⛓ mainnet blocker | Redesign deposit to require a player-signed inbound transfer; verify on TestNet |

## P1 — harden / next capability
| ID | Sev | Finding | Owner | Effort | Status |
|----|-----|---------|-------|--------|--------|
| F005 | High | Withdrawal cap undercounts un-flushed rows in one session (+ plausible concurrent-request race) | blake | M | 🔧 not exploitable via current HTTP routing; flush-before-sum or row-lock before mainnet |
| F011 | High | Settlement daily-cap (treasury-drain defense) was 0% covered | casey | S | 🔧 promote Casey's 7 tests into `tests/` |
| F041 | High | Pre-migration / never-ticked rows yield full vigor via the health fallback | harper | M | 🔧 exploit vector closed by the gate; residual = legacy-row fairness → backfill migration |
| F006 | Med | NFT mint not idempotent across a chain-success→commit-fail window | blake | M | 🔧 reconcile by metadata hash / external key |
| H4 | Med | `breed` accepts any strain ids — no ownership/discovery check, no self-cross guard | harper | M | 🔧 |
| F001/F002 | Med | Catch-up cost (~411ms/yr, ORM-bound) + cap leaves long-idle plants permanently behind | fiona | M | 🔧 fast-forward/discard past the cap; batch dormant plants |
| F003 | Med | One always-on rAF+ResizeObserver per PlantCanvas, N per dashboard, redraws off-screen | fiona, alex | M | 🔧 IntersectionObserver/virtualize; pause rAF when not visible |
| IVY-1/2 | Med | serializer↔TS drift (`lifetime_vigor`, `season` missing from web types) | ivy | S | ✅ fixed (added to `web/src/lib/types.ts`); IVY-3 parity test still 🔧 |
| E1/E2 | Med | Toast has no `aria-live` (silent money/auth feedback to SRs); no `:focus-visible` ring | evan | S | 🔧 |

## P2 — later / low
- Gabe G1: add a `LICENSE` file (README claims MIT, none exists) — **compliance, do before public**.
- Gabe G2–G6: doc-count drift (README "16 strains"→47, "139 tests"→192; MAP.md "22"; player manual; document `lifetime_vigor` for players).
- Alex ALX-1 (reduced-motion: detail page still says "Swipe…" though brushing is inert), ALX-2/3.
- Evan E3–E7 a11y polish; Blake B4 (algorand address uniqueness/validation), provider-parity tests; Casey C2–C5 mint-path coverage.

## Definition-of-Done check
- ≥8/9 night artifacts present & schema-valid: **9/9.**
- Zero unverified Criticals in this plan: **met** — both Criticals verified by re-run and fixed; the
  downgraded Critical (F004) is marked ⛓ unverifiable with a written reason.
- Disputed items: **0** machine-disputed; the Blake↔Casey cap tension resolved by re-run (see audit-report).
- Draft PR: changes are on the open, **unmerged** PR #4 (human merge authority preserved). GitHub
  Critical issues NOT opened because both Criticals are already remediated in this PR (repo convention:
  be frugal with GitHub posting) — can open them on request.

## Not examined this run (launch-checklist gaps)
- Live **TestNet** verification: F004 on-chain effect + mock↔real provider parity (needs funded testnet).
- **Concurrency/load**: the withdrawal cap race and catch-up cost under Postgres + parallel workers.
- **Web e2e** (Playwright) of the full grow→harvest→sell→breed loop.
- **AI advisor / auto-care** spend-guard not deeply audited this cycle.
- **`.github/` CI**: still absent; the gate scripts exist but aren't wired (tracked in BACKLOG).
