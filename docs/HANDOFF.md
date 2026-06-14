# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-14 · **By:** Records Dept — DRIFT-001 / CASE A reconciliation
**Trunk HEAD:** `dc6ccde` (PR #34). **Note:** the local `main` ref (`04146a8`) is a stale
import/production pointer ~93 commits behind — the live integration trunk is the active dev line,
not `main`.
**Merged & canonical:** **PR #25** De-Grape · **PR #26** Bud Weight Physics · **PR #29** Canonical
Stage PNG · **PR #30** Dashboard / GameState Wiring (+ `AuthErrorListener`) · **PR #33** Launch Strain
Integration Pack (White Rhino, White Fire OG, Gelato, Wedding Cake) · **PR #34** FTUE starter-grant rail.
**Parked (open PRs, green — do NOT modify):** **PR #27** Phenotype Generator Foundation, **PR #28**
Circadian Leaf Motion.

> **⚠️ DRIFT-001 (RISK #12) — resolved CASE A (2026-06-14).** The previous baton froze the project at
> "PR #30 = NEXT, visual/UX only" while the owner squash-merged **#30, #33, #34** *after* the last
> closeout — so the baton went stale by construction (merges outran closeouts), **not** by an
> unauthorized-work breach. The CEO adopted **CASE A**: git history is canonical; this baton is
> rewritten to actual merged state. Authorization chain for all three terminates at the owner
> (`dominick.ziola@gmail.com`). **Root-cause process fix:** do not squash-merge a `claude/*` PR
> without a follow-up closeout rewriting this baton, or every post-closeout merge re-creates RISK #12.
> #34 received a retroactive audit — `docs/audits/pr-34-retroactive-audit.md` (**PASS WITH NOTES**).

---

## NEXT ACTION (the one scoped item the next chat does)

**PR #31 — MVP Launch Candidate.** The whole-plant chamber visuals are signed off (#25/#26/#29), the
dashboard/auth wiring landed (#30), the launch strain pack is in (#33), and first-run onboarding is
unblocked (#34). The next PR assembles the launch candidate over that base.
- **Stay on the launch funnel:** PR #31 → Desktop Playtesting → Retention Validation → Release
  Hardening → Testnet Preparation. **No new feature branches** outside this funnel without CEO
  authorization, and no chain/economy/breeding/combat/crop-family expansion.
- **Do NOT modify PR #27 (Phenotype) or PR #28 (Circadian)** — both parked and green.
- **Reuse, don't rebuild:** the chamber renders through `web/src/lib/chamber/chamberCore.ts` (shared by
  the live component and the headless `npm run gen:stages` generator). Keep that single source intact.
- **Carry from AUDIT-034 (non-blocking, do before scaled signup):** the #34 starter grant is a
  per-account *item* faucet that converts to GROW via grow→harvest→sell — fold it into the anti-bot /
  new-account faucet-throttle backlog item; and add the missing starter-grant ADR/BACKLOG line.
- **Macro Bud Polish II** (BACKLOG, *not launch-blocking*): sharper calyx ridges / denser nesting on
  the PDP *macro* bud — macro view only; whole-plant is signed off.

---

## What the DRIFT-001 reconciliation chat did

Records-only. Adopted CEO ruling CASE A: promoted git HEAD to canonical, rewrote this baton to actual
merged state (#30/#33/#34), set NEXT = PR #31, cleared RISK #10 on evidence, and produced the
retroactive **AUDIT-034** for PR #34 (`docs/audits/pr-34-retroactive-audit.md`, PASS WITH NOTES). No
code, history, or PR was modified or reverted.

## Verification (this reconciliation)

**Agent-verifiable (proven):**
- `make test` **226 passed, 80.97% ≥ 79** ✅ · `make lint` ✅ · `make check-memory` ✅ (21 files).
- Alembic single head `c7ecd7523cc8` ✅; fresh `alembic upgrade head` clean ✅.
- PR #30 shipped `web/src/components/layout/AuthErrorListener.tsx` + `web/src/lib/authError.ts` (+test)
  → the global 401/403 teardown that **RISK #10** required.

**Device/human-verifiable (owner):**
- PR #34 UX intent: a brand-new player lands on a usable dashboard (starter pod + seed) and reaches
  first-plant with zero setup.
- The chamber pixels (#25/#26/#29) — no headless browser in CI to screenshot the chamber.

---

## OPEN RISKS (carried) — re-stated after DRIFT-001; backend risks still NOT re-audited except where noted

> A risk clears only when VERIFIED FIXED (test-backed). Re-audit the backend items against current
> code before acting on them.

| # | Sev | Risk | Evidence | Status |
|---|-----|------|----------|--------|
| 3 | HIGH | Idempotency on mutations. | `api/game_api.py`, `db/models.py` | PARTIAL — concurrency core fixed (2026-06-10); **one-shot grants now shipped & test-backed via #34** (`grant_claims`); general `Idempotency-Key` header still open. |
| 4/7 | HIGH | **Chain settlement not real** — deposit trusts no on-chain proof; treasury drain path; no txid replay protection / reconciliation / address validation. | `services/settlement_service.py`, `db/models.py`, `game_service.py` | OPEN — blocks any real value moving (Sprint 4 gate). |
| 8 | HIGH | **Web safety net** — vitest runs in CI; Playwright e2e still stubbed; treasury-cap + chain-failure-rollback tests absent. | `web/package.json`, `.github/workflows/ci.yml` | PARTIAL. |
| 9 | MED | **Sim dormancy semantics** — can delay an earned harvest if `max_catchup_hours` lowered below a stage; skips lethal decay. Masked at default cap. | `simulation/engine.py` | OPEN — needs a design decision + knob guard. |
| 10 | MED | **Web: no global 401/403 handler.** | `AuthErrorListener.tsx`, `authError.ts` | **✅ ADDRESSED (2026-06-14, PR #30)** — global auth-error listener tears down the session on a rejected key; unit-tested. Cleared per DRIFT-001 evidence. |
| 11 | LOW | Rate-limiter `memory://` per-worker (set Redis); `get_level` public oracle. **+ #34 starter grant is a per-account item faucet** → anti-bot/Sybil radar before scaled signup. | see fleet-sweep, AUDIT-034 NOTE 2 | PARTIAL. |
| 12 | — | **Baton ↔ repo drift.** | DRIFT-001 | **✅ RESOLVED CASE A (2026-06-14)** — git canonical; baton reconciled; #34 audited. Process fix recorded above. |

> Reassuring (verified solid earlier, not all re-checked here): no IDOR; auth/authz
> server-authoritative; AI SpendGuard unescapable + CI never hits a live key; ledger correct
> single-threaded; no model↔migration drift (single head `c7ecd7523cc8` confirmed).
